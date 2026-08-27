/* ============================================
   REACTION GAME - ENGINE + UI (vanilla JS)
   ============================================ */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var area = $('rtArea'), big = $('rtBig'), sub = $('rtSub'), msEl = $('rtMs');
  var roundEl = $('rtRound'), stateEl = $('rtState'), streakEl = $('rtStreak');
  var startBtn = $('rtStart'), againBtn = $('rtAgain'), shareBtn = $('rtShare');
  var summaryEl = $('rtSummary');

  var DIFFS = { easy: [1500, 4000], normal: [1000, 3500], hard: [700, 2500], expert: [500, 2000] };

  var state = 'idle';
  var session = { mode: 'single', rounds: 1, diff: null, results: [], falseStarts: 0, round: 0, daily: false, active: false };
  var t0 = 0, timer = null, countT = null, autoT = null, lastShare = '';

  /* ---------- small helpers ---------- */
  function setState(s, cls) {
    state = s;
    area.className = 'rt-area ' + (cls || 'st-' + s);
    stateEl.textContent =
      s === 'idle' ? 'Ready' :
      s === 'wait' ? 'Wait' :
      s === 'go' ? 'CLICK!' :
      s === 'false' ? 'False Start' :
      s === 'nogo' ? 'No-Go' : 'Result';
  }
  function hud() {
    var r = session.rounds === Infinity ? (session.round || 0) : session.round;
    roundEl.textContent = session.active
      ? (session.rounds === Infinity ? 'Round ' + r : 'Round ' + Math.max(1, r) + '/' + session.rounds)
      : '—';
    streakEl.textContent = 'Streak ' + RTD.data.streak;
  }
  function cancelTimers() { clearTimeout(timer); clearTimeout(countT); clearTimeout(autoT); }
  function fxOn() { return RTD.data.settings.fx === 1 && RTD.data.settings.rm !== 1; }

  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99;background:#16a34a;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.4)';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function achToast(list) {
    for (var i = 0; i < list.length; i++) toast('Achievement unlocked: ' + list[i].name);
  }

  /* ---------- session flow ---------- */
  function modeRounds(m) {
    if (m === 'single') return 1;
    if (m === 'endless') return Infinity;
    if (m === 'nogo') return 5;
    return Number(m);
  }

  function begin() {
    cancelTimers();
    session.results = [];
    session.falseStarts = 0;
    session.round = 0;
    session.active = true;
    summaryEl.classList.add('hidden');
    againBtn.classList.add('hidden');
    shareBtn.classList.add('hidden');
    if (session.mode === 'endless') startBtn.textContent = 'End Run';
    RTD.audio.unlock();
    if (RTD.data.settings.countdown) {
      var n = 3;
      setState('idle');
      big.textContent = n;
      sub.textContent = 'Get ready…';
      RTD.audio.play('count');
      countT = setInterval(function () {
        n--;
        if (n <= 0) { clearInterval(countT); startRound(); }
        else { big.textContent = n; RTD.audio.play('count'); }
      }, 500);
    } else startRound();
  }

  function startRound() {
    session.round++;
    hud();
    setState('wait');
    big.textContent = 'Wait…';
    sub.textContent = 'Click / tap / press key when GREEN';
    msEl.textContent = '';
    RTD.audio.play('start');
    var d = session.diff || RTD.data.settings.diff;
    var range = DIFFS[d] || DIFFS.normal;
    var delay = range[0] + Math.random() * (range[1] - range[0]);

    /* no-signal traps: nogo mode 35%, expert 12% */
    var trapChance = session.mode === 'nogo' ? 0.35 : (d === 'expert' ? 0.12 : 0);
    var trap = Math.random() < trapChance;

    timer = setTimeout(function () {
      if (trap) {
        setState('nogo', 'st-false');
        big.textContent = 'NO-GO';
        sub.textContent = 'Don\'t click — wait it out';
        timer = setTimeout(function () { roundPass(); }, 1400);
      } else {
        setState('go');
        big.textContent = 'CLICK!';
        sub.textContent = '';
        t0 = performance.now();           /* measurement starts EXACTLY here */
        RTD.audio.play('go');
      }
    }, delay);
  }

  function roundPass() {
    setState('result');
    big.textContent = 'Discipline!';
    sub.textContent = 'No-go round survived';
    msEl.textContent = '';
    nextOrFinish();
  }

  function falseStart() {
    cancelTimers();
    RTD.recordFalse();
    session.falseStarts++;
    RTD.audio.play('false');
    setState('false');
    big.textContent = 'Too early!';
    sub.textContent = session.rounds === 1 || !session.active
      ? 'Wait for green before clicking'
      : 'False start — round lost';
    msEl.textContent = '';
    hud();
    if (session.active && session.rounds !== 1) nextOrFinish(true);
    else { againBtn.classList.remove('hidden'); }
  }

  function hit() {
    var ms = Math.round(performance.now() - t0);   /* measurement ends EXACTLY here */
    setState('result');
    session.results.push(ms);
    var r = RTD.recordAttempt(ms);
    RTD.audio.play(r.newPB ? 'record' : 'result');
    big.textContent = ms + ' ms';
    sub.textContent = r.cat + (r.newPB ? ' — NEW PERSONAL BEST!' : '');
    msEl.textContent = 'Best ' + RTD.data.pb + ' ms · Avg ' + (RTD.getStats().avg || ms) + ' ms';
    if (r.newPB && fxOn()) area.classList.add('st-pb');
    if (r.newPB) toast('New Personal Best: ' + ms + ' ms');
    hud();
    nextOrFinish();
  }

  function nextOrFinish(fromFalse) {
    var done = session.rounds !== Infinity && session.round >= session.rounds;
    if (session.mode === 'endless') {
      autoT = setTimeout(startRound, 1100);
      return;
    }
    if (!done) { autoT = setTimeout(startRound, 1100); return; }
    finish();
  }

  function finish() {
    session.active = false;
    cancelTimers();
    startBtn.textContent = 'Start';
    var res = session.results;
    var avg = RTD.mean(res), best = res.length ? Math.min.apply(null, res) : null;
    var worst = res.length ? Math.max.apply(null, res) : null;
    var med = RTD.median(res), cons = RTD.consistency(res);

    if (session.rounds > 1) {
      var ctx = { challenge: { rounds: session.rounds, falseStarts: session.falseStarts, avg: avg } };
      if (cons !== null && res.length >= 10) { ctx.sessionCons = cons; ctx.sessionN = res.length; }
      var newly = RTD.recordChallenge(ctx);
      achToast(newly);

      var rows = '';
      for (var i = 0; i < res.length; i++) rows += 'Round ' + (i + 1) + ': <strong>' + res[i] + ' ms</strong> (' + RTD.category(res[i]) + ')<br>';
      var rating = avg ? RTD.category(avg) : '—';
      summaryEl.innerHTML =
        '<div class="rt-rate">Session rating: ' + rating + '</div>' +
        rows +
        'Average <strong>' + (avg || '—') + ' ms</strong> · Best <strong>' + (best || '—') + '</strong> · Worst <strong>' + (worst || '—') + '</strong><br>' +
        'Median <strong>' + (med || '—') + '</strong> · Consistency <strong>' + (cons === null ? '—' : cons + '%') + '</strong> · False starts <strong>' + session.falseStarts + '</strong>';
      summaryEl.classList.remove('hidden');
    }

    if (session.daily && res.length) {
      var dNew = RTD.completeDaily(best);
      achToast(dNew);
      toast('Daily Challenge complete!');
      session.daily = false;
    }

    againBtn.classList.remove('hidden');
    shareBtn.classList.remove('hidden');
    lastShare = buildShare(avg, best);
    submitScore("reaction", avg || best);
    renderAll();
  }

  /* ---------- input routing ---------- */
  function handleInput() {
    if (state === 'idle') { if (!session.active) begin(); }
    else if (state === 'wait') falseStart();
    else if (state === 'nogo') falseStart();
    else if (state === 'go') hit();
    else if (state === 'result' && session.rounds === 1 && !session.active) begin();
  }

  area.addEventListener('pointerdown', function (e) { e.preventDefault(); handleInput(); });
  area.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  document.addEventListener('keydown', function (e) {
    if (captureKey) {
      e.preventDefault();
      RTD.set('key', e.code);
      captureKey = false;
      buildSettings();
      return;
    }
    if (e.code === RTD.data.settings.key && !e.repeat) {
      if (state === 'wait' || state === 'go' || state === 'nogo') e.preventDefault();
      handleInput();
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && (state === 'wait' || state === 'go' || state === 'nogo')) {
      cancelTimers();
      setState('idle');
      big.textContent = 'Round cancelled';
      sub.textContent = 'Tab switch detected — start again for a fair result';
    }
  });

  /* ---------- buttons ---------- */
  startBtn.addEventListener('click', function () {
    if (session.mode === 'endless' && session.active) { finish(); return; }
    begin();
  });
  againBtn.addEventListener('click', begin);
  shareBtn.addEventListener('click', function () {
    if (navigator.share) { navigator.share({ text: lastShare }).catch(function () {}); }
    else copyText(lastShare).then(function () { toast('Result copied to clipboard'); });
  });
  function copyText(t) { return RTD ? window.copyText ? window.copyText(t) : Promise.resolve() : Promise.resolve(); }

  function buildShare(avg, best) {
    var s = RTD.getStats();
    return 'ReflexLab Reaction Time\n' +
      'Session avg: ' + (avg || '—') + ' ms · Best: ' + (best || s.pb || '—') + ' ms\n' +
      'Category: ' + (avg ? RTD.category(avg) : '—') + ' · Accuracy: ' + (s.accuracy === null ? '—' : s.accuracy + '%') + '\n' +
      'Try it: https://reflexlab.tobiascent.workers.dev/tests/reaction/reaction.html';
  }

  /* ---------- mode / difficulty ---------- */
  var modeBtns = document.querySelectorAll('.rt-mode');
  var diffBtns = document.querySelectorAll('.rt-diff');
  function setActive(list, btn) {
    for (var i = 0; i < list.length; i++) list[i].classList.remove('active');
    btn.classList.add('active');
  }
  for (var i = 0; i < modeBtns.length; i++) modeBtns[i].addEventListener('click', function () {
    cancelTimers(); session.active = false; setState('idle');
    big.textContent = 'Reaction Time'; sub.textContent = 'Click, tap or press ' + keyName() + ' to start';
    session.mode = this.getAttribute('data-mode');
    session.rounds = modeRounds(session.mode);
    RTD.set('mode', session.mode);
    setActive(modeBtns, this);
    startBtn.textContent = 'Start';
    hud();
  });
  for (var j = 0; j < diffBtns.length; j++) diffBtns[j].addEventListener('click', function () {
    RTD.set('diff', this.getAttribute('data-diff'));
    setActive(diffBtns, this);
  });
  function keyName() {
    var k = RTD.data.settings.key;
    return k === 'Space' ? 'SPACE' : k.replace('Key', '').toUpperCase();
  }

  /* ---------- quick buttons ---------- */
  $('rtSound').addEventListener('click', function () {
    RTD.set('sound', !RTD.data.settings.sound);
    this.textContent = RTD.data.settings.sound ? '🔊' : '🔇';
    this.classList.toggle('off', !RTD.data.settings.sound);
  });
  $('rtTheme').addEventListener('click', function () {
    RTD.set('theme', RTD.data.settings.theme === 'dark' ? 'light' : 'dark');
  });
  $('rtFull').addEventListener('click', function () {
    var shell = document.querySelector('.rt-shell');
    if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); }
    else if (shell.requestFullscreen) shell.requestFullscreen();
  });
  $('rtSettingsBtn').addEventListener('click', function () {
    $('rtSettings').classList.remove('hidden');
    buildSettings();
  });
  $('rtSettingsClose').addEventListener('click', function () { $('rtSettings').classList.add('hidden'); });

  /* ---------- tabs ---------- */
  var tabBtns = document.querySelectorAll('.rt-tabbtn');
  for (var t = 0; t < tabBtns.length; t++) tabBtns[t].addEventListener('click', function () {
    for (var x = 0; x < tabBtns.length; x++) {
      tabBtns[x].classList.remove('active');
      $('tab-' + tabBtns[x].getAttribute('data-tab')).classList.add('hidden');
    }
    this.classList.add('active');
    $('tab-' + this.getAttribute('data-tab')).classList.remove('hidden');
  });

  /* ---------- settings modal ---------- */
  var captureKey = false;
  function row(label, ctrl) { return '<div class="rt-srow"><span>' + label + '</span>' + ctrl + '</div>'; }
  function onoff(val) {
    return '<select><option value="1"' + (val ? ' selected' : '') + '>On</option><option value="0"' + (!val ? ' selected' : '') + '>Off</option></select>';
  }
  function buildSettings() {
    var s = RTD.data.settings;
    var h = '';
    h += row('Sound', onoff(s.sound)).replace('</select>', '</select>').replace('<select>', '<select data-s="sound">');
    h += row('Volume', '<input type="range" min="5" max="100" value="' + Math.round(s.volume * 100) + '" data-s="volume">');
    h += row('Countdown', onoff(s.countdown).replace('<select>', '<select data-s="countdown">'));
    h += row('Reaction key', '<button class="btn btn-ghost rt-keybtn" id="rtKeyBtn">' + keyName() + '</button>');
    h += row('Theme', '<select data-s="theme"><option value="dark"' + (s.theme === 'dark' ? ' selected' : '') + '>Dark</option><option value="light"' + (s.theme === 'light' ? ' selected' : '') + '>Light</option></select>');
    h += row('High contrast', onoff(s.hc).replace('<select>', '<select data-s="hc">'));
    h += row('Reduced motion', onoff(s.rm).replace('<select>', '<select data-s="rm">'));
    h += row('Visual effects', onoff(s.fx).replace('<select>', '<select data-s="fx">'));
    h += row('Reset statistics', '<button class="btn btn-ghost" id="rtResetStats">Reset</button>');
    h += row('Reset achievements', '<button class="btn btn-ghost" id="rtResetAch">Reset</button>');
    h += row('Clear ALL local data', '<button class="btn btn-ghost" id="rtResetAll">Clear</button>');
    $('rtSettingsBody').innerHTML = h;

    var sels = $('rtSettingsBody').querySelectorAll('select');
    for (var i = 0; i < sels.length; i++) sels[i].addEventListener('change', function () {
      var k = this.getAttribute('data-s');
      var v = this.value;
      if (k === 'sound' || k === 'countdown' || k === 'hc' || k === 'rm' || k === 'fx') v = v === '1';
      RTD.set(k, v);
    });
    $('rtSettingsBody').querySelector('[data-s="volume"]').addEventListener('input', function () {
      RTD.set('volume', Number(this.value) / 100);
    });
    $('rtKeyBtn').addEventListener('click', function () {
      captureKey = true;
      this.textContent = 'Press any key…';
    });
    $('rtResetStats').addEventListener('click', function () {
      if (confirm('Reset all statistics and history? This cannot be undone.')) { RTD.resetStats(); renderAll(); }
    });
    $('rtResetAch').addEventListener('click', function () {
      if (confirm('Reset all achievements?')) { RTD.resetAch(); renderAll(); }
    });
    $('rtResetAll').addEventListener('click', function () {
      if (confirm('Clear ALL local data (stats, achievements, settings)?')) { RTD.resetAll(); RTD.applyPrefs(); renderAll(); }
    });
  }

  /* ---------- render: stats / history / achievements / daily ---------- */
  function timeAgo(ts) {
    var d = Math.round((Date.now() - ts) / 1000);
    if (d < 60) return 'just now';
    if (d < 3600) return Math.round(d / 60) + 'm ago';
    if (d < 86400) return Math.round(d / 3600) + 'h ago';
    return Math.round(d / 86400) + 'd ago';
  }

  function renderStats() {
    var s = RTD.getStats();
    if (s.tests === 0) {
      $('rtProfile').innerHTML = '<div class="rt-empty">No tests yet — play your first round to build your Reaction Profile.</div>';
      $('rtStatsGrid').innerHTML = '';
      $('rtCompare').innerHTML = '';
      return;
    }
    $('rtProfile').innerHTML =
      '<strong>Reaction Profile</strong><br>' +
      'Average <strong>' + (s.avg || '—') + ' ms</strong> (' + (s.avg ? RTD.category(s.avg) : '—') + ') · ' +
      'Personal best <strong>' + (s.pb || '—') + ' ms</strong><br>' +
      'Consistency <strong>' + (s.consistency === null ? '—' : s.consistency + '%') + '</strong> · ' +
      'Accuracy <strong>' + (s.accuracy === null ? '—' : s.accuracy + '%') + '</strong> · ' +
      'Best streak <strong>' + s.bestStreak + '</strong><br>' +
      'Total tests <strong>' + s.tests + '</strong> · ' +
      'Improvement <strong>' + (s.improvement === null ? '—' : (s.improvement > 0 ? '+' : '') + s.improvement + '%') + '</strong>';
    var tiles = [
      ['Best', s.pb === null ? '—' : s.pb + ' ms'],
      ['Worst', s.worst === null ? '—' : s.worst + ' ms'],
      ['Average', s.avg === null ? '—' : s.avg + ' ms'],
      ['Median', s.median === null ? '—' : s.median + ' ms'],
      ['Last 10 avg', s.avg10 === null ? '—' : s.avg10 + ' ms'],
      ['Today best', s.todayBest === null ? '—' : s.todayBest + ' ms'],
      ['False starts', s.falseStarts],
      ['Challenges', s.games]
    ];
    var h = '';
    for (var i = 0; i < tiles.length; i++) h += '<div class="rt-stat"><b>' + tiles[i][1] + '</b><span>' + tiles[i][0] + '</span></div>';
    $('rtStatsGrid').innerHTML = h;

    /* compare bars (inline styles, no deps) */
    var you = s.avg || s.pb;
    var items = [['You', you, '#22d3ee'], ['Average', 250, '#8a94a6'], ['Pro', 150, '#4ade80']];
    var max = Math.max(you, 250, 150);
    var ch = '';
    for (var k = 0; k < items.length; k++) {
      var w = Math.max(6, Math.round(items[k][1] / max * 100));
      ch += '<div style="display:flex;align-items:center;gap:10px;margin:6px 0;font-size:13px;color:var(--text-2)">' +
        '<span style="width:70px">' + items[k][0] + '</span>' +
        '<div style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:6px;height:14px;overflow:hidden">' +
        '<div style="width:' + w + '%;height:100%;background:' + items[k][2] + '"></div></div>' +
        '<span style="width:70px;text-align:right;color:var(--text)">' + items[k][1] + ' ms</span></div>';
    }
    $('rtCompare').innerHTML = ch;
  }

  function renderHistory() {
    var h = RTD.data.history;
    if (!h.length) { $('rtGraph').innerHTML = ''; $('rtHistList').innerHTML = '<div class="rt-empty">No attempts yet.</div>'; return; }
    var recent = h.slice(0, 20);
    var max = 0, best = Infinity;
    for (var i = 0; i < recent.length; i++) { if (recent[i].ms > max) max = recent[i].ms; if (recent[i].ms < best) best = recent[i].ms; }
    var g = '';
    for (var b = 0; b < recent.length; b++) {
      var hh = Math.max(6, Math.round(recent[b].ms / max * 100));
      g += '<div class="rt-bar' + (recent[b].ms === best ? ' best' : '') + '" style="height:' + hh + '%" title="' + recent[b].ms + ' ms"></div>';
    }
    $('rtGraph').innerHTML = g;
    var list = '';
    for (var r = 0; r < Math.min(recent.length, 10); r++) {
      list += '<div class="rt-hrow"><span>' + timeAgo(recent[r].t) + '</span><span>' + RTD.category(recent[r].ms) + '</span><b>' + recent[r].ms + ' ms</b></div>';
    }
    $('rtHistList').innerHTML = list;
  }

  function renderAch() {
    var list = RTD.achList();
    var h = '';
    for (var i = 0; i < list.length; i++) {
      h += '<div class="rt-ach ' + (list[i].on ? 'on' : 'locked') + '"><b>' + (list[i].on ? '✓ ' : '') + list[i].name + '</b>' + list[i].desc + '</div>';
    }
    $('rtAchGrid').innerHTML = h;
  }

  function renderDaily() {
    var cfg = RTD.dailyConfig();
    var d = RTD.data.daily;
    var done = d.today === cfg.date;
    $('rtDaily').innerHTML =
      '<strong>Daily Challenge — ' + cfg.date + '</strong><br>' +
      'Today\'s config: <strong>' + cfg.rounds + ' rounds</strong> on <strong>' + cfg.diff.toUpperCase() + '</strong> difficulty.<br>' +
      'Status: ' + (done ? '<strong>Completed</strong> · best ' + d.best + ' ms' : 'Not completed yet') + '<br>' +
      'Today best: <strong>' + (d.todayBest || d.best || '—') + '</strong> · Challenge streak: <strong>' + d.dayStreak + ' day(s)</strong> · Total completed: <strong>' + d.doneTotal + '</strong><br>' +
      (done ? '' : '<button class="btn btn-primary" id="rtDailyPlay">Play Daily Challenge</button>');
    var btn = $('rtDailyPlay');
    if (btn) btn.addEventListener('click', function () {
      session.mode = 'single';
      session.rounds = cfg.rounds;
      session.diff = cfg.diff;
      session.daily = true;
      for (var i = 0; i < tabBtns.length; i++) {
        tabBtns[i].classList.toggle('active', tabBtns[i].getAttribute('data-tab') === 'stats');
        $('tab-' + tabBtns[i].getAttribute('data-tab')).classList.toggle('hidden', tabBtns[i].getAttribute('data-tab') !== 'stats');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast('Daily Challenge armed: ' + cfg.rounds + ' rounds @ ' + cfg.diff);
      begin();
    });
  }

  function renderAll() { renderStats(); renderHistory(); renderAch(); renderDaily(); hud(); }

  /* ---------- init ---------- */
  function init() {
    RTD.applyPrefs();
    var s = RTD.data.settings;
    $('rtSound').textContent = s.sound ? '🔊' : '🔇';
    $('rtSound').classList.toggle('off', !s.sound);

    /* restore mode/diff buttons */
    for (var i = 0; i < modeBtns.length; i++) {
      if (modeBtns[i].getAttribute('data-mode') === s.mode) { modeBtns[i].classList.add('active'); session.mode = s.mode; session.rounds = modeRounds(s.mode); }
      else modeBtns[i].classList.remove('active');
    }
    for (var d = 0; d < diffBtns.length; d++) diffBtns[d].classList.toggle('active', diffBtns[d].getAttribute('data-diff') === s.diff);

    sub.textContent = 'Click, tap or press ' + keyName() + ' to start';

    if (!localStorage.getItem('rl-rt-onboard')) {
      $('rtOnboard').classList.remove('hidden');
    }
    $('rtOnboardOk').addEventListener('click', function () {
      $('rtOnboard').classList.add('hidden');
      try { localStorage.setItem('rl-rt-onboard', '1'); } catch (e) {}
    });

    renderAll();
  }
  init();
})();