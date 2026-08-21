/* ============================================
   NUMBER MEMORY - ENGINE + UI (vanilla JS)
   ============================================ */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var numberEl = $('nmNumber'), recallEl = $('nmRecall'), input = $('nmInput');
  var keypad = $('nmKeypad'), submitBtn = $('nmSubmit'), revealEl = $('nmReveal');
  var levelEl = $('nmLevel'), stateEl = $('nmState'), livesEl = $('nmLives');
  var startBtn = $('nmStart'), hideBtn = $('nmHide'), againBtn = $('nmAgain'), shareBtn = $('nmShare');
  var summaryEl = $('nmSummary');

  var SPEED_PER_DIGIT = { auto: 700, slow: 1200, normal: 900, fast: 550, expert: 350 };

  var state = 'idle';
  var mode = 'classic';
  var level = 1, number = '', lives = 1, maxLives = 1;
  var rounds = 0, correct = 0, wrong = 0, digitsRecalled = 0, longest = 0;
  var roundStreak = 0, bestRoundStreak = 0;
  var recallStart = 0, recallTimes = [], bestRecall = null;
  var timers = [], daily = false, lastShare = '';

  function digits() { return level + 2; }
  function fxOn() { return NMD.data.settings.fx === 1 && NMD.data.settings.rm !== 1; }
  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99;background:#16a34a;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.4)';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function achToast(l) { for (var i = 0; i < l.length; i++) toast('Achievement unlocked: ' + l[i].name); }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers = []; }

  function genNumber(len) {
    var s = '';
    for (var i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
    return s;   /* string — leading zeros preserved */
  }
  function chunked(s) {
    if (!NMD.data.settings.chunk) return s;
    return s.replace(/(\d{3})(?=\d)/g, '$1 ');
  }

  /* ---------- flow ---------- */
  function startGame() {
    clearTimers();
    level = 1; rounds = 0; correct = 0; wrong = 0; digitsRecalled = 0; longest = 0;
    roundStreak = 0; bestRoundStreak = 0; recallTimes = []; bestRecall = null;
    maxLives = mode === 'lives' ? 3 : 1;
    lives = maxLives;
    summaryEl.classList.add('hidden');
    revealEl.classList.add('hidden');
    againBtn.classList.add('hidden');
    shareBtn.classList.add('hidden');
    if (mode === 'practice') startBtn.textContent = 'End Practice';
    NMD.audio.unlock();
    nextRound();
  }

  function nextRound() {
    state = 'showing';
    number = genNumber(digits());
    levelEl.textContent = 'Level ' + level + ' · ' + digits() + ' digits';
    stateEl.textContent = 'Memorize';
    livesEl.textContent = maxLives > 1 ? 'Lives ' + '●'.repeat(lives) + '○'.repeat(maxLives - lives) : '';
    numberEl.textContent = chunked(number);
    numberEl.classList.remove('hidden');
    recallEl.classList.add('hidden');
    revealEl.classList.add('hidden');
    NMD.audio.play('show');

    if (mode === 'practice') {
      hideBtn.classList.remove('hidden');
    } else {
      hideBtn.classList.add('hidden');
      var per = SPEED_PER_DIGIT[NMD.data.settings.speed] || SPEED_PER_DIGIT.auto;
      var ms = Math.max(1200, per * digits());
      later(hideNumber, ms);
    }
  }

  function hideNumber() {
    if (state !== 'showing') return;
    hideBtn.classList.add('hidden');
    numberEl.classList.add('hidden');
    state = 'recall';
    stateEl.textContent = mode === 'reverse' ? 'Type it BACKWARDS' : 'Your turn';
    recallEl.classList.remove('hidden');
    input.value = '';
    input.focus();
    recallStart = performance.now();
  }

  function submit() {
    if (state !== 'recall') return;
    var answer = input.value;
    if (!answer.length) return;
    state = 'between';
    var rt = Math.round((performance.now() - recallStart) / 100) / 10;
    recallTimes.push(rt);

    var expected = mode === 'reverse' ? number.split('').reverse().join('') : number;
    if (answer === expected) {
      correct++;
      rounds++;
      roundStreak++;
      if (roundStreak > bestRoundStreak) bestRoundStreak = roundStreak;
      digitsRecalled += digits();
      if (digits() > longest) longest = digits();
      if (bestRecall === null || rt < bestRecall) bestRecall = rt;
      NMD.audio.play('correct');
      stateEl.textContent = 'Correct!';
      level++;
      later(nextRound, 700);
    } else {
      wrong++;
      roundStreak = 0;
      lives--;
      NMD.audio.play('wrong');
      showReveal(expected, answer);
      stateEl.textContent = 'Wrong!';
      if (mode === 'practice') {
        later(nextRound, 2200);
      } else if (lives > 0) {
        later(nextRound, 2200);   /* same level retry */
      } else {
        later(gameOver, 2200);
      }
    }
  }

  function showReveal(expected, answer) {
    var h = '<div class="rv-row">';
    for (var i = 0; i < expected.length; i++) {
      h += '<span class="d d-ok">' + expected[i] + '</span>';
    }
    h += '</div><div class="rv-row">';
    for (var j = 0; j < expected.length; j++) {
      if (j < answer.length) {
        h += '<span class="d ' + (answer[j] === expected[j] ? 'd-ok' : 'd-bad') + '">' + answer[j] + '</span>';
      } else {
        h += '<span class="d d-miss">–</span>';
      }
    }
    h += '</div><div style="margin-top:6px">Number vs your answer' + (mode === 'reverse' ? ' (reverse order)' : '') + '</div>';
    revealEl.innerHTML = h;
    revealEl.classList.remove('hidden');
  }

  function gameOver() {
    clearTimers();
    state = 'over';
    stateEl.textContent = 'Game over';
    recallEl.classList.add('hidden');
    NMD.audio.play('over');
    startBtn.textContent = 'Start';

    var acc = correct + wrong > 0 ? Math.round(correct / (correct + wrong) * 100) : 100;
    var avgRecall = recallTimes.length ? Math.round(NMD.mean(recallTimes) * 10) / 10 : null;

    var r = NMD.recordGame({
      mode: mode, digits: longest, acc: acc, rounds: rounds,
      correct: correct, wrong: wrong, digitsRecalled: digitsRecalled,
      roundStreak: bestRoundStreak, bestRecall: bestRecall
    });
    if (r.newPB) { NMD.audio.play('record'); toast('New Personal Best: ' + longest + ' digits'); if (fxOn()) summaryEl.classList.add('st-pb'); }

    summaryEl.innerHTML =
      '<div class="nm-big">' + longest + ' Digits</div>' +
      '<div class="nm-line">Accuracy ' + acc + '% · ' + correct + ' correct / ' + wrong + ' wrong · ' + mode.toUpperCase() + '</div>' +
      '<div class="nm-cat">' + r.cat + '</div>' +
      '<div class="nm-extra">' +
      'Rounds: <strong>' + rounds + '</strong> · Digits recalled: <strong>' + digitsRecalled + '</strong><br>' +
      (avgRecall !== null ? 'Avg recall: <strong>' + avgRecall + 's</strong>' + (bestRecall !== null ? ' · Best: <strong>' + bestRecall + 's</strong>' : '') + '<br>' : '') +
      'Personal Best: <strong>' + (NMD.data.pb || longest) + ' digits</strong>' +
      '</div>';
    summaryEl.classList.remove('hidden');
    againBtn.classList.remove('hidden');
    shareBtn.classList.remove('hidden');

    var newly = NMD.checkAchievements({
      digits: longest, mode: mode, wrong: wrong, bestRecall: bestRecall,
      roundStreak: bestRoundStreak, newPB: r.newPB, hadPB: r.hadPB
    });
    achToast(newly);

    if (daily) {
      var cfg = NMD.dailyConfig();
      var dNew = NMD.completeDaily(longest);
      achToast(dNew);
      toast('Daily Challenge complete: ' + longest + ' digits');
      daily = false;
    }

    lastShare = 'ReflexLab Number Memory\n' + longest + ' digits · ' + acc + '% accuracy · ' + mode + '\n' +
      'Personal Best: ' + (NMD.data.pb || longest) + ' digits (' + r.cat + ')\n' +
      'Try it: https://reflexlab.tobiascent.workers.dev/tests/number-memory/number-memory.html';

    renderAll();
  }

  /* ---------- input ---------- */
  input.addEventListener('input', function () {
    var v = this.value.replace(/\D/g, '');
    if (v.length > digits()) v = v.slice(0, digits());
    this.value = v;
  });
  input.addEventListener('paste', function (e) { e.preventDefault(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });
  submitBtn.addEventListener('click', submit);
  hideBtn.addEventListener('click', hideNumber);

  /* keypad */
  (function buildKeypad() {
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'C'];
    for (var i = 0; i < keys.length; i++) {
      var b = document.createElement('button');
      b.className = 'nm-key' + (keys[i].length > 1 ? ' fn' : '');
      b.textContent = keys[i];
      b.setAttribute('aria-label', keys[i] === '⌫' ? 'Backspace' : keys[i] === 'C' ? 'Clear' : keys[i]);
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        if (state !== 'recall') return;
        var k = this.textContent;
        if (k === '⌫') input.value = input.value.slice(0, -1);
        else if (k === 'C') input.value = '';
        else if (input.value.length < digits()) input.value += k;
      });
      keypad.appendChild(b);
    }
  })();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'showing' && mode !== 'practice') {
      clearTimers();
      state = 'idle';
      numberEl.classList.add('hidden');
      stateEl.textContent = 'Cancelled';
    }
  });

  /* ---------- buttons ---------- */
  startBtn.addEventListener('click', function () {
    if (mode === 'practice' && (state === 'showing' || state === 'recall' || state === 'between')) {
      clearTimers();
      gameOverPractice();
      return;
    }
    startGame();
  });
  function gameOverPractice() {
    /* practice: end without affecting PB-style recording is handled by recording anyway as a normal game */
    gameOver();
  }
  againBtn.addEventListener('click', startGame);
  shareBtn.addEventListener('click', function () {
    if (navigator.share) navigator.share({ text: lastShare }).catch(function () {});
    else if (window.copyText) window.copyText(lastShare).then(function () { toast('Result copied to clipboard'); });
  });

  /* ---------- pills ---------- */
  var modeBtns = document.querySelectorAll('.nm-mode');
  for (var i = 0; i < modeBtns.length; i++) modeBtns[i].addEventListener('click', function () {
    mode = this.getAttribute('data-mode');
    NMD.set('mode', mode);
    for (var x = 0; x < modeBtns.length; x++) modeBtns[x].classList.remove('active');
    this.classList.add('active');
    clearTimers();
    state = 'idle';
    stateEl.textContent = 'Ready';
    numberEl.classList.add('hidden');
    recallEl.classList.add('hidden');
    revealEl.classList.add('hidden');
    hideBtn.classList.add('hidden');
    startBtn.textContent = 'Start';
    levelEl.textContent = 'Level 1 · 3 digits';
    livesEl.textContent = '';
  });

  /* ---------- quick buttons ---------- */
  $('nmSound').addEventListener('click', function () {
    NMD.set('sound', !NMD.data.settings.sound);
    this.textContent = NMD.data.settings.sound ? '🔊' : '🔇';
    this.classList.toggle('off', !NMD.data.settings.sound);
  });
  $('nmTheme').addEventListener('click', function () { NMD.set('theme', NMD.data.settings.theme === 'dark' ? 'light' : 'dark'); });
  $('nmFull').addEventListener('click', function () {
    var shell = document.querySelector('.nm-shell');
    if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); }
    else if (shell.requestFullscreen) shell.requestFullscreen();
  });
  $('nmSettingsBtn').addEventListener('click', function () { $('nmSettings').classList.remove('hidden'); buildSettings(); });
  $('nmSettingsClose').addEventListener('click', function () { $('nmSettings').classList.add('hidden'); });
  $('nmSettings').addEventListener('click', function (e) { if (e.target === this) this.classList.add('hidden'); });

  /* ---------- tabs ---------- */
  var tabBtns = document.querySelectorAll('.nm-tabbtn');
  for (var t = 0; t < tabBtns.length; t++) tabBtns[t].addEventListener('click', function () {
    for (var x = 0; x < tabBtns.length; x++) {
      tabBtns[x].classList.remove('active');
      $('tab-' + tabBtns[x].getAttribute('data-tab')).classList.add('hidden');
    }
    this.classList.add('active');
    $('tab-' + this.getAttribute('data-tab')).classList.remove('hidden');
  });

  /* ---------- settings ---------- */
  function row(label, ctrl) { return '<div class="nm-srow"><span>' + label + '</span>' + ctrl + '</div>'; }
  function onoff(val) { return '<select><option value="1"' + (val ? ' selected' : '') + '>On</option><option value="0"' + (!val ? ' selected' : '') + '>Off</option></select>'; }
  function buildSettings() {
    var s = NMD.data.settings;
    var h = '';
    h += row('Sound', onoff(s.sound).replace('<select>', '<select data-s="sound">'));
    h += row('Volume', '<input type="range" min="5" max="100" value="' + Math.round(s.volume * 100) + '" data-s="volume">');
    h += row('Display speed', '<select data-s="speed"><option value="auto"' + (s.speed === 'auto' ? ' selected' : '') + '>Auto</option><option value="slow"' + (s.speed === 'slow' ? ' selected' : '') + '>Slow</option><option value="normal"' + (s.speed === 'normal' ? ' selected' : '') + '>Normal</option><option value="fast"' + (s.speed === 'fast' ? ' selected' : '') + '>Fast</option><option value="expert"' + (s.speed === 'expert' ? ' selected' : '') + '>Expert</option></select>');
    h += row('Group digits (chunking aid)', onoff(s.chunk).replace('<select>', '<select data-s="chunk">'));
    h += row('Theme', '<select data-s="theme"><option value="dark"' + (s.theme === 'dark' ? ' selected' : '') + '>Dark</option><option value="light"' + (s.theme === 'light' ? ' selected' : '') + '>Light</option></select>');
    h += row('High contrast', onoff(s.hc).replace('<select>', '<select data-s="hc">'));
    h += row('Reduced motion', onoff(s.rm).replace('<select>', '<select data-s="rm">'));
    h += row('Reset statistics', '<button class="btn btn-ghost" id="nmResetStats">Reset</button>');
    h += row('Reset achievements', '<button class="btn btn-ghost" id="nmResetAch">Reset</button>');
    h += row('Clear ALL local data', '<button class="btn btn-ghost" id="nmResetAll">Clear</button>');
    $('nmSettingsBody').innerHTML = h;

    var sels = $('nmSettingsBody').querySelectorAll('select');
    for (var i = 0; i < sels.length; i++) sels[i].addEventListener('change', function () {
      var k = this.getAttribute('data-s');
      var v = this.value;
      if (k !== 'theme' && k !== 'speed') v = v === '1';
      NMD.set(k, v);
    });
    $('nmSettingsBody').querySelector('[data-s="volume"]').addEventListener('input', function () { NMD.set('volume', Number(this.value) / 100); });
    $('nmResetStats').addEventListener('click', function () { if (confirm('Reset all number memory statistics?')) { NMD.resetStats(); renderAll(); } });
    $('nmResetAch').addEventListener('click', function () { if (confirm('Reset all achievements?')) { NMD.resetAch(); renderAll(); } });
    $('nmResetAll').addEventListener('click', function () { if (confirm('Clear ALL local number memory data?')) { NMD.resetAll(); NMD.applyPrefs(); renderAll(); } });
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
    var s = NMD.getStats();
    if (s.games === 0) {
      $('nmProfile').innerHTML = '<div class="nm-empty">No games yet — play your first game to build your profile.</div>';
      $('nmStatsGrid').innerHTML = '';
      $('nmGraph').innerHTML = '';
      return;
    }
    $('nmProfile').innerHTML =
      '<strong>Number Memory Profile</strong><br>' +
      'Best <strong>' + (s.pb || '—') + ' digits</strong> (' + (s.pb ? NMD.category(s.pb) : '—') + ') · ' +
      'Average <strong>' + (s.avgDigits || '—') + '</strong><br>' +
      'Accuracy <strong>' + (s.acc === null ? '—' : s.acc + '%') + '</strong> · ' +
      'Digits recalled <strong>' + s.digits + '</strong> · Best streak <strong>' + s.bestRoundStreak + '</strong><br>' +
      'Improvement <strong>' + (s.improvement === null ? '—' : (s.improvement > 0 ? '+' : '') + s.improvement + '%') + '</strong>';
    var tiles = [
      ['Best digits', s.pb === null ? '—' : s.pb],
      ['Avg digits', s.avgDigits === null ? '—' : s.avgDigits],
      ['Accuracy', s.acc === null ? '—' : s.acc + '%'],
      ['Games', s.games],
      ['Rounds', s.rounds],
      ['Correct', s.correct],
      ['Wrong', s.wrong],
      ['Today best', s.todayBest === null ? '—' : s.todayBest]
    ];
    var h = '';
    for (var i = 0; i < tiles.length; i++) h += '<div class="nm-stat"><b>' + tiles[i][1] + '</b><span>' + tiles[i][0] + '</span></div>';
    $('nmStatsGrid').innerHTML = h;

    var recent = NMD.data.history.slice(0, 20);
    var max = 0, best = 0;
    for (var b = 0; b < recent.length; b++) { if (recent[b].digits > max) max = recent[b].digits; if (recent[b].digits > best) best = recent[b].digits; }
    var g = '';
    for (var k = 0; k < recent.length; k++) {
      var hh = Math.max(6, Math.round(recent[k].digits / max * 100));
      g += '<div class="nm-bar' + (recent[k].digits === best ? ' best' : '') + '" style="height:' + hh + '%" title="' + recent[k].digits + ' digits"></div>';
    }
    $('nmGraph').innerHTML = g;
  }

  function renderHistory() {
    var h = NMD.data.history;
    if (!h.length) { $('nmHistList').innerHTML = '<div class="nm-empty">No games yet.</div>'; return; }
    var list = '';
    for (var r = 0; r < Math.min(h.length, 12); r++) {
      list += '<div class="nm-hrow"><span>' + timeAgo(h[r].t) + ' · ' + h[r].mode + '</span><span>' + h[r].acc + '%</span><b>' + h[r].digits + ' digits</b></div>';
    }
    $('nmHistList').innerHTML = list;
  }

  function renderAch() {
    var list = NMD.achList();
    var h = '';
    for (var i = 0; i < list.length; i++) {
      h += '<div class="nm-ach ' + (list[i].on ? 'on' : 'locked') + '"><b>' + (list[i].on ? '✓ ' : '') + list[i].name + '</b>' + list[i].desc + '</div>';
    }
    $('nmAchGrid').innerHTML = h;
  }

  function renderDaily() {
    var cfg = NMD.dailyConfig();
    var d = NMD.data.daily;
    var done = d.today === cfg.date;
    $('nmDaily').innerHTML =
      '<strong>Daily Challenge — ' + cfg.date + '</strong><br>' +
      'Today: <strong>' + cfg.mode + '</strong> mode · <strong>' + cfg.speed + '</strong> display speed.<br>' +
      'Status: ' + (done ? '<strong>Completed</strong> · best ' + d.best + ' digits' : 'Not completed yet') + '<br>' +
      'Challenge streak: <strong>' + d.dayStreak + ' day(s)</strong> · Total completed: <strong>' + d.doneTotal + '</strong><br>' +
      (done ? '' : '<button class="btn btn-primary" id="nmDailyPlay">Play Daily Challenge</button>');
    var btn = $('nmDailyPlay');
    if (btn) btn.addEventListener('click', function () {
      mode = cfg.mode;
      NMD.set('speed', cfg.speed);
      daily = true;
      for (var i = 0; i < modeBtns.length; i++) modeBtns[i].classList.toggle('active', modeBtns[i].getAttribute('data-mode') === mode);
      toast('Daily armed: ' + cfg.mode + ' · ' + cfg.speed);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      startGame();
    });
  }

  function renderAll() { renderStats(); renderHistory(); renderAch(); renderDaily(); }

  /* ---------- init ---------- */
  function init() {
    NMD.applyPrefs();
    var s = NMD.data.settings;
    $('nmSound').textContent = s.sound ? '🔊' : '🔇';
    $('nmSound').classList.toggle('off', !s.sound);
    mode = s.mode || 'classic';
    for (var i = 0; i < modeBtns.length; i++) modeBtns[i].classList.toggle('active', modeBtns[i].getAttribute('data-mode') === mode);
    if (!localStorage.getItem('rl-nm-onboard')) $('nmOnboard').classList.remove('hidden');
    $('nmOnboardOk').addEventListener('click', function () {
      $('nmOnboard').classList.add('hidden');
      try { localStorage.setItem('rl-nm-onboard', '1'); } catch (e) {}
    });
    renderAll();
  }
  init();
})();