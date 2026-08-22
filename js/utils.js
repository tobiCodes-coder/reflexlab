/* ============================================
   REFLEXLAB - SHARED UTILITIES (FINAL v3)
   Layout, icons, storage, compare bars
   ============================================ */

function byId(id) { return document.getElementById(id); }

function siteRoot() {
  var path = window.location.pathname;
  if (path.indexOf('/tests/') !== -1) return '../../';
  if (path.indexOf('/content/') !== -1) return '../';
  return './';
}

/* ---------- ICONS (8 tests) ---------- */
var ICONS = {
  'reaction': '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  'cps': '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>',
  'typing': '<path d="M4 7V4h16v3M8 12h8M6 20h12"/>',
  'aim': '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
  'sequence-memory': '<path d="M8 6h8M8 12h8M8 18h5"/>',
  'visual-memory': '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="8" y="8" width="4" height="4"/>',
  'number-memory': '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/>',
  'color-vision': '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>'
};

function iconSvg(name) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
}

/* ---------- STORAGE (best + history) ---------- */
function getBest(key) {
  try {
    var v = localStorage.getItem('rl-best-' + key);
    return v === null ? null : Number(v);
  } catch (e) { return null; }
}

function saveBest(key, value, lowerBetter) {
  try {
    var cur = getBest(key);
    if (cur === null || (lowerBetter ? value < cur : value > cur)) {
      localStorage.setItem('rl-best-' + key, value);
    }
  } catch (e) {}
}

function getHistory(key) {
  try { return JSON.parse(localStorage.getItem('rl-hist-' + key) || '[]'); } catch (e) { return []; }
}

function pushHistory(key, value) {
  try {
    var h = getHistory(key);
    h.push(value);
    if (h.length > 5) h = h.slice(h.length - 5);
    localStorage.setItem('rl-hist-' + key, JSON.stringify(h));
  } catch (e) {}
}

/* ---------- HELPERS ---------- */
function copyText(t) {
  if (navigator.clipboard) return navigator.clipboard.writeText(t);
  return new Promise(function (res) {
    var ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    res();
  });
}

function avg(arr) {
  return Math.round(arr.reduce(function (a, b) { return a + b; }, 0) / arr.length);
}

/* ---------- COMPARISON BAR CHART ---------- */
function renderCompare(items, unit) {
  var max = 0;
  for (var i = 0; i < items.length; i++) {
    if (items[i].value !== null && items[i].value > max) max = items[i].value;
  }
  if (max === 0) max = 1;
  var html = '';
  for (var j = 0; j < items.length; j++) {
    var it = items[j];
    var w = (it.value === null) ? 0 : Math.max(4, Math.round(it.value / max * 100));
    var valText = (it.value === null) ? '—' : it.value + ' ' + unit;
    html += '<div class="cmp-row">' +
      '<div class="cmp-label">' + it.label + '</div>' +
      '<div class="cmp-bar"><div class="cmp-fill ' + it.cls + '" style="width:' + w + '%"></div></div>' +
      '<div class="cmp-val">' + valText + '</div>' +
      '</div>';
  }
  return html;
}

/* ---------- LAYOUT (header + sidebar + footer) ---------- */
function initLayout() {
  var root = siteRoot();

  /* Favicon + theme color */
  document.head.insertAdjacentHTML('beforeend',
    '<link rel="icon" type="image/svg+xml" href="' + root + 'favicon.svg">' +
    '<meta name="theme-color" content="#0a0e1a">'
  );

  /* Header */
  var header =
    '<header class="site-header">' +
    '  <div class="header-inner">' +
    '    <a class="logo" href="' + root + 'index.html">Reflex<span>Lab</span></a>' +
    '    <nav class="main-nav">' +
    '      <a href="' + root + 'index.html">Home</a>' +
    '      <a href="' + root + 'tests/reaction/reaction.html">Tests</a>' +
    '      <a href="' + root + 'content/guides.html">Guides</a>' +
    '    </nav>' +
    '  </div>' +
    '</header>';
  document.body.insertAdjacentHTML('afterbegin', header);

  /* Sidebar — shudhu test pages e */
  if (window.location.pathname.indexOf('/tests/') !== -1) {
    document.body.classList.add('has-side');
    var tests = [
      ['reaction', 'Reaction Time'],
      ['cps', 'Click Speed'],
      ['typing', 'Typing Speed'],
      ['aim', 'Aim Trainer'],
      ['sequence-memory', 'Sequence Memory'],
      ['visual-memory', 'Visual Memory'],
      ['number-memory', 'Number Memory'],
      ['color-vision', 'Color Vision']
    ];
    var html = '<aside class="side-nav">';
    for (var i = 0; i < tests.length; i++) {
      var active = window.location.pathname.indexOf('/' + tests[i][0] + '/') !== -1 ? ' active' : '';
      html += '<a class="side-link' + active + '" title="' + tests[i][1] + '" href="' + root + 'tests/' + tests[i][0] + '/' + tests[i][0] + '.html">' + iconSvg(tests[i][0]) + '</a>';
    }
    html += '</aside>';
    document.body.insertAdjacentHTML('afterbegin', html);
  }

   /* Footer (3-column pro) */
  var footer =
    '<footer class="site-footer">' +
    '  <div class="footer-inner">' +
    '    <div class="f-col f-about">' +
    '      <a class="f-brand" href="' + root + 'index.html">Reflex<span>Lab</span></a>' +
    '      <p>Train your brain. Beat your best.<br>Free reflex &amp; cognitive tests — right in your browser.</p>' +
    '    </div>' +
    '    <div class="f-col">' +
    '      <h4>Tests</h4>' +
    '      <a href="' + root + 'tests/reaction/reaction.html">Reaction Time</a>' +
    '      <a href="' + root + 'tests/cps/cps.html">Click Speed</a>' +
    '      <a href="' + root + 'tests/typing/typing.html">Typing Speed</a>' +
    '      <a href="' + root + 'tests/aim/aim.html">Aim Trainer</a>' +
    '    </div>' +
    '    <div class="f-col">' +
    '      <h4>Learn</h4>' +
    '      <a href="' + root + 'content/guides.html">Guides &amp; Facts</a>' +
    '      <a href="' + root + 'content/average-reaction-time.html">Average Reaction Time</a>' +
    '      <a href="' + root + 'content/good-cps-score.html">Good CPS Score</a>' +
    '      <a href="' + root + 'content/improve-typing-speed.html">Improve Typing Speed</a>' +
    '    </div>' +
    '  </div>' +
    '  <div class="f-bottom">' +
    '    <span>© 2026 ReflexLab</span>' +
    '    <span class="f-note">No signup · No downloads · Scores stay on your device</span>' +
    '  </div>' +
    '</footer>';
  document.body.insertAdjacentHTML('beforeend', footer);
}

initLayout();


/* ---------- MINIMAL 1-LINE FOOTER ---------- */
window.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () {
    var f = document.querySelector('footer');
    if (!f) return;
    f.innerHTML =
      '<div class="container foot-line">© 2026 ReflexLab · Free browser reflex & memory games — no signup, no downloads · <a href="/index.html">Home</a></div>';
  }, 0);
});









/* ---------- PWA: manifest + SW + install button ---------- */
(function () {
  function addMeta(name, content) {
    var m = document.createElement('meta');
    m.name = name;
    m.content = content;
    document.head.appendChild(m);
  }
  var l = document.createElement('link');
  l.rel = 'manifest';
  l.href = '/manifest.webmanifest';
  document.head.appendChild(l);
  addMeta('theme-color', '#0b0f17');
  addMeta('mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    try { if (localStorage.getItem('rl-pwa-hide')) return; } catch (err) {}
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:98;display:flex;gap:6px;align-items:center';
    var b = document.createElement('button');
    b.textContent = '⬇ Install ReflexLab App';
    b.style.cssText = 'background:#22d3ee;color:#06202a;border:none;padding:10px 16px;border-radius:999px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.4)';
    var x = document.createElement('button');
    x.textContent = '✕';
    x.setAttribute('aria-label', 'Dismiss install prompt');
    x.style.cssText = 'background:rgba(0,0,0,.4);color:#fff;border:none;width:28px;height:28px;border-radius:50%;cursor:pointer';
    x.onclick = function () {
      wrap.remove();
      try { localStorage.setItem('rl-pwa-hide', '1'); } catch (err) {}
    };
    b.onclick = function () { e.prompt(); wrap.remove(); };
    wrap.appendChild(b);
    wrap.appendChild(x);
    document.body.appendChild(wrap);
  });
})();