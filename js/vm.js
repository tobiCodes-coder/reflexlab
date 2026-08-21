/* ============================================
   VISUAL MEMORY - ENGINE + UI (vanilla JS)
   ============================================ */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var grid = $('vmGrid'), timerBar = $('vmTimerBar'), timerFill = $('vmTimerFill');
  var levelEl = $('vmLevel'), stateEl = $('vmState'), livesEl = $('vmLives'), progEl = $('vmProg');
  var startBtn = $('vmStart'), againBtn = $('vmAgain'), shareBtn = $('vmShare');
  var summaryEl = $('vmSummary');

  var SPEED_MS = { slow: 1600, normal: 1100, fast: 700, expert: 450 };

  var state = 'idle';
  var mode = 'classic', diff = 'normal';
  var n = 3, tiles = [], pattern = [], selected = [];
  var level = 1, lives = 3, maxLives = 3;
  var score = 0, rounds = 0, mistakes = 0, correctSel = 0, totalSel = 0, tilesRecalled = 0;
  var roundStreak = 0, bestRoundStreak = 0, longestPattern = 0, biggestGrid = 0;
  var recallStart = 0, recallTimes = [], fastestRecall = null;
  var timers = [], recallTimer = null;
  var daily = false, lastShare = '';

  function fxOn() { return VMD.data.settings.fx === 1 && VMD.data.settings.rm !== 1; }
  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99;background:#16a34a;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.4)';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function achToast(l) { for (var i = 0; i < l.length; i++) toast('Achievement unlocked: ' + l[i].name); }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers = []; clearInterval(recallTimer); recallTimer = null; }

  function gridFor(l) { return l <= 3 ? 3 : l <= 6 ? 4 : l <= 10 ? 5 : l <= 15 ? 6 : 7; }
  function targets() { return Math.min(level + 2, n * n - 2); }

  /* ---------- grid + pattern ---------- */
  function buildGrid() {
    n = gridFor(level);
    if (n > biggestGrid && rounds >= 0) biggestGrid = Math.max(biggestGrid, 0);
    grid.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
    grid.innerHTML = '';
    tiles = [];
    for (var i = 0; i < n * n; i++) {
      var d = document.createElement('div');
      d.className = 'vm-tile';
      d.dataset.i = i;
      d.setAttribute('role', 'button');
      d.setAttribute('aria-label', 'Tile ' + (i + 1));
      grid.appendChild(d);
      tiles.push(d);
    }
  }
  function genPattern() {
    var count = targets(), out = [];
    if (mode === 'shape') {
      var cur = Math.floor(Math.random() * n * n);
      out.push(cur);
      while (out.length < count) {
        var r = Math.floor(cur / n), c = cur % n, nb = [];
        if (r > 0) nb.push(cur - n);
        if (r < n - 1) nb.push(cur + n);
        if (c > 0) nb.push(cur - 1);
        if (c < n - 1) nb.push(cur + 1);
        var opts = nb.filter(function (x) { return out.indexOf(x) === -1; });
        if (!opts.length) break;
        cur = opts[Math.floor(Math.random() * opts.length)];
        out.push(cur);
      }
    }
    while (out.length < count) {
      var x = Math.floor(Math.random() * n * n);
      if (out.indexOf(x) === -1) out.push(x);
    }
    return out;
  }

  /* ---------- flow ---------- */
  function startGame() {
    clearTimers();
    level = 1; score = 0; rounds = 0; mistakes = 0; correctSel = 0; totalSel = 0;
    tilesRecalled = 0; roundStreak = 0; bestRoundStreak = 0; longestPattern = 0; biggestGrid = 0;
    recallTimes = []; fastestRecall = null;
    maxLives = mode === 'nomistake' ? 1 : 3;
    lives = maxLives;
    summaryEl.classList.add('hidden');
    againBtn.classList.add('hidden');
    shareBtn.classList.add('hidden');
    VMD.audio.unlock();
    nextRound();
  }

  function nextRound() {
    buildGrid();
    biggestGrid = Math.max(biggestGrid, n);
    pattern = genPattern();
    selected = [];
    state = 'showing';
    grid.classList.add('locked');
    levelEl.textContent = 'Level ' + level + ' · ' + targets() + ' targets · ' + n + '×' + n;
    stateEl.textContent = 'Watch';
    livesEl.textContent = 'Lives ' + '●'.repeat(lives) + '○'.repeat(maxLives - lives);
    progEl.textContent = '0 / ' + targets() + ' selected';
    timerBar.classList.add('hidden');

    var base = SPEED_MS[VMD.data.settings.speed] || SPEED_MS.normal;
    if (diff === 'expert') base = SPEED_MS.expert;
    else if (diff === 'hard') base = Math.min(base, SPEED_MS.fast);
    else if (diff === 'easy') base = Math.max(base, SPEED_MS.slow);
    var showMs = Math.max(300, base - level * 15);

    later(function () {
      for (var i = 0; i < pattern.length; i++) tiles[pattern[i]].classList.add('show');
      VMD.audio.play('show');
      later(startRecall, showMs);
    }, 600);
  }

  function startRecall() {
    for (var i = 0; i < pattern.length; i++) tiles[pattern[i]].classList.remove('show');
    state = 'recall';
    grid.classList.remove('locked');
    stateEl.textContent = 'Your turn';
    recallStart = performance.now();

    if (mode === 'timed') {
      var limit = Math.max(2500, targets() * 1500 - level * 80);
      var t0 = performance.now();
      timerBar.classList.remove('hidden');
      recallTimer = setInterval(function () {
        var left = limit - (performance.now() - t0);
        timerFill.style.width = Math.max(0, left / limit * 100) + '%';
        if (left <= 0) { clearInterval(recallTimer); roundFail(true); }
      }, 80);
    }
  }

  /* ---------- input ---------- */
  grid.addEventListener('pointerdown', function (e) {
    if (!e.isPrimary || state !== 'recall') return;
    var el = e.target;
    if (!el.classList.contains('vm-tile')) return;
    e.preventDefault();
    var i = Number(el.dataset.i);
    if (selected.indexOf(i) !== -1) return;
    selected.push(i);
    totalSel++;
    el.classList.add('sel');
    VMD.audio.play('sel');
    progEl.textContent = selected.length + ' / ' + targets() + ' selected';
    if (selected.length >= targets()) evaluate();
  });

  function evaluate() {
    clearInterval(recallTimer);
    var wrong = 0;
    for (var i = 0; i < selected.length; i++) {
      if (pattern.indexOf(selected[i]) === -1) wrong++;
    }
    var rt = Math.round((performance.now() - recallStart) / 100) / 10;
    recallTimes.push(rt);

    if (wrong === 0) {
      rounds++;
      roundStreak++;
      if (roundStreak > bestRoundStreak) bestRoundStreak = roundStreak;
      correctSel += targets();
      tilesRecalled += targets();
      if (targets() > longestPattern) longestPattern = targets();
      if (fastestRecall === null || rt < fastestRecall) fastestRecall = rt;
      score += targets() * 10;
      for (var k = 0; k < selected.length; k++) tiles[selected[k]].classList.add('ok');
      VMD.audio.play('level');
      state = 'between';
      grid.classList.add('locked');
      stateEl.textContent = 'Correct!';
      level++;
      later(nextRound, 900);
    } else {
      correctSel += targets() - wrong;
      mistakes += wrong;
      roundFail(false, wrong);
    }
  }

  function roundFail(timeUp, wrong) {
    clearInterval(recallTimer);
    lives--;
    roundStreak = 0;
    if (!timeUp) mistakes += 0; /* wrong already counted in evaluate */
    state = 'between';
    grid.classList.add('locked');
    VMD.audio.play('bad');

    /* reveal: bad selections + missed targets */
    for (var i = 0; i < selected.length; i++) {
      if (pattern.indexOf(selected[i]) === -1) tiles[selected[i]].classList.add('bad');
    }
    for (var p = 0; p < pattern.length; p++) {
      if (selected.indexOf(pattern[p]) === -1) tiles[pattern[p]].classList.add('missed');
    }
    livesEl.textContent = 'Lives ' + '●'.repeat(Math.max(0, lives)) + '○'.repeat(maxLives - Math.max(0, lives));
    stateEl.textContent = timeUp ? 'Time up!' : 'Wrong!';

    if (lives <= 0) later(gameOver, 1200);
    else { level++; later(nextRound, 1200); }
  }

  function gameOver() {
    clearTimers();
    state = 'over';
    grid.classList.add('locked');
    stateEl.textContent = 'Game over';
    VMD.audio.play('over');

    var acc = totalSel > 0 ? Math.round(correctSel / totalSel * 100) : 100;
    var avgRecall = recallTimes.length ? Math.round(VMD.mean(recallTimes) * 10) / 10 : null;

    var r = VMD.recordGame({
      mode: mode, level: level, pattern: longestPattern, score: score,
      acc: acc, rounds: rounds, mistakes: mistakes, tiles: tilesRecalled,
      roundStreak: bestRoundStreak
    });
    if (r.newPB) { VMD.audio.play('record'); toast('New Personal Best: level ' + level); if (fxOn()) summaryEl.classList.add('st-pb'); }

    summaryEl.innerHTML =
      '<div class="vm-big">Level ' + level + '</div>' +
      '<div class="vm-line">Longest pattern: ' + longestPattern + ' tiles · ' + acc + '% accuracy · ' + mode.toUpperCase() + '</div>' +
      '<div class="vm-cat">' + r.cat + '</div>' +
      '<div class="vm-extra">' +
      'Score: <strong>' + score + '</strong> · Rounds: <strong>' + rounds + '</strong> · Mistakes: <strong>' + mistakes + '</strong><br>' +
      (avgRecall !== null ? 'Avg recall: <strong>' + avgRecall + 's</strong>' + (fastestRecall !== null ? ' · Best: <strong>' + fastestRecall + 's</strong>' : '') + '<br>' : '') +
      'Personal Best: <strong>' + (VMD.data.pb || level) + '</strong>' +
      '</div>';
    summaryEl.classList.remove('hidden');
    againBtn.classList.remove('hidden');
    shareBtn.classList.remove('hidden');

    var newly = VMD.checkAchievements({
      level: level, acc: acc, rounds: rounds, roundStreak: bestRoundStreak,
      grid: biggestGrid, fastRecall: fastestRecall, newPB: r.newPB, hadPB: r.hadPB
    });
    achToast(newly);

    if (daily) {
      var cfg = VMD.dailyConfig();
      var dNew = VMD.completeDaily(level);
      achToast(dNew);
      toast('Daily Challenge complete: level ' + level);
      daily = false;
    }

    lastShare = 'ReflexLab Visual Memory\nLevel: ' + level + ' · Longest pattern: ' + longestPattern + ' tiles · ' + acc + '% accuracy\n' +
      'Personal Best: ' + (VMD.data.pb || level) + ' (' + r.cat + ')\n' +
      'Try it: https://reflexlab.tobiascent.workers.dev/tests/visual-memory/visual-memory.html';

    renderAll();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && (state === 'showing' || state === 'recall')) {
      clearTimers();
      state = 'idle';
      grid.classList.add('locked');
      stateEl.textContent = 'Cancelled';
    }
  });

  /* ---------- buttons ---------- */
  startBtn.addEventListener('click', startGame);
  againBtn.addEventListener('click', startGame);
  shareBtn.addEventListener('click', function () {
    if (navigator.share) navigator.share({ text: lastShare }).catch(function () {});
    else if (window.copyText) window.copyText(lastShare).then(function () { toast('Result copied to clipboard'); });
  });

  /* ---------- pills ---------- */
  var modeBtns = document.querySelectorAll('.vm-mode');
  var diffBtns = document.querySelectorAll('.vm-diff');
  function setActive(list, btn) { for (var i = 0; i < list.length; i++) list[i].classList.remove('active'); btn.classList.add('active'); }
  function resetIdle() {
    clearTimers();
    state = 'idle';
    buildGrid();
    grid.classList.add('locked');
    stateEl.textContent = 'Ready';
    levelEl.textContent = 'Level 1 · 3 targets · 3×3';
    livesEl.textContent = 'Lives ●●●';
    progEl.textContent = '0 / 3 selected';
    timerBar.classList.add('hidden');
  }
  for (var i = 0; i < modeBtns.length; i++) modeBtns[i].addEventListener('click', function () {
    mode = this.getAttribute('data-mode');
    VMD.set('mode', mode);
    setActive(modeBtns, this);
    resetIdle();
  });
  for (var d = 0; d < diffBtns.length; d++) diffBtns[d].addEventListener('click', function () {
    diff = this.getAttribute('data-diff');
    VMD.set('diff', diff);
    setActive(diffBtns, this);
    resetIdle();
  });

  /* ---------- quick buttons ---------- */
  $('vmSound').addEventListener('click', function () {
    VMD.set('sound', !VMD.data.settings.sound);
    this.textContent = VMD.data.settings.sound ? '🔊' : '🔇';
    this.classList.toggle('off', !VMD.data.settings.sound);
  });
  $('vmTheme').addEventListener('click', function () { VMD.set('theme', VMD.data.settings.theme === 'dark' ? 'light' : 'dark'); });
  $('vmFull').addEventListener('click', function () {
    var shell = document.querySelector('.vm-shell');
    if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); }
    else if (shell.requestFullscreen) shell.requestFullscreen();
  });
  $('vmSettingsBtn').addEventListener('click', function () { $('vmSettings').classList.remove('hidden'); buildSettings(); });
  $('vmSettingsClose').addEventListener('click', function () { $('vmSettings').classList.add('hidden'); });
  $('vmSettings').addEventListener('click', function (e) { if (e.target === this) this.classList.add('hidden'); });

  /* ---------- tabs ---------- */
  var tabBtns = document.querySelectorAll('.vm-tabbtn');
  for (var t = 0; t < tabBtns.length; t++) tabBtns[t].addEventListener('click', function () {
    for (var x = 0; x < tabBtns.length; x++) {
      tabBtns[x].classList.remove('active');
      $('tab-' + tabBtns[x].getAttribute('data-tab')).classList.add('hidden');
    }
    this.classList.add('active');
    $('tab-' + this.getAttribute('data-tab')).classList.remove('hidden');
  });

  /* ---------- settings ---------- */
  function row(label, ctrl) { return '<div class="vm-srow"><span>' + label + '</span>' + ctrl + '</div>'; }
  function onoff(val) { return '<select><option value="1"' + (val ? ' selected' : '') + '>On</option><option value="0"' + (!val ? ' selected' : '') + '>Off</option></select>'; }
  function buildSettings() {
    var s = VMD.data.settings;
    var h = '';
    h += row('Sound', onoff(s.sound).replace('<select>', '<select data-s="sound">'));
    h += row('Volume', '<input type="range" min="5" max="100" value="' + Math.round(s.volume * 100) + '" data-s="volume">');
    h += row('Display speed', '<select data-s="speed"><option value="slow"' + (s.speed === 'slow' ? ' selected' : '') + '>Slow</option><option value="normal"' + (s.speed === 'normal' ? ' selected' : '') + '>Normal</option><option value="fast"' + (s.speed === 'fast' ? ' selected' : '') + '>Fast</option><option value="expert"' + (s.speed === 'expert' ? ' selected' : '') + '>Expert</option></select>');
    h += row('Theme', '<select data-s="theme"><option value="dark"' + (s.theme === 'dark' ? ' selected' : '') + '>Dark</option><option value="light"' + (s.theme === 'light' ? ' selected' : '') + '>Light</option></select>');
    h += row('High contrast', onoff(s.hc).replace('<select>', '<select data-s="hc">'));
    h += row('Reduced motion', onoff(s.rm).replace('<select>', '<select data-s="rm">'));
    h += row('Reset statistics', '<button class="btn btn-ghost" id="vmResetStats">Reset</button>');
    h += row('Reset achievements', '<button class="btn btn-ghost" id="vmResetAch">Reset</button>');
    h += row('Clear ALL local data', '<button class="btn btn-ghost" id="vmResetAll">Clear</button>');
    $('vmSettingsBody').innerHTML = h;

    var sels = $('vmSettingsBody').querySelectorAll('select');
    for (var i = 0; i < sels.length; i++) sels[i].addEventListener('change', function () {
      var k = this.getAttribute('data-s');
      var v = this.value;
      if (k !== 'theme' && k !== 'speed') v = v === '1';
      VMD.set(k, v);
    });
    $('vmSettingsBody').querySelector('[data-s="volume"]').addEventListener('input', function () { VMD.set('volume', Number(this.value) / 100); });
    $('vmResetStats').addEventListener('click', function () { if (confirm('Reset all visual memory statistics?')) { VMD.resetStats(); renderAll(); } });
    $('vmResetAch').addEventListener('click', function () { if (confirm('Reset all achievements?')) { VMD.resetAch(); renderAll(); } });
    $('vmResetAll').addEventListener('click', function () { if (confirm('Clear ALL local visual memory data?')) { VMD.resetAll(); VMD.applyPrefs(); renderAll(); } });
  }

  /* ---------- render ---------- */
  function timeAgo(ts) {
    var d = Math.round((Date.now() - ts) / 1000);
    if (d < 60) return 'just now';
    if (d < 3600) return Math.round(d / 60) + 'm ago';
    if (d < 86400) return Math.round(d / 3600) + 'h ago';
    return Math.round(d / 86400) + 'd ago';
  }

  function renderStats() {
    var s = VMD.getStats();
    if (s.games === 0) {
      $('vmProfile').innerHTML = '<div class="vm-empty">No games yet — play your first game to build your profile.</div>';
      $('vmStatsGrid').innerHTML = '';
      $('vmGraph').innerHTML = '';
      return;
    }
    $('vmProfile').innerHTML =
      '<strong>Visual Memory Profile</strong><br>' +
      'Best level <strong>' + (s.pb || '—') + '</strong> (' + (s.pb ? VMD.category(s.pb) : '—') + ') · ' +
      'Average <strong>' + (s.avgLevel || '—') + '</strong><br>' +
      'Games <strong>' + s.games + '</strong> · Tiles recalled <strong>' + s.tiles + '</strong> · ' +
      'Best clean streak <strong>' + s.bestRoundStreak + '</strong><br>' +
      'Best score <strong>' + s.bestScore + '</strong> · ' +
      'Improvement <strong>' + (s.improvement === null ? '—' : (s.improvement > 0 ? '+' : '') + s.improvement + '%') + '</strong>';
    var tilesArr = [
      ['Best level', s.pb === null ? '—' : s.pb],
      ['Avg level', s.avgLevel === null ? '—' : s.avgLevel],
      ['Best score', s.bestScore],
      ['Games', s.games],
      ['Rounds', s.rounds],
      ['Mistakes', s.mistakes],
      ['Tiles', s.tiles],
      ['Today best', s.todayBest === null ? '—' : s.todayBest]
    ];
    var h = '';
    for (var i = 0; i < tilesArr.length; i++) h += '<div class="vm-stat"><b>' + tilesArr[i][1] + '</b><span>' + tilesArr[i][0] + '</span></div>';
    $('vmStatsGrid').innerHTML = h;

    var recent = VMD.data.history.slice(0, 20);
    var max = 0, best = 0;
    for (var b = 0; b < recent.length; b++) { if (recent[b].level > max) max = recent[b].level; if (recent[b].level > best) best = recent[b].level; }
    var g = '';
    for (var k = 0; k < recent.length; k++) {
      var hh = Math.max(6, Math.round(recent[k].level / max * 100));
      g += '<div class="vm-bar' + (recent[k].level === best ? ' best' : '') + '" style="height:' + hh + '%" title="Level ' + recent[k].level + '"></div>';
    }
    $('vmGraph').innerHTML = g;
  }

  function renderHistory() {
    var h = VMD.data.history;
    if (!h.length) { $('vmHistList').innerHTML = '<div class="vm-empty">No games yet.</div>'; return; }
    var list = '';
    for (var r = 0; r < Math.min(h.length, 12); r++) {
      list += '<div class="vm-hrow"><span>' + timeAgo(h[r].t) + ' · ' + h[r].mode + '</span><span>' + h[r].acc + '%</span><b>Level ' + h[r].level + ' · ' + h[r].pattern + ' tiles</b></div>';
    }
    $('vmHistList').innerHTML = list;
  }

  function renderAch() {
    var list = VMD.achList();
    var h = '';
    for (var i = 0; i < list.length; i++) {
      h += '<div class="vm-ach ' + (list[i].on ? 'on' : 'locked') + '"><b>' + (list[i].on ? '✓ ' : '') + list[i].name + '</b>' + list[i].desc + '</div>';
    }
    $('vmAchGrid').innerHTML = h;
  }

  function renderDaily() {
    var cfg = VMD.dailyConfig();
    var d = VMD.data.daily;
    var done = d.today === cfg.date;
    $('vmDaily').innerHTML =
      '<strong>Daily Challenge — ' + cfg.date + '</strong><br>' +
      'Today: <strong>' + cfg.mode + '</strong> mode · <strong>' + cfg.diff + '</strong> difficulty.<br>' +
      'Status: ' + (done ? '<strong>Completed</strong> · best level ' + d.best : 'Not completed yet') + '<br>' +
      'Challenge streak: <strong>' + d.dayStreak + ' day(s)</strong> · Total completed: <strong>' + d.doneTotal + '</strong><br>' +
      (done ? '' : '<button class="btn btn-primary" id="vmDailyPlay">Play Daily Challenge</button>');
    var btn = $('vmDailyPlay');
    if (btn) btn.addEventListener('click', function () {
      mode = cfg.mode; diff = cfg.diff;
      daily = true;
      for (var i = 0; i < modeBtns.length; i++) modeBtns[i].classList.toggle('active', modeBtns[i].getAttribute('data-mode') === mode);
      for (var x = 0; x < diffBtns.length; x++) diffBtns[x].classList.toggle('active', diffBtns[x].getAttribute('data-diff') === diff);
      toast('Daily armed: ' + cfg.mode + ' · ' + cfg.diff);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      startGame();
    });
  }

  function renderAll() { renderStats(); renderHistory(); renderAch(); renderDaily(); }

  /* ---------- init ---------- */
  function init() {
    VMD.applyPrefs();
    var s = VMD.data.settings;
    $('vmSound').textContent = s.sound ? '🔊' : '🔇';
    $('vmSound').classList.toggle('off', !s.sound);
    mode = s.mode || 'classic';
    diff = s.diff || 'normal';
    for (var i = 0; i < modeBtns.length; i++) modeBtns[i].classList.toggle('active', modeBtns[i].getAttribute('data-mode') === mode);
    for (var d = 0; d < diffBtns.length; d++) diffBtns[d].classList.toggle('active', diffBtns[d].getAttribute('data-diff') === diff);
    buildGrid();
    grid.classList.add('locked');
    if (!localStorage.getItem('rl-vm-onboard')) $('vmOnboard').classList.remove('hidden');
    $('vmOnboardOk').addEventListener('click', function () {
      $('vmOnboard').classList.add('hidden');
      try { localStorage.setItem('rl-vm-onboard', '1'); } catch (e) {}
    });
    renderAll();
  }
  init();
})();