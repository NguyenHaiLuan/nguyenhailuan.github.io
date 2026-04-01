/* HL Portfolio Content Loader v1.0 */
(function () {
  var raw = localStorage.getItem('hl_cms');

  if (raw) {
    renderContent(JSON.parse(raw));
  } else {
    fetch('hl-portfolio-data.json')
      .then(response => {
        if (!response.ok) throw new Error("Không tìm thấy file JSON");
        return response.json();
      })
      .then(data => renderContent(data))
      .catch(err => console.log("Đang sử dụng nội dung mặc định trong HTML."));
  }

  function renderContent(D) {
    function esc(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
                           .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function nl2p(s) {
      return s ? s.split(/\n\n+/).map(p => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('') : '';
    }

    /* INJECT BLOG */
    var bg = document.querySelector('.blog-grid');
    if (bg && D.blog?.length) {
      bg.innerHTML = D.blog.map(b => `
        <div class="blog-card reveal">
          <div class="blog-meta">
            <span class="blog-cat" data-en>${esc(b.cat.en)}</span>
            <span class="blog-cat" data-vi>${esc(b.cat.vi)}</span>
            <span>·</span>
            <span data-en>${esc(b.readTime.en)}</span>
            <span data-vi>${esc(b.readTime.vi)}</span>
          </div>
          <div class="blog-title">
            <span data-en>${esc(b.title.en)}</span>
            <span data-vi>${esc(b.title.vi)}</span>
          </div>
          <p class="blog-excerpt" data-en-b>${esc(b.excerpt.en)}</p>
          <p class="blog-excerpt" data-vi-b>${esc(b.excerpt.vi)}</p>
          <a href="${esc(b.link || '#')}" class="blog-read">
            <span data-en>Read →</span><span data-vi>Đọc →</span>
          </a>
        </div>
      `).join('');
    }

    /* INJECT PORTFOLIO */
    var pg = document.querySelector('.port-grid');
    if (pg && D.portfolio?.length) {
      window._hlPortData = D.portfolio;
      pg.innerHTML = D.portfolio.map((p, i) => {
        const hasModal = !!(p.brief?.en || p.brief?.vi || p.copyVI || p.copyEN);
        return `
          <div class="port-card reveal" ${hasModal ? `onclick="hlOpenModal('${p.id}')"` : ''}>
            <div class="port-top port-top-${p.color || ((i % 6) + 1)}">
              <span class="port-type" data-en>${esc(p.type.en)}</span>
              <span class="port-type" data-vi>${esc(p.type.vi)}</span>
              <div class="port-title" data-en>${esc(p.title.en)}</div>
              <div class="port-title" data-vi>${esc(p.title.vi)}</div>
            </div>
            <div class="port-bottom">
              <span class="port-meta">${esc(p.meta)}</span>
              <span class="port-arrow">${hasModal ? '→' : ''}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    /* DYNAMIC MODAL */
    window.hlOpenModal = function(id) {
      const p = (window._hlPortData || []).find(x => x.id === id);
      if (!p) return;

      const m = document.getElementById('modal');
      if (!m) return;

      // ... (phần modal bạn giữ nguyên hoặc mình sẽ tối ưu sau nếu cần)

      if (typeof openModal === 'function') openModal();
      else m.classList.add('open');

      const lang = document.body.className || 'en';
      if (typeof setLang === 'function') setLang(lang);
    };

    /* RE-APPLY LANG */
    const lang = document.body.className || 'en';
    if (typeof setLang === 'function') setLang(lang);

    /* SCROLL REVEAL */
    if (typeof IntersectionObserver !== 'undefined') {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add('on'), i * 75);
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.1 });

      document.querySelectorAll('.blog-grid .reveal, .port-grid .reveal')
        .forEach(el => obs.observe(el));
    }
  }
})();