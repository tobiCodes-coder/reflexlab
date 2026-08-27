/* ============================================
   SEQUENCE MEMORY - ENGINE + UI (vanilla JS)
   ============================================ */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var grid = $('sqGrid'), timerBar = $('sqTimerBar'), timerFill = $('sqTimerFill');
  var levelEl = $('sqLevel'), stateEl = $('sqState'), progEl = $('sqProg');
  var startBtn = $('sqStart'), againBtn = $('sqAgain'), shareBtn = $('sqShare');
  var summaryEl = $('sqSummary');

  var GRID_N = { easy: 3, normal: 4, hard: 5, expert: 5 };
  var SPEEDS = {
    slow: { on: 700, gap: 300 }, normal: { on: 500, gap: 250 },
    fast: { on: 350, gap: 150 }, expert: { on: 250, gap: 100 }
  };

  var state = 'idle';
  var mode = 'classic', diff = 'normal';
  var n = 4, tiles = [];
  var seq = [], idx = 0, level = 1;
  var score = 0, rounds = 0, mistakes = 0, correctTaps = 0, roundStreak = 0, bestRoundStreak = 0;
  var recallStart = 0, recallTimes = [];
  var timers = [], recallTimer = null, recallLimit = 0;
  var daily = false, lastShare = '';

  function fxOn() { return SQD.data.settings.fx === 1 && SQD.data.settings.rm !== 1; }
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

  /* ---------- grid ---------- */
  function buildGrid() {
    n = GRID_N[diff];
    grid.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
    grid.innerHTML = '';
    tiles = [];
    for (var i = 0; i < n * n; i++) {
      var d = document.createElement('div');
      d.className = 'sq-tile';
      d.dataset.i = i;
      d.setAttribute('role', 'button');
      d.setAttribute('aria-label', 'Tile ' + (i + 1));
      grid.appendChild(d);
      tiles.push(d);
    }
  }

  /* ---------- sequence generation ---------- */
  function genSeq(len) {
    var out = [];
    if (mode === 'pattern') {
      var cur = Math.floor(Math.random() * n * n);
      out.push(cur);
      while (out.length < len) {
        var nb = neighbors(cur);
        var next = nb[Math.floor(Math.random() * nb.length)];
        if (out.length >= 2 && next === out[out.length - 2]) {
          var alt = nb.filter(function (x) { return x !== out[out.length - 2]; });
          if (alt.length) next = alt[Math.floor(Math.random() * alt.length)];
        }
        out.push(next);
        cur = next;
      }
    } else {
      while (out.length < len) {
        var c = Math.floor(Math.random() * n * n);
        if (out.length && c === out[out.length - 1]) continue;
        out.push(c);
      }
    }
    return out;
  }
  function neighbors(i) {
    var r = Math.floor(i / n), c = i % n, out = [];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
  }

  /* ---------- flow ---------- */
  function startGame() {
    clearTimers();
    buildGrid();
    level = 1; score = 0; rounds = 0; mistakes = 0; correctTaps = 0;
    roundStreak = 0; bestRoundStreak = 0; recallTimes = [];
    summaryEl.classList.add('hidden');
    againBtn.classList.add('hidden');
    shareBtn.classList.remove('hidden') && shareBtn.classList.add('hidden');
    SQD.audio.unlock();
    nextLevel();
  }

  function seqLen() { return level + 1; }

  function nextLevel() {
    state = 'showing';
    grid.classList.add('locked');
    seq = genSeq(seqLen());
    idx = 0;
    levelEl.textContent = 'Level ' + level + ' · Sequence ' + seqLen();
    stateEl.textContent = 'Watch';
    progEl.textContent = '0 / ' + seqLen();
    timerBar.classList.add('hidden');

    var sp = SPEEDS[SQD.data.settings.speed] || SPEEDS.normal;
    if (diff === 'expert') sp = SPEEDS.expert;

    later(function () {
      for (var i = 0; i < seq.length; i++) {
        (function (i) {
          later(function () {
            if (state !== 'showing') return;
            flash(seq[i], 'show', sp.on);
            SQD.audio.play('show', i);
          }, i * (sp.on + sp.gap));
        })(i);
      }
      later(startRecall, seq.length * (sp.on + sp.gap) + 150);
    }, 700);
  }

  function flash(i, cls, ms) {
    tiles[i].classList.add(cls);
    setTimeout(function () { tiles[i].classList.remove(cls); }, ms);
  }

  function startRecall() {
    state = 'recall';
    grid.classList.remove('locked');
    stateEl.textContent = mode === 'reverse' ? 'Your turn (REVERSE)' : 'Your turn';
    recallStart = performance.now();
    idx = 0;
    progEl.textContent = '0 / ' + seqLen();

    if (mode === 'timed') {
      recallLimit = Math.max(2000, seqLen() * 1100 - level * 60);
      var t0 = performance.now();
      timerBar.classList.remove('hidden');
      recallTimer = setInterval(function () {
        var left = recallLimit - (performance.now() - t0);
        timerFill.style.width = Math.max(0, left / recallLimit * 100) + '%';
        if (left <= 0) {
          clearInterval(recallTimer);
          timeUp();
        }
      }, 80);
    }
  }

  function timeUp() {
    mistakes++;
    gameOver('Time up!');
  }

  /* ---------- input ---------- */
  grid.addEventListener('pointerdown', function (e) {
    if (!e.isPrimary || state !== 'recall') return;
    var el = e.target;
    if (!el.classList.contains('sq-tile')) return;
    e.preventDefault();
    var i = Number(el.dataset.i);
    var expected = mode === 'reverse' ? seq[seq.length - 1 - idx] : seq[idx];

    if (i === expected) {
      correctTaps++;
      idx++;
      flash(i, 'ok', 220);
      SQD.audio.play('ok');
      progEl.textContent = idx + ' / ' + seqLen();
      if (idx >= seq.length) levelComplete();
    } else {
      mistakes++;
      flash(i, 'bad', 400);
      SQD.audio.play('bad');
      gameOver('Wrong tile!');
    }
  });

  function levelComplete() {
    clearInterval(recallTimer);
    recallTimes.push(Math.round((performance.now() - recallStart) / 100) / 10);
    rounds++;
    roundStreak++;
    if (roundStreak > bestRoundStreak) bestRoundStreak = roundStreak;
    score += seqLen() * 10;
    SQD.audio.play('level');
    state = 'between';
    grid.classList.add('locked');
    stateEl.textContent = 'Correct!';
    level++;
    later(nextLevel, 800);
  }

  function gameOver(msg) {
    clearInterval(recallTimer);
    clearTimers();
    state = 'over';
    grid.classList.add('locked');
    stateEl.textContent = 'Game over';
    SQD.audio.play('over');

    var longest = rounds > 0 ? rounds + 1 : 0;   /* longest completed sequence */
    var acc = correctTaps + mistakes > 0 ? Math.round(correctTaps / (correctTaps + mistakes) * 100) : 100;
    var avgRecall = recallTimes.length ? Math.round(SQD.mean(recallTimes) * 10) / 10 : null;
    var bestRecall = recallTimes.length ? Math.min.apply(null, recallTimes) : null;

    var r = SQD.recordGame({
      mode: mode, longest: longest, level: level, score: score,
      acc: acc, rounds: rounds, mistakes: mistakes, roundStreak: bestRoundStreak
    });
    if (r.newPB) { SQD.audio.play('record'); toast('New Personal Best: sequence ' + longest); if (fxOn()) summaryEl.classList.add('st-pb'); }

    summaryEl.innerHTML =
      '<div class="sq-big">Level ' + longest + '</div>' +
      '<div class="sq-line">' + (msg || 'Game over') + ' · ' + mode.toUpperCase() + ' · ' + acc + '% accuracy</div>' +
      '<div class="sq-cat">' + r.cat + '</div>' +
      '<div class="sq-extra">' +
      'Score: <strong>' + score + '</strong> · Rounds: <strong>' + rounds + '</strong> · Mistakes: <strong>' + mistakes + '</strong><br>' +
      (avgRecall !== null ? 'Avg recall: <strong>' + avgRecall + 's</strong> · Best recall: <strong>' + bestRecall + 's</strong><br>' : '') +
      'Personal Best: <strong>' + (SQD.data.pb || longest) + '</strong>' +
      '</div>';
    summaryEl.classList.remove('hidden');
    againBtn.classList.remove('hidden');
    shareBtn.classList.remove('hidden');

    var newly = SQD.checkAchievements({ longest: longest, mode: mode, acc: acc, rounds: rounds, newPB: r.newPB, hadPB: r.hadPB });
    achToast(newly);

    if (daily) {
      var cfg = SQD.dailyConfig();
      var dNew = SQD.completeDaily(longest);
      achToast(dNew);
      toast('Daily Challenge complete: level ' + longest);
      daily = false;
    }

    lastShare = 'ReflexLab Sequence Memory\nLevel: ' + longest + ' · Accuracy: ' + acc + '% · ' + mode + '\n' +
      'Personal Best: ' + (SQD.data.pb || longest) + ' (' + r.cat + ')\n' +
      'Try it: https://reflexlab.tobiascent.workers.dev/tests/sequence-memory/sequence-memory.html';

    submitScore("sequence-memory", longest);
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
  var modeBtns = document.querySelectorAll('.sq-mode');
  var diffBtns = document.querySelectorAll('.sq-diff');
  function setActive(list, btn) { for (var i = 0; i < list.length; i++) list[i].classList.remove('active'); btn.classList.add('active'); }
  for (var i = 0; i < modeBtns.length; i++) modeBtns[i].addEventListener('click', function () {
    mode = this.getAttribute('data-mode');
    SQD.set('mode', mode);
    setActive(modeBtns, this);
    resetIdle();
  });
  for (var d = 0; d < diffBtns.length; d++) diffBtns[d].addEventListener('click', function () {
    diff = this.getAttribute('data-diff');
    SQD.set('diff', diff);
    setActive(diffBtns, this);
    resetIdle();
  });
  function resetIdle() {
    clearTimers();
    state = 'idle';
    buildGrid();
    grid.classList.add('locked');
    stateEl.textContent = 'Ready';
    levelEl.textContent = 'Level 1 · Sequence 2';
    progEl.textContent = '0 / 2';
    timerBar.classList.add('hidden');
  }

  /* ---------- quick buttons ---------- */
  $('sqSound').addEventListener('click', function () {
    SQD.set('sound', !SQD.data.settings.sound);
    this.textContent = SQD.data.settings.sound ? '🔊' : '🔇';
    this.classList.toggle('off', !SQD.data.settings.sound);
  });
  $('sqTheme').addEventListener('click', function () { SQD.set('theme', SQD.data.settings.theme === 'dark' ? 'light' : 'dark'); });
  $('sqFull').addEventListener('click', function () {
    var shell = document.querySelector('.sq-shell');
    if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); }
    else if (shell.requestFullscreen) shell.requestFullscreen();
  });
  $('sqSettingsBtn').addEventListener('click', function () { $('sqSettings').classList.remove('hidden'); buildSettings(); });
  $('sqSettingsClose').addEventListener('click', function () { $('sqSettings').classList.add('hidden'); });
  $('sqSettings').addEventListener('click', function (e) { if (e.target === this) this.classList.add('hidden'); });

  /* ---------- tabs ---------- */
  var tabBtns = document.querySelectorAll('.sq-tabbtn');
  for (var t = 0; t < tabBtns.length; t++) tabBtns[t].addEventListener('click', function () {
    for (var x = 0; x < tabBtns.length; x++) {
      tabBtns[x].classList.remove('active');
      $('tab-' + tabBtns[x].getAttribute('data-tab')).classList.add('hidden');
    }
    this.classList.add('active');
    $('tab-' + this.getAttribute('data-tab')).classList.remove('hidden');
  });

  /* ---------- settings ---------- */
  function row(label, ctrl) { return '<div class="sq-srow"><span>' + label + '</span>' + ctrl + '</div>'; }
  function onoff(val) { return '<select><option value="1"' + (val ? ' selected' : '') + '>On</option><option value="0"' + (!val ? ' selected' : '') + '>Off</option></select>'; }
  function buildSettings() {
    var s = SQD.data.settings;
    var h = '';
    h += row('Sound', onoff(s.sound).replace('<select>', '<select data-s="sound">'));
    h += row('Volume', '<input type="range" min="5" max="100" value="' + Math.round(s.volume * 100) + '" data-s="volume" style="accent-color:var(--primary)">');
    h += row('Playback speed', '<select data-s="speed"><option value="slow"' + (s.speed === 'slow' ? ' selected' : '') + '>Slow</option><option value="normal"' + (s.speed === 'normal' ? ' selected' : '') + '>Normal</option><option value="fast"' + (s.speed === 'fast' ? ' selected' : '') + '>Fast</option><option value="expert"' + (s.speed === 'expert' ? ' selected' : '') + '>Expert</option></select>');
    h += row('Theme', '<select data-s="theme"><option value="dark"' + (s.theme === 'dark' ? ' selected' : '') + '>Dark</option><option value="light"' + (s.theme === 'light' ? ' selected' : '') + '>Light</option></select>');
    h += row('High contrast', onoff(s.hc).replace('<select>', '<select data-s="hc">'));
    h += row('Reduced motion', onoff(s.rm).replace('<select>', '<select data-s="rm">'));
    h += row('Reset statistics', '<button class="btn btn-ghost" id="sqResetStats">Reset</button>');
    h += row('Reset achievements', '<button class="btn btn-ghost" id="sqResetAch">Reset</button>');
    h += row('Clear ALL local data', '<button class="btn btn-ghost" id="sqResetAll">Clear</button>');
    $('sqSettingsBody').innerHTML = h;

    var sels = $('sqSettingsBody').querySelectorAll('select');
    for (var i = 0; i < sels.length; i++) sels[i].addEventListener('change', function () {
      var k = this.getAttribute('data-s');
      var v = this.value;
      if (k !== 'theme' && k !== 'speed') v = v === '1';
      SQD.set(k, v);
    });
    $('sqSettingsBody').querySelector('[data-s="volume"]').addEventListener('input', function () { SQD.set('volume', Number(this.value) / 100); });
    $('sqResetStats').addEventListener('click', function () { if (confirm('Reset all memory statistics?')) { SQD.resetStats(); renderAll(); } });
    $('sqResetAch').addEventListener('click', function () { if (confirm('Reset all achievements?')) { SQD.resetAch(); renderAll(); } });
    $('sqResetAll').addEventListener('click', function () { if (confirm('Clear ALL local memory data?')) { SQD.resetAll(); SQD.applyPrefs(); renderAll(); } });
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
    var s = SQD.getStats();
    if (s.games === 0) {
      $('sqProfile').innerHTML = '<div class="sq-empty">No games yet — play your first game to build your profile.</div>';
      $('sqStatsGrid').innerHTML = '';
      $('sqGraph').innerHTML = '';
      return;
    }
    $('sqProfile').innerHTML =
      '<strong>Memory Profile</strong><br>' +
      'Longest sequence <strong>' + (s.pb || '—') + '</strong> (' + (s.pb ? SQD.category(s.pb) : '—') + ') · ' +
      'Average <strong>' + (s.avgLongest || '—') + '</strong><br>' +
      'Games <strong>' + s.games + '</strong> · Rounds <strong>' + s.rounds + '</strong> · ' +
      'Best round streak <strong>' + s.bestRoundStreak + '</strong><br>' +
      'Best score <strong>' + s.bestScore + '</strong> · ' +
      'Improvement <strong>' + (s.improvement === null ? '—' : (s.improvement > 0 ? '+' : '') + s.improvement + '%') + '</strong>';
    var tiles = [
      ['Longest', s.pb === null ? '—' : s.pb],
      ['Avg longest', s.avgLongest === null ? '—' : s.avgLongest],
      ['Best score', s.bestScore],
      ['Games', s.games],
      ['Rounds', s.rounds],
      ['Mistakes', s.mistakes],
      ['Round streak', s.bestRoundStreak],
      ['Today best', s.todayBest === null ? '—' : s.todayBest]
    ];
    var h = '';
    for (var i = 0; i < tiles.length; i++) h += '<div class="sq-stat"><b>' + tiles[i][1] + '</b><span>' + tiles[i][0] + '</span></div>';
    $('sqStatsGrid').innerHTML = h;

    var recent = SQD.data.history.slice(0, 20);
    var max = 0, best = 0;
    for (var b = 0; b < recent.length; b++) { if (recent[b].longest > max) max = recent[b].longest; if (recent[b].longest > best) best = recent[b].longest; }
    var g = '';
    for (var k = 0; k < recent.length; k++) {
      var hh = Math.max(6, Math.round(recent[k].longest / max * 100));
      g += '<div class="sq-bar' + (recent[k].longest === best ? ' best' : '') + '" style="height:' + hh + '%" title="Level ' + recent[k].longest + '"></div>';
    }
    $('sqGraph').innerHTML = g;
  }

  function renderHistory() {
    var h = SQD.data.history;
    if (!h.length) { $('sqHistList').innerHTML = '<div class="sq-empty">No games yet.</div>'; return; }
    var list = '';
    for (var r = 0; r < Math.min(h.length, 12); r++) {
      list += '<div class="sq-hrow"><span>' + timeAgo(h[r].t) + ' · ' + h[r].mode + '</span><span>' + h[r].acc + '%</span><b>Level ' + h[r].longest + '</b></div>';
    }
    $('sqHistList').innerHTML = list;
  }

  function renderAch() {
    var list = SQD.achList();
    var h = '';
    for (var i = 0; i < list.length; i++) {
      h += '<div class="sq-ach ' + (list[i].on ? 'on' : 'locked') + '"><b>' + (list[i].on ? '✓ ' : '') + list[i].name + '</b>' + list[i].desc + '</div>';
    }
    $('sqAchGrid').innerHTML = h;
  }

  function renderDaily() {
    var cfg = SQD.dailyConfig();
    var d = SQD.data.daily;
    var done = d.today === cfg.date;
    $('sqDaily').innerHTML =
      '<strong>Daily Challenge — ' + cfg.date + '</strong><br>' +
      'Today: <strong>' + cfg.mode + '</strong> mode · <strong>' + cfg.diff + '</strong> difficulty.<br>' +
      'Status: ' + (done ? '<strong>Completed</strong> · best level ' + d.best : 'Not completed yet') + '<br>' +
      'Challenge streak: <strong>' + d.dayStreak + ' day(s)</strong> · Total completed: <strong>' + d.doneTotal + '</strong><br>' +
      (done ? '' : '<button class="btn btn-primary" id="sqDailyPlay">Play Daily Challenge</button>');
    var btn = $('sqDailyPlay');
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
    SQD.applyPrefs();
    var s = SQD.data.settings;
    $('sqSound').textContent = s.sound ? '🔊' : '🔇';
    $('sqSound').classList.toggle('off', !s.sound);
    mode = s.mode || 'classic';
    diff = s.diff || 'normal';
    for (var i = 0; i < modeBtns.length; i++) modeBtns[i].classList.toggle('active', modeBtns[i].getAttribute('data-mode') === mode);
    for (var d = 0; d < diffBtns.length; d++) diffBtns[d].classList.toggle('active', diffBtns[d].getAttribute('data-diff') === diff);
    buildGrid();
    grid.classList.add('locked');
    if (!localStorage.getItem('rl-seq-onboard')) $('sqOnboard').classList.remove('hidden');
    $('sqOnboardOk').addEventListener('click', function () {
      $('sqOnboard').classList.add('hidden');
      try { localStorage.setItem('rl-seq-onboard', '1'); } catch (e) {}
    });
    renderAll();
  }
  init();
})();