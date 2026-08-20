/* ============================================
   REFLEXLAB - utils.js
   ============================================ */

function byId(id) {
  return document.getElementById(id);
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  var ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  return Promise.resolve();
}

function getBest(testId) {
  var v = localStorage.getItem('rl_best_' + testId);
  return v === null ? null : Number(v);
}

function saveBest(testId, score, lowerBetter) {
  var prev = getBest(testId);
  if (prev === null || (lowerBetter ? score < prev : score > prev)) {
    localStorage.setItem('rl_best_' + testId, score);
    return true;
  }
  return false;
}

function pushHistory(testId, score) {
  var key = 'rl_hist_' + testId;
  var hist = JSON.parse(localStorage.getItem(key) || '[]');
  hist.push(score);
  if (hist.length > 5) hist.shift();
  localStorage.setItem(key, JSON.stringify(hist));
}

function getHistory(testId) {
  return JSON.parse(localStorage.getItem('rl_hist_' + testId) || '[]');
}

function avg(arr) {
  if (!arr.length) return 0;
  var s = 0;
  for (var i = 0; i < arr.length; i++) s += arr[i];
  return Math.round(s / arr.length);
}

function siteRoot() {
  var parts = window.location.pathname.split('/').filter(Boolean);
  var depth = Math.max(0, parts.length - 1);
  var root = '';
  for (var i = 0; i < depth; i++) root += '../';
  return root;
}

var ICONS = {
  'reaction': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  'cps': '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>',
  'typing': '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  'aim': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  'sequence-memory': '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  'visual-memory': '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  'number-memory': '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
  'color-vision': '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  'verbal-memory': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
};

function iconSvg(id) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[id] + '</svg>';
}

function initLayout() {
  var root = siteRoot();

  /* Favicon + theme color */
  document.head.insertAdjacentHTML('beforeend',
    '<link rel="icon" type="image/svg+xml" href="' + root + 'favicon.svg">' +
    '<meta name="theme-color" content="#0a0e1a">'
  );

   /* Cloudflare Web Analytics (createElement = script thik moto load hobe) */
  var cf = document.createElement('script');
  cf.type = 'module';
  cf.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  cf.setAttribute('data-cf-beacon', '{"token": "91f8d5feb2f64822bef2583dad7b55c0"}');
  document.head.appendChild(cf);

  /* Header */
  var header =
    '<header class="site-header">' +
    '  <div class="header-inner">' +
    '    <a class="logo" href="' + root + 'index.html">Reflex<span>Lab</span></a>' +
    '    <nav class="main-nav">' +
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
      ['color-vision', 'Color Vision'],
      ['verbal-memory', 'Verbal Memory']
    ];
    var html = '<aside class="side-nav">';
    for (var i = 0; i < tests.length; i++) {
      var active = window.location.pathname.indexOf('/' + tests[i][0] + '/') !== -1 ? ' active' : '';
      html += '<a class="side-link' + active + '" title="' + tests[i][1] + '" href="' + root + 'tests/' + tests[i][0] + '/' + tests[i][0] + '.html">' + iconSvg(tests[i][0]) + '</a>';
    }
    html += '</aside>';
    document.body.insertAdjacentHTML('afterbegin', html);
  }

  /* Footer */
  var footer =
    '<footer class="site-footer">' +
    '  <div class="footer-inner">' +
    '    <div class="f-brand">Reflex<span>Lab</span><p>Free brain &amp; reflex tests — right in your browser.</p></div>' +
    '    <nav class="f-nav">' +
    '      <a href="' + root + 'index.html">Home</a>' +
    '      <a href="' + root + 'tests/reaction/reaction.html">Tests</a>' +
    '      <a href="' + root + 'content/guides.html">Guides</a>' +
    '    </nav>' +
    '  </div>' +
    '  <div class="f-copy">© 2026 ReflexLab · All scores stay on your device.</div>' +
    '</footer>';
  document.body.insertAdjacentHTML('beforeend', footer);
}

initLayout();


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