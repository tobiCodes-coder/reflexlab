/* ============================================
   REFLEXLAB - HOMEPAGE
   Test grid render (icons + best score)
   ============================================ */

var grid = byId('testGrid');
var html = '';

for (var i = 0; i < TESTS.length; i++) {
  var t = TESTS[i];
  var best = getBest(t.id);

  html += '<a class="test-card" href="tests/' + t.id + '/' + t.id + '.html">' +
    '<div class="icon-wrap">' + iconSvg(t.id) + '</div>' +
    '<h3>' + t.title + '</h3>' +
    '<p>' + t.desc + '</p>' +
    (best !== null
      ? '<span class="best">Best: ' + best + ' ' + t.unit + '</span>'
      : '<span class="best">Play now</span>') +
    '</a>';
}

grid.innerHTML = html;