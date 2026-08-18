/* ============================================
   REFLEXLAB - REACTION TIME (FINAL v2)
   Chart: you + average users + gamers
   Progress: last 5 session line chart
   ============================================ */

var gameBox = byId('gameBox');
var roundInfo = byId('roundInfo');
var bigScore = byId('bigScore');
var pctText = byId('pctText');
var bestChip = byId('bestChip');
var btnPlay = byId('btnPlay');
var btnShare = byId('btnShare');
var msg = byId('msg');

var ROUNDS = 5;
var HUMAN_AVG = 273, HUMAN_SD = 60;
var GAMER_AVG = 200, GAMER_SD = 40;

var state = 'idle';
var timer = null;
var startTime = 0;
var times = [];
var lastAvg = null;

/* ---------- Percentile ---------- */
function fasterThan(ms) {
  var z = (ms - HUMAN_AVG) / HUMAN_SD;
  var t = 1 / (1 + 0.2316419 * Math.abs(z));
  var d = 0.3989423 * Math.exp(-z * z / 2);
  var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  var cdf = z > 0 ? 1 - p : p;
  return Math.round((1 - cdf) * 100);
}

/* ---------- Distribution chart ---------- */
var MIN = 100, MAX = 600, W = 600, H = 200;

function xPos(ms) { return (ms - MIN) / (MAX - MIN) * W; }

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
  byId('avgCurve').setAttribute('d', curvePath(HUMAN_AVG, HUMAN_SD));
  byId('gamerCurve').setAttribute('d', curvePath(GAMER_AVG, GAMER_SD));
}

function markYou(ms) {
  var x = xPos(Math.max(MIN, Math.min(MAX, ms)));
  var line = byId('youLine');
  var lab = byId('youLabel');
  line.setAttribute('x1', x);
  line.setAttribute('x2', x);
  line.style.display = 'block';
  lab.setAttribute('x', Math.min(x + 6, W - 80));
  lab.setAttribute('y', 24);
  lab.textContent = 'You: ' + ms + 'ms';
  lab.style.display = 'block';
}

/* ---------- Progress line chart ---------- */
function drawProg() {
  var hist = getHistory('reaction');
  var svg = byId('progChart');

  if (hist.length < 2) {
    svg.innerHTML = '<text x="300" y="70" fill="#94a3b8" font-size="12" text-anchor="middle">Play at least 2 sessions to see your progress line</text>';
    return;
  }

  var min = Math.min.apply(null, hist) - 20;
  var max = Math.max.apply(null, hist) + 20;
  var pts = [];
  for (var i = 0; i < hist.length; i++) {
    var x = 50 + i * (500 / (hist.length - 1));
    var y = 25 + ((hist[i] - min) / (max - min)) * 90; // kom ms = upore = better
    pts.push([x, y, hist[i]]);
  }

  var line = '';
  var dots = '';
  for (var j = 0; j < pts.length; j++) {
    line += (j ? ' L' : 'M') + pts[j][0].toFixed(1) + ',' + pts[j][1].toFixed(1);
    dots += '<circle cx="' + pts[j][0] + '" cy="' + pts[j][1] + '" r="4" fill="#22d3ee"/>';
    dots += '<text x="' + pts[j][0] + '" y="' + (pts[j][1] - 10) + '" fill="#94a3b8" font-size="11" text-anchor="middle">' + pts[j][2] + '</text>';
  }

  svg.innerHTML =
    '<path d="' + line + '" fill="none" stroke="#22d3ee" stroke-width="2.5"/>' +
    dots;
}

/* ---------- Best chip ---------- */
function showBestChip() {
  var best = getBest('reaction');
  bestChip.textContent = best !== null ? 'Best: ' + best + ' ms' : 'No record yet';
}

/* ---------- Game logic ---------- */
function startSession() {
  times = [];
  nextRound();
}

function nextRound() {
  state = 'waiting';
  roundInfo.textContent = 'Round ' + (times.length + 1) + '/' + ROUNDS;
  gameBox.className = 'game-box wait';
  gameBox.textContent = 'Wait for green...';
  msg.textContent = '';
  timer = setTimeout(showGreen, 1000 + Math.random() * 3000);
}

function showGreen() {
  state = 'go';
  gameBox.className = 'game-box go';
  gameBox.textContent = 'CLICK NOW!';
  startTime = performance.now();
}

function tooSoon() {
  clearTimeout(timer);
  state = 'between';
  gameBox.className = 'game-box';
  gameBox.textContent = 'Too soon! Click to redo this round.';
}

function finishRound() {
  var t = Math.round(performance.now() - startTime);
  times.push(t);
  if (times.length < ROUNDS) {
    state = 'between';
    gameBox.className = 'game-box';
    gameBox.textContent = t + ' ms — click for next round';
  } else {
    endSession();
  }
}

function endSession() {
  state = 'done';
  var average = avg(times);
  var best = Math.min.apply(null, times);
  lastAvg = average;

  gameBox.className = 'game-box';
  gameBox.textContent = 'Session complete! Click to play again.';
  roundInfo.textContent = '';

  bigScore.textContent = average;
  bigScore.classList.remove('pop');
  void bigScore.offsetWidth;
  bigScore.classList.add('pop');
  pctText.textContent = 'Faster than ' + fasterThan(average) + '% of people';

  markYou(average);
  pushHistory('reaction', average);
  drawProg();

  saveBest('reaction', best, true);
  showBestChip();
  msg.textContent = ratingFor(average);
}

function ratingFor(ms) {
  if (ms < 200) return 'Faster than most humans!';
  if (ms < 250) return 'Great reflexes!';
  if (ms < 320) return 'Average human speed.';
  return 'A bit slow — practice will fix it!';
}

/* ---------- Events ---------- */
gameBox.addEventListener('click', function () {
  if (state === 'idle' || state === 'done') startSession();
  else if (state === 'waiting') tooSoon();
  else if (state === 'go') finishRound();
  else if (state === 'between') nextRound();
});

btnPlay.addEventListener('click', function () {
  startSession();
  gameBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

btnShare.addEventListener('click', function () {
  if (lastAvg === null) { msg.textContent = 'Play one session first!'; return; }
  var text = 'My reaction time: ' + lastAvg + ' ms (faster than ' + fasterThan(lastAvg) + '% of people) on ReflexLab. Beat me!';
  copyText(text).then(function () { msg.textContent = 'Score copied — share it anywhere!'; });
});

/* ---------- Init ---------- */
drawCurves();
drawProg();
showBestChip();
var savedBest = getBest('reaction');
if (savedBest !== null) {
  bigScore.textContent = savedBest;
  pctText.textContent = 'Best: faster than ' + fasterThan(savedBest) + '% of people';
  markYou(savedBest);
}