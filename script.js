 /* ══ THEME ══ */
  let isDark = false;
  function toggleTheme() {
    isDark = !isDark;
    document.documentElement.classList.toggle('dark', isDark);
    document.getElementById('themeBtn').textContent = isDark ? '☀️' : '🌙';
    document.getElementById('themeBtn').title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }
  // Restore preference
  if (localStorage.getItem('theme') === 'dark') { isDark = true; document.documentElement.classList.add('dark'); document.getElementById('themeBtn').textContent = '☀️'; }

  /* ══ LANG ══ */
  function setLang(lang) {
    document.body.className = lang;
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.textContent === lang.toUpperCase()));
  }

  /* ══ SCROLL REVEAL ══ */
  (() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) { setTimeout(() => e.target.classList.add('on'), i * 75); obs.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  })();

  /* ══ SKILL BARS ══ */
  (() => {
    const t = document.querySelector('.skills-col');
    if (!t) return;
    new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.querySelectorAll('.bar-fill').forEach(b => setTimeout(() => b.classList.add('on'), 300)); });
    }, { threshold: 0.3 }).observe(t);
  })();

  /* ══ MODAL ══ */
  function openModal()  { document.getElementById('modal').classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeModal() { document.getElementById('modal').classList.remove('open'); document.body.style.overflow = ''; }
  function closeIfOutside(e) { if (e.target.id === 'modal') closeModal(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  //send email via Formspree
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

    // Basic validation
    if (!name || !email || !text) {
      msg.className = 'form-msg error';
      msg.textContent = isVI ? 'Vui lòng điền đầy đủ tên, email và lời nhắn.' : 'Please fill in your name, email, and message.';
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
          : '✅ Message sent! I\'ll get back to you soon.';
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
      btn.innerHTML = isVI ? '<span data-vi>Gửi tin nhắn →</span>' : '<span data-en>Send message →</span>';
    }
  }
