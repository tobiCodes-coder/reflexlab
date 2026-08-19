var gameBox = byId('gameBox');
var numInput = byId('numInput');
var roundInfo = byId('roundInfo');
var bigScore = byId('bigScore');
var pctText = byId('pctText');
var bestChip = byId('bestChip');
var btnPlay = byId('btnPlay');
var btnShare = byId('btnShare');
var msg = byId('msg');

var state = 'idle';
var level = 1;
var currentNum = '';
var lastScore = null;
var showTimer = null;
var nextTimer = null;

function makeNumber(digits) {
  var s = String(1 + Math.floor(Math.random() * 9));
  for (var i = 1; i < digits; i++) s += Math.floor(Math.random() * 10);
  return s;
}

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
    { label: 'Average humans', value: 7, cls: 'avg' },
    { label: 'Elite memory', value: 13, cls: 'pro' },
    { label: 'You', value: youVal, cls: 'you' }
  ], 'digits');
}

function drawProg() {
  var hist = getHistory('number-memory');
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
  var best = getBest('number-memory');
  bestChip.textContent = best !== null ? 'Best: ' + best + ' digits' : 'No record yet';
}

function clearTimers() {
  if (showTimer) { clearTimeout(showTimer); showTimer = null; }
  if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
}

function startSession() {
  clearTimers();
  level = 1;
  nextLevel();
}

function nextLevel() {
  clearTimers();
  currentNum = makeNumber(level);
  state = 'showing';
  numInput.disabled = true;
  numInput.value = '';
  gameBox.textContent = currentNum;
  roundInfo.textContent = 'Level ' + level + ' — memorize the number (' + level + ' digits)';
  showTimer = setTimeout(function () {
    showTimer = null;
    gameBox.textContent = 'Type the number!';
    numInput.disabled = false;
    numInput.focus();
    state = 'input';
  }, 1000 + level * 500);
}

function endSession() {
  state = 'done';
  var score = level - 1;
  lastScore = score;
  numInput.disabled = true;
  gameBox.textContent = 'It was: ' + currentNum;
  roundInfo.textContent = '';
  bigScore.textContent = score;
  bigScore.classList.remove('pop'); void bigScore.offsetWidth; bigScore.classList.add('pop');
  pctText.textContent = 'Better than ' + percentile(score, 7, 2) + '% of users';
  updateCompare(score);
  pushHistory('number-memory', score);
  drawProg();
  saveBest('number-memory', score, false);
  showBestChip();
  msg.textContent = ratingFor(score);
}

function ratingFor(v) {
  if (v >= 13) return 'Elite memory!';
  if (v >= 9) return 'Above average!';
  if (v >= 6) return 'Average (human limit ~7).';
  return 'Keep training!';
}

numInput.addEventListener('input', function () {
  if (state !== 'input') return;
  numInput.value = numInput.value.replace(/\D/g, '');
  if (numInput.value.length === currentNum.length) {
    if (numInput.value === currentNum) {
      level++;
      nextTimer = setTimeout(nextLevel, 500);
    } else {
      endSession();
    }
  }
});

btnPlay.addEventListener('click', startSession);
btnShare.addEventListener('click', function () {
  if (lastScore === null) { msg.textContent = 'Play one session first!'; return; }
  copyText('I remembered ' + lastScore + ' digits on ReflexLab Number Memory. Beat me!')
    .then(function () { msg.textContent = 'Score copied — share it anywhere!'; });
});

var savedBest = getBest('number-memory');
updateCompare(savedBest);
drawProg(); showBestChip();
if (savedBest !== null) { bigScore.textContent = savedBest; pctText.textContent = 'Best: better than ' + percentile(savedBest, 7, 2) + '%'; }