/* ============================================
   REFLEXLAB - HOMEPAGE
   TESTS list theke sob card render kore
   ============================================ */

/* SVG icon helper - inline SVG return kore */
function getIcon(iconName) {
  var icons = {
    reaction: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    cps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
    typing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h0M10 10h0M14 10h0M18 10h0M7 14h10"/></svg>',
    aim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    'sequence-memory': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    'visual-memory': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>',
    'number-memory': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
    'color-vision': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>',
    'verbal-memory': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>'
  };
  return icons[iconName] || icons.reaction;
}

function renderHome() {
  var grid = byId('testGrid');
  var html = '';

  for (var i = 0; i < TESTS.length; i++) {
    var t = TESTS[i];
    var best = getBest(t.id);

    var bestLine;
    if (best !== null) {
      bestLine = '🏆 Best: ' + best + ' ' + t.unit;
    } else if (t.live) {
      bestLine = '▶ Play now!';
    } else {
      bestLine = '🔒 Coming soon';
    }

    var cardClass = 'test-card' + (t.live ? '' : ' soon');

    html += '<a class="' + cardClass + '" href="tests/' + t.id + '/' + t.id + '.html">'
         +    '<div class="icon-wrap">' + getIcon(t.id) + '</div>'
         +    '<h3>' + t.name + '</h3>'
         +    '<p>' + t.desc + '</p>'
         +    '<div class="best">' + bestLine + '</div>'
         +  '</a>';
  }

  grid.innerHTML = html;
}

renderHome();