var arena = byId('arena');
var arenaMsg = byId('arenaMsg');
var target = byId('target');
var roundInfo = byId('roundInfo');
var bigScore = byId('bigScore');
var pctText = byId('pctText');
var bestChip = byId('bestChip');
var btnPlay = byId('btnPlay');
var btnShare = byId('btnShare');
var msg = byId('msg');

var TARGETS = 20;

var state = 'idle';
var hits = 0;
var misses = 0;
var times = [];
var targetStart = 0;
var lastAvg = null;

function percentile(val, mean, sd, lowerBetter) {
  var z = (val - mean) / sd;
  var t = 1 / (1 + 0.2316419 * Math.abs(z));
  var d = 0.3989423 * Math.exp(-z * z / 2);
  var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  var cdf = z > 0 ? 1 - p : p;
  var pct = lowerBetter ? (1 - cdf) * 100 : cdf * 100;
  return Math.round(pct);
}

function updateCompare(youVal) {
  byId('compareBox').innerHTML = renderCompare([
    { label: 'Average users', value: 700, cls: 'avg' },
    { label: 'Pro FPS players', value: 400, cls: 'pro' },
    { label: 'You', value: youVal, cls: 'you' }
  ], 'ms');
}

function drawProg() {
  var hist = getHistory('aim');
  var svg = byId('progChart');
  if (hist.length < 2) { svg.innerHTML = '<text x="300" y="70" fill="#94a3b8" font-size="12" text-anchor="middle">Play at least 2 sessions to see your progress line</text>'; return; }
  var min = Math.min.apply(null, hist) - 30;
  var max = Math.max.apply(null, hist) + 30;
  var pts = [], dots = '';
  for (var i = 0; i < hist.length; i++) {
    var x = 50 + i * (500 / (hist.length - 1));
    var y = 25 + ((hist[i] - min) / (max - min)) * 90;
    pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    dots += '<circle cx="' + x + '" cy="' + y + '" r="4" fill="#22d3ee"/>';
    dots += '<text x="' + x + '" y="' + (y - 10) + '" fill="#94a3b8" font-size="11" text-anchor="middle">' + hist[i] + '</text>';
  }
  svg.innerHTML = '<path d="M' + pts.join(' L') + '" fill="none" stroke="#22d3ee" stroke-width="2.5"/>' + dots;
}

function showBestChip() {
  var best = getBest('aim');
  bestChip.textContent = best !== null ? 'Best: ' + best + ' ms' : 'No record yet';
}

function placeTarget() {
  var box = arena.getBoundingClientRect();
  var maxX = box.width - 70;
  var maxY = box.height - 70;
  target.style.left = (10 + Math.random() * maxX) + 'px';
  target.style.top = (10 + Math.random() * maxY) + 'px';
  target.style.display = 'block';
  targetStart = performance.now();
}

function startSession() {
  hits = 0; misses = 0; times = [];
  state = 'running';
  arenaMsg.textContent = '';
  roundInfo.textContent = 'Target 1 / ' + TARGETS;
  msg.textContent = '';
  placeTarget();
}

function endSession() {
  state = 'done';
  target.style.display = 'none';
  var average = Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length);
  var accuracy = Math.round(hits / (hits + misses) * 100);
  lastAvg = average;

  arenaMsg.textContent = 'Session complete! Click to play again.';
  roundInfo.textContent = '';

  bigScore.textContent = average;
  bigScore.classList.remove('pop'); void bigScore.offsetWidth; bigScore.classList.add('pop');
  pctText.textContent = 'Faster than ' + percentile(average, 700, 150, true) + '% of players';
  updateCompare(average);
  pushHistory('aim', average);
  drawProg();
  saveBest('aim', average, true);
  showBestChip();
  msg.textContent = ratingFor(average) + ' · Accuracy: ' + accuracy + '% (' + misses + ' miss)';
}

function ratingFor(v) {
  if (v < 450) return 'Pro FPS level!';
  if (v < 600) return 'Above average!';
  if (v < 800) return 'Normal aim speed.';
  return 'Keep practicing!';
}

target.addEventListener('click', function (e) {
  e.stopPropagation();
  if (state !== 'running') return;
  var t = Math.round(performance.now() - targetStart);
  times.push(t);
  hits++;
  if (hits >= TARGETS) { endSession(); return; }
  roundInfo.textContent = 'Target ' + (hits + 1) + ' / ' + TARGETS + ' — last: ' + t + 'ms';
  placeTarget();
});

arena.addEventListener('click', function () {
  if (state === 'idle' || state === 'done') startSession();
  else if (state === 'running') {
    misses++;
    roundInfo.textContent = 'Target ' + (hits + 1) + ' / ' + TARGETS + ' — Miss!';
  }
});

btnPlay.addEventListener('click', startSession);
btnShare.addEventListener('click', function () {
  if (lastAvg === null) { msg.textContent = 'Play one session first!'; return; }
  copyText('My aim speed: ' + lastAvg + ' ms per target on ReflexLab. Beat me!')
    .then(function () { msg.textContent = 'Score copied — share it anywhere!'; });
});

arenaMsg.textContent = 'Click anywhere to start';
var savedBest = getBest('aim');
updateCompare(savedBest);
drawProg(); showBestChip();
if (savedBest !== null) { bigScore.textContent = savedBest; pctText.textContent = 'Best: faster than ' + percentile(savedBest, 700, 150, true) + '%'; }