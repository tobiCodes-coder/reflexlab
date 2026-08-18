/* ============================================
   REFLEXLAB - TYPING SPEED TEST
   Flow: idle -> running -> done
   ============================================ */

var targetText = byId('targetText');
var typeInput = byId('typeInput');
var liveWrap = byId('liveWrap');
var liveTime = byId('liveTime');
var liveWpm = byId('liveWpm');
var scoreWrap = byId('scoreWrap');
var scoreBig = byId('scoreBig');
var accText = byId('accText');
var btnRetry = byId('btnRetry');
var btnShare = byId('btnShare');
var bestBadge = byId('bestBadge');
var msg = byId('msg');
var durBtns = document.querySelectorAll('.dur-btn');

/* Typing er jonno short sentences */
var SENTENCES = [
  'the quick brown fox jumps over the lazy dog',
  'practice makes a man perfect every single day',
  'code is like humor when you have to explain it',
  'a journey of a thousand miles begins with a step',
  'simple things should be simple and complex things possible',
  'the best way to predict the future is to invent it',
  'talk is cheap show me the code line by line',
  'first solve the problem then write the code fast',
  'speed matters but accuracy matters even more today',
  'keep your face to the sunshine and you cannot see a shadow'
];

var state = 'idle';     // idle | running | done
var duration = 30;      // default 30 sec
var target = '';
var startTime = 0;
var timer = null;
var lastWpm = null;
var lastAcc = null;

/* Best badge */
function showBest() {
  var best = getBest('typing');
  bestBadge.textContent = best !== null ? 'Best: ' + best + ' WPM' : 'No record yet';
}

/* HTML char escape (safe render) */
function escapeChar(c) {
  if (c === '<') return '&lt;';
  if (c === '>') return '&gt;';
  if (c === '&') return '&amp;';
  return c;
}

/* Target text ke span e bhag kora (character highlight) */
function renderTarget() {
  var html = '';
  for (var i = 0; i < target.length; i++) {
    var ch = target[i] === ' ' ? '&nbsp;' : escapeChar(target[i]);
    html += '<span>' + ch + '</span>';
  }
  targetText.innerHTML = html;
}

/* Reset + notun text (chahle) */
function resetTest(newText) {
  state = 'idle';
  if (newText || !target) {
    target = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
  }
  renderTarget();
  typeInput.value = '';
  typeInput.disabled = false;
  liveWrap.style.display = 'none';
  scoreWrap.style.display = 'none';
  msg.textContent = '';
}

/* Prottek character compare + highlight */
function updateChars() {
  var typed = typeInput.value;
  var spans = targetText.children;
  var correct = 0;

  for (var i = 0; i < spans.length; i++) {
    spans[i].className = '';
    if (i < typed.length) {
      if (typed[i] === target[i]) {
        spans[i].className = 'ok';
        correct++;
      } else {
        spans[i].className = 'bad';
      }
    } else if (i === typed.length) {
      spans[i].className = 'current'; // cursor position
    }
  }

  // Live WPM update
  var minutes = (performance.now() - startTime) / 60000;
  if (minutes > 0.01) {
    liveWpm.textContent = Math.round((correct / 5) / minutes);
  }

  // Puro text sesh hole test sesh
  if (typed.length >= target.length) endTest();
}

/* Timer check */
function checkTime() {
  var elapsed = (performance.now() - startTime) / 1000;
  var left = Math.max(0, duration - elapsed);
  liveTime.textContent = Math.ceil(left);
  if (left <= 0) endTest();
}

/* Sesh: WPM + accuracy hishab */
function endTest() {
  clearInterval(timer);
  state = 'done';
  typeInput.disabled = true;

  var typed = typeInput.value;
  var correct = 0;
  for (var i = 0; i < target.length; i++) {
    if (i < typed.length && typed[i] === target[i]) correct++;
  }

  var seconds = Math.min(duration, (performance.now() - startTime) / 1000);
  var minutes = seconds / 60;
  var wpm = minutes > 0 ? Math.round((correct / 5) / minutes) : 0;
  var acc = typed.length > 0 ? Math.round((correct / typed.length) * 100) : 100;

  lastWpm = wpm;
  lastAcc = acc;

  scoreWrap.style.display = 'block';
  scoreBig.textContent = wpm + ' WPM';
  accText.textContent = acc + '%';

  var isNewBest = saveBest('typing', wpm, false); // beshi = bhalo
  msg.textContent = isNewBest ? 'New personal best!' : ratingFor(wpm);
  showBest();
}

/* WPM rating */
function ratingFor(wpm) {
  if (wpm < 25) return 'Keep practicing daily!';
  if (wpm < 40) return 'Average typing speed.';
  if (wpm < 60) return 'Fast typist!';
  return 'Professional level!';
}

/* Typing shuru korlei timer on */
typeInput.addEventListener('input', function () {
  if (state === 'done') return;
  if (state === 'idle') {
    state = 'running';
    startTime = performance.now();
    liveWrap.style.display = 'block';
    timer = setInterval(checkTime, 100);
  }
  updateChars();
});

/* Target e click korle input focus */
targetText.addEventListener('click', function () {
  typeInput.focus();
});

/* Time button select */
for (var i = 0; i < durBtns.length; i++) {
  durBtns[i].addEventListener('click', function () {
    if (state === 'running') return;
    duration = Number(this.getAttribute('data-sec'));
    for (var j = 0; j < durBtns.length; j++) {
      durBtns[j].className = 'btn btn-ghost dur-btn';
    }
    this.className = 'btn btn-primary dur-btn';
    resetTest(false);
  });
}

/* New text button */
btnRetry.addEventListener('click', function () {
  resetTest(true);
  typeInput.focus();
});

/* Share button */
btnShare.addEventListener('click', function () {
  if (lastWpm === null) {
    msg.textContent = 'Play one round first!';
    return;
  }
  var text = 'I type ' + lastWpm + ' WPM with ' + lastAcc + '% accuracy on ReflexLab. Beat me!';
  copyText(text).then(function () {
    msg.textContent = 'Score copied — share it anywhere!';
  });
});

/* Page load */
showBest();
resetTest(true);