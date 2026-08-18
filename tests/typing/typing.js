var target = byId('target');
var typeInput = byId('typeInput');
var bigScore = byId('bigScore');
var pctText = byId('pctText');
var bestChip = byId('bestChip');
var btnPlay = byId('btnPlay');
var btnShare = byId('btnShare');
var msg = byId('msg');

var AVG_WPM = 40, AVG_SD = 15;
var PRO_WPM = 80, PRO_SD = 20;

var SAMPLES = [
  "The quick brown fox jumps over the lazy dog while the farmer watches from the field.",
  "Every great journey begins with a single step forward into the unknown world ahead.",
  "Practice makes perfect when you commit to small improvements every single day.",
  "Technology connects us across oceans while simple conversations bridge the gaps between hearts.",
  "Reading books expands the mind far beyond what any single experience could teach alone.",
  "Mountains rise from the earth just as dreams rise from the determined human spirit."
];

var state = 'idle';
var text = '';
var startTime = 0;
var lastWPM = null;

function pickText() { return SAMPLES[Math.floor(Math.random() * SAMPLES.length)]; }

function renderTarget() {
  var typed = typeInput.value;
  var html = '';
  for (var i = 0; i < text.length; i++) {
    var cls = 'pending';
    if (i < typed.length) cls = typed[i] === text[i] ? 'ok' : 'bad';
    else if (i === typed.length) cls = 'current';
    html += '<span class="' + cls + '">' + (text[i] === ' ' ? '&nbsp;' : text[i]) + '</span>';
  }
  target.innerHTML = html;
}

function percentile(val, mean, sd) {
  var z = (val - mean) / sd;
  var t = 1 / (1 + 0.2316419 * Math.abs(z));
  var d = 0.3989423 * Math.exp(-z * z / 2);
  var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  var cdf = z > 0 ? 1 - p : p;
  return Math.round(cdf * 100);
}

var MIN = 0, MAX = 120, W = 600, H = 200;
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
  byId('avgCurve').setAttribute('d', curvePath(AVG_WPM, AVG_SD));
  byId('proCurve').setAttribute('d', curvePath(PRO_WPM, PRO_SD));
}
function markYou(v) {
  var x = xPos(Math.max(MIN, Math.min(MAX, v)));
  var line = byId('youLine');
  var lab = byId('youLabel');
  line.setAttribute('x1', x); line.setAttribute('x2', x);
  line.style.display = 'block';
  lab.setAttribute('x', Math.min(x + 6, W - 80));
  lab.setAttribute('y', 24);
  lab.textContent = 'You: ' + Math.round(v) + ' WPM';
  lab.style.display = 'block';
}
function drawProg() {
  var hist = getHistory('typing');
  var svg = byId('progChart');
  if (hist.length < 2) { svg.innerHTML = '<text x="300" y="70" fill="#94a3b8" font-size="12" text-anchor="middle">Play at least 2 sessions to see your progress line</text>'; return; }
  var min = Math.min.apply(null, hist) - 5;
  var max = Math.max.apply(null, hist) + 5;
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
  var best = getBest('typing');
  bestChip.textContent = best !== null ? 'Best: ' + best + ' WPM' : 'No record yet';
}

function startSession() {
  text = pickText();
  typeInput.value = '';
  typeInput.disabled = false;
  state = 'waiting';
  renderTarget();
  typeInput.focus();
  msg.textContent = '';
}

function endSession() {
  state = 'done';
  typeInput.disabled = true;
  var elapsed = (performance.now() - startTime) / 1000 / 60;
  var chars = text.length;
  var wpm = Math.round((chars / 5) / elapsed);
  lastWPM = wpm;

  bigScore.textContent = wpm;
  bigScore.classList.remove('pop'); void bigScore.offsetWidth; bigScore.classList.add('pop');
  pctText.textContent = 'Faster than ' + percentile(wpm, AVG_WPM, AVG_SD) + '% of typists';
  markYou(wpm);
  pushHistory('typing', wpm);
  drawProg();
  saveBest('typing', wpm, false);
  showBestChip();
  msg.textContent = ratingFor(wpm);
}

function ratingFor(v) {
  if (v >= 80) return 'Professional level!';
  if (v >= 60) return 'Above average!';
  if (v >= 40) return 'Normal typing speed.';
  return 'Keep practicing!';
}

typeInput.addEventListener('input', function () {
  if (state === 'waiting') { state = 'running'; startTime = performance.now(); }
  if (state !== 'running') return;
  renderTarget();
  if (typeInput.value.length >= text.length) endSession();
});

btnPlay.addEventListener('click', startSession);
btnShare.addEventListener('click', function () {
  if (lastWPM === null) { msg.textContent = 'Play one session first!'; return; }
  copyText('My typing speed: ' + lastWPM + ' WPM on ReflexLab. Beat me!')
    .then(function () { msg.textContent = 'Score copied — share it anywhere!'; });
});

drawCurves(); drawProg(); showBestChip();
var savedBest = getBest('typing');
if (savedBest !== null) { bigScore.textContent = savedBest; pctText.textContent = 'Best: faster than ' + percentile(savedBest, AVG_WPM, AVG_SD) + '%'; markYou(savedBest); }