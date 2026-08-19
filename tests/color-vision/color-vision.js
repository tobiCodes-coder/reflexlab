var grid = byId('grid');
var roundInfo = byId('roundInfo');
var bigScore = byId('bigScore');
var pctText = byId('pctText');
var bestChip = byId('bestChip');
var btnPlay = byId('btnPlay');
var btnShare = byId('btnShare');
var msg = byId('msg');

var state = 'idle';
var level = 1;
var oddIndex = -1;
var lastScore = null;
var nextTimer = null;

function gridCols(lvl) { return Math.min(2 + Math.floor((lvl - 1) / 2), 8); }
function colorDiff(lvl) { return Math.max(24 - lvl * 2, 2); }

function percentile(val, mean, sd) {
  var z = (val - mean) / sd;
  var t = 1 / (1 + 0.2316419 * Math.abs(z));
  var d = 0.3989423 * Math.exp(-z * z / 2);
  var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  var cdf = z > 0 ? 1 - p : p;
  return Math.round(cdf * 100);
}

function updateCompare(youVal) {
  byId('compareBox').innerHTML = renderCompare([
    { label: 'Average users', value: 7, cls: 'avg' },
    { label: 'Elite vision', value: 15, cls: 'pro' },
    { label: 'You', value: youVal, cls: 'you' }
  ], 'lvl');
}

function drawProg() {
  var hist = getHistory('color-vision');
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
  var best = getBest('color-vision');
  bestChip.textContent = best !== null ? 'Best: level ' + best : 'No record yet';
}

function startSession() {
  if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
  level = 1;
  nextLevel();
}

function nextLevel() {
  if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
  var cols = gridCols(level);
  var total = cols * cols;
  oddIndex = Math.floor(Math.random() * total);
  var hue = Math.floor(Math.random() * 360);
  var base = 45;
  var diff = colorDiff(level);
  var oddLight = Math.random() < 0.5 ? base + diff : base - diff;

  grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
  grid.innerHTML = '';
  for (var i = 0; i < total; i++) {
    var cell = document.createElement('div');
    cell.className = 'mem-cell';
    cell.style.background = 'hsl(' + hue + ', 70%, ' + (i === oddIndex ? oddLight : base) + '%)';
    cell.style.border = 'none';
    cell.setAttribute('data-i', i);
    grid.appendChild(cell);
  }
  state = 'playing';
  roundInfo.textContent = 'Level ' + level + ' — find the different tile';
}

function endSession() {
  state = 'done';
  var score = level - 1;
  lastScore = score;
  roundInfo.textContent = '';
  bigScore.textContent = score;
  bigScore.classList.remove('pop'); void bigScore.offsetWidth; bigScore.classList.add('pop');
  pctText.textContent = 'Better than ' + percentile(score, 7, 2.5) + '% of users';
  updateCompare(score);
  pushHistory('color-vision', score);
  drawProg();
  saveBest('color-vision', score, false);
  showBestChip();
  msg.textContent = ratingFor(score);
}

function ratingFor(v) {
  if (v >= 15) return 'Elite color vision!';
  if (v >= 10) return 'Sharp eyes!';
  if (v >= 6) return 'Average color vision.';
  return 'Warm up those eyes!';
}

grid.addEventListener('click', function (e) {
  if (state !== 'playing') return;
  var cell = e.target.closest('.mem-cell');
  if (!cell) return;
  var i = Number(cell.getAttribute('data-i'));
  if (i === oddIndex) {
    cell.style.outline = '3px solid #4ade80';
    level++;
    nextTimer = setTimeout(nextLevel, 400);
  } else {
    cell.style.outline = '3px solid #f87171';
    var cells = grid.querySelectorAll('.mem-cell');
    cells[oddIndex].style.outline = '3px solid #4ade80';
    endSession();
  }
});

btnPlay.addEventListener('click', startSession);
btnShare.addEventListener('click', function () {
  if (lastScore === null) { msg.textContent = 'Play one session first!'; return; }
  copyText('I cleared level ' + lastScore + ' on ReflexLab Color Vision. Beat me!')
    .then(function () { msg.textContent = 'Score copied — share it anywhere!'; });
});

var savedBest = getBest('color-vision');
updateCompare(savedBest);
drawProg(); showBestChip();
if (savedBest !== null) { bigScore.textContent = savedBest; pctText.textContent = 'Best: better than ' + percentile(savedBest, 7, 2.5) + '%'; }