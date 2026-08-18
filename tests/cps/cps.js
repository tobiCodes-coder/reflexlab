/* ============================================
   REFLEXLAB - CLICK SPEED (CPS) TEST
   Flow: idle -> running -> done
   ============================================ */

var gameBox = byId('gameBox');
var liveWrap = byId('liveWrap');
var liveClicks = byId('liveClicks');
var liveTime = byId('liveTime');
var scoreWrap = byId('scoreWrap');
var scoreBig = byId('scoreBig');
var btnRetry = byId('btnRetry');
var btnShare = byId('btnShare');
var bestBadge = byId('bestBadge');
var msg = byId('msg');
var durBtns = document.querySelectorAll('.dur-btn');

var state = 'idle';    // idle | running | done
var duration = 5;      // default 5 second
var clicks = 0;
var startTime = 0;
var timer = null;
var lastScore = null;

/* Best badge dekhano */
function showBest() {
  var best = getBest('cps');
  bestBadge.textContent = best !== null ? 'Best: ' + best + ' CPS' : 'No record yet';
}

/* Reset: start state */
function resetBox() {
  state = 'idle';
  clicks = 0;
  gameBox.className = 'game-box';
  gameBox.textContent = 'Click to start (' + duration + ' sec test)';
  liveWrap.style.display = 'none';
  scoreWrap.style.display = 'none';
  msg.textContent = '';
}

/* Time button select kora */
for (var i = 0; i < durBtns.length; i++) {
  durBtns[i].addEventListener('click', function () {
    if (state === 'running') return; // running e change kora jabe na
    duration = Number(this.getAttribute('data-sec'));
    for (var j = 0; j < durBtns.length; j++) {
      durBtns[j].className = 'btn btn-ghost dur-btn';
    }
    this.className = 'btn btn-primary dur-btn';
    resetBox();
  });
}

/* Test shuru (first click o count hobe) */
function startTest() {
  state = 'running';
  clicks = 1;
  startTime = performance.now();
  gameBox.className = 'game-box go';
  gameBox.textContent = 'CLICK CLICK CLICK!';
  liveWrap.style.display = 'block';
  scoreWrap.style.display = 'none';
  updateLive();
  timer = setInterval(checkTime, 100); // 10x per second check
}

/* Live counter update */
function updateLive() {
  var elapsed = (performance.now() - startTime) / 1000;
  var left = Math.max(0, duration - elapsed);
  liveClicks.textContent = clicks;
  liveTime.textContent = left.toFixed(1);
}

/* Time sesh kina check */
function checkTime() {
  updateLive();
  var elapsed = (performance.now() - startTime) / 1000;
  if (elapsed >= duration) endTest();
}

/* Sesh: CPS hishab */
function endTest() {
  clearInterval(timer);
  state = 'done';
  var cps = round(clicks / duration, 1);
  lastScore = cps;

  gameBox.className = 'game-box';
  gameBox.textContent = 'Time up! Click to play again.';
  liveWrap.style.display = 'none';
  scoreWrap.style.display = 'block';
  scoreBig.textContent = cps + ' CPS';

  var isNewBest = saveBest('cps', cps, false); // false = beshi score bhalo
  msg.textContent = isNewBest ? 'New personal best!' : ratingFor(cps);
  showBest();
}

/* CPS rating */
function ratingFor(cps) {
  if (cps < 5) return 'Warm up those fingers!';
  if (cps < 7) return 'Average human speed.';
  if (cps < 9) return 'Fast fingers!';
  return 'Pro gamer level!';
}

/* Box click handler */
gameBox.addEventListener('click', function () {
  if (state === 'idle' || state === 'done') startTest();
  else if (state === 'running') {
    clicks++;
    updateLive();
  }
});

/* Try again button */
btnRetry.addEventListener('click', resetBox);

/* Share button */
btnShare.addEventListener('click', function () {
  if (lastScore === null) {
    msg.textContent = 'Play one round first!';
    return;
  }
  var text = 'My click speed is ' + lastScore + ' CPS on ReflexLab. Can you beat me?';
  copyText(text).then(function () {
    msg.textContent = 'Score copied — share it anywhere!';
  });
});

/* Page load */
showBest();
resetBox();