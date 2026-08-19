var grid = byId('grid');
var roundInfo = byId('roundInfo');
var bigScore = byId('bigScore');
var pctText = byId('pctText');
var bestChip = byId('bestChip');
var btnPlay = byId('btnPlay');
var btnShare = byId('btnShare');
var msg = byId('msg');

var CELLS = 12;

var state = 'idle';
var sequence = [];
var userSeq = [];
var level = 1;
var lastScore = null;
var showTimer = null;
var nextTimer = null;

var cells = [];
(function buildGrid() {
  for (var i = 0; i < CELLS; i++) {
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

function updateCompare(youVal) {
  byId('compareBox').innerHTML = renderCompare([
    { label: 'Average users', value: 7, cls: 'avg' },
    { label: 'Elite memory', value: 12, cls: 'pro' },
    { label: 'You', value: youVal, cls: 'you' }
  ], 'lvl');
}

function drawProg() {
  var hist = getHistory('sequence-memory');
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
  var best = getBest('sequence-memory');
  bestChip.textContent = best !== null ? 'Best: ' + best + ' levels' : 'No record yet';
}

function clearTimers() {
  if (showTimer) { clearInterval(showTimer); showTimer = null; }
  if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
}

function startSession() {
  clearTimers();
  sequence = [];
  level = 1;
  nextLevel();
}

function nextLevel() {
  clearTimers();
  sequence.push(Math.floor(Math.random() * CELLS));
  userSeq = [];
  state = 'showing';
  roundInfo.textContent = 'Level ' + level + ' — watch the sequence';
  var i = 0;
  var speed = Math.max(500 - level * 15, 260);
  showTimer = setInterval(function () {
    if (i > 0) cells[sequence[i - 1]].classList.remove('on');
    if (i < sequence.length) {
      cells[sequence[i]].classList.add('on');
      i++;
    } else {
      clearInterval(showTimer);
      showTimer = null;
      state = 'input';
      roundInfo.textContent = 'Your turn — repeat the sequence';
    }
  }, speed);
}

function endSession() {
  state = 'done';
  var score = level - 1;
  lastScore = score;
  roundInfo.textContent = '';
  bigScore.textContent = score;
  bigScore.classList.remove('pop'); void bigScore.offsetWidth; bigScore.classList.add('pop');
  pctText.textContent = 'Better than ' + percentile(score, 7, 2) + '% of users';
  updateCompare(score);
  pushHistory('sequence-memory', score);
  drawProg();
  saveBest('sequence-memory', score, false);
  showBestChip();
  msg.textContent = ratingFor(score);
}

function ratingFor(v) {
  if (v >= 12) return 'Elite memory!';
  if (v >= 8) return 'Above average!';
  if (v >= 5) return 'Average short-term memory.';
  return 'Keep training!';
}

grid.addEventListener('click', function (e) {
  if (state !== 'input') return;
  var cell = e.target.closest('.mem-cell');
  if (!cell) return;
  var i = Number(cell.getAttribute('data-i'));
  userSeq.push(i);
  cell.classList.add('on');
  setTimeout(function () { cell.classList.remove('on'); }, 150);
  var idx = userSeq.length - 1;
  if (userSeq[idx] !== sequence[idx]) { endSession(); return; }
  if (userSeq.length === sequence.length) {
    level++;
    nextTimer = setTimeout(nextLevel, 400);
  }
});

btnPlay.addEventListener('click', startSession);
btnShare.addEventListener('click', function () {
  if (lastScore === null) { msg.textContent = 'Play one session first!'; return; }
  copyText('I reached level ' + lastScore + ' on ReflexLab Sequence Memory. Beat me!')
    .then(function () { msg.textContent = 'Score copied — share it anywhere!'; });
});

var savedBest = getBest('sequence-memory');
updateCompare(savedBest);
drawProg(); showBestChip();
if (savedBest !== null) { bigScore.textContent = savedBest; pctText.textContent = 'Best: better than ' + percentile(savedBest, 7, 2) + '%'; }