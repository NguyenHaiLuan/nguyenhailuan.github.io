/* HL Portfolio Content Loader v2.1
   - Loads from hl-portfolio-data.json (fallback: localStorage)
   - Full markdown renderer: headings, bold, italic, blockquote, lists, links, code, hr
   - Blog cards: click opens detail modal (if full content exists)
   - Portfolio cards: click opens case study modal
   - Language badges use text (EN/VI) instead of flag emoji
*/
(function () {

  var raw = localStorage.getItem('hl_cms');
  if (raw) {
    try { renderContent(JSON.parse(raw)); } catch(e) { console.warn('[HL CMS]', e); }
  } else {
    fetch('hl-portfolio-data.json')
      .then(function(r) { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(function(data) {
        localStorage.setItem('hl_cms', JSON.stringify(data));
        renderContent(data);
      })
      .catch(function() { /* use default HTML */ });
  }

  /* ── MARKDOWN RENDERER ── */
  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function inlineFmt(s) {
    return esc(s)
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/~~(.*?)~~/g,'<del>$1</del>')
      .replace(/\*(.*?)\*/g,'<em>$1</em>')
      .replace(/`(.*?)`/g,'<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  function renderMd(raw) {
    if (!raw) return '';
    var lines = raw.split('\n');
    var html = '';
    var inUl = false, inOl = false;

    function closeLists() {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
    }

    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (/^---+$/.test(line.trim())) {
        closeLists(); html += '<hr>'; i++; continue;
      }
      if (/^## /.test(line)) {
        closeLists(); html += '<h2>' + inlineFmt(line.slice(3)) + '</h2>'; i++; continue;
      }
      if (/^### /.test(line)) {
        closeLists(); html += '<h3>' + inlineFmt(line.slice(4)) + '</h3>'; i++; continue;
      }
      if (/^> /.test(line)) {
        closeLists(); html += '<blockquote>' + inlineFmt(line.slice(2)) + '</blockquote>'; i++; continue;
      }
      if (/^- /.test(line)) {
        if (!inUl) { closeLists(); html += '<ul>'; inUl = true; }
        html += '<li>' + inlineFmt(line.slice(2)) + '</li>'; i++; continue;
      }
      if (/^\d+\. /.test(line)) {
        if (!inOl) { closeLists(); html += '<ol>'; inOl = true; }
        html += '<li>' + inlineFmt(line.replace(/^\d+\. /, '')) + '</li>'; i++; continue;
      }
      if (line.trim() === '') {
        closeLists(); i++;
        while (i < lines.length && lines[i].trim() === '') i++;
        continue;
      }
      // paragraph
      closeLists();
      var para = '';
      while (i < lines.length && lines[i].trim() !== '' && !/^(## |### |> |- |\d+\. |---+)/.test(lines[i])) {
        para += (para ? '<br>' : '') + inlineFmt(lines[i]);
        i++;
      }
      if (para) html += '<p>' + para + '</p>';
    }
    closeLists();
    return html;
  }

  /* ── MAIN RENDER ── */
  function renderContent(D) {
    injectBlog(D);
    injectPortfolio(D);
    buildBlogModal(D);
    buildPortModal(D);
    var lang = document.body.className || 'en';
    if (typeof setLang === 'function') setLang(lang);
    observeReveal();
  }

  /* ── BLOG INJECTION ── */
  function injectBlog(D) {
    var grid = document.querySelector('.blog-grid');
    if (!grid || !D.blog || !D.blog.length) return;

    grid.innerHTML = D.blog.map(function(b) {
      var hasFull = !!(b.contentEN || b.contentVI);
      var link = b.link && b.link !== '' ? b.link : '#';
      var clickAttr = (hasFull && (!b.link || b.link === '' || b.link === '#'))
        ? 'onclick="hlOpenBlog(\'' + b.id + '\'); return false;"'
        : '';

      return '<div class="blog-card reveal">' +
        '<div class="blog-meta">' +
        '<span class="blog-cat" data-en>' + esc(b.cat.en) + '</span>' +
        '<span class="blog-cat" data-vi>' + esc(b.cat.vi) + '</span>' +
        '<span>·</span>' +
        '<span data-en>' + esc(b.readTime.en) + '</span>' +
        '<span data-vi>' + esc(b.readTime.vi) + '</span>' +
        '</div>' +
        '<div class="blog-title">' +
        '<span data-en>' + esc(b.title.en) + '</span>' +
        '<span data-vi>' + esc(b.title.vi) + '</span>' +
        '</div>' +
        '<p class="blog-excerpt" data-en-b>' + esc(b.excerpt.en) + '</p>' +
        '<p class="blog-excerpt" data-vi-b>' + esc(b.excerpt.vi) + '</p>' +
        '<a href="' + esc(link) + '" class="blog-read" ' + clickAttr + '>' +
        '<span data-en>Read →</span><span data-vi>Đọc →</span>' +
        '</a></div>';
    }).join('');
  }

  /* ── PORTFOLIO INJECTION ── */
  function injectPortfolio(D) {
    var grid = document.querySelector('.port-grid');
    if (!grid || !D.portfolio || !D.portfolio.length) return;
    window._hlPortData = D.portfolio;

    grid.innerHTML = D.portfolio.map(function(p, i) {
      var hasModal = !!(
        (p.brief && (p.brief.en || p.brief.vi)) || p.copyVI || p.copyEN
      );
      var colorClass = 'port-top-' + (p.color || ((i % 6) + 1));
      return '<div class="port-card reveal"' +
        (hasModal ? ' onclick="hlOpenModal(\'' + p.id + '\')"' : '') + '>' +
        '<div class="port-top ' + colorClass + '">' +
        '<span class="port-type" data-en>' + esc(p.type.en) + '</span>' +
        '<span class="port-type" data-vi>' + esc(p.type.vi) + '</span>' +
        '<div class="port-title" data-en>' + esc(p.title.en) + '</div>' +
        '<div class="port-title" data-vi>' + esc(p.title.vi) + '</div>' +
        '</div>' +
        '<div class="port-bottom">' +
        '<span class="port-meta">' + esc(p.meta) + '</span>' +
        '<span class="port-arrow">' + (hasModal ? '→' : '') + '</span>' +
        '</div></div>';
    }).join('');
  }

  /* ── BLOG DETAIL MODAL ── */
  function buildBlogModal(D) {
    var hasFull = D.blog.some(function(b) { return b.contentEN || b.contentVI; });
    if (!hasFull) return;

    // CSS injection (once)
    if (!document.getElementById('hl-blog-modal-style')) {
      var style = document.createElement('style');
      style.id = 'hl-blog-modal-style';
      style.textContent = [
        /* overlay */
        '.hl-bm-ov{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(10px);z-index:9000;display:flex;align-items:center;justify-content:center;padding:1.25rem;opacity:0;pointer-events:none;transition:opacity .25s}',
        '.hl-bm-ov.open{opacity:1;pointer-events:all}',
        /* modal box */
        '.hl-bm-box{background:var(--surface,#fff);border:1px solid var(--border,#e5e2dc);border-radius:20px;width:100%;max-width:1100px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.15),0 0 0 1px rgba(0,0,0,.04);transform:translateY(20px) scale(.98);transition:transform .3s cubic-bezier(.22,1,.36,1);overflow:hidden}',
        '.hl-bm-ov.open .hl-bm-box{transform:translateY(0) scale(1)}',
        /* header */
        '.hl-bm-head{padding:.9rem 1.5rem;border-bottom:1px solid var(--border,#e5e2dc);display:flex;align-items:center;gap:.6rem;flex-shrink:0;background:var(--surface,#fff)}',
        /* lang pills */
        '.hl-lb{display:inline-flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:800;letter-spacing:.06em;border-radius:99px;padding:.2rem .65rem;cursor:pointer;font-family:inherit;border:1.5px solid transparent;transition:all .15s}',
        '.hl-lb.hl-lb-en{background:#1e3a5f;color:#93c5fd;border-color:#1e3a5f}',
        '.hl-lb.hl-lb-vi{background:#7c1d1d;color:#fca5a5;border-color:#7c1d1d}',
        '.hl-lb:not(.active){opacity:.4}',
        '.hl-lb.active{opacity:1;outline:2px solid currentColor;outline-offset:2px}',
        /* close btn */
        '.hl-bm-close{margin-left:auto;width:30px;height:30px;border-radius:50%;border:1px solid var(--border,#e5e2dc);background:var(--surface2,#f4f2ee);cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;color:var(--ink-muted,#6b6660);transition:all .18s;flex-shrink:0}',
        '.hl-bm-close:hover{border-color:var(--green,#16a34a);color:var(--green,#16a34a);background:var(--green-dim,#dcfce7)}',
        /* scrollable body — max-width for readability */
        '.hl-bm-body{overflow-y:auto;flex:1;padding:2.25rem 3rem 3rem;max-width:780px;margin:0 auto;width:100%;box-sizing:border-box}',
        /* meta row */
        '.hl-bm-meta{display:flex;align-items:center;gap:.6rem;margin-bottom:.9rem;flex-wrap:wrap}',
        '.hl-bm-cat{background:var(--green-dim,#dcfce7);color:var(--green,#16a34a);padding:.2rem .75rem;border-radius:99px;font-size:.65rem;font-weight:800;letter-spacing:.04em}',
        '.hl-bm-rt{font-size:.75rem;color:var(--ink-muted,#6b6660)}',
        /* title */
        '.hl-bm-title{font-size:1.75rem;font-weight:800;line-height:1.18;margin-bottom:1rem;color:var(--ink,#141210)}',
        /* excerpt */
        '.hl-bm-excerpt{font-size:.92rem;color:var(--ink-muted,#6b6660);border-left:3px solid var(--green,#16a34a);padding:.7rem 1rem;margin-bottom:1.75rem;font-style:italic;line-height:1.75;background:var(--green-dim,#dcfce7);border-radius:0 8px 8px 0}',
        /* divider before body */
        '.hl-bm-divider{height:1px;background:var(--border,#e5e2dc);margin-bottom:1.75rem}',
        /* content typography */
        '.hl-bm-content{font-size:.93rem;line-height:1.9;color:var(--ink,#141210)}',
        '.hl-bm-content p{margin-bottom:1rem}',
        '.hl-bm-content p:last-child{margin-bottom:0}',
        '.hl-bm-content h2{font-size:1.2rem;font-weight:800;margin:1.75rem 0 .6rem;color:var(--ink,#141210);padding-bottom:.4rem;border-bottom:2px solid var(--border,#e5e2dc)}',
        '.hl-bm-content h3{font-size:1rem;font-weight:700;margin:1.4rem 0 .5rem;color:var(--ink,#141210)}',
        '.hl-bm-content blockquote{border-left:3px solid var(--green,#16a34a);padding:.7rem 1.1rem;background:var(--green-dim,#dcfce7);border-radius:0 8px 8px 0;margin:1.1rem 0;font-style:italic;color:var(--green,#16a34a);font-size:.9rem}',
        '.hl-bm-content ul,.hl-bm-content ol{margin:.5rem 0 1rem 1.4rem}',
        '.hl-bm-content li{margin-bottom:.35rem}',
        '.hl-bm-content code{background:var(--surface2,#f4f2ee);padding:.1rem .4rem;border-radius:4px;font-family:monospace;font-size:.82rem;color:var(--ink,#141210)}',
        '.hl-bm-content hr{border:none;border-top:1px solid var(--border,#e5e2dc);margin:1.5rem 0}',
        '.hl-bm-content a{color:var(--green,#16a34a);text-decoration:underline;text-underline-offset:2px}',
        '.hl-bm-content strong{font-weight:700}',
        '.hl-bm-content del{opacity:.55}',
        /* pane switch */
        '.hl-bm-pane{display:none}.hl-bm-pane.active{display:block}',
        /* empty state */
        '.hl-bm-empty{background:var(--surface2,#f4f2ee);border:1px dashed var(--border,#e5e2dc);border-radius:10px;padding:2rem;text-align:center;color:var(--ink-muted,#6b6660);font-size:.85rem}',
        /* mobile */
        '@media(max-width:640px){.hl-bm-body{padding:1.5rem 1.25rem 2rem}.hl-bm-title{font-size:1.35rem}}'
      ].join('');
      document.head.appendChild(style);
    }

    if (!document.getElementById('hl-blog-overlay')) {
      var div = document.createElement('div');
      div.id = 'hl-blog-overlay';
      div.className = 'hl-bm-ov';
      /* No click-outside close on index either — user asked to keep it */
      div.onclick = function(e) { if (e.target === div) hlCloseBlog(); };
      div.innerHTML =
        '<div class="hl-bm-box">' +
        '<div class="hl-bm-head">' +
        '<button class="hl-lb hl-lb-en active" id="hl-bm-en-btn" onclick="hlBlogLang(\'en\')">EN</button>' +
        '<button class="hl-lb hl-lb-vi" id="hl-bm-vi-btn" onclick="hlBlogLang(\'vi\')">VI</button>' +
        '<button class="hl-bm-close" onclick="hlCloseBlog()">✕</button>' +
        '</div>' +
        '<div class="hl-bm-body">' +
        '<div class="hl-bm-pane active" id="hl-bm-en"></div>' +
        '<div class="hl-bm-pane" id="hl-bm-vi"></div>' +
        '</div></div>';
      document.body.appendChild(div);
    }

    window._hlBlogData = D.blog;

    window.hlOpenBlog = function(id) {
      var b = (window._hlBlogData||[]).find(function(x){return x.id===id;});
      if (!b) return;

      function renderPane(lang) {
        var isVI = lang === 'vi';
        var title   = isVI ? b.title.vi   : b.title.en;
        var cat     = isVI ? b.cat.vi     : b.cat.en;
        var rt      = isVI ? b.readTime.vi: b.readTime.en;
        var excerpt = isVI ? b.excerpt.vi : b.excerpt.en;
        var content = isVI ? (b.contentVI||'') : (b.contentEN||'');
        var contentHTML = content ? renderMd(content)
          : '<div class="hl-bm-empty">Bài viết này chưa có nội dung bằng ngôn ngữ này.</div>';
        return '<div class="hl-bm-meta">' +
          '<span class="hl-bm-cat">' + esc(cat) + '</span>' +
          '<span class="hl-bm-rt">· ' + esc(rt) + '</span></div>' +
          '<div class="hl-bm-title">' + esc(title) + '</div>' +
          (excerpt ? '<div class="hl-bm-excerpt">' + esc(excerpt) + '</div>' : '') +
          '<div class="hl-bm-divider"></div>' +
          '<div class="hl-bm-content">' + contentHTML + '</div>';
      }

      document.getElementById('hl-bm-en').innerHTML = renderPane('en');
      document.getElementById('hl-bm-vi').innerHTML = renderPane('vi');

      var siteLang = document.body.className === 'vi' ? 'vi' : 'en';
      hlBlogLang(siteLang);
      document.getElementById('hl-blog-overlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    };

    window.hlBlogLang = function(lang) {
      document.getElementById('hl-bm-en').classList.toggle('active', lang==='en');
      document.getElementById('hl-bm-vi').classList.toggle('active', lang==='vi');
      document.getElementById('hl-bm-en-btn').classList.toggle('active', lang==='en');
      document.getElementById('hl-bm-vi-btn').classList.toggle('active', lang==='vi');
    };

    window.hlCloseBlog = function() {
      document.getElementById('hl-blog-overlay').classList.remove('open');
      document.body.style.overflow = '';
    };
  }

  /* ── PORTFOLIO CASE STUDY MODAL ── */
  function buildPortModal(D) {
    window._hlPortData = D.portfolio;

    // Inject CSS once
    if (!document.getElementById('hl-port-modal-style')) {
      var s = document.createElement('style');
      s.id = 'hl-port-modal-style';
      s.textContent = [
        // EN/VI pill buttons (same style as blog modal)
        '.hl-lb{display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;letter-spacing:.06em;border-radius:4px;padding:3px 8px;cursor:pointer;font-family:inherit;border:none;transition:all .15s}',
        '.hl-lb.hl-lb-en{background:#1e3a5f;color:#93c5fd}',
        '.hl-lb.hl-lb-vi{background:#7c1d1d;color:#fca5a5}',
        '.hl-lb.active{outline:2px solid currentColor;outline-offset:2px;opacity:1}',
        '.hl-lb:not(.active){opacity:.45}',
        // Port lang row in modal head
        '.hl-port-lb-row{display:flex;gap:.35rem;margin-bottom:.6rem}',
        // Two-pane switch
        '.hl-cs-pane{display:none}.hl-cs-pane.active{display:block}',
        // Pane content styles
        '.cs-pane-type{font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--green,#16a34a);margin-bottom:.4rem}',
        '.cs-pane-title{font-size:1.35rem;font-weight:800;line-height:1.25;margin-bottom:0}'
      ].join('');
      document.head.appendChild(s);
    }

    // Wire lang buttons — set once and reuse via hlPortLang
    var mlbEn = document.getElementById('mlb-en');
    var mlbVi = document.getElementById('mlb-vi');
    if (mlbEn) mlbEn.onclick = function() { window.hlPortLang('en'); };
    if (mlbVi) mlbVi.onclick = function() { window.hlPortLang('vi'); };

    window.hlPortLang = function(lang) {
      var enPane = document.getElementById('hl-cs-en');
      var viPane = document.getElementById('hl-cs-vi');
      if (enPane) enPane.classList.toggle('active', lang === 'en');
      if (viPane) viPane.classList.toggle('active', lang === 'vi');
      var eBt = document.getElementById('mlb-en');
      var vBt = document.getElementById('mlb-vi');
      if (eBt) eBt.classList.toggle('active', lang === 'en');
      if (vBt) vBt.classList.toggle('active', lang === 'vi');
    };

    window.hlOpenModal = function(id) {
      var p = (window._hlPortData||[]).find(function(x){return x.id===id;});
      if (!p) return;

      var m = document.getElementById('modal');
      if (!m) return;
      var body = m.querySelector('.modal-body');
      if (!body) return;

      // Helper: build breakdown list HTML
      function buildBkList(raw) {
        if (!raw) return '';
        return '<ul class="bk-list">' + raw.split('\n').filter(Boolean).map(function(line) {
          var parts = line.split('||');
          return '<li><span class="bk-tag">' + esc(parts[0]||'') + '</span><span>' + esc(parts.slice(1).join('||')) + '</span></li>';
        }).join('') + '</ul>';
      }

      // Build one full pane per language — zero data-attribute dependence
      function buildPane(lang) {
        var isVI = lang === 'vi';
        var typeLabel = isVI ? p.type.vi : p.type.en;
        var titleLabel = isVI ? p.title.vi : p.title.en;
        var brief = isVI ? (p.brief && p.brief.vi || '') : (p.brief && p.brief.en || '');
        var copy = isVI ? (p.copyVI || '') : (p.copyEN || '');
        var bkRaw = isVI
          ? (p.breakdownVI || p.breakdown || '')
          : (p.breakdownEN || (p.breakdown && !p.breakdownVI ? p.breakdown : '') || '');

        var html = '<div class="cs-pane-type">Case Study — ' + esc(typeLabel) + '</div>' +
                   '<div class="cs-pane-title">' + esc(titleLabel) + '</div>';

        if (brief) {
          html += '<div class="modal-sec"><h4>' + (isVI ? 'Bối cảnh' : 'Brief') + '</h4>' +
                  '<p class="brief-text">' + esc(brief) + '</p></div>';
        }
        if (copy) {
          html += '<div class="modal-sec"><h4>' + (isVI ? 'Bài viết' : 'The copy') + '</h4>' +
                  '<div class="copy-sample"><div class="copy-body">' + renderMd(copy) + '</div></div></div>';
        }
        if (bkRaw) {
          html += '<div class="modal-sec"><h4>Copywriting breakdown</h4>' + buildBkList(bkRaw) + '</div>';
        }
        return html;
      }

      body.innerHTML =
        '<div class="hl-cs-pane active" id="hl-cs-en">' + buildPane('en') + '</div>' +
        '<div class="hl-cs-pane" id="hl-cs-vi">' + buildPane('vi') + '</div>';

      if (typeof openModal === 'function') openModal();
      else { m.classList.add('open'); document.body.style.overflow = 'hidden'; }

      // Sync pane to current site lang
      var lang = document.body.className === 'vi' ? 'vi' : 'en';
      window.hlPortLang(lang);
    };
  }

  /* ── SCROLL REVEAL ── */
  function observeReveal() {
    if (typeof IntersectionObserver === 'undefined') return;
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e, i) {
        if (e.isIntersecting) {
          setTimeout(function(){ e.target.classList.add('on'); }, i * 75);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.blog-grid .reveal, .port-grid .reveal').forEach(function(el){
      obs.observe(el);
    });
  }

})();
