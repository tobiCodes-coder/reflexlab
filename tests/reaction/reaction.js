/* ============================================
   REFLEXLAB - REACTION TIME TEST
   Flow: idle -> waiting (red) -> go (green) -> result
   ============================================ */

var gameBox = byId('gameBox');
var scoreWrap = byId('scoreWrap');
var scoreBig = byId('scoreBig');
var btnRetry = byId('btnRetry');
var btnShare = byId('btnShare');
var bestBadge = byId('bestBadge');
var msg = byId('msg');

var state = 'idle';     // idle | waiting | go | result
var timer = null;       // setTimeout id
var startTime = 0;      // green dekhano r time
var lastScore = null;   // sesh score (ms)

/* Personal best badge dekhano */
function showBest() {
  var best = getBest('reaction');
  if (best !== null) {
    bestBadge.textContent = 'Best: ' + best + ' ms';
  } else {
    bestBadge.textContent = 'No record yet';
  }
}

/* Box ke start state e niye asha */
function resetBox() {
  state = 'idle';
  gameBox.className = 'game-box';
  gameBox.textContent = 'Click to start';
  scoreWrap.style.display = 'none';
  msg.textContent = '';
}

/* Round shuru: red box + random delay */
function startRound() {
  state = 'waiting';
  gameBox.className = 'game-box wait';
  gameBox.textContent = 'Wait for green...';
  msg.textContent = '';

  var delay = 1000 + Math.random() * 3000; // 1-4 second random
  timer = setTimeout(showGreen, delay);
}

/* Green! Timer shuru */
function showGreen() {
  state = 'go';
  gameBox.className = 'game-box go';
  gameBox.textContent = 'CLICK NOW!';
  startTime = performance.now();
}

/* Age click kore feleche */
function tooSoon() {
  clearTimeout(timer);
  state = 'result';
  gameBox.className = 'game-box';
  gameBox.textContent = 'Too soon! Click to try again.';
  msg.textContent = 'You clicked before green. Focus!';
}

/* Green e click: score hishab */
function finishRound() {
  var time = performance.now() - startTime;
  lastScore = Math.round(time);

  state = 'result';
  gameBox.className = 'game-box';
  gameBox.textContent = 'Click to play again';

  scoreWrap.style.display = 'block';
  scoreBig.textContent = lastScore + ' ms';

  var isNewBest = saveBest('reaction', lastScore, true); // true = kom score bhalo
  msg.textContent = isNewBest ? 'New personal best!' : ratingFor(lastScore);
  showBest();
}

/* Score onujayi human-friendly comment */
function ratingFor(ms) {
  if (ms < 200) return 'Faster than most humans!';
  if (ms < 250) return 'Great reflexes!';
  if (ms < 350) return 'Average human speed.';
  return 'A bit slow — try again!';
}

/* Main click handler: state onujayi alada kaj */
gameBox.addEventListener('click', function () {
  if (state === 'idle' || state === 'result') startRound();
  else if (state === 'waiting') tooSoon();
  else if (state === 'go') finishRound();
});

/* Try again button */
btnRetry.addEventListener('click', resetBox);

/* Share button: score copy kore */
btnShare.addEventListener('click', function () {
  if (lastScore === null) {
    msg.textContent = 'Play one round first!';
    return;
  }
  var text = 'My reaction time is ' + lastScore + ' ms on ReflexLab. Can you beat me?';
  copyText(text).then(function () {
    msg.textContent = 'Score copied — share it anywhere!';
  });
});

/* Page load hole best badge dekhao */
showBest();