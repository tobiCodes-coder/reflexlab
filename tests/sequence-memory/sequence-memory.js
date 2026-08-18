/* ============================================
   REFLEXLAB - SEQUENCE MEMORY
   Flow: idle -> showing -> input -> (next level / done)
   ============================================ */

var gameBox = byId('gameBox');
var inputWrap = byId('inputWrap');
var seqInput = byId('seqInput');
var scoreWrap = byId('scoreWrap');
var scoreBig = byId('scoreBig');
var btnRetry = byId('btnRetry');
var btnShare = byId('btnShare');
var bestBadge = byId('bestBadge');
var msg = byId('msg');

var state = 'idle';    // idle | showing | input | between | done
var sequence = [];     // digit gulo
var level = 1;
var lastScore = null;

/* Random 0-9 digit */
function randDigit() {
  return Math.floor(Math.random() * 10);
}

/* Best badge */
function showBest() {
  var best = getBest('sequence-memory');
  bestBadge.textContent = best !== null ? 'Best: level ' + best : 'No record yet';
}

/* Reset */
function resetGame() {
  state = 'idle';
  sequence = [];
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
  sequence = [randDigit()];
  nextRound();
}

/* Number dekhano, tarpor input phase */
function nextRound() {
  state = 'showing';
  seqInput.value = '';
  inputWrap.style.display = 'none';
  scoreWrap.style.display = 'none';

  // Number boro kore dekhao
  gameBox.className = 'game-box seq';
  gameBox.textContent = sequence.join('');

  // Joto boro sequence, toto beshi dekhano time
  var showTime = 500 + sequence.length * 800;

  setTimeout(function () {
    if (state !== 'showing') return; // safety
    state = 'input';
    gameBox.className = 'game-box';
    gameBox.textContent = 'Type the sequence!';
    inputWrap.style.display = 'flex';
    seqInput.focus();
  }, showTime);
}

/* Input check: puro length hole auto-check */
seqInput.addEventListener('input', function () {
  if (state !== 'input') return;

  // Shudhu digit rakho
  var v = seqInput.value.replace(/\D/g, '');
  seqInput.value = v;

  if (v.length === sequence.length) {
    checkAnswer(v);
  }
});

/* Sohoj naki vul */
function checkAnswer(v) {
  if (v === sequence.join('')) {
    // Sohoj: level barao, notun digit jog koro
    level++;
    sequence.push(randDigit());
    state = 'between';
    inputWrap.style.display = 'none';
    msg.textContent = 'Correct! Level ' + level;
    setTimeout(nextRound, 800);
  } else {
    endGame();
  }
}

/* Sesh: score = jotogula level clear koreche */
function endGame() {
  state = 'done';
  var score = level - 1;
  lastScore = score;

  inputWrap.style.display = 'none';
  gameBox.className = 'game-box';
  gameBox.textContent = 'It was: ' + sequence.join('');
  scoreWrap.style.display = 'block';
  scoreBig.textContent = score;

  var isNewBest = saveBest('sequence-memory', score, false); // beshi = bhalo
  msg.textContent = isNewBest ? 'New personal best!' : ratingFor(score);
  showBest();
}

/* Memory rating */
function ratingFor(lvl) {
  if (lvl < 4) return 'Warm up that memory!';
  if (lvl < 7) return 'Average memory.';
  if (lvl < 10) return 'Strong memory!';
  return 'Photographic memory?!';
}

/* Box click: start / restart */
gameBox.addEventListener('click', function () {
  if (state === 'idle' || state === 'done') startGame();
});

/* Try again */
btnRetry.addEventListener('click', resetGame);

/* Share */
btnShare.addEventListener('click', function () {
  if (lastScore === null) {
    msg.textContent = 'Play one round first!';
    return;
  }
  var text = 'I cleared level ' + lastScore + ' on ReflexLab Sequence Memory. Beat me!';
  copyText(text).then(function () {
    msg.textContent = 'Score copied — share it anywhere!';
  });
});

/* Page load */
showBest();
resetGame();