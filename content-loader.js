/* HL Portfolio Content Loader v3.0
   - Platform mockups: FB Ads, Instagram Ads, Gmail/Email sequence
   - Results section in case study modal
   - Language badges use text (EN/VI)
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

      var platformBadges = '';
      if (p.adPlatforms && p.adPlatforms.length) {
        var platformMap = { fb: '📘 FB Ads', insta: '📸 Instagram', email: '✉️ Email' };
        platformBadges = '<div class="port-platforms">' +
          p.adPlatforms.map(function(pl) {
            return '<span class="port-platform-badge">' + (platformMap[pl] || pl) + '</span>';
          }).join('') + '</div>';
      }

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
        platformBadges +
        '<span class="port-arrow">' + (hasModal ? '→' : '') + '</span>' +
        '</div></div>';
    }).join('');
  }

  /* ── BLOG DETAIL MODAL ── */
  function buildBlogModal(D) {
    var hasFull = D.blog.some(function(b) { return b.contentEN || b.contentVI; });
    if (!hasFull) return;

    if (!document.getElementById('hl-blog-modal-style')) {
      var style = document.createElement('style');
      style.id = 'hl-blog-modal-style';
      style.textContent = [
        '.hl-bm-ov{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(10px);z-index:9000;display:flex;align-items:center;justify-content:center;padding:1.25rem;opacity:0;pointer-events:none;transition:opacity .25s}',
        '.hl-bm-ov.open{opacity:1;pointer-events:all}',
        '.hl-bm-box{background:var(--surface,#fff);border:1px solid var(--border,#e5e2dc);border-radius:20px;width:100%;max-width:1100px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.15),0 0 0 1px rgba(0,0,0,.04);transform:translateY(20px) scale(.98);transition:transform .3s cubic-bezier(.22,1,.36,1);overflow:hidden}',
        '.hl-bm-ov.open .hl-bm-box{transform:translateY(0) scale(1)}',
        '.hl-bm-head{padding:.9rem 1.5rem;border-bottom:1px solid var(--border,#e5e2dc);display:flex;align-items:center;gap:.6rem;flex-shrink:0;background:var(--surface,#fff)}',
        '.hl-lb{display:inline-flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:800;letter-spacing:.06em;border-radius:99px;padding:.2rem .65rem;cursor:pointer;font-family:inherit;border:1.5px solid transparent;transition:all .15s}',
        '.hl-lb.hl-lb-en{background:#1e3a5f;color:#93c5fd;border-color:#1e3a5f}',
        '.hl-lb.hl-lb-vi{background:#7c1d1d;color:#fca5a5;border-color:#7c1d1d}',
        '.hl-lb:not(.active){opacity:.4}',
        '.hl-bm-close{margin-left:auto;background:none;border:none;font-size:1.1rem;cursor:pointer;color:var(--muted,#888);padding:.2rem .5rem;border-radius:6px}',
        '.hl-bm-close:hover{background:var(--bg,#f5f4f0)}',
        '.hl-bm-body{overflow-y:auto;padding:2rem 2.5rem;flex:1}',
        '.hl-bm-pane{display:none}.hl-bm-pane.active{display:block}',
        '.hl-bm-meta{display:flex;align-items:center;gap:.5rem;margin-bottom:.75rem}',
        '.hl-bm-cat{font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:var(--green-tint,#dcfce7);color:var(--green,#16a34a);padding:.2rem .6rem;border-radius:99px}',
        '.hl-bm-rt{font-size:.75rem;color:var(--muted,#888)}',
        '.hl-bm-title{font-size:1.7rem;font-weight:800;line-height:1.2;margin-bottom:1rem;font-family:"DM Serif Display",serif}',
        '.hl-bm-excerpt{font-size:1rem;color:var(--muted,#888);margin-bottom:1.5rem;font-style:italic;line-height:1.7}',
        '.hl-bm-divider{height:1px;background:var(--border,#e5e2dc);margin-bottom:1.5rem}',
        '.hl-bm-content h2{font-size:1.25rem;font-weight:700;margin:1.75rem 0 .75rem}',
        '.hl-bm-content h3{font-size:1.05rem;font-weight:700;margin:1.5rem 0 .6rem}',
        '.hl-bm-content p{line-height:1.8;margin-bottom:1rem}',
        '.hl-bm-content blockquote{border-left:3px solid var(--green,#16a34a);padding:.5rem 1rem;margin:1rem 0;background:var(--bg,#f5f4f0);border-radius:0 8px 8px 0;font-style:italic}',
        '.hl-bm-content ul,.hl-bm-content ol{padding-left:1.5rem;margin-bottom:1rem}',
        '.hl-bm-content li{margin-bottom:.35rem;line-height:1.6}',
        '.hl-bm-content hr{border:none;border-top:1px solid var(--border,#e5e2dc);margin:2rem 0}',
        '.hl-bm-content code{background:var(--bg,#f5f4f0);padding:.1rem .35rem;border-radius:4px;font-size:.85em}',
        '.hl-bm-deco-wrap{position:relative}',
        '.hl-deco{position:absolute;opacity:.06;pointer-events:none;z-index:0}',
        '.hl-deco-l2{top:30px;left:-20px;width:120px;transform:rotate(-15deg)}',
        '.hl-deco-r2{top:60px;right:-20px;width:100px;transform:rotate(20deg)}',
        '.hl-bm-empty{color:var(--muted,#888);font-style:italic;padding:2rem;text-align:center}'
      ].join('');
      document.head.appendChild(style);
    }

    if (!document.getElementById('hl-blog-overlay')) {
      var div = document.createElement('div');
      div.className = 'hl-bm-ov';
      div.id = 'hl-blog-overlay';
      div.onclick = function(e) { if (e.target === div) hlCloseBlog(); };
      div.innerHTML =
        '<div class="hl-bm-box hl-bm-deco-wrap">' +
        '<img src="assets/images/blog_decoration_4.png" class="hl-deco hl-deco-l2" aria-hidden="true">' +
        '<img src="assets/images/blog_decoration_4.png" class="hl-deco hl-deco-r2" aria-hidden="true">' +
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

  /* ══════════════════════════════════════════════
     PORTFOLIO CASE STUDY MODAL
  ══════════════════════════════════════════════ */
  function buildPortModal(D) {
    window._hlPortData = D.portfolio;

    if (!document.getElementById('hl-port-modal-style')) {
      var s = document.createElement('style');
      s.id = 'hl-port-modal-style';
      s.textContent = [
        '.hl-lb{display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;letter-spacing:.06em;border-radius:4px;padding:3px 8px;cursor:pointer;font-family:inherit;border:none;transition:all .15s}',
        '.hl-lb.hl-lb-en{background:#1e3a5f;color:#93c5fd}',
        '.hl-lb.hl-lb-vi{background:#7c1d1d;color:#fca5a5}',
        '.hl-lb.active{outline:2px solid currentColor;outline-offset:2px;opacity:1}',
        '.hl-lb:not(.active){opacity:.45}',
        '.hl-port-lb-row{display:flex;gap:.35rem;margin-bottom:.6rem}',
        '.hl-cs-pane{display:none}.hl-cs-pane.active{display:block}',
        '.cs-pane-type{font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--green,#16a34a);margin-bottom:.4rem}',
        '.cs-pane-title{font-size:1.35rem;font-weight:800;line-height:1.25;margin-bottom:2rem}',
        /* Results */
        '.cs-results-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.75rem;margin-top:.75rem}',
        '.cs-result-card{background:var(--bg,#f5f4f0);border:1px solid var(--border,#e5e2dc);border-radius:12px;padding:.85rem 1rem;text-align:center}',
        '.cs-result-metric{font-size:1.5rem;font-weight:800;color:var(--green,#16a34a);line-height:1;margin-bottom:.3rem}',
        '.cs-result-label{font-size:.72rem;color:var(--muted,#888);line-height:1.3}',
        /* Platform tabs */
        '.cs-platform-wrap{margin-top:1rem}',
        '.cs-platform-tabs{display:flex;gap:.5rem;margin-bottom:1.25rem;flex-wrap:wrap}',
        '.cs-platform-tab{display:inline-flex;align-items:center;gap:.4rem;font-size:.72rem;font-weight:700;letter-spacing:.05em;padding:.35rem .85rem;border-radius:99px;cursor:pointer;border:1.5px solid var(--border,#e5e2dc);background:var(--surface,#fff);color:var(--muted,#888);transition:all .15s;white-space:nowrap}',
        '.cs-platform-tab.active{border-color:var(--green,#16a34a);color:var(--green,#16a34a);background:var(--green-tint,#dcfce7)}',
        '.cs-platform-pane{display:none}.cs-platform-pane.active{display:block}',
        /* Version sub-tabs */
        '.cs-ver-tabs{display:flex;gap:.4rem;margin-bottom:1rem;flex-wrap:wrap}',
        '.cs-ver-tab{font-size:.68rem;font-weight:700;padding:.25rem .7rem;border-radius:99px;cursor:pointer;border:1.5px solid var(--border,#e5e2dc);background:transparent;color:var(--muted,#888);transition:all .12s}',
        '.cs-ver-tab.active{border-color:#1877f2;color:#1877f2;background:#e7f0fd}',
        '.hl-ver-pane{display:none}.hl-ver-pane.show{display:block}',
        /* FB mock */
        '.fb-mock{max-width:500px;border:1px solid #ddd;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.1)}',
        '.fb-mock-head{display:flex;align-items:center;gap:.6rem;padding:.75rem 1rem .5rem}',
        '.fb-mock-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#1877f2,#42a5f5);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:.9rem;flex-shrink:0}',
        '.fb-mock-page{font-size:.8rem;font-weight:700;color:#050505;line-height:1.2}',
        '.fb-mock-meta{font-size:.68rem;color:#65676b;display:flex;align-items:center;gap:.3rem}',
        '.fb-mock-sponsored{background:#e7f0fd;color:#1877f2;font-size:.6rem;font-weight:700;padding:.1rem .4rem;border-radius:3px;letter-spacing:.04em}',
        '.fb-mock-body{padding:.25rem 1rem .5rem;font-size:.82rem;color:#050505;line-height:1.6;white-space:pre-wrap}',
        '.fb-mock-img{width:100%;background:linear-gradient(135deg,#e9ebee,#f0f2f5);min-height:200px;display:flex;align-items:center;justify-content:center;color:#8a8d91;font-size:.8rem;border-top:1px solid #ddd}',
        '.fb-mock-link-box{background:#f0f2f5;padding:.6rem 1rem;border-top:1px solid #ddd}',
        '.fb-mock-link-url{font-size:.65rem;color:#65676b;text-transform:uppercase;letter-spacing:.04em}',
        '.fb-mock-link-title{font-size:.82rem;font-weight:700;color:#050505;margin:.15rem 0 .1rem}',
        '.fb-mock-link-desc{font-size:.72rem;color:#65676b}',
        '.fb-mock-cta-btn{display:block;margin:.6rem 1rem .75rem;background:#1877f2;color:#fff;text-align:center;padding:.5rem 1rem;border-radius:6px;font-size:.82rem;font-weight:700;cursor:pointer}',
        '.fb-mock-actions{display:flex;border-top:1px solid #e4e6ea;padding:.25rem .5rem}',
        '.fb-mock-act{flex:1;display:flex;align-items:center;justify-content:center;gap:.4rem;padding:.5rem;border-radius:6px;cursor:pointer;font-size:.75rem;font-weight:600;color:#65676b;border:none;background:none}',
        /* IG mock */
        '.ig-mock{max-width:400px;border:1px solid #dbdbdb;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.08)}',
        '.ig-mock-head{display:flex;align-items:center;gap:.6rem;padding:.6rem .75rem}',
        '.ig-mock-avatar{width:32px;height:32px;border-radius:50%;padding:2px;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);flex-shrink:0}',
        '.ig-mock-avatar-inner{width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#e1306c,#833ab4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:.7rem;border:2px solid #fff}',
        '.ig-mock-username{font-size:.8rem;font-weight:700;color:#262626;line-height:1.2}',
        '.ig-mock-sponsored{font-size:.68rem;color:#8e8e8e}',
        '.ig-mock-more{margin-left:auto;color:#262626;font-size:1.2rem;padding:0 .25rem;cursor:pointer}',
        '.ig-mock-img{width:100%;background:linear-gradient(135deg,#ffecd2,#fcb69f);min-height:360px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:.85rem;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,.3)}',
        '.ig-mock-cta-strip{background:#fff;padding:.5rem .75rem;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #efefef}',
        '.ig-mock-cta-link{font-size:.75rem;font-weight:700;color:#262626}',
        '.ig-mock-cta-btn{background:#0095f6;color:#fff;border:none;padding:.35rem .85rem;border-radius:6px;font-size:.75rem;font-weight:700;cursor:pointer}',
        '.ig-mock-actions{display:flex;align-items:center;gap:.75rem;padding:.5rem .75rem .25rem;font-size:1.2rem}',
        '.ig-mock-caption{padding:.1rem .75rem .75rem;font-size:.82rem;color:#262626;line-height:1.55;white-space:pre-wrap}',
        /* Email/Gmail mock */
        '.email-mock-wrap{max-width:620px}',
        '.email-seq-tabs{display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:1rem}',
        '.email-seq-tab{font-size:.68rem;font-weight:700;padding:.25rem .75rem;border-radius:99px;cursor:pointer;border:1.5px solid var(--border,#e5e2dc);background:transparent;color:var(--muted,#888);transition:all .12s}',
        '.email-seq-tab.active{border-color:#ea4335;color:#ea4335;background:#fce8e6}',
        '.email-pane{display:none}.email-pane.active{display:block}',
        '.gmail-chrome{background:#f1f3f4;border-radius:12px 12px 0 0;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.12);border:1px solid #dadce0}',
        '.gmail-topbar{background:#fff;display:flex;align-items:center;gap:.5rem;padding:.45rem .75rem;border-bottom:1px solid #e0e0e0}',
        '.gmail-dot{width:10px;height:10px;border-radius:50%}',
        '.gmail-dot.r{background:#ff5f57}.gmail-dot.y{background:#ffbd2e}.gmail-dot.g{background:#28c840}',
        '.gmail-url{flex:1;background:#f1f3f4;border-radius:99px;font-size:.63rem;color:#5f6368;padding:.18rem .75rem;margin:0 .4rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '.gmail-body{background:#fff;border-radius:0 0 12px 12px;overflow:hidden}',
        '.gmail-header{padding:1rem 1.5rem .6rem;border-bottom:1px solid #e0e0e0}',
        '.gmail-from{font-size:.75rem;color:#5f6368;margin-bottom:.25rem}',
        '.gmail-from strong{color:#202124;font-weight:600}',
        '.gmail-subject{font-size:1.1rem;font-weight:600;color:#202124;margin-bottom:.2rem;line-height:1.3}',
        '.gmail-meta{font-size:.7rem;color:#5f6368}',
        '.gmail-content{padding:1.5rem;font-size:.85rem;color:#202124;line-height:1.8;min-height:100px}',
        '.gmail-content p{margin-bottom:.85rem;white-space:pre-wrap}',
        '.gmail-cta-btn{display:inline-block;background:#1a73e8;color:#fff;padding:.5rem 1.4rem;border-radius:4px;font-size:.82rem;font-weight:600;text-decoration:none;margin:.25rem 0 1rem;cursor:pointer}',
        '.gmail-footer-strip{background:#f8f9fa;border-top:1px solid #e0e0e0;padding:.65rem 1.5rem;font-size:.68rem;color:#80868b;line-height:1.5}',
        /* port-card badges */
        '.port-platforms{display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.4rem}',
        '.port-platform-badge{font-size:.6rem;font-weight:700;background:rgba(255,255,255,.22);color:#fff;padding:.15rem .5rem;border-radius:99px;letter-spacing:.03em}',
      ].join('');
      document.head.appendChild(s);
    }

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

    /* ── MOCKUP BUILDERS ── */
    function buildFbMock(v) {
      var init = v.pageName ? v.pageName.charAt(0).toUpperCase() : 'HL';
      var body = esc(v.primaryText || '').replace(/\n/g, '<br>');
      var cta  = esc(v.ctaText || 'Learn More');
      return '<div class="fb-mock">' +
        '<div class="fb-mock-head">' +
        '<div class="fb-mock-avatar">' + init + '</div>' +
        '<div><div class="fb-mock-page">' + esc(v.pageName || 'Hải Luân Copy') + '</div>' +
        '<div class="fb-mock-meta"><span class="fb-mock-sponsored">Sponsored</span> · Facebook</div></div>' +
        '</div>' +
        (body ? '<div class="fb-mock-body">' + body + '</div>' : '') +
        '<div class="fb-mock-img">' + esc(v.imageLabel || '🖼 Ad creative / Banner') + '</div>' +
        ((v.linkTitle || v.linkUrl) ? '<div class="fb-mock-link-box">' +
          (v.linkUrl ? '<div class="fb-mock-link-url">' + esc(v.linkUrl) + '</div>' : '') +
          (v.linkTitle ? '<div class="fb-mock-link-title">' + esc(v.linkTitle) + '</div>' : '') +
          (v.linkDesc ? '<div class="fb-mock-link-desc">' + esc(v.linkDesc) + '</div>' : '') +
          '</div>' : '') +
        '<div class="fb-mock-cta-btn">' + cta + '</div>' +
        '<div class="fb-mock-actions"><button class="fb-mock-act">👍 Like</button><button class="fb-mock-act">💬 Comment</button><button class="fb-mock-act">↗️ Share</button></div>' +
        '</div>';
    }

    function buildIgMock(v) {
      var init    = v.username ? v.username.charAt(0).toUpperCase() : 'H';
      var caption = esc(v.caption || v.primaryText || '').replace(/\n/g,'<br>');
      var cta     = esc(v.ctaText || 'Learn More');
      return '<div class="ig-mock">' +
        '<div class="ig-mock-head">' +
        '<div class="ig-mock-avatar"><div class="ig-mock-avatar-inner">' + init + '</div></div>' +
        '<div><div class="ig-mock-username">' + esc(v.username||'hailuan.copy') + '</div>' +
        '<div class="ig-mock-sponsored">Sponsored</div></div>' +
        '<div class="ig-mock-more">···</div>' +
        '</div>' +
        '<div class="ig-mock-img">' + esc(v.imageLabel || '🖼 Visual / Creative') + '</div>' +
        '<div class="ig-mock-cta-strip">' +
        '<span class="ig-mock-cta-link">' + esc(v.linkUrl||'hailuan.copy') + '</span>' +
        '<button class="ig-mock-cta-btn">' + cta + '</button>' +
        '</div>' +
        '<div class="ig-mock-actions">❤️ 💬 ✈️ <span style="margin-left:auto">🔖</span></div>' +
        (caption ? '<div class="ig-mock-caption"><strong>' + esc(v.username||'hailuan.copy') + '</strong>  ' + caption + '</div>' : '') +
        '</div>';
    }

    function buildEmailMock(email) {
      var body   = esc(email.body || '').replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');
      var today  = new Date().toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
      return '<div class="gmail-chrome">' +
        '<div class="gmail-topbar">' +
        '<div class="gmail-dot r"></div><div class="gmail-dot y"></div><div class="gmail-dot g"></div>' +
        '<div class="gmail-url">mail.google.com/mail</div>' +
        '</div>' +
        '<div class="gmail-body">' +
        '<div class="gmail-header">' +
        '<div class="gmail-from"><strong>' + esc(email.senderName||'Hải Luân') + '</strong> &lt;' + esc(email.senderEmail||'hailuan@email.com') + '&gt;</div>' +
        '<div class="gmail-subject">' + esc(email.subject||'(No subject)') + '</div>' +
        '<div class="gmail-meta">Đến: Bạn · ' + today + '</div>' +
        '</div>' +
        '<div class="gmail-content"><p>' + (body||'') + '</p>' +
        (email.ctaText ? '<a class="gmail-cta-btn">' + esc(email.ctaText) + '</a>' : '') +
        '</div>' +
        '<div class="gmail-footer-strip">' + esc(email.footer||'Bạn nhận được email này vì đã đăng ký nhận tin từ chúng tôi.') + '</div>' +
        '</div></div>';
    }

    /* ── BUILD ONE PANE ── */
    function buildPane(lang, p) {
      var isVI = lang === 'vi';
      var typeLabel  = isVI ? p.type.vi  : p.type.en;
      var titleLabel = isVI ? p.title.vi : p.title.en;
      var brief = isVI ? (p.brief && p.brief.vi||'') : (p.brief && p.brief.en||'');
      var copy  = isVI ? (p.copyVI||'') : (p.copyEN||'');
      var bkRaw = isVI ? (p.breakdownVI||p.breakdown||'') : (p.breakdownEN||(p.breakdown&&!p.breakdownVI?p.breakdown:'')||'');

      var html = '<div class="cs-pane-type">Case Study — ' + esc(typeLabel) + '</div>' +
                 '<div class="cs-pane-title">' + esc(titleLabel) + '</div>';

      if (brief) {
        html += '<div class="modal-sec"><h4>' + (isVI?'Bối cảnh':'Brief') + '</h4>' +
                '<p class="brief-text">' + esc(brief) + '</p></div>';
      }

      if (copy) {
        html += '<div class="modal-sec"><h4>' + (isVI?'Bài viết':'The copy') + '</h4>' +
                '<div class="copy-sample"><div class="copy-body">' + renderMd(copy) + '</div></div></div>';
      }

      /* Platform mockups */
      var platforms = p.adPlatforms || [];
      if (platforms.length) {
        var platformTabs = '';
        var platformPanes = '';
        var firstPlatform = true;

        platforms.forEach(function(pl) {
          var isFirst = firstPlatform;
          if (firstPlatform) firstPlatform = false;
          var activeClass = isFirst ? ' active' : '';

          if (pl === 'fb') {
            platformTabs += '<button class="cs-platform-tab' + activeClass + '" onclick="hlPlatformTab(this,\'fb\')">📘 Facebook Ads</button>';
            var vers = (isVI ? p.adVersionsVI : p.adVersionsEN) || p.adVersions || [];
            var fbV  = vers.filter(function(v){ return v.platform === 'fb'; });
            var inner = '';
            if (fbV.length > 1) {
              var vtabs = fbV.map(function(v,i){
                return '<button class="cs-ver-tab' + (i===0?' active':'') + '" onclick="hlVerTab(this,' + i + ',this.closest(\'.cs-platform-pane\'))">' + esc(v.label||('Ver. '+(i+1))) + '</button>';
              }).join('');
              var vpanes = fbV.map(function(v,i){
                return '<div class="hl-ver-pane" style="display:' + (i===0?'block':'none') + '">' + buildFbMock(v) + '</div>';
              }).join('');
              inner = '<div class="cs-ver-tabs">' + vtabs + '</div>' + vpanes;
            } else if (fbV.length === 1) {
              inner = buildFbMock(fbV[0]);
            } else {
              inner = '<p style="color:var(--muted);font-style:italic;padding:.5rem 0">Chưa có nội dung FB Ads.</p>';
            }
            platformPanes += '<div class="cs-platform-pane' + activeClass + '" data-pane="fb">' + inner + '</div>';
          }

          if (pl === 'insta') {
            platformTabs += '<button class="cs-platform-tab' + activeClass + '" onclick="hlPlatformTab(this,\'insta\')">📸 Instagram Ads</button>';
            var vers2 = (isVI ? p.adVersionsVI : p.adVersionsEN) || p.adVersions || [];
            var igV   = vers2.filter(function(v){ return v.platform === 'insta'; });
            var inner2 = '';
            if (igV.length > 1) {
              var vtabs2 = igV.map(function(v,i){
                return '<button class="cs-ver-tab' + (i===0?' active':'') + '" style="border-color:#c13584;color:#c13584" onclick="hlVerTab(this,' + i + ',this.closest(\'.cs-platform-pane\'))">' + esc(v.label||('Ver. '+(i+1))) + '</button>';
              }).join('');
              var vpanes2 = igV.map(function(v,i){
                return '<div class="hl-ver-pane" style="display:' + (i===0?'block':'none') + '">' + buildIgMock(v) + '</div>';
              }).join('');
              inner2 = '<div class="cs-ver-tabs">' + vtabs2 + '</div>' + vpanes2;
            } else if (igV.length === 1) {
              inner2 = buildIgMock(igV[0]);
            } else {
              inner2 = '<p style="color:var(--muted);font-style:italic;padding:.5rem 0">Chưa có nội dung Instagram Ads.</p>';
            }
            platformPanes += '<div class="cs-platform-pane' + activeClass + '" data-pane="insta">' + inner2 + '</div>';
          }

          if (pl === 'email') {
            platformTabs += '<button class="cs-platform-tab' + activeClass + '" onclick="hlPlatformTab(this,\'email\')">✉️ Email</button>';
            var seq = (isVI ? p.emailSequenceVI : p.emailSequenceEN) || p.emailSequence || [];
            var inner3 = '';
            if (seq.length > 1) {
              var etabs = seq.map(function(e,i){
                return '<button class="email-seq-tab' + (i===0?' active':'') + '" onclick="hlEmailTab(this,' + i + ',this.closest(\'.cs-platform-pane\'))">' + esc(e.label||('Email '+(i+1))) + '</button>';
              }).join('');
              var epanes = seq.map(function(e,i){
                return '<div class="email-pane' + (i===0?' active':'') + '">' + buildEmailMock(e) + '</div>';
              }).join('');
              inner3 = '<div class="email-seq-tabs">' + etabs + '</div>' + epanes;
            } else if (seq.length === 1) {
              inner3 = buildEmailMock(seq[0]);
            } else {
              inner3 = '<p style="color:var(--muted);font-style:italic;padding:.5rem 0">Chưa có email nào.</p>';
            }
            platformPanes += '<div class="cs-platform-pane' + activeClass + '" data-pane="email">' +
                             '<div class="email-mock-wrap">' + inner3 + '</div></div>';
          }
        });

        html += '<div class="modal-sec"><h4>' + (isVI?'Nền tảng quảng bá':'Platform preview') + '</h4>' +
                '<div class="cs-platform-wrap">' +
                '<div class="cs-platform-tabs">' + platformTabs + '</div>' +
                platformPanes + '</div></div>';
      }

      /* Breakdown */
      if (bkRaw) {
        var bkHTML = '<ul class="bk-list">' + bkRaw.split('\n').filter(Boolean).map(function(line){
          var parts = line.split('||');
          return '<li><span class="bk-tag">' + esc(parts[0]||'') + '</span><span>' + esc(parts.slice(1).join('||')) + '</span></li>';
        }).join('') + '</ul>';
        html += '<div class="modal-sec"><h4>Copywriting breakdown</h4>' + bkHTML + '</div>';
      }

      /* Results */
      var results = (isVI ? p.resultsVI : p.resultsEN) || p.results || [];
      if (results.length) {
        var resCards = results.map(function(r){
          return '<div class="cs-result-card">' +
            '<div class="cs-result-metric">' + esc(r.metric) + '</div>' +
            '<div class="cs-result-label">' + esc(r.label) + '</div>' +
            '</div>';
        }).join('');
        html += '<div class="modal-sec"><h4>' + (isVI?'Kết quả đạt được':'Results') + '</h4>' +
                '<div class="cs-results-grid">' + resCards + '</div></div>';
      }

      return html;
    }

    /* ── Global tab handlers ── */
    window.hlPlatformTab = function(btn, pane) {
      var wrap = btn.closest('.cs-platform-wrap');
      if (!wrap) return;
      wrap.querySelectorAll('.cs-platform-tab').forEach(function(b){ b.classList.remove('active'); });
      wrap.querySelectorAll('.cs-platform-pane').forEach(function(p){ p.classList.remove('active'); });
      btn.classList.add('active');
      var target = wrap.querySelector('[data-pane="' + pane + '"]');
      if (target) target.classList.add('active');
    };

    window.hlVerTab = function(btn, idx, container) {
      container.querySelectorAll('.cs-ver-tab').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      container.querySelectorAll('.hl-ver-pane').forEach(function(p, i){ p.style.display = i === idx ? 'block' : 'none'; });
    };

    window.hlEmailTab = function(btn, idx, container) {
      container.querySelectorAll('.email-seq-tab').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      container.querySelectorAll('.email-pane').forEach(function(p, i){ p.classList.toggle('active', i === idx); });
    };

    /* ── OPEN MODAL ── */
    window.hlOpenModal = function(id) {
      var p = (window._hlPortData||[]).find(function(x){return x.id===id;});
      if (!p) return;
      var m = document.getElementById('modal');
      if (!m) return;
      var body = m.querySelector('.modal-body');
      if (!body) return;

      body.innerHTML =
        '<div class="hl-cs-pane active" id="hl-cs-en">' + buildPane('en', p) + '</div>' +
        '<div class="hl-cs-pane" id="hl-cs-vi">'        + buildPane('vi', p) + '</div>';

      if (typeof openModal === 'function') openModal();
      else { m.classList.add('open'); document.body.style.overflow = 'hidden'; }

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
