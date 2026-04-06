(function () {

  localStorage.removeItem('hl_cms');
  var raw = localStorage.getItem('hl_cms');

  if (raw) {
    try { renderContent(JSON.parse(raw)); } catch(e) { console.warn('[HL CMS] localStorage parse error', e); }
  } else {
    fetch('hl-portfolio-data.json')
      .then(function(r) {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(function(data) {
        localStorage.setItem('hl_cms', JSON.stringify(data)); // cache
        renderContent(data);
      })
      .catch(function() {
        console.log('[HL CMS] No data file found — using default HTML content.');
      });
  }

  /* ─────────────────────────────────────
     HELPERS
  ───────────────────────────────────── */
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function nl2p(s) {
    if (!s) return '';
    return s.split(/\n\n+/).map(function(p) {
      return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  // Bold markdown **text** → <strong>text</strong>
  function md(s) {
    return esc(s).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  function nl2pmd(s) {
    if (!s) return '';
    return s.split(/\n\n+/).map(function(p) {
      return '<p>' + md(p).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  /* ─────────────────────────────────────
     MAIN RENDER
  ───────────────────────────────────── */
  function renderContent(D) {
    injectBlog(D);
    injectPortfolio(D);
    buildBlogModal(D);
    buildPortModal(D);

    // Re-apply current language
    var lang = document.body.className || 'en';
    if (typeof setLang === 'function') setLang(lang);

    // Scroll reveal for newly injected elements
    observeReveal();
  }

  /* ─────────────────────────────────────
     BLOG INJECTION
  ───────────────────────────────────── */
  function injectBlog(D) {
    var grid = document.querySelector('.blog-grid');
    if (!grid || !D.blog || !D.blog.length) return;

    var LIMIT = 4; // 2 columns × 2 rows

    var cards = D.blog.map(function(b, i) {
      var hasFull = !!(b.contentEN || b.contentVI);
      var link = b.link && b.link !== '' ? b.link : '#';
      var clickAttr = (hasFull && (!b.link || b.link === '' || b.link === '#'))
        ? 'onclick="hlOpenBlog(\'' + b.id + '\'); return false;"'
        : '';
      var extra = i >= LIMIT ? ' hl-extra' : '';
      return (
        '<div class="blog-card reveal' + extra + '">' +
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
        '</a>' +
        '</div>'
      );
    }).join('');

    grid.innerHTML = cards;

    // Remove old button if exists
    var old = document.querySelector('.hl-more-wrap-blog');
    if (old) old.remove();

    if (D.blog.length > LIMIT) {
      var wrap = document.createElement('div');
      wrap.className = 'hl-more-wrap-blog';
      wrap.innerHTML =
        '<button class="hl-more-btn" id="hl-blog-btn" onclick="hlToggleBlog()">' +
        '<span data-en>See all posts ↓</span>' +
        '<span data-vi>Xem tất cả bài viết ↓</span>' +
        '</button>';
      grid.parentNode.insertBefore(wrap, grid.nextSibling);
    }

    window.hlToggleBlog = function() {
      var btn = document.getElementById('hl-blog-btn');
      var expanded = btn.classList.contains('expanded');
      document.querySelectorAll('.blog-grid .hl-extra').forEach(function(el) {
        el.style.display = expanded ? 'none' : 'block';
      });
      btn.classList.toggle('expanded', !expanded);
      if (expanded) {
        btn.querySelector('[data-en]').textContent = 'See all posts ↓';
        btn.querySelector('[data-vi]').textContent = 'Xem tất cả bài viết ↓';
      } else {
        btn.querySelector('[data-en]').textContent = 'Show less ↑';
        btn.querySelector('[data-vi]').textContent = 'Thu gọn ↑';
      }
    };

    // Hide extra cards initially
    document.querySelectorAll('.blog-grid .hl-extra').forEach(function(el) {
      el.style.display = 'none';
    });
  }

  /* ─────────────────────────────────────
     PORTFOLIO INJECTION
  ───────────────────────────────────── */
  function injectPortfolio(D) {
    var grid = document.querySelector('.port-grid');
    if (!grid || !D.portfolio || !D.portfolio.length) return;

    window._hlPortData = D.portfolio;

    var LIMIT = 6; // 3 columns × 2 rows

    var cards = D.portfolio.map(function(p, i) {
      var hasModal = !!(
        (p.brief && (p.brief.en || p.brief.vi)) ||
        p.copyVI || p.copyEN
      );
      var colorClass = 'port-top-' + (p.color || ((i % 6) + 1));
      var extra = i >= LIMIT ? ' hl-extra' : '';
      return (
        '<div class="port-card reveal' + extra + '"' +
        (hasModal ? ' onclick="hlOpenModal(\'' + p.id + '\')"' : '') +
        '>' +
        '<div class="port-top ' + colorClass + '">' +
        '<span class="port-type" data-en>' + esc(p.type.en) + '</span>' +
        '<span class="port-type" data-vi>' + esc(p.type.vi) + '</span>' +
        '<div class="port-title" data-en>' + esc(p.title.en) + '</div>' +
        '<div class="port-title" data-vi>' + esc(p.title.vi) + '</div>' +
        '</div>' +
        '<div class="port-bottom">' +
        '<span class="port-meta">' + esc(p.meta) + '</span>' +
        '<span class="port-arrow">' + (hasModal ? '→' : '') + '</span>' +
        '</div>' +
        '</div>'
      );
    }).join('');

    grid.innerHTML = cards;

    // Remove old button if exists
    var old = document.querySelector('.hl-more-wrap-port');
    if (old) old.remove();

    if (D.portfolio.length > LIMIT) {
      var wrap = document.createElement('div');
      wrap.className = 'hl-more-wrap-port';
      wrap.innerHTML =
        '<button class="hl-more-btn" id="hl-port-btn" onclick="hlTogglePort()">' +
        '<span data-en>See all works ↓</span>' +
        '<span data-vi>Xem tất cả tác phẩm ↓</span>' +
        '</button>';
      grid.parentNode.insertBefore(wrap, grid.nextSibling);
    }

    window.hlTogglePort = function() {
      var btn = document.getElementById('hl-port-btn');
      var expanded = btn.classList.contains('expanded');
      document.querySelectorAll('.port-grid .hl-extra').forEach(function(el) {
        el.style.display = expanded ? 'none' : 'block';
      });
      btn.classList.toggle('expanded', !expanded);
      if (expanded) {
        btn.querySelector('[data-en]').textContent = 'See all works ↓';
        btn.querySelector('[data-vi]').textContent = 'Xem tất cả tác phẩm ↓';
      } else {
        btn.querySelector('[data-en]').textContent = 'Show less ↑';
        btn.querySelector('[data-vi]').textContent = 'Thu gọn ↑';
      }
    };

    // Hide extra cards initially
    document.querySelectorAll('.port-grid .hl-extra').forEach(function(el) {
      el.style.display = 'none';
    });
  }

  /* ─────────────────────────────────────
     BLOG DETAIL MODAL
     Creates a floating modal for reading
     full blog posts inline on the site.
  ───────────────────────────────────── */
  function buildBlogModal(D) {
    // Only build if there are posts with full content
    var hasFull = D.blog.some(function(b) { return b.contentEN || b.contentVI; });
    if (!hasFull) return;

    // Inject CSS for blog modal (only once)
    if (!document.getElementById('hl-blog-modal-style')) {
      var style = document.createElement('style');
      style.id = 'hl-blog-modal-style';
      style.textContent = [
        '.hl-blog-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .2s}',
        '.hl-blog-overlay.open{opacity:1;pointer-events:all}',
        '.hl-blog-modal{background:#fff;border-radius:14px;width:100%;max-width:660px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);transform:scale(.96) translateY(14px);transition:transform .2s;overflow:hidden}',
        '.hl-blog-overlay.open .hl-blog-modal{transform:scale(1) translateY(0)}',
        '.hl-bm-head{padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:12px;flex-shrink:0}',
        '.hl-bm-lang{display:flex;gap:6px;flex:1}',
        '.hl-bm-lbtn{padding:3px 11px;border-radius:20px;border:1.5px solid #e2e8f0;font-size:12px;font-weight:700;cursor:pointer;background:#fff;transition:all .15s;font-family:inherit}',
        '.hl-bm-lbtn.active{background:#16a34a;color:#fff;border-color:#16a34a}',
        '.hl-bm-close{width:30px;height:30px;border-radius:7px;border:none;background:transparent;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:#64748b;transition:background .15s}',
        '.hl-bm-close:hover{background:#f1f5f9}',
        '.hl-bm-body{padding:24px 28px;overflow-y:auto;flex:1}',
        '.hl-bm-meta{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}',
        '.hl-bm-cat{background:#dcfce7;color:#166534;padding:3px 11px;border-radius:20px;font-size:11px;font-weight:700}',
        '.hl-bm-rt{font-size:12px;color:#64748b}',
        '.hl-bm-title{font-size:22px;font-weight:800;line-height:1.3;margin-bottom:14px;color:#1e293b}',
        '.hl-bm-excerpt{font-size:14px;color:#64748b;border-left:3px solid #16a34a;padding-left:14px;margin-bottom:20px;font-style:italic;line-height:1.65}',
        '.hl-bm-content p{font-size:14px;line-height:1.85;color:#334155;margin-bottom:14px}',
        '.hl-bm-empty{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:24px;text-align:center;color:#64748b;font-size:13px}',
        '.hl-bm-pane{display:none}.hl-bm-pane.active{display:block}'
      ].join('');
      document.head.appendChild(style);
    }

    // Inject modal HTML into page
    if (!document.getElementById('hl-blog-overlay')) {
      var div = document.createElement('div');
      div.id = 'hl-blog-overlay';
      div.className = 'hl-blog-overlay';
      div.innerHTML = (
        '<div class="hl-blog-modal">' +
        '<div class="hl-bm-head">' +
        '<div class="hl-bm-lang">' +
        '<button class="hl-bm-lbtn active" id="hl-bm-en-btn" onclick="hlBlogLang(\'en\')">🇬🇧 English</button>' +
        '<button class="hl-bm-lbtn" id="hl-bm-vi-btn" onclick="hlBlogLang(\'vi\')">🇻🇳 Tiếng Việt</button>' +
        '</div>' +
        '<button class="hl-bm-close" onclick="hlCloseBlog()">✕</button>' +
        '</div>' +
        '<div class="hl-bm-body">' +
        '<div class="hl-bm-pane active" id="hl-bm-en"></div>' +
        '<div class="hl-bm-pane" id="hl-bm-vi"></div>' +
        '</div>' +
        '</div>'
      );
      div.addEventListener('click', function(e) { if (e.target === div) hlCloseBlog(); });
      document.body.appendChild(div);
    }

    // Store data for the modal handler
    window._hlBlogData = D.blog;

    window.hlOpenBlog = function(id) {
      var b = (window._hlBlogData || []).find(function(x) { return x.id === id; });
      if (!b) return;

      function renderPane(lang) {
        var isVI = lang === 'vi';
        var title = isVI ? b.title.vi : b.title.en;
        var cat = isVI ? b.cat.vi : b.cat.en;
        var rt = isVI ? b.readTime.vi : b.readTime.en;
        var excerpt = isVI ? b.excerpt.vi : b.excerpt.en;
        var content = isVI ? (b.contentVI || '') : (b.contentEN || '');

        var contentHTML = content
          ? nl2pmd(content)
          : '<div class="hl-bm-empty">Bài viết này chưa có nội dung đầy đủ bằng ngôn ngữ này.</div>';

        return (
          '<div class="hl-bm-meta">' +
          '<span class="hl-bm-cat">' + esc(cat) + '</span>' +
          '<span class="hl-bm-rt">· ' + esc(rt) + '</span>' +
          '</div>' +
          '<div class="hl-bm-title">' + esc(title) + '</div>' +
          (excerpt ? '<div class="hl-bm-excerpt">' + esc(excerpt) + '</div>' : '') +
          '<div class="hl-bm-content">' + contentHTML + '</div>'
        );
      }

      document.getElementById('hl-bm-en').innerHTML = renderPane('en');
      document.getElementById('hl-bm-vi').innerHTML = renderPane('vi');

      // Set active lang to match current site lang
      var siteLang = document.body.className === 'vi' ? 'vi' : 'en';
      document.getElementById('hl-bm-en').classList.toggle('active', siteLang === 'en');
      document.getElementById('hl-bm-vi').classList.toggle('active', siteLang === 'vi');
      document.getElementById('hl-bm-en-btn').classList.toggle('active', siteLang === 'en');
      document.getElementById('hl-bm-vi-btn').classList.toggle('active', siteLang === 'vi');

      document.getElementById('hl-blog-overlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    };

    window.hlBlogLang = function(lang) {
      document.getElementById('hl-bm-en').classList.toggle('active', lang === 'en');
      document.getElementById('hl-bm-vi').classList.toggle('active', lang === 'vi');
      document.getElementById('hl-bm-en-btn').classList.toggle('active', lang === 'en');
      document.getElementById('hl-bm-vi-btn').classList.toggle('active', lang === 'vi');
    };

    window.hlCloseBlog = function() {
      document.getElementById('hl-blog-overlay').classList.remove('open');
      document.body.style.overflow = '';
    };
  }

  /* ─────────────────────────────────────
     PORTFOLIO CASE STUDY MODAL
     Populates the existing #modal element
     from index.html with dynamic content.
  ───────────────────────────────────── */
  function buildPortModal(D) {
    window._hlPortData = D.portfolio;

    window.hlOpenModal = function(id) {
      var p = (window._hlPortData || []).find(function(x) { return x.id === id; });
      if (!p) return;

      var m = document.getElementById('modal');
      if (!m) return;

      // ── Update header ──
      var head = m.querySelector('.modal-head');
      if (head) {
        var types = head.querySelectorAll('.modal-type');
        if (types[0]) types[0].textContent = 'Case Study — ' + p.type.en;
        if (types[1]) types[1].textContent = 'Case Study — ' + p.type.vi;
        var titles = head.querySelectorAll('.modal-title');
        if (titles[0]) titles[0].textContent = p.title.en;
        if (titles[1]) titles[1].textContent = p.title.vi;
      }

      // ── Build breakdown ──
      var bkHTML = '';
      if (p.breakdown) {
        var lines = p.breakdown.split('\n').filter(Boolean);
        bkHTML = '<div class="modal-sec"><h4>Copywriting breakdown</h4><ul class="bk-list">' +
          lines.map(function(line) {
            var parts = line.split('||');
            var tag = parts[0] || '';
            var body = parts.slice(1).join('||');
            return '<li><span class="bk-tag">' + esc(tag) + '</span><span>' + esc(body) + '</span></li>';
          }).join('') +
          '</ul></div>';
      }

      // ── Build body ──
var body = m.querySelector('.modal-body');
if (body) {
  var briefSection = (p.brief && (p.brief.en || p.brief.vi))
    ? `<div class="modal-sec">
        <h4 class="modal-sec-title" data-en>Brief</h4>
        <h4 class="modal-sec-title" data-vi>Bối cảnh</h4>
        <p class="brief-text" data-en-b>${esc(p.brief.en || '')}</p>
        <p class="brief-text" data-vi-b>${esc(p.brief.vi || '')}</p>
      </div>`
    : '';

  var copyVISection = p.copyVI
    ? `<div class="modal-sec">
        <h4 class="modal-sec-title" data-en>The copy (Vietnamese)</h4>
        <h4 class="modal-sec-title" data-vi>Bài viết</h4>
        <div class="copy-sample"><div class="copy-body">${nl2p(p.copyVI)}</div></div>
      </div>`
    : '';

  var copyENSection = p.copyEN
    ? `<div class="modal-sec">
        <h4 class="modal-sec-title" data-en>English version</h4>
        <h4 class="modal-sec-title" data-vi>Bản tiếng Anh</h4>
        <div class="copy-sample"><div class="copy-body">${nl2p(p.copyEN)}</div></div>
      </div>`
    : '';

  body.innerHTML = briefSection + copyVISection + copyENSection + bkHTML;
}

      // ── Open modal ──
      if (typeof openModal === 'function') {
        openModal();
      } else {
        m.classList.add('open');
        document.body.style.overflow = 'hidden';
      }

      // Re-apply language to newly injected content
      var lang = document.body.className || 'en';
      if (typeof setLang === 'function') setLang(lang);
    };
  }

  /* ─────────────────────────────────────
     SCROLL REVEAL for injected elements
  ───────────────────────────────────── */
  function observeReveal() {
    if (typeof IntersectionObserver === 'undefined') return;
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e, i) {
        if (e.isIntersecting) {
          setTimeout(function() { e.target.classList.add('on'); }, i * 75);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.blog-grid .reveal, .port-grid .reveal').forEach(function(el) {
      obs.observe(el);
    });
  }

})();