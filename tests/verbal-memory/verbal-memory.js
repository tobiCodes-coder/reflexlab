var gameBox = byId('gameBox');
var btnNew = byId('btnNew');
var btnSeen = byId('btnSeen');
var roundInfo = byId('roundInfo');
var bigScore = byId('bigScore');
var pctText = byId('pctText');
var bestChip = byId('bestChip');
var btnPlay = byId('btnPlay');
var btnShare = byId('btnShare');
var msg = byId('msg');

var AVG = 8, AVG_SD = 3;
var ELITE = 18, ELITE_SD = 5;

var WORDS = [
  'apple', 'river', 'stone', 'tiger', 'cloud', 'maple', 'ember', 'frost', 'grape', 'harbor',
  'ivory', 'juniper', 'koala', 'lemon', 'mango', 'nectar', 'olive', 'pearl', 'quartz', 'raven',
  'silver', 'topaz', 'velvet', 'willow', 'zephyr', 'anchor', 'breeze', 'canyon', 'dawn', 'eagle',
  'falcon', 'glade', 'iris', 'jade', 'kite', 'lark', 'meadow', 'north', 'pine', 'quill',
  'ridge', 'snow', 'trail', 'unity', 'vale', 'wave', 'birch', 'cedar', 'dune', 'elm',
  'fern', 'grove', 'hazel', 'island', 'jasmine', 'lava', 'moss', 'nova', 'orchid', 'poppy'
];

var state = 'idle';
var score = 0;
var seenWords = [];
var currentWord = '';
var currentIsNew = true;
var lastScore = null;

function percentile(val, mean, sd) {
  var z = (val - mean) / sd;
  var t = 1 / (1 + 0.2316419 * Math.abs(z));
  var d = 0.3989423 * Math.exp(-z * z / 2);
  var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  var cdf = z > 0 ? 1 - p : p;
  return Math.round(cdf * 100);
}
var MIN = 0, MAX = 25, W = 600, H = 200;
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
  var hist = getHistory('verbal-memory');
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
  var best = getBest('verbal-memory');
  bestChip.textContent = best !== null ? 'Best: ' + best + ' words' : 'No record yet';
}

function startSession() {
  score = 0;
  seenWords = [];
  nextWord();
}

function nextWord() {
  var repeatChance = Math.min(0.2 + score * 0.06, 0.7);
  if (seenWords.length > 0 && Math.random() < repeatChance) {
    currentWord = seenWords[Math.floor(Math.random() * seenWords.length)];
    currentIsNew = false;
  } else {
    currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    currentIsNew = true;
  }
  gameBox.textContent = currentWord;
  btnNew.disabled = false;
  btnSeen.disabled = false;
  state = 'playing';
  roundInfo.textContent = 'Score: ' + score;
}

function answer(userSaysNew) {
  if (state !== 'playing') return;
  btnNew.disabled = true;
  btnSeen.disabled = true;
  if (currentIsNew === userSaysNew) {
    score++;
    if (currentIsNew) seenWords.push(currentWord);
    setTimeout(nextWord, 300);
  } else {
    endSession();
  }
}

function endSession() {
  state = 'done';
  lastScore = score;
  btnNew.disabled = true;
  btnSeen.disabled = true;
  roundInfo.textContent = '';
  bigScore.textContent = score;
  bigScore.classList.remove('pop'); void bigScore.offsetWidth; bigScore.classList.add('pop');
  pctText.textContent = 'Better than ' + percentile(score, AVG, AVG_SD) + '% of users';
  markYou(score);
  pushHistory('verbal-memory', score);
  drawProg();
  saveBest('verbal-memory', score, false);
  showBestChip();
  msg.textContent = ratingFor(score);
}

function ratingFor(v) {
  if (v >= 18) return 'Elite verbal memory!';
  if (v >= 12) return 'Above average!';
  if (v >= 7) return 'Average verbal memory.';
  return 'Keep training!';
}

btnNew.addEventListener('click', function () { answer(true); });
btnSeen.addEventListener('click', function () { answer(false); });
btnPlay.addEventListener('click', startSession);
btnShare.addEventListener('click', function () {
  if (lastScore === null) { msg.textContent = 'Play one session first!'; return; }
  copyText('I got ' + lastScore + ' words right on ReflexLab Verbal Memory. Beat me!')
    .then(function () { msg.textContent = 'Score copied — share it anywhere!'; });
});

drawCurves(); drawProg(); showBestChip();
var savedBest = getBest('verbal-memory');
if (savedBest !== null) { bigScore.textContent = savedBest; pctText.textContent = 'Best: better than ' + percentile(savedBest, AVG, AVG_SD) + '%'; markYou(savedBest); }