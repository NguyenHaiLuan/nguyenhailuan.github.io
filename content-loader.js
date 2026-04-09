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
        '.hl-bm-ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .2s}',
        '.hl-bm-ov.open{opacity:1;pointer-events:all}',
        '.hl-bm-box{background:var(--surface,#fff);border-radius:14px;width:100%;max-width:660px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);transform:scale(.96) translateY(14px);transition:transform .2s;overflow:hidden}',
        '.hl-bm-ov.open .hl-bm-box{transform:scale(1) translateY(0)}',
        '.hl-bm-head{padding:14px 20px;border-bottom:1px solid var(--border,#e5e2dc);display:flex;align-items:center;gap:10px;flex-shrink:0}',
        /* lang badges — text, no emoji */
        '.hl-lb{display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;letter-spacing:.06em;border-radius:4px;padding:3px 7px;cursor:pointer;font-family:inherit;border:none;transition:all .15s}',
        '.hl-lb.hl-lb-en{background:#1e3a5f;color:#93c5fd}',
        '.hl-lb.hl-lb-vi{background:#7c1d1d;color:#fca5a5}',
        '.hl-lb.active{outline:2px solid #fff;outline-offset:1px;opacity:1}',
        '.hl-lb:not(.active){opacity:.55}',
        '.hl-bm-close{margin-left:auto;width:28px;height:28px;border-radius:7px;border:none;background:transparent;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;color:var(--ink-muted,#6b6660);transition:background .15s}',
        '.hl-bm-close:hover{background:var(--surface2,#f4f2ee)}',
        '.hl-bm-body{padding:24px 28px;overflow-y:auto;flex:1}',
        '.hl-bm-meta{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}',
        '.hl-bm-cat{background:var(--green-dim,#dcfce7);color:var(--green,#16a34a);padding:3px 11px;border-radius:20px;font-size:11px;font-weight:700}',
        '.hl-bm-rt{font-size:12px;color:var(--ink-muted,#6b6660)}',
        '.hl-bm-title{font-size:22px;font-weight:800;line-height:1.3;margin-bottom:14px;color:var(--ink,#141210)}',
        '.hl-bm-excerpt{font-size:14px;color:var(--ink-muted,#6b6660);border-left:3px solid var(--green,#16a34a);padding-left:14px;margin-bottom:20px;font-style:italic;line-height:1.65}',
        '.hl-bm-content{font-size:14px;line-height:1.85;color:var(--ink,#141210)}',
        '.hl-bm-content p{margin-bottom:14px}',
        '.hl-bm-content h2{font-size:18px;font-weight:800;margin:20px 0 8px}',
        '.hl-bm-content h3{font-size:16px;font-weight:700;margin:16px 0 6px}',
        '.hl-bm-content blockquote{border-left:3px solid var(--green,#16a34a);padding:8px 14px;background:var(--green-dim,#dcfce7);border-radius:0 6px 6px 0;margin:14px 0;font-style:italic;color:var(--green,#16a34a)}',
        '.hl-bm-content ul,.hl-bm-content ol{margin:8px 0 14px 22px}',
        '.hl-bm-content li{margin-bottom:5px}',
        '.hl-bm-content code{background:var(--surface2,#f4f2ee);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:12px}',
        '.hl-bm-content hr{border:none;border-top:1px solid var(--border,#e5e2dc);margin:18px 0}',
        '.hl-bm-content a{color:var(--green,#16a34a);text-decoration:underline}',
        '.hl-bm-content del{opacity:.6}',
        '.hl-bm-pane{display:none}.hl-bm-pane.active{display:block}',
        '.hl-bm-empty{background:var(--surface2,#f4f2ee);border:1px dashed var(--border,#e5e2dc);border-radius:8px;padding:24px;text-align:center;color:var(--ink-muted,#6b6660);font-size:13px}'
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

    window.hlOpenModal = function(id) {
      var p = (window._hlPortData||[]).find(function(x){return x.id===id;});
      if (!p) return;

      var m = document.getElementById('modal');
      if (!m) return;

      // Update header
      var head = m.querySelector('.modal-head');
      if (head) {
        var types = head.querySelectorAll('.modal-type');
        if (types[0]) types[0].textContent = 'Case Study — ' + p.type.en;
        if (types[1]) types[1].textContent = 'Case Study — ' + p.type.vi;
        var titles = head.querySelectorAll('.modal-title');
        if (titles[0]) titles[0].textContent = p.title.en;
        if (titles[1]) titles[1].textContent = p.title.vi;
      }

      // Build breakdown
      var bkHTML = '';
      if (p.breakdown) {
        var lines = p.breakdown.split('\n').filter(Boolean);
        bkHTML = '<div class="modal-sec"><h4>Copywriting breakdown</h4><ul class="bk-list">' +
          lines.map(function(line) {
            var parts = line.split('||');
            var tag = parts[0]||'';
            var body = parts.slice(1).join('||');
            return '<li><span class="bk-tag">' + esc(tag) + '</span><span>' + esc(body) + '</span></li>';
          }).join('') + '</ul></div>';
      }

      // Build body
      var body = m.querySelector('.modal-body');
      if (body) {
        var briefSection = (p.brief && (p.brief.en || p.brief.vi))
          ? '<div class="modal-sec">' +
            '<h4 data-en>Brief</h4><h4 data-vi>Bối cảnh</h4>' +
            '<p class="brief-text" data-en-b>' + esc(p.brief.en||'') + '</p>' +
            '<p class="brief-text" data-vi-b>' + esc(p.brief.vi||'') + '</p>' +
            '</div>' : '';

        var copyVISection = p.copyVI
          ? '<div class="modal-sec"><h4 data-en>The copy (Vietnamese)</h4><h4 data-vi>Bài viết</h4>' +
            '<div class="copy-sample"><div class="copy-body">' + renderMd(p.copyVI) + '</div></div></div>' : '';

        var copyENSection = p.copyEN
          ? '<div class="modal-sec"><h4 data-en>English version</h4><h4 data-vi>Bản tiếng Anh</h4>' +
            '<div class="copy-sample"><div class="copy-body">' + renderMd(p.copyEN) + '</div></div></div>' : '';

        body.innerHTML = briefSection + copyVISection + copyENSection + bkHTML;
      }

      if (typeof openModal === 'function') openModal();
      else { m.classList.add('open'); document.body.style.overflow='hidden'; }

      var lang = document.body.className || 'en';
      if (typeof setLang === 'function') setLang(lang);
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
