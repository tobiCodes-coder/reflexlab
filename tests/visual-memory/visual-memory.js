var grid = byId('grid');
var roundInfo = byId('roundInfo');
var bigScore = byId('bigScore');
var pctText = byId('pctText');
var bestChip = byId('bestChip');
var btnPlay = byId('btnPlay');
var btnShare = byId('btnShare');
var msg = byId('msg');

var AVG = 9, AVG_SD = 3;
var ELITE = 16, ELITE_SD = 4;

var state = 'idle';
var level = 1;
var pattern = [];
var userClicks = [];
var lastScore = null;

var cells = [];
(function buildGrid() {
  for (var i = 0; i < 9; i++) {
    var c = document.createElement('div');
    c.className = 'mem-cell';
    c.setAttribute('data-i', i);
    grid.appendChild(c);
    cells.push(c);
  }
})();

function percentile(val, mean, sd) {
  var z = (val - mean) / sd;
  var t = 1 / (1 + 0.2316419 * Math.abs(z));
  var d = 0.3989423 * Math.exp(-z * z / 2);
  var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  var cdf = z > 0 ? 1 - p : p;
  return Math.round(cdf * 100);
}
var MIN = 0, MAX = 22, W = 600, H = 200;
function xPos(v) { return (v - MIN) / (MAX - MIN) * W; }
function curvePath(mean, sd) {
  var pts = 'M0,' + H;
  for (var i = 0; i <= 60; i++) {
    var x = MIN + (MAX - MIN) * i / 60;
    var y = Math.exp(-0.5 * Math.pow((x - mean) / sd, 2));
    pts += ' L' + xPos(x).toFixed(1) + ',' + (H - 8 - y * (H - 40)).toFixed(1);
  }
  return pts + ' L' + W + ',' + H + ' Z';
}
function drawCurves() {
  byId('avgCurve').setAttribute('d', curvePath(AVG, AVG_SD));
  byId('proCurve').setAttribute('d', curvePath(ELITE, ELITE_SD));
}
function markYou(v) {
  var x = xPos(Math.max(MIN, Math.min(MAX, v)));
  var line = byId('youLine');
  var lab = byId('youLabel');
  line.setAttribute('x1', x); line.setAttribute('x2', x);
  line.style.display = 'block';
  lab.setAttribute('x', Math.min(x + 6, W - 80));
  lab.setAttribute('y', 24);
  lab.textContent = 'You: ' + v;
  lab.style.display = 'block';
}
function drawProg() {
  var hist = getHistory('visual-memory');
  var svg = byId('progChart');
  if (hist.length < 2) { svg.innerHTML = '<text x="300" y="70" fill="#94a3b8" font-size="12" text-anchor="middle">Play at least 2 sessions to see your progress line</text>'; return; }
  var min = Math.min.apply(null, hist);
  var max = Math.max.apply(null, hist);
  if (min === max) max = min + 1;
  var pts = [], dots = '';
  for (var i = 0; i < hist.length; i++) {
    var x = 50 + i * (500 / (hist.length - 1));
    var y = 25 + (1 - (hist[i] - min) / (max - min)) * 90;
    pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    dots += '<circle cx="' + x + '" cy="' + y + '" r="4" fill="#22d3ee"/>';
    dots += '<text x="' + x + '" y="' + (y - 10) + '" fill="#94a3b8" font-size="11" text-anchor="middle">' + hist[i] + '</text>';
  }
  svg.innerHTML = '<path d="M' + pts.join(' L') + '" fill="none" stroke="#22d3ee" stroke-width="2.5"/>' + dots;
}
function showBestChip() {
  var best = getBest('visual-memory');
  bestChip.textContent = best !== null ? 'Best: ' + best + ' levels' : 'No record yet';
}

function startSession() {
  level = 1;
  nextLevel();
}

function nextLevel() {
  var count = level + 2;
  pattern = [];
  userClicks = [];
  cells.forEach(function (c) { c.classList.remove('on', 'hit', 'miss'); });
  var indices = [];
  while (pattern.length < count) {
    var r = Math.floor(Math.random() * 9);
    if (indices.indexOf(r) === -1) { indices.push(r); pattern.push(r); }
  }
  state = 'showing';
  pattern.forEach(function (i) { cells[i].classList.add('on'); });
  roundInfo.textContent = 'Level ' + level + ' — memorize the pattern';
  setTimeout(function () {
    pattern.forEach(function (i) { cells[i].classList.remove('on'); });
    state = 'input';
    roundInfo.textContent = 'Your turn — click the lit tiles';
  }, 1500 + level * 200);
}

function endSession() {
  state = 'done';
  var score = level - 1;
  lastScore = score;
  roundInfo.textContent = '';
  bigScore.textContent = score;
  bigScore.classList.remove('pop'); void bigScore.offsetWidth; bigScore.classList.add('pop');
  pctText.textContent = 'Better than ' + percentile(score, AVG, AVG_SD) + '% of users';
  markYou(score);
  pushHistory('visual-memory', score);
  drawProg();
  saveBest('visual-memory', score, false);
  showBestChip();
  msg.textContent = ratingFor(score);
}

function ratingFor(v) {
  if (v >= 16) return 'Elite visual memory!';
  if (v >= 11) return 'Above average!';
  if (v >= 7) return 'Average visual memory.';
  return 'Keep training!';
}

grid.addEventListener('click', function (e) {
  if (state !== 'input') return;
  var cell = e.target.closest('.mem-cell');
  if (!cell || cell.classList.contains('hit') || cell.classList.contains('miss')) return;
  var i = Number(cell.getAttribute('data-i'));
  if (pattern.indexOf(i) !== -1) {
    cell.classList.add('hit');
    userClicks.push(i);
    if (userClicks.length === pattern.length) { level++; setTimeout(nextLevel, 500); }
  } else {
    cell.classList.add('miss');
    pattern.forEach(function (pi) { cells[pi].classList.add('hit'); });
    endSession();
  }
});

btnPlay.addEventListener('click', startSession);
btnShare.addEventListener('click', function () {
  if (lastScore === null) { msg.textContent = 'Play one session first!'; return; }
  copyText('I reached level ' + lastScore + ' on ReflexLab Visual Memory. Beat me!')
    .then(function () { msg.textContent = 'Score copied — share it anywhere!'; });
});

drawCurves(); drawProg(); showBestChip();
var savedBest = getBest('visual-memory');
if (savedBest !== null) { bigScore.textContent = savedBest; pctText.textContent = 'Best: better than ' + percentile(savedBest, AVG, AVG_SD) + '%'; markYou(savedBest); }