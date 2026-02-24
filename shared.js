/* ================================================
   RoxyScore — shared.js  v0.3
   Sayfa geçiş yöneticisi + ortak yardımcılar
   ================================================ */

// Back-Forward Cache'den gelince exit class temizle
window.addEventListener('pageshow', function(e) {
  document.body.classList.remove('page-exit', 'page-exit-right');
  if (e.persisted) {
    // Sayfa cache'den geldi, animasyonu sıfırla
    document.body.style.opacity = '1';
    document.body.style.transform = 'none';
  }
});

// ── NAVİGASYON ───────────────────────────────────
function goTo(url, direction) {
  if (!url) return;
  var cls = (direction === 'back') ? 'page-exit-right' : 'page-exit';
  document.body.classList.add(cls);
  setTimeout(function() { window.location.href = url; }, 190);
}

function goBack(fallback) {
  var fb = fallback || 'home.html';
  var fromParam = new URLSearchParams(location.search).get('from');
  if (fromParam) {
    goTo(decodeURIComponent(fromParam), 'back');
  } else {
    goTo(fb, 'back');
  }
}

// ── CSS LOGO ─────────────────────────────────────
// Firebase entegrasyonunda bu fonksiyon takım logosunu
// Firebase Storage'dan alacak. Şimdilik CSS ile yapılıyor.
function buildLogo(teamId, size) {
  size = size || 'sm';
  var t = (typeof TEAM_PROFILES !== 'undefined') ? TEAM_PROFILES[teamId] : null;
  if (!t) {
    var initials = (teamId || 'XX').substring(0, 2).toUpperCase();
    return '<div class="tl tl-' + size + '" style="--tc:#1e2740;--tc2:#2c3550">' + initials + '</div>';
  }
  return '<div class="tl tl-' + size + '" style="--tc:' + t.color + ';--tc2:' + (t.color2 || 'rgba(255,255,255,0.15)') + '">' + t.short + '</div>';
}

// ── TOAST ────────────────────────────────────────
function showToast(icon, title, sub, type, ms) {
  type = type || 'neutral';
  ms   = ms   || 3200;
  var c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
  }
  var t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = '<div class="toast-icon">' + icon + '</div>'
    + '<div class="toast-body">'
    +   '<div class="toast-title">' + title + '</div>'
    +   (sub ? '<div class="toast-sub">' + sub + '</div>' : '')
    + '</div>';
  c.appendChild(t);
  setTimeout(function() {
    t.style.opacity = '0';
    t.style.transform = 'translateY(-8px)';
    t.style.transition = 'opacity .28s ease, transform .28s ease';
    setTimeout(function() { if (t.parentNode) t.remove(); }, 320);
  }, ms);
}
