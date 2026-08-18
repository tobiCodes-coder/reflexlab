/* ============================================
   REFLEXLAB - COLOR VISION
   Ekta tile ektu alada color — khujhe ber korun
   Prottek level e: grid boro hoy + parthokko kome
   ============================================ */

var gameBox = byId('gameBox');
var boxMsg = byId('boxMsg');
var memGrid = byId('memGrid');
var scoreWrap = byId('scoreWrap');
var scoreBig = byId('scoreBig');
var btnRetry = byId('btnRetry');
var btnShare = byId('btnShare');
var bestBadge = byId('bestBadge');
var msg = byId('msg');

var state = 'idle';   // idle | playing | between | done
var level = 1;
var oddIndex = -1;    // je tile ta alada
var lastScore = null;

/* Level onujayi grid size: 2x2, 3x3, 4x4... max 8x8 */
function gridCols(lvl) {
  return Math.min(2 + Math.floor((lvl - 1) / 2), 8);
}

/* Level onujayi color difference: level boro = alada ta kom */
function colorDiff(lvl) {
  return Math.max(24 - lvl * 2, 2);
}

/* Best badge */
function showBest() {
  var best = getBest('color-vision');
  bestBadge.textContent = best !== null ? 'Best: level ' + best : 'No record yet';
}

/* Reset */
function resetGame() {
  state = 'idle';
  level = 1;
  memGrid.style.display = 'none';
  boxMsg.style.display = 'block';
  boxMsg.textContent = 'Click to start';
  scoreWrap.style.display = 'none';
  msg.textContent = '';
}

/* Game shuru */
function startGame() {
  level = 1;
  nextRound();
}

/* Notun round: grid + odd tile */
function nextRound() {
  state = 'playing';
  var cols = gridCols(level);
  var total = cols * cols;
  oddIndex = Math.floor(Math.random() * total);

  // Random base color (HSL)
  var hue = Math.floor(Math.random() * 360);
  var baseLight = 45;
  var diff = colorDiff(level);
  var oddLight = Math.random() < 0.5 ? baseLight + diff : baseLight - diff;

  // Grid build
  memGrid.style.display = 'grid';
  memGrid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
  memGrid.innerHTML = '';
  for (var i = 0; i < total; i++) {
    var cell = document.createElement('div');
    cell.className = 'mem-cell';
    var light = (i === oddIndex) ? oddLight : baseLight;
    cell.style.background = 'hsl(' + hue + ', 70%, ' + light + '%)';
    cell.style.border = 'none';
    cell.setAttribute('data-i', i);
    memGrid.appendChild(cell);
  }

  boxMsg.style.display = 'block';
  boxMsg.textContent = 'Find the different color! (Level ' + level + ')';
  msg.textContent = '';
}

/* Tile click */
memGrid.addEventListener('click', function (e) {
  if (state !== 'playing') return;
  var cell = e.target.closest('.mem-cell');
  if (!cell) return;

  var i = Number(cell.getAttribute('data-i'));

  if (i === oddIndex) {
    // Sohoj: next level
    state = 'between';
    cell.style.outline = '3px solid var(--success)';
    level++;
    msg.textContent = 'Correct! Level ' + level;
    setTimeout(nextRound, 500);
  } else {
    // Vul: odd tile dekhie dei, game over
    cell.style.outline = '3px solid var(--danger)';
    memGrid.children[oddIndex].style.outline = '3px solid var(--success)';
    endGame();
  }
});

/* Sesh */
function endGame() {
  state = 'done';
  var score = level - 1;
  lastScore = score;

  boxMsg.textContent = 'Done! Click to play again.';
  scoreWrap.style.display = 'block';
  scoreBig.textContent = score;

  var isNewBest = saveBest('color-vision', score, false); // beshi = bhalo
  msg.textContent = isNewBest ? 'New personal best!' : ratingFor(score);
  showBest();
}

/* Rating */
function ratingFor(lvl) {
  if (lvl < 5) return 'Warm up those eyes!';
  if (lvl < 9) return 'Average color vision.';
  if (lvl < 13) return 'Sharp eyes!';
  return 'Eagle vision!';
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
  var text = 'I cleared level ' + lastScore + ' on ReflexLab Color Vision. Beat me!';
  copyText(text).then(function () {
    msg.textContent = 'Score copied — share it anywhere!';
  });
});

/* Page load */
showBest();
resetGame();