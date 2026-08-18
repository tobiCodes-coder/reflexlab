/* ============================================
   REFLEXLAB - VERBAL MEMORY
   Word dekhe answer: NEW naki SEEN BEFORE?
   Round joto barbe, repeat er chance o barbe
   ============================================ */

var gameBox = byId('gameBox');
var btnNew = byId('btnNew');
var btnSeen = byId('btnSeen');
var scoreWrap = byId('scoreWrap');
var scoreBig = byId('scoreBig');
var btnRetry = byId('btnRetry');
var btnShare = byId('btnShare');
var bestBadge = byId('bestBadge');
var msg = byId('msg');

/* Simple English word list */
var WORDS = [
  'apple', 'river', 'stone', 'tiger', 'cloud', 'maple', 'ember', 'frost', 'grape', 'harbor',
  'ivory', 'juniper', 'koala', 'lemon', 'mango', 'nectar', 'olive', 'pearl', 'quartz', 'raven',
  'silver', 'topaz', 'velvet', 'willow', 'zephyr', 'anchor', 'breeze', 'canyon', 'dawn', 'eagle',
  'falcon', 'glade', 'iris', 'jade', 'kite', 'lark', 'meadow', 'north', 'pine', 'quill',
  'ridge', 'snow', 'trail', 'unity', 'vale', 'wave', 'birch', 'cedar', 'dune', 'elm',
  'fern', 'grove', 'hazel', 'island', 'jasmine', 'lava', 'moss', 'nova', 'orchid', 'poppy'
];

var state = 'idle';      // idle | playing | done
var score = 0;
var seenWords = [];      // ja ja dekhechi
var currentWord = '';
var currentIsNew = true;
var lastScore = null;

/* Best badge */
function showBest() {
  var best = getBest('verbal-memory');
  bestBadge.textContent = best !== null ? 'Best: ' + best + ' words' : 'No record yet';
}

/* Reset */
function resetGame() {
  state = 'idle';
  score = 0;
  seenWords = [];
  gameBox.className = 'game-box';
  gameBox.textContent = 'Click to start';
  btnNew.disabled = true;
  btnSeen.disabled = true;
  scoreWrap.style.display = 'none';
  msg.textContent = '';
}

/* Game shuru */
function startGame() {
  score = 0;
  seenWords = [];
  nextWord();
}

/* Notun word pick: new naki repeat */
function nextWord() {
  state = 'playing';

  // Round joto boro, repeat chance toto beshi (max 70%)
  var repeatChance = Math.min(0.2 + score * 0.06, 0.7);

  if (seenWords.length > 0 && Math.random() < repeatChance) {
    // Age dekhano word abar dekhano
    currentWord = seenWords[Math.floor(Math.random() * seenWords.length)];
    currentIsNew = false;
  } else {
    // Ekdom notun word
    currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    currentIsNew = true;
  }

  gameBox.className = 'game-box word';
  gameBox.textContent = currentWord;
  btnNew.disabled = false;
  btnSeen.disabled = false;
}

/* User er answer check */
function answer(userSaysNew) {
  if (state !== 'playing') return;
  btnNew.disabled = true;
  btnSeen.disabled = true;

  var correct = (currentIsNew === userSaysNew);

  if (correct) {
    score++;
    if (currentIsNew) seenWords.push(currentWord);
    msg.textContent = 'Correct! Streak: ' + score;
    setTimeout(nextWord, 400);
  } else {
    // Vul — explanation dekhao
    msg.textContent = currentIsNew
      ? 'That was a NEW word!'
      : 'You had seen "' + currentWord + '" before!';
    endGame();
  }
}

/* Sesh */
function endGame() {
  state = 'done';
  lastScore = score;

  btnNew.disabled = true;
  btnSeen.disabled = true;
  scoreWrap.style.display = 'block';
  scoreBig.textContent = score;

  var isNewBest = saveBest('verbal-memory', score, false); // beshi = bhalo
  if (!isNewBest) msg.textContent += ' Final: ' + score;
  showBest();
}

/* Buttons */
btnNew.addEventListener('click', function () { answer(true); });
btnSeen.addEventListener('click', function () { answer(false); });

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
  var text = 'I got ' + lastScore + ' words right on ReflexLab Verbal Memory. Beat me!';
  copyText(text).then(function () {
    msg.textContent = 'Score copied — share it anywhere!';
  });
});

/* Page load */
showBest();
resetGame();