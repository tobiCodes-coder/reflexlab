/* ============================================
   REFLEXLAB - VISUAL MEMORY
   Flow: idle -> showing -> input -> (next / done)
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

var state = 'idle';   // idle | showing | input | between | done
var level = 1;
var pattern = [];     // je cell gulo jolbe
var hitsCount = 0;
var lastScore = null;

/* Level onujayi grid size + koyta cell jolbe */
function gridSize(lvl) {
  var cols = Math.min(3 + Math.floor((lvl - 1) / 2), 6); // 3,3,4,4,5,5,6...
  var filled = Math.min(lvl + 2, cols * cols - 1);       // 3,4,5,6...
  return { cols: cols, filled: filled };
}

/* Best badge */
function showBest() {
  var best = getBest('visual-memory');
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

/* Notun round: pattern banano + dekhano */
function nextRound() {
  state = 'showing';
  hitsCount = 0;
  var cfg = gridSize(level);
  var total = cfg.cols * cfg.cols;

  // Random pattern pick (no duplicate)
  pattern = [];
  while (pattern.length < cfg.filled) {
    var r = Math.floor(Math.random() * total);
    if (pattern.indexOf(r) === -1) pattern.push(r);
  }

  // Grid build
  memGrid.style.display = 'grid';
  memGrid.style.gridTemplateColumns = 'repeat(' + cfg.cols + ', 1fr)';
  memGrid.innerHTML = '';
  for (var i = 0; i < total; i++) {
    var cell = document.createElement('div');
    cell.className = 'mem-cell' + (pattern.indexOf(i) !== -1 ? ' on' : '');
    cell.setAttribute('data-i', i);
    memGrid.appendChild(cell);
  }

  boxMsg.style.display = 'block';
  boxMsg.textContent = 'Memorize the pattern! (Level ' + level + ')';

  // Kichhon por pattern lukao
  setTimeout(function () {
    if (state !== 'showing') return; // safety
    state = 'input';
    var cells = memGrid.children;
    for (var i = 0; i < cells.length; i++) cells[i].className = 'mem-cell';
    boxMsg.textContent = 'Click the cells that were lit!';
  }, 1000 + cfg.filled * 200);
}

/* Cell click handler (event delegation) */
memGrid.addEventListener('click', function (e) {
  if (state !== 'input') return;
  var cell = e.target.closest('.mem-cell');
  if (!cell || cell.className.indexOf('hit') !== -1) return;

  var i = Number(cell.getAttribute('data-i'));

  if (pattern.indexOf(i) !== -1) {
    // Sohoj cell
    cell.className = 'mem-cell hit';
    hitsCount++;
    if (hitsCount === pattern.length) {
      state = 'between';
      level++;
      msg.textContent = 'Correct! Level ' + level;
      setTimeout(nextRound, 700);
    }
  } else {
    // Vul cell = game over
    cell.className = 'mem-cell miss';
    endGame();
  }
});

/* Sesh */
function endGame() {
  state = 'done';
  var score = level - 1;
  lastScore = score;

  // Asol pattern dekhie dei (learning er jonno)
  var cells = memGrid.children;
  for (var i = 0; i < cells.length; i++) {
    if (pattern.indexOf(i) !== -1 && cells[i].className.indexOf('hit') === -1) {
      cells[i].className = 'mem-cell on';
    }
  }

  boxMsg.textContent = 'Done! Click to play again.';
  scoreWrap.style.display = 'block';
  scoreBig.textContent = score;

  var isNewBest = saveBest('visual-memory', score, false); // beshi = bhalo
  msg.textContent = isNewBest ? 'New personal best!' : ratingFor(score);
  showBest();
}

/* Rating */
function ratingFor(lvl) {
  if (lvl < 4) return 'Warm up those eyes!';
  if (lvl < 7) return 'Average visual memory.';
  if (lvl < 10) return 'Sharp eyes!';
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
  var text = 'I cleared level ' + lastScore + ' on ReflexLab Visual Memory. Beat me!';
  copyText(text).then(function () {
    msg.textContent = 'Score copied — share it anywhere!';
  });
});

/* Page load */
showBest();
resetGame();