/* ============================================
   REFLEXLAB - NUMBER MEMORY
   Flow: idle -> showing -> input -> (next / done)
   Note: ekhane time limit NEI — nije ready hole click korben
   ============================================ */

var gameBox = byId('gameBox');
var inputWrap = byId('inputWrap');
var numInput = byId('numInput');
var scoreWrap = byId('scoreWrap');
var scoreBig = byId('scoreBig');
var btnRetry = byId('btnRetry');
var btnShare = byId('btnShare');
var bestBadge = byId('bestBadge');
var msg = byId('msg');

var state = 'idle';     // idle | showing | input | between | done
var level = 1;          // level = koy digit
var currentNum = '';
var lastScore = null;

/* N digit er random number (first digit 0 na) */
function makeNumber(digits) {
  var s = String(1 + Math.floor(Math.random() * 9));
  for (var i = 1; i < digits; i++) {
    s += Math.floor(Math.random() * 10);
  }
  return s;
}

/* Best badge */
function showBest() {
  var best = getBest('number-memory');
  bestBadge.textContent = best !== null ? 'Best: ' + best + ' digits' : 'No record yet';
}

/* Reset */
function resetGame() {
  state = 'idle';
  level = 1;
  gameBox.className = 'game-box';
  gameBox.textContent = 'Click to start';
  inputWrap.style.display = 'none';
  scoreWrap.style.display = 'none';
  msg.textContent = '';
}

/* Game shuru */
function startGame() {
  level = 1;
  nextRound();
}

/* Number dekhano */
function nextRound() {
  state = 'showing';
  currentNum = makeNumber(level);

  inputWrap.style.display = 'none';
  scoreWrap.style.display = 'none';
  gameBox.className = 'game-box seq';
  gameBox.textContent = currentNum;
  msg.textContent = 'Memorize it, then click the box.';
}

/* Input phase: number lukao, input anao */
function startInput() {
  state = 'input';
  numInput.value = '';
  gameBox.className = 'game-box';
  gameBox.textContent = 'Type the number!';
  inputWrap.style.display = 'flex';
  numInput.focus();
}

/* Input auto-check: length match hole */
numInput.addEventListener('input', function () {
  if (state !== 'input') return;

  var v = numInput.value.replace(/\D/g, '');
  numInput.value = v;

  if (v.length === currentNum.length) {
    if (v === currentNum) {
      // Sohoj: next level
      level++;
      state = 'between';
      inputWrap.style.display = 'none';
      msg.textContent = 'Correct! Now ' + level + ' digits...';
      setTimeout(nextRound, 800);
    } else {
      endGame();
    }
  }
});

/* Sesh */
function endGame() {
  state = 'done';
  var score = level - 1;
  lastScore = score;

  inputWrap.style.display = 'none';
  gameBox.className = 'game-box';
  gameBox.textContent = 'It was: ' + currentNum;
  scoreWrap.style.display = 'block';
  scoreBig.textContent = score;

  var isNewBest = saveBest('number-memory', score, false); // beshi = bhalo
  msg.textContent = isNewBest ? 'New personal best!' : ratingFor(score);
  showBest();
}

/* Rating */
function ratingFor(digits) {
  if (digits < 5) return 'Warm up that brain!';
  if (digits < 8) return 'Average memory (human limit ~7).';
  if (digits < 11) return 'Strong memory!';
  return 'Superhuman memory!';
}

/* Box click: state onujayi */
gameBox.addEventListener('click', function () {
  if (state === 'idle' || state === 'done') startGame();
  else if (state === 'showing') startInput(); // ready = click
});

/* Try again */
btnRetry.addEventListener('click', resetGame);

/* Share */
btnShare.addEventListener('click', function () {
  if (lastScore === null) {
    msg.textContent = 'Play one round first!';
    return;
  }
  var text = 'I remembered ' + lastScore + ' digits on ReflexLab Number Memory. Beat me!';
  copyText(text).then(function () {
    msg.textContent = 'Score copied — share it anywhere!';
  });
});

/* Page load */
showBest();
resetGame();