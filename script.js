/* ══ THEME ══ */
let isDark = false;
function toggleTheme() {
  isDark = !isDark;
  document.documentElement.classList.toggle('dark', isDark);
  document.getElementById('themeBtn').textContent = isDark ? '☀️' : '🌙';
  document.getElementById('themeBtn').title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
if (localStorage.getItem('theme') === 'dark') {
  isDark = true;
  document.documentElement.classList.add('dark');
  document.getElementById('themeBtn').textContent = '☀️';
}

/* ══ LANG ══ */
function setLang(lang) {
  document.body.className = lang;
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === lang.toUpperCase());
  });
  // Also sync modal lang buttons if modal is open
  const mlbEn = document.getElementById('mlb-en');
  const mlbVi = document.getElementById('mlb-vi');
  if (mlbEn && mlbVi) {
    mlbEn.classList.toggle('active', lang === 'en');
    mlbVi.classList.toggle('active', lang === 'vi');
    const modal = document.getElementById('modal');
    if (modal) {
      modal.classList.toggle('modal-lang-en', lang === 'en');
      modal.classList.toggle('modal-lang-vi', lang === 'vi');
    }
  }
  localStorage.setItem('lang', lang);
}

// Restore language preference
(function() {
  const saved = localStorage.getItem('lang');
  if (saved && saved !== 'en') setLang(saved);
})();

/* ══ MODAL LANG SWITCHER ══ */
function setModalLang(lang) {
  const modal = document.getElementById('modal');
  if (!modal) return;
  modal.classList.toggle('modal-lang-en', lang === 'en');
  modal.classList.toggle('modal-lang-vi', lang === 'vi');
  document.getElementById('mlb-en').classList.toggle('active', lang === 'en');
  document.getElementById('mlb-vi').classList.toggle('active', lang === 'vi');
}

/* ══ SCROLL REVEAL ══ */
(() => {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('on'), i * 75);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();

/* ══ SKILL BARS ══ */
(() => {
  const t = document.querySelector('.skills-col');
  if (!t) return;
  new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting)
        e.target.querySelectorAll('.bar-fill').forEach(b => setTimeout(() => b.classList.add('on'), 300));
    });
  }, { threshold: 0.3 }).observe(t);
})();

/* ══ ACTIVE NAV UNDERLINE on scroll ══ */
(() => {
  const sections = ['about', 'services', 'portfolio', 'blog', 'contact'];
  const navH = 80;

  function updateActiveNav() {
    let current = '';
    for (const id of sections) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (window.scrollY >= el.offsetTop - navH - 40) current = id;
    }
    document.querySelectorAll('.nav-links a[data-nav]').forEach(a => {
      a.classList.toggle('nav-active', a.getAttribute('data-nav') === current);
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();
})();

/* ══ LANG TOOLTIP (shows once on first visit) ══ */
(() => {
  const tooltip = document.getElementById('langTooltip');
  if (!tooltip) return;

  const shown = sessionStorage.getItem('langTooltipShown');
  if (!shown) {
    // Show after a short delay so page has settled
    setTimeout(() => {
      tooltip.classList.add('show');
      setTimeout(() => {
        tooltip.classList.remove('show');
        sessionStorage.setItem('langTooltipShown', '1');
      }, 4000);
    }, 1800);
  }

  // Also show briefly when hovering the lang row
  const langRow = document.getElementById('langRow');
  if (langRow) {
    let hoverTimer;
    langRow.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimer);
      tooltip.classList.add('show');
    });
    langRow.addEventListener('mouseleave', () => {
      hoverTimer = setTimeout(() => tooltip.classList.remove('show'), 600);
    });
  }
})();

/* ══ MODAL ══ */
function openModal() {
  const modal = document.getElementById('modal');
  modal.classList.add('open');
  // Sync modal lang to site lang
  const lang = document.body.className === 'vi' ? 'vi' : 'en';
  setModalLang(lang);
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
}
function closeIfOutside(e) {
  if (e.target.id === 'modal') closeModal();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ══ FORMSPREE ══ */
const FORMSPREE_ID = 'xgopzerw';

async function submitForm(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const msg = document.getElementById('formMsg');
  const isVI = document.body.classList.contains('vi');

  const name  = document.getElementById('f-name').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const need  = document.getElementById('f-need').value.trim();
  const text  = document.getElementById('f-msg').value.trim();

  if (!name || !email || !text) {
    msg.className = 'form-msg error';
    msg.textContent = isVI
      ? 'Vui lòng điền đầy đủ tên, email và lời nhắn.'
      : 'Please fill in your name, email, and message.';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    msg.className = 'form-msg error';
    msg.textContent = isVI ? 'Email không hợp lệ.' : 'Please enter a valid email address.';
    return;
  }

  btn.disabled = true;
  btn.textContent = isVI ? 'Đang gửi...' : 'Sending...';
  msg.className = 'form-msg';
  msg.textContent = '';

  try {
    const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ name, email, need, message: text })
    });

    if (res.ok) {
      msg.className = 'form-msg success';
      msg.textContent = isVI
        ? '✅ Gửi thành công! Mình sẽ liên hệ lại với bạn sớm nhé.'
        : "✅ Message sent! I'll get back to you soon.";
      ['f-name','f-email','f-need','f-msg'].forEach(id => document.getElementById(id).value = '');
    } else {
      throw new Error('Server error');
    }
  } catch {
    msg.className = 'form-msg error';
    msg.textContent = isVI
      ? '❌ Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ trực tiếp qua email.'
      : '❌ Something went wrong. Please try again or email me directly.';
  } finally {
    btn.disabled = false;
    btn.innerHTML = isVI
      ? '<span>Gửi tin nhắn →</span>'
      : '<span>Send message →</span>';
  }
}
