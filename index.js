/* ================================================
   RoxyScore — index.js  v0.3
   Auth — localStorage (Firebase'e hazır)
   Firebase'e geçişte AS.getSession() →
   firebase.auth().currentUser ile değişecek
   ================================================ */

// Oturum varsa direkt ana sayfaya
if (AS.getSession()) { goTo('home.html'); }

function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
function sleep(ms)  { return new Promise(r => setTimeout(r, ms)); }

function showErr(id, msg) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', !!msg);
  var inp = el.closest('.fg')?.querySelector('input');
  if (inp) inp.classList.toggle('error', !!msg);
}
function clearErr(id) { showErr(id, ''); }

function setLoading(btnId, on) {
  var btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = on;
  btn.querySelector('.bt')?.classList.toggle('hidden', on);
  btn.querySelector('.bl')?.classList.toggle('hidden', !on);
}

function shake() {
  var c = document.querySelector('.auth-card');
  c.classList.remove('shake');
  void c.offsetWidth;
  c.classList.add('shake');
}

// ── TAB GEÇİŞİ ───────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  var target = document.getElementById('form-' + name);
  if (target) target.classList.add('active');
  ['login-email-err','login-pass-err','reg-email-err','reg-pass-err','reg-confirm-err','forgot-err'].forEach(clearErr);
}

document.querySelectorAll('[data-tab]').forEach(el => {
  el.addEventListener('click', () => switchTab(el.dataset.tab));
});

// ── ŞİFRE GÖSTER/GİZLE ───────────────────────────
document.querySelectorAll('.eye').forEach(btn => {
  btn.addEventListener('click', () => {
    var inp = document.getElementById(btn.dataset.t);
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  });
});

// ── ŞİFRE GÜCÜ ───────────────────────────────────
document.getElementById('reg-password')?.addEventListener('input', function() {
  var v = this.value, score = 0;
  if (v.length >= 6)  score++;
  if (v.length >= 10) score++;
  if (/[A-Z]/.test(v)) score++;
  if (/[0-9]/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  var lvls = [
    { pct:'0%',   bg:'#2c3550', lbl:'' },
    { pct:'25%',  bg:'#ff3d57', lbl:'Çok Zayıf' },
    { pct:'50%',  bg:'#ff9800', lbl:'Zayıf' },
    { pct:'75%',  bg:'#ffd600', lbl:'Orta' },
    { pct:'90%',  bg:'#00bcd4', lbl:'İyi' },
    { pct:'100%', bg:'#00e676', lbl:'Güçlü' },
  ];
  var lvl = v.length === 0 ? lvls[0] : lvls[Math.min(score, 5)];
  var fill = document.getElementById('sf');
  var lbl  = document.getElementById('sl');
  fill.style.width = lvl.pct;
  fill.style.background = lvl.bg;
  lbl.textContent = lvl.lbl;
  lbl.style.color = lvl.bg;
});

// ── GİRİŞ ────────────────────────────────────────
document.getElementById('form-login').addEventListener('submit', async e => {
  e.preventDefault();
  var email = document.getElementById('login-email').value.trim();
  var pass  = document.getElementById('login-password').value;
  var ok = true;
  clearErr('login-email-err'); clearErr('login-pass-err');

  if (!email)          { showErr('login-email-err', 'E-posta adresi gerekli'); ok = false; }
  else if (!isEmail(email)) { showErr('login-email-err', 'Geçerli bir e-posta girin'); ok = false; }
  if (!pass)           { showErr('login-pass-err', 'Şifre gerekli'); ok = false; }
  if (!ok) { shake(); return; }

  setLoading('login-btn', true);
  await sleep(700);

  // Firebase'e geçişte: firebase.auth().signInWithEmailAndPassword(email, pass)
  var users = AS.getUsers();
  var user  = users[email.toLowerCase()];
  if (!user) {
    showErr('login-email-err', 'Bu e-posta ile kayıt bulunamadı');
    shake();
  } else if (user.password !== pass) {
    showErr('login-pass-err', 'Şifre yanlış');
    shake();
  } else {
    AS.setSession(email.toLowerCase());
    goTo('home.html');
    return;
  }
  setLoading('login-btn', false);
});

// ── KAYIT ─────────────────────────────────────────
document.getElementById('form-register').addEventListener('submit', async e => {
  e.preventDefault();
  var email   = document.getElementById('reg-email').value.trim();
  var pass    = document.getElementById('reg-password').value;
  var confirm = document.getElementById('reg-confirm').value;
  var ok = true;
  clearErr('reg-email-err'); clearErr('reg-pass-err'); clearErr('reg-confirm-err');

  if (!email)             { showErr('reg-email-err', 'E-posta adresi gerekli'); ok = false; }
  else if (!isEmail(email)) { showErr('reg-email-err', 'Geçerli bir e-posta girin'); ok = false; }
  if (!pass)              { showErr('reg-pass-err', 'Şifre gerekli'); ok = false; }
  else if (pass.length<6) { showErr('reg-pass-err', 'En az 6 karakter olmalı'); ok = false; }
  if (!confirm)           { showErr('reg-confirm-err', 'Şifre tekrarı gerekli'); ok = false; }
  else if (pass !== confirm) { showErr('reg-confirm-err', 'Şifreler eşleşmiyor'); ok = false; }
  if (!ok) { shake(); return; }

  setLoading('reg-btn', true);
  await sleep(700);

  // Firebase'e geçişte: firebase.auth().createUserWithEmailAndPassword(email, pass)
  var users = AS.getUsers();
  if (users[email.toLowerCase()]) {
    showErr('reg-email-err', 'Bu e-posta zaten kayıtlı');
    shake();
    setLoading('reg-btn', false);
    return;
  }
  users[email.toLowerCase()] = { email: email.toLowerCase(), password: pass, createdAt: Date.now() };
  AS.saveUsers(users);
  setLoading('reg-btn', false);
  showModal('Hesap Oluşturuldu', 'Giriş yapabilirsin.', () => {
    switchTab('login');
    document.getElementById('login-email').value = email;
  });
});

// ── ŞİFRE SIFIRLA ─────────────────────────────────
document.getElementById('form-forgot').addEventListener('submit', async e => {
  e.preventDefault();
  var email = document.getElementById('forgot-email').value.trim();
  clearErr('forgot-err');
  if (!email)          { showErr('forgot-err', 'E-posta adresi gerekli'); shake(); return; }
  if (!isEmail(email)) { showErr('forgot-err', 'Geçerli bir e-posta girin'); shake(); return; }

  setLoading('forgot-btn', true);
  await sleep(900);
  setLoading('forgot-btn', false);
  // Firebase'e geçişte: firebase.auth().sendPasswordResetEmail(email)
  showModal('E-posta Gönderildi', email + ' adresine sıfırlama bağlantısı gönderildi.', () => switchTab('login'));
});

// ── MODAL ─────────────────────────────────────────
function showModal(title, desc, onOk) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-desc').textContent  = desc;
  document.getElementById('modal').classList.remove('hidden');
  var btn = document.getElementById('modal-ok');
  var handler = () => {
    document.getElementById('modal').classList.add('hidden');
    btn.removeEventListener('click', handler);
    if (onOk) onOk();
  };
  btn.addEventListener('click', handler);
}
