var gameBox = byId('gameBox');
var roundInfo = byId('roundInfo');
var bigScore = byId('bigScore');
var pctText = byId('pctText');
var bestChip = byId('bestChip');
var btnPlay = byId('btnPlay');
var btnShare = byId('btnShare');
var msg = byId('msg');

var DURATION = 5000;
var AVG_CPS = 6.5, AVG_SD = 1.8;
var PRO_CPS = 10, PRO_SD = 2;

var state = 'idle';
var startTime = 0;
var clicks = 0;
var lastCPS = null;

function percentile(val, mean, sd) {
  var z = (val - mean) / sd;
  var t = 1 / (1 + 0.2316419 * Math.abs(z));
  var d = 0.3989423 * Math.exp(-z * z / 2);
  var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  var cdf = z > 0 ? 1 - p : p;
  return Math.round(cdf * 100);
}

var MIN = 0, MAX = 15, W = 600, H = 200;
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
  byId('avgCurve').setAttribute('d', curvePath(AVG_CPS, AVG_SD));
  byId('proCurve').setAttribute('d', curvePath(PRO_CPS, PRO_SD));
}
function markYou(v) {
  var x = xPos(Math.max(MIN, Math.min(MAX, v)));
  var line = byId('youLine');
  var lab = byId('youLabel');
  line.setAttribute('x1', x); line.setAttribute('x2', x);
  line.style.display = 'block';
  lab.setAttribute('x', Math.min(x + 6, W - 80));
  lab.setAttribute('y', 24);
  lab.textContent = 'You: ' + v.toFixed(1) + ' CPS';
  lab.style.display = 'block';
}
function drawProg() {
  var hist = getHistory('cps');
  var svg = byId('progChart');
  if (hist.length < 2) { svg.innerHTML = '<text x="300" y="70" fill="#94a3b8" font-size="12" text-anchor="middle">Play at least 2 sessions to see your progress line</text>'; return; }
  var min = Math.min.apply(null, hist) - 1;
  var max = Math.max.apply(null, hist) + 1;
  var pts = [], dots = '';
  for (var i = 0; i < hist.length; i++) {
    var x = 50 + i * (500 / (hist.length - 1));
    var y = 25 + (1 - (hist[i] - min) / (max - min)) * 90;
    pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    dots += '<circle cx="' + x + '" cy="' + y + '" r="4" fill="#22d3ee"/>';
    dots += '<text x="' + x + '" y="' + (y - 10) + '" fill="#94a3b8" font-size="11" text-anchor="middle">' + hist[i].toFixed(1) + '</text>';
  }
  svg.innerHTML = '<path d="M' + pts.join(' L') + '" fill="none" stroke="#22d3ee" stroke-width="2.5"/>' + dots;
}

function showBestChip() {
  var best = getBest('cps');
  bestChip.textContent = best !== null ? 'Best: ' + best.toFixed(1) + ' CPS' : 'No record yet';
}

function startSession() {
  clicks = 0;
  state = 'running';
  startTime = performance.now();
  gameBox.className = 'game-box go';
  gameBox.textContent = 'CLICK!';
  roundInfo.textContent = '5 seconds left';
  msg.textContent = '';
  var interval = setInterval(function () {
    var left = Math.ceil((DURATION - (performance.now() - startTime)) / 1000);
    if (left < 0) left = 0;
    roundInfo.textContent = left + ' seconds left';
  }, 100);
  setTimeout(function () {
    clearInterval(interval);
    endSession();
  }, DURATION);
}

function endSession() {
  state = 'done';
  var cps = clicks / (DURATION / 1000);
  lastCPS = cps;

  gameBox.className = 'game-box';
  gameBox.textContent = 'Session complete! Click to play again.';
  roundInfo.textContent = '';

  bigScore.textContent = cps.toFixed(1);
  bigScore.classList.remove('pop'); void bigScore.offsetWidth; bigScore.classList.add('pop');
  pctText.textContent = 'Faster than ' + percentile(cps, AVG_CPS, AVG_SD) + '% of clickers';
  markYou(cps);
  pushHistory('cps', cps);
  drawProg();
  saveBest('cps', cps, false);
  showBestChip();
  msg.textContent = ratingFor(cps);
}

function ratingFor(v) {
  if (v >= 10) return 'Pro gamer speed!';
  if (v >= 8) return 'Above average!';
  if (v >= 6) return 'Normal human speed.';
  return 'Practice makes perfect!';
}

gameBox.addEventListener('click', function () {
  if (state === 'idle' || state === 'done') startSession();
  else if (state === 'running') clicks++;
});
btnPlay.addEventListener('click', startSession);
btnShare.addEventListener('click', function () {
  if (lastCPS === null) { msg.textContent = 'Play one session first!'; return; }
  copyText('My click speed: ' + lastCPS.toFixed(1) + ' CPS on ReflexLab. Beat me!')
    .then(function () { msg.textContent = 'Score copied — share it anywhere!'; });
});

drawCurves(); drawProg(); showBestChip();
var savedBest = getBest('cps');
if (savedBest !== null) { bigScore.textContent = savedBest.toFixed(1); pctText.textContent = 'Best: faster than ' + percentile(savedBest, AVG_CPS, AVG_SD) + '%'; markYou(savedBest); }