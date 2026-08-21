/* ============================================
   COLOR VISION - ENGINE + UI (vanilla JS)
   ============================================ */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var grid = $('cvGrid');
  var levelEl = $('cvLevel'), stateEl = $('cvState'), livesEl = $('cvLives'), clockEl = $('cvClock');
  var startBtn = $('cvStart'), againBtn = $('cvAgain'), shareBtn = $('cvShare');
  var summaryEl = $('cvSummary');

  var state = 'idle';
  var mode = 'classic', diff = 'normal';
  var level = 1, lives = 3, maxLives = 3;
  var score = 0, rounds = 0, correct = 0, wrong = 0;
  var roundStreak = 0, bestRoundStreak = 0;
  var respTimes = [], fastResp = null, roundStart = 0;
  var clockTimer = null, timers = [], timeLeft = 45;
  var daily = false, lastShare = '';

  function fxOn() { return CVD.data.settings.fx === 1 && CVD.data.settings.rm !== 1; }
  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99;background:#16a34a;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.4)';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function achToast(l) { for (var i = 0; i < l.length; i++) toast('Achievement unlocked: ' + l[i].name); }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers = []; clearInterval(clockTimer); clockTimer = null; }

  function gridFor(l) { return l <= 2 ? 2 : l <= 5 ? 3 : l <= 9 ? 4 : l <= 14 ? 5 : l <= 20 ? 6 : l <= 27 ? 7 : 8; }
  function deltaFor(l) {
    var start = { easy: 60, normal: 45, hard: 32, expert: 22 }[diff] || 45;
    var min = { easy: 10, normal: 6, hard: 4, expert: 2 }[diff] || 6;
    if (mode === 'practice') return Math.max(18, start * 0.8);
    return Math.max(min, start * Math.pow(0.94, l - 1));
  }

  /* ---------- color generation (HSL) ---------- */
  function makeColors() {
    var h = Math.floor(Math.random() * 360);
    var s = 55 + Math.random() * 25;
    var l = 42 + Math.random() * 20;
    var d = deltaFor(level);
    var axes = ['hue', 'sat', 'light', 'mixed'];
    var axis = axes[Math.floor(Math.random() * axes.length)];
    var sign = Math.random() < 0.5 ? -1 : 1;
    var dh = 0, ds = 0, dl = 0;
    if (axis === 'hue' || axis === 'mixed') dh = d * sign;
    if (axis === 'sat' || axis === 'mixed') ds = d * 0.9 * (sign);
    if (axis === 'light' || axis === 'mixed') dl = d * 0.7 * (-sign);
    var base = 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
    var target = 'hsl(' + ((h + dh + 360) % 360) + ', ' +
      Math.max(5, Math.min(95, s + ds)) + '%, ' +
      Math.max(8, Math.min(92, l + dl)) + '%)';
    return { base: base, target: target };
  }

  /* ---------- round ---------- */
  function nextRound() {
    var n = gridFor(level);
    var colors = makeColors();
    var targetIdx = Math.floor(Math.random() * n * n);

    grid.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
    grid.innerHTML = '';
    grid.classList.remove('locked');
    var aid = CVD.data.settings.aid;
    for (var i = 0; i < n * n; i++) {
      var t = document.createElement('div');
      t.className = 'cv-tile' + (i === targetIdx && aid ? ' aid' : '');
      t.style.background = i === targetIdx ? colors.target : colors.base;
      t.dataset.t = i === targetIdx ? '1' : '0';
      t.setAttribute('role', 'button');
      t.setAttribute('aria-label', 'Tile ' + (i + 1));
      grid.appendChild(t);
    }
    state = 'active';
    stateEl.textContent = 'Find it';
    levelEl.textContent = 'Level ' + level + ' · ' + n + '×' + n;
    roundStart = performance.now();
  }

  function startGame() {
    clearTimers();
    level = 1; score = 0; rounds = 0; correct = 0; wrong = 0;
    roundStreak = 0; bestRoundStreak = 0; respTimes = []; fastResp = null;
    maxLives = mode === 'speed' ? 1 : 3;
    lives = maxLives;
    summaryEl.classList.add('hidden');
    againBtn.classList.add('hidden');
    shareBtn.classList.add('hidden');
    if (mode === 'practice') startBtn.textContent = 'End Practice';
    CVD.audio.unlock();

    if (mode === 'timed') {
      timeLeft = 45;
      clockEl.textContent = '45.0s';
      clockTimer = setInterval(function () {
        timeLeft -= 0.1;
        clockEl.textContent = Math.max(0, timeLeft).toFixed(1) + 's';
        if (timeLeft <= 0) gameOver();
      }, 100);
    } else clockEl.textContent = '';

    updateLives();
    nextRound();
  }

  function updateLives() {
    livesEl.textContent = mode === 'timed' ? '' : 'Lives ' + '●'.repeat(Math.max(0, lives)) + '○'.repeat(maxLives - Math.max(0, lives));
  }

  /* ---------- input ---------- */
  grid.addEventListener('pointerdown', function (e) {
    if (!e.isPrimary || state !== 'active') return;
    var el = e.target;
    if (!el.classList.contains('cv-tile')) return;
    e.preventDefault();
    state = 'between';
    grid.classList.add('locked');

    var rt = Math.round((performance.now() - roundStart) / 10) / 100;

    if (el.dataset.t === '1') {
      correct++;
      rounds++;
      roundStreak++;
      if (roundStreak > bestRoundStreak) bestRoundStreak = roundStreak;
      respTimes.push(rt);
      if (fastResp === null || rt < fastResp) fastResp = rt;
      score += 100 + level * 5;
      el.classList.add('ok');
      CVD.audio.play('correct');
      stateEl.textContent = 'Correct!';
      level++;
      later(nextRound, mode === 'timed' ? 250 : 450);
    } else {
      wrong++;
      roundStreak = 0;
      el.classList.add('bad');
      CVD.audio.play('wrong');
      /* reveal target */
      var tiles = grid.children;
      for (var i = 0; i < tiles.length; i++) if (tiles[i].dataset.t === '1') tiles[i].classList.add('ok');
      stateEl.textContent = 'Wrong!';
      if (mode === 'timed') {
        timeLeft = Math.max(0, timeLeft - 2);
        later(nextRound, 600);
      } else if (mode === 'practice') {
        later(nextRound, 800);
      } else {
        lives--;
        updateLives();
        if (lives <= 0) later(gameOver, 900);
        else later(nextRound, 800);
      }
    }
  });

  function gameOver() {
    if (state === 'over') return;
    clearTimers();
    state = 'over';
    grid.classList.add('locked');
    stateEl.textContent = 'Game over';
    startBtn.textContent = 'Start';
    CVD.audio.play('over');

    var acc = correct + wrong > 0 ? Math.round(correct / (correct + wrong) * 100) : 100;
    var avgResp = respTimes.length ? Math.round(CVD.mean(respTimes) * 100) / 100 : null;

    var r = CVD.recordGame({
      mode: mode, level: level, score: score, acc: acc,
      correct: correct, wrong: wrong, rounds: rounds,
      avgResp: avgResp, fastResp: fastResp, roundStreak: bestRoundStreak
    });
    if (r.newPB) { CVD.audio.play('record'); toast('New Personal Best: level ' + level); if (fxOn()) summaryEl.classList.add('st-pb'); }

    summaryEl.innerHTML =
      '<div class="cv-big">Level ' + level + '</div>' +
      '<div class="cv-line">' + acc + '% accuracy · ' + correct + ' correct / ' + wrong + ' wrong · ' + mode.toUpperCase() + '</div>' +
      '<div class="cv-cat">' + r.cat + '</div>' +
      '<div class="cv-extra">' +
      'Score: <strong>' + score + '</strong>' +
      (avgResp !== null ? ' · Best response: <strong>' + fastResp + 's</strong> · Avg: <strong>' + avgResp + 's</strong>' : '') + '<br>' +
      'Best streak: <strong>' + bestRoundStreak + '</strong> · Personal Best: <strong>' + (CVD.data.pb || level) + '</strong>' +
      '</div>';
    summaryEl.classList.remove('hidden');
    againBtn.classList.remove('hidden');
    shareBtn.classList.remove('hidden');

    var newly = CVD.checkAchievements({
      level: level, acc: acc, rounds: rounds, wrong: wrong,
      fastResp: fastResp, roundStreak: bestRoundStreak, newPB: r.newPB, hadPB: r.hadPB
    });
    achToast(newly);

    if (daily) {
      var cfg = CVD.dailyConfig();
      var dNew = CVD.completeDaily(level);
      achToast(dNew);
      toast('Daily Challenge complete: level ' + level);
      daily = false;
    }

    lastShare = 'ReflexLab Color Vision\nLevel: ' + level + ' · ' + acc + '% accuracy' +
      (avgResp !== null ? ' · avg ' + avgResp + 's' : '') + '\n' +
      'Personal Best: ' + (CVD.data.pb || level) + ' (' + r.cat + ')\n' +
      'Try it: https://reflexlab.tobiascent.workers.dev/tests/color-vision/color-vision.html';

    renderAll();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'active') {
      clearTimers();
      state = 'idle';
      grid.classList.add('locked');
      stateEl.textContent = 'Cancelled';
    }
  });

  /* ---------- buttons ---------- */
  startBtn.addEventListener('click', function () {
    if (mode === 'practice' && (state === 'active' || state === 'between')) { gameOver(); return; }
    startGame();
  });
  againBtn.addEventListener('click', startGame);
  shareBtn.addEventListener('click', function () {
    if (navigator.share) navigator.share({ text: lastShare }).catch(function () {});
    else if (window.copyText) window.copyText(lastShare).then(function () { toast('Result copied to clipboard'); });
  });

  /* ---------- pills ---------- */
  var modeBtns = document.querySelectorAll('.cv-mode');
  var diffBtns = document.querySelectorAll('.cv-diff');
  function setActive(list, btn) { for (var i = 0; i < list.length; i++) list[i].classList.remove('active'); btn.classList.add('active'); }
  function resetIdle() {
    clearTimers();
    state = 'idle';
    grid.innerHTML = '';
    grid.classList.add('locked');
    stateEl.textContent = 'Ready';
    levelEl.textContent = 'Level 1 · 2×2';
    livesEl.textContent = 'Lives ●●●';
    clockEl.textContent = '';
    startBtn.textContent = 'Start';
  }
  for (var i = 0; i < modeBtns.length; i++) modeBtns[i].addEventListener('click', function () {
    mode = this.getAttribute('data-mode');
    CVD.set('mode', mode);
    setActive(modeBtns, this);
    resetIdle();
  });
  for (var d = 0; d < diffBtns.length; d++) diffBtns[d].addEventListener('click', function () {
    diff = this.getAttribute('data-diff');
    CVD.set('diff', diff);
    setActive(diffBtns, this);
    resetIdle();
  });

  /* ---------- quick buttons ---------- */
  $('cvSound').addEventListener('click', function () {
    CVD.set('sound', !CVD.data.settings.sound);
    this.textContent = CVD.data.settings.sound ? '🔊' : '🔇';
    this.classList.toggle('off', !CVD.data.settings.sound);
  });
  $('cvTheme').addEventListener('click', function () { CVD.set('theme', CVD.data.settings.theme === 'dark' ? 'light' : 'dark'); });
  $('cvFull').addEventListener('click', function () {
    var shell = document.querySelector('.cv-shell');
    if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); }
    else if (shell.requestFullscreen) shell.requestFullscreen();
  });
  $('cvSettingsBtn').addEventListener('click', function () { $('cvSettings').classList.remove('hidden'); buildSettings(); });
  $('cvSettingsClose').addEventListener('click', function () { $('cvSettings').classList.add('hidden'); });
  $('cvSettings').addEventListener('click', function (e) { if (e.target === this) this.classList.add('hidden'); });

  /* ---------- tabs ---------- */
  var tabBtns = document.querySelectorAll('.cv-tabbtn');
  for (var t = 0; t < tabBtns.length; t++) tabBtns[t].addEventListener('click', function () {
    for (var x = 0; x < tabBtns.length; x++) {
      tabBtns[x].classList.remove('active');
      $('tab-' + tabBtns[x].getAttribute('data-tab')).classList.add('hidden');
    }
    this.classList.add('active');
    $('tab-' + this.getAttribute('data-tab')).classList.remove('hidden');
  });

  /* ---------- settings ---------- */
  function row(label, ctrl) { return '<div class="cv-srow"><span>' + label + '</span>' + ctrl + '</div>'; }
  function onoff(val) { return '<select><option value="1"' + (val ? ' selected' : '') + '>On</option><option value="0"' + (!val ? ' selected' : '') + '>Off</option></select>'; }
  function buildSettings() {
    var s = CVD.data.settings;
    var h = '';
    h += row('Sound', onoff(s.sound).replace('<select>', '<select data-s="sound">'));
    h += row('Volume', '<input type="range" min="5" max="100" value="' + Math.round(s.volume * 100) + '" data-s="volume">');
    h += row('Marker aid (accessibility)', onoff(s.aid).replace('<select>', '<select data-s="aid">'));
    h += row('Theme', '<select data-s="theme"><option value="dark"' + (s.theme === 'dark' ? ' selected' : '') + '>Dark</option><option value="light"' + (s.theme === 'light' ? ' selected' : '') + '>Light</option></select>');
    h += row('High contrast', onoff(s.hc).replace('<select>', '<select data-s="hc">'));
    h += row('Reduced motion', onoff(s.rm).replace('<select>', '<select data-s="rm">'));
    h += row('Reset statistics', '<button class="btn btn-ghost" id="cvResetStats">Reset</button>');
    h += row('Reset achievements', '<button class="btn btn-ghost" id="cvResetAch">Reset</button>');
    h += row('Clear ALL local data', '<button class="btn btn-ghost" id="cvResetAll">Clear</button>');
    $('cvSettingsBody').innerHTML = h;

    var sels = $('cvSettingsBody').querySelectorAll('select');
    for (var i = 0; i < sels.length; i++) sels[i].addEventListener('change', function () {
      var k = this.getAttribute('data-s');
      var v = this.value;
      if (k !== 'theme') v = v === '1';
      CVD.set(k, v);
    });
    $('cvSettingsBody').querySelector('[data-s="volume"]').addEventListener('input', function () { CVD.set('volume', Number(this.value) / 100); });
    $('cvResetStats').addEventListener('click', function () { if (confirm('Reset all color vision statistics?')) { CVD.resetStats(); renderAll(); } });
    $('cvResetAch').addEventListener('click', function () { if (confirm('Reset all achievements?')) { CVD.resetAch(); renderAll(); } });
    $('cvResetAll').addEventListener('click', function () { if (confirm('Clear ALL local color vision data?')) { CVD.resetAll(); CVD.applyPrefs(); renderAll(); } });
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
    var s = CVD.getStats();
    if (s.games === 0) {
      $('cvProfile').innerHTML = '<div class="cv-empty">No games yet — play your first game to build your profile.</div>';
      $('cvStatsGrid').innerHTML = '';
      $('cvGraph').innerHTML = '';
      return;
    }
    $('cvProfile').innerHTML =
      '<strong>Color Vision Profile</strong><br>' +
      'Best level <strong>' + (s.pb || '—') + '</strong> (' + (s.pb ? CVD.category(s.pb) : '—') + ') · ' +
      'Average <strong>' + (s.avgLevel || '—') + '</strong><br>' +
      'Accuracy <strong>' + (s.acc === null ? '—' : s.acc + '%') + '</strong> · ' +
      'Avg response <strong>' + (s.avgResp === null ? '—' : s.avgResp + 's') + '</strong> · ' +
      'Best streak <strong>' + s.bestStreak + '</strong><br>' +
      'Improvement <strong>' + (s.improvement === null ? '—' : (s.improvement > 0 ? '+' : '') + s.improvement + '%') + '</strong>';
    var tiles = [
      ['Best level', s.pb === null ? '—' : s.pb],
      ['Avg level', s.avgLevel === null ? '—' : s.avgLevel],
      ['Accuracy', s.acc === null ? '—' : s.acc + '%'],
      ['Avg resp.', s.avgResp === null ? '—' : s.avgResp + 's'],
      ['Games', s.games],
      ['Correct', s.correct],
      ['Wrong', s.wrong],
      ['Today best', s.todayBest === null ? '—' : s.todayBest]
    ];
    var h = '';
    for (var i = 0; i < tiles.length; i++) h += '<div class="cv-stat"><b>' + tiles[i][1] + '</b><span>' + tiles[i][0] + '</span></div>';
    $('cvStatsGrid').innerHTML = h;

    var recent = CVD.data.history.slice(0, 20);
    var max = 0, best = 0;
    for (var b = 0; b < recent.length; b++) { if (recent[b].level > max) max = recent[b].level; if (recent[b].level > best) best = recent[b].level; }
    var g = '';
    for (var k = 0; k < recent.length; k++) {
      var hh = Math.max(6, Math.round(recent[k].level / max * 100));
      g += '<div class="cv-bar' + (recent[k].level === best ? ' best' : '') + '" style="height:' + hh + '%" title="Level ' + recent[k].level + '"></div>';
    }
    $('cvGraph').innerHTML = g;
  }

  function renderHistory() {
    var h = CVD.data.history;
    if (!h.length) { $('cvHistList').innerHTML = '<div class="cv-empty">No games yet.</div>'; return; }
    var list = '';
    for (var r = 0; r < Math.min(h.length, 12); r++) {
      list += '<div class="cv-hrow"><span>' + timeAgo(h[r].t) + ' · ' + h[r].mode + '</span><span>' + h[r].acc + '%</span><b>Level ' + h[r].level + '</b></div>';
    }
    $('cvHistList').innerHTML = list;
  }

  function renderAch() {
    var list = CVD.achList();
    var h = '';
    for (var i = 0; i < list.length; i++) {
      h += '<div class="cv-ach ' + (list[i].on ? 'on' : 'locked') + '"><b>' + (list[i].on ? '✓ ' : '') + list[i].name + '</b>' + list[i].desc + '</div>';
    }
    $('cvAchGrid').innerHTML = h;
  }

  function renderDaily() {
    var cfg = CVD.dailyConfig();
    var d = CVD.data.daily;
    var done = d.today === cfg.date;
    $('cvDaily').innerHTML =
      '<strong>Daily Challenge — ' + cfg.date + '</strong><br>' +
      'Today: <strong>' + cfg.mode + '</strong> mode · <strong>' + cfg.diff + '</strong> difficulty.<br>' +
      'Status: ' + (done ? '<strong>Completed</strong> · best level ' + d.best : 'Not completed yet') + '<br>' +
      'Challenge streak: <strong>' + d.dayStreak + ' day(s)</strong> · Total completed: <strong>' + d.doneTotal + '</strong><br>' +
      (done ? '' : '<button class="btn btn-primary" id="cvDailyPlay">Play Daily Challenge</button>');
    var btn = $('cvDailyPlay');
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
    CVD.applyPrefs();
    var s = CVD.data.settings;
    $('cvSound').textContent = s.sound ? '🔊' : '🔇';
    $('cvSound').classList.toggle('off', !s.sound);
    mode = s.mode || 'classic';
    diff = s.diff || 'normal';
    for (var i = 0; i < modeBtns.length; i++) modeBtns[i].classList.toggle('active', modeBtns[i].getAttribute('data-mode') === mode);
    for (var d = 0; d < diffBtns.length; d++) diffBtns[d].classList.toggle('active', diffBtns[d].getAttribute('data-diff') === diff);
    grid.classList.add('locked');
    if (!localStorage.getItem('rl-cv-onboard')) $('cvOnboard').classList.remove('hidden');
    $('cvOnboardOk').addEventListener('click', function () {
      $('cvOnboard').classList.add('hidden');
      try { localStorage.setItem('rl-cv-onboard', '1'); } catch (e) {}
    });
    renderAll();
  }
  init();
})();