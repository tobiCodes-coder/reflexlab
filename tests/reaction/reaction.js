var gameBox = byId('gameBox');
var roundInfo = byId('roundInfo');
var bigScore = byId('bigScore');
var pctText = byId('pctText');
var bestChip = byId('bestChip');
var btnPlay = byId('btnPlay');
var btnShare = byId('btnShare');
var msg = byId('msg');

var ROUNDS = 5;
var HUMAN_AVG = 273;
var GAMER_AVG = 200;

var state = 'idle';
var timer = null;
var startTime = 0;
var times = [];
var lastAvg = null;

/* ---------- Percentile ---------- */
function fasterThan(ms) {
  var z = (ms - HUMAN_AVG) / 60;
  var t = 1 / (1 + 0.2316419 * Math.abs(z));
  var d = 0.3989423 * Math.exp(-z * z / 2);
  var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  var cdf = z > 0 ? 1 - p : p;
  return Math.round((1 - cdf) * 100);
}

/* ---------- Comparison bars ---------- */
function updateCompare(youVal) {
  byId('compareBox').innerHTML = renderCompare([
    { label: 'Average users', value: HUMAN_AVG, cls: 'avg' },
    { label: 'Pro gamers', value: GAMER_AVG, cls: 'pro' },
    { label: 'You', value: youVal, cls: 'you' }
  ], 'ms');
}

/* ---------- Progress line ---------- */
function drawProg() {
  var hist = getHistory('reaction');
  var svg = byId('progChart');
  if (hist.length < 2) {
    svg.innerHTML = '<text x="300" y="70" fill="#94a3b8" font-size="12" text-anchor="middle">Play at least 2 sessions to see your progress line</text>';
    return;
  }
  var min = Math.min.apply(null, hist) - 20;
  var max = Math.max.apply(null, hist) + 20;
  var bestVal = Math.min.apply(null, hist);

  /* horizontal grid lines (4 bands) + Y labels */
  var grid = '';
  var GRID_LINES = 4;
  for (var g = 0; g <= GRID_LINES; g++) {
    var gy = 25 + (g / GRID_LINES) * 90;
    var gVal = Math.round(max - (g / GRID_LINES) * (max - min));
    grid += '<line x1="45" y1="' + gy + '" x2="560" y2="' + gy + '" stroke="#1e293b" stroke-width="1"/>';
    grid += '<text x="38" y="' + (gy + 3) + '" fill="#64748b" font-size="9" text-anchor="end">' + gVal + '</text>';
  }

  var pts = [], dots = '';
  for (var i = 0; i < hist.length; i++) {
    var x = 50 + i * (500 / (hist.length - 1));
    var y = 25 + ((hist[i] - min) / (max - min)) * 90;
    pts.push(x.toFixed(1) + ',' + y.toFixed(1));

    var isBest = hist[i] === bestVal;
    var dotColor = isBest ? '#22c55e' : '#22d3ee';
    var dotR = isBest ? 6 : 4;

    dots += '<circle cx="' + x + '" cy="' + y + '" r="' + dotR + '" fill="' + dotColor + '">' +
      '<title>Session ' + (i + 1) + ': ' + hist[i] + ' ms' + (isBest ? ' (best)' : '') + '</title>' +
      '</circle>';
    dots += '<text x="' + x + '" y="' + (y - 12) + '" fill="#94a3b8" font-size="11" text-anchor="middle">' + hist[i] + '</text>';
  }
  svg.innerHTML = grid + '<path d="M' + pts.join(' L') + '" fill="none" stroke="#22d3ee" stroke-width="2.5"/>' + dots;
}

function showBestChip() {
  var best = getBest('reaction');
  bestChip.textContent = best !== null ? 'Best: ' + best + ' ms' : 'No record yet';
}

/* ---------- Game logic ---------- */
function startSession() { times = []; nextRound(); }

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
  bigScore.classList.remove('pop'); void bigScore.offsetWidth; bigScore.classList.add('pop');
  pctText.textContent = 'Faster than ' + fasterThan(average) + '% of people';

  updateCompare(average);
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

function handleGameBoxAction() {
  if (state === 'idle' || state === 'done') startSession();
  else if (state === 'waiting') tooSoon();
  else if (state === 'go') finishRound();
  else if (state === 'between') nextRound();
}

gameBox.addEventListener('click', handleGameBoxAction);

gameBox.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
    e.preventDefault(); /* stop page scroll on space */
    handleGameBoxAction();
  }
});

btnPlay.addEventListener('click', function () {
  startSession();
  gameBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

btnShare.addEventListener('click', function () {
  if (lastAvg === null) { msg.textContent = 'Play one session first!'; return; }
  copyText('My reaction time: ' + lastAvg + ' ms (faster than ' + fasterThan(lastAvg) + '% of people) on ReflexLab. Beat me!')
    .then(function () { msg.textContent = 'Score copied — share it anywhere!'; });
});

/* ---------- Init ---------- */
updateCompare(getBest('reaction'));
drawProg();
showBestChip();
var savedBest = getBest('reaction');
if (savedBest !== null) {
  bigScore.textContent = savedBest;
  pctText.textContent = 'Best: faster than ' + fasterThan(savedBest) + '% of people';
}