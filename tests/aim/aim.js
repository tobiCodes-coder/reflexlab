/* ============================================
   REFLEXLAB - AIM TRAINER
   Flow: idle -> running -> done
   ============================================ */

var gameBox = byId('gameBox');
var boxMsg = byId('boxMsg');
var liveWrap = byId('liveWrap');
var liveHits = byId('liveHits');
var liveTotal = byId('liveTotal');
var liveMiss = byId('liveMiss');
var scoreWrap = byId('scoreWrap');
var scoreBig = byId('scoreBig');
var accText = byId('accText');
var btnRetry = byId('btnRetry');
var btnShare = byId('btnShare');
var bestBadge = byId('bestBadge');
var msg = byId('msg');
var cntBtns = document.querySelectorAll('.cnt-btn');

/* Target element: ekbar banai, position change kori */
var targetEl = document.createElement('div');
targetEl.className = 'target';
gameBox.appendChild(targetEl);

var TARGET_SIZE = 48;
var state = 'idle';      // idle | running | done
var totalTargets = 20;   // default 20
var hits = 0;
var misses = 0;
var times = [];          // prottek hit er time
var spawnTime = 0;
var lastScore = null;

/* Best badge */
function showBest() {
  var best = getBest('aim');
  bestBadge.textContent = best !== null ? 'Best: ' + best + ' ms' : 'No record yet';
}

/* Reset */
function resetGame() {
  state = 'idle';
  hits = 0;
  misses = 0;
  times = [];
  targetEl.style.display = 'none';
  boxMsg.style.display = 'block';
  boxMsg.textContent = 'Click to start';
  liveWrap.style.display = 'none';
  scoreWrap.style.display = 'none';
  msg.textContent = '';
}

/* Game shuru */
function startGame() {
  state = 'running';
  hits = 0;
  misses = 0;
  times = [];
  boxMsg.style.display = 'none';
  liveTotal.textContent = totalTargets;
  liveWrap.style.display = 'block';
  updateLive();
  spawnTarget();
}

/* Random position e target dekhano */
function spawnTarget() {
  var boxW = gameBox.clientWidth;
  var boxH = gameBox.clientHeight;
  var x = Math.random() * (boxW - TARGET_SIZE);
  var y = Math.random() * (boxH - TARGET_SIZE);
  targetEl.style.left = x + 'px';
  targetEl.style.top = y + 'px';
  targetEl.style.display = 'block';
  spawnTime = performance.now();
}

/* Live counter */
function updateLive() {
  liveHits.textContent = hits;
  liveMiss.textContent = misses;
}

/* Target hit! */
targetEl.addEventListener('click', function (e) {
  e.stopPropagation(); // miss hishebe dhora hobe na
  if (state !== 'running') return;

  times.push(performance.now() - spawnTime);
  hits++;
  updateLive();

  if (hits >= totalTargets) endGame();
  else spawnTarget();
});

/* Box click: start / miss / restart */
gameBox.addEventListener('click', function () {
  if (state === 'idle' || state === 'done') {
    startGame();
    return;
  }
  if (state === 'running') {
    misses++; // target chara click = miss
    updateLive();
  }
});

/* Sesh: average time + accuracy */
function endGame() {
  state = 'done';
  targetEl.style.display = 'none';
  boxMsg.style.display = 'block';
  boxMsg.textContent = 'Done! Click to play again.';

  var sum = 0;
  for (var i = 0; i < times.length; i++) sum += times[i];
  var avg = Math.round(sum / times.length);

  var totalClicks = hits + misses;
  var acc = totalClicks > 0 ? Math.round((hits / totalClicks) * 100) : 100;

  lastScore = avg;
  scoreWrap.style.display = 'block';
  scoreBig.textContent = avg + ' ms';
  accText.textContent = acc + '%';

  var isNewBest = saveBest('aim', avg, true); // kom = bhalo
  msg.textContent = isNewBest ? 'New personal best!' : ratingFor(avg);
  showBest();
}

/* Aim rating */
function ratingFor(ms) {
  if (ms < 400) return 'Insane aim!';
  if (ms < 600) return 'Sharp shooter!';
  if (ms < 900) return 'Decent aim.';
  return 'Keep training!';
}

/* Target count button */
for (var i = 0; i < cntBtns.length; i++) {
  cntBtns[i].addEventListener('click', function () {
    if (state === 'running') return;
    totalTargets = Number(this.getAttribute('data-cnt'));
    for (var j = 0; j < cntBtns.length; j++) {
      cntBtns[j].className = 'btn btn-ghost cnt-btn';
    }
    this.className = 'btn btn-primary cnt-btn';
    resetGame();
  });
}

/* Try again */
btnRetry.addEventListener('click', resetGame);

/* Share */
btnShare.addEventListener('click', function () {
  if (lastScore === null) {
    msg.textContent = 'Play one round first!';
    return;
  }
  var text = 'I hit targets in ' + lastScore + ' ms average on ReflexLab Aim Trainer. Beat me!';
  copyText(text).then(function () {
    msg.textContent = 'Score copied — share it anywhere!';
  });
});

/* Page load */
showBest();
resetGame();