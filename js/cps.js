/* ============================================
   CPS GAME - ENGINE + UI (vanilla JS)
   ============================================ */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var area = $('cpArea'), big = $('cpBig'), sub = $('cpSub'), msEl = $('cpMs');
  var timeEl = $('cpTime'), stateEl = $('cpState'), liveEl = $('cpLive');
  var startBtn = $('cpStart'), againBtn = $('cpAgain'), shareBtn = $('cpShare');
  var summaryEl = $('cpSummary');

  var state = 'idle';           // idle | armed | active | end
  var dur = 5;
  var mode = 'classic';
  var daily = false;
  var t0 = 0, clicks = 0, stamps = [], uiTimer = null, endTimer = null, lastShare = '';

  /* ---------- helpers ---------- */
  function setState(s) {
    state = s;
    area.className = 'cp-area ' + (s === 'active' ? 'st-active' : s === 'end' ? 'st-end' : 'st-idle');
    stateEl.textContent = s === 'idle' ? 'Ready' : s === 'armed' ? 'Go!' : s === 'active' ? 'CLICK!' : 'Done';
  }
  function cancelTimers() { clearInterval(uiTimer); clearTimeout(endTimer); uiTimer = null; endTimer = null; }
  function fxOn() { return CPSD.data.settings.fx === 1 && CPSD.data.settings.rm !== 1; }
  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99;background:#16a34a;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.4)';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function achToast(list) { for (var i = 0; i < list.length; i++) toast('Achievement unlocked: ' + list[i].name); }

  /* ---------- flow ---------- */
  function arm() {
    cancelTimers();
    clicks = 0; stamps = [];
    summaryEl.classList.add('hidden');
    againBtn.classList.add('hidden');
    shareBtn.classList.add('hidden');
    CPSD.audio.unlock();
    if (mode === 'endless') { startTest(); startBtn.textContent = 'End Test'; return; }
    if (CPSD.data.settings.countdown) {
      var n = 3;
      setState('armed');
      big.textContent = n;
      sub.textContent = 'Get ready…';
      CPSD.audio.play('count');
      var c = setInterval(function () {
        n--;
        if (n <= 0) { clearInterval(c); setState('armed'); big.textContent = 'Click to start!'; sub.textContent = 'Timer starts on your first click'; }
        else { big.textContent = n; CPSD.audio.play('count'); }
      }, 500);
    } else {
      setState('armed');
      big.textContent = 'Click to start!';
      sub.textContent = 'Timer starts on your first click';
    }
    msEl.textContent = '';
    liveEl.textContent = '0 clicks · 0.0 CPS';
    timeEl.textContent = dur + '.0s';
  }

  function startTest() {
    t0 = performance.now();
    clicks = 0; stamps = [t0];
    setState('active');
    big.textContent = 'CLICK!';
    sub.textContent = '';
    CPSD.audio.play('start');

    uiTimer = setInterval(function () {
      var el = (performance.now() - t0) / 1000;
      if (mode === 'endless') {
        timeEl.textContent = el.toFixed(1) + 's';
      } else {
        var rem = Math.max(0, dur - el);
        timeEl.textContent = rem.toFixed(1) + 's';
        if (rem <= 0) finish();
      }
      liveEl.textContent = clicks + ' clicks · ' + (el > 0 ? (clicks / el).toFixed(1) : '0.0') + ' CPS';
    }, 100);

    if (mode !== 'endless') {
      endTimer = setTimeout(finish, dur * 1000 + 50);
    }
  }

  function clickNow() {
    var now = performance.now();
    var el = (now - t0) / 1000;
    if (mode !== 'endless' && el > dur) return;      /* post-time clicks never count */
    clicks++;
    stamps.push(now);
    CPSD.audio.play('tick');
    if (clicks === 25 || clicks === 50 || clicks === 100) {
      msEl.textContent = clicks + ' clicks!';
    }
    liveEl.textContent = clicks + ' clicks · ' + (el > 0 ? (clicks / el).toFixed(1) : '0.0') + ' CPS';
  }

  function handleInput() {
    if (state === 'idle') { /* do nothing; Start button controls */ }
    else if (state === 'armed') { startTest(); clickCountFirst(); }
    else if (state === 'active') clickNow();
    else if (state === 'end') arm();
  }
  function clickCountFirst() { clicks = 1; stamps = [performance.now()]; }

  function finish() {
    if (state !== 'active') return;
    cancelTimers();
    setState('end');
    CPSD.audio.play('end');

    var end = performance.now();
    var elapsed = (end - t0) / 1000;
    var actual = mode === 'endless' ? Math.max(0.2, elapsed) : dur;
    var cps = Math.round(clicks / actual * 10) / 10;

    /* intervals */
    var ints = [];
    for (var i = 2; i < stamps.length; i++) ints.push(stamps[i] - stamps[i - 1]);
    var avgInt = ints.length ? Math.round(ints.reduce(function (a, b) { return a + b; }, 0) / ints.length) : null;
    var fastInt = ints.length ? Math.round(Math.min.apply(null, ints)) : null;
    var cons = null;
    if (ints.length >= 2) {
      var m = ints.reduce(function (a, b) { return a + b; }, 0) / ints.length;
      var sd = Math.sqrt(ints.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / ints.length);
      cons = Math.max(0, Math.min(100, Math.round(100 - (sd / m) * 100)));
    }

    var prev = CPSD.data.history.length ? CPSD.data.history[0].cps : null;
    var r = CPSD.recordTest({ cps: cps, clicks: clicks, dur: actual, cons: cons, avgInt: avgInt, fastInt: fastInt });
    if (r.newPB) { CPSD.audio.play('record'); toast('New Personal Best: ' + cps + ' CPS'); if (fxOn()) area.classList.add('st-pb'); }

    var s = CPSD.getStats();
    big.textContent = cps + ' CPS';
    sub.textContent = r.cat + (r.newPB ? ' — NEW PERSONAL BEST!' : '');
    msEl.textContent = clicks + ' clicks in ' + actual + 's';
    timeEl.textContent = actual + 's';
    liveEl.textContent = clicks + ' clicks · ' + cps + ' CPS';

    summaryEl.innerHTML =
      '<div class="cps-big">' + cps + ' CPS</div>' +
      '<div class="cps-line">' + clicks + ' Clicks • ' + actual + ' Seconds</div>' +
      '<div class="cps-cat">' + r.cat + '</div>' +
      '<div class="cps-extra">' +
      'Personal Best: <strong>' + (CPSD.data.pb || '—') + ' CPS</strong> · Average: <strong>' + (s.avg || '—') + ' CPS</strong>' +
      (prev !== null ? ' · Previous: <strong>' + prev + ' CPS</strong>' : '') + '<br>' +
      'Consistency: <strong>' + (cons === null ? '—' : cons + '%') + '</strong>' +
      (avgInt !== null ? ' · Avg interval: <strong>' + avgInt + ' ms</strong>' : '') +
      (fastInt !== null ? ' · Fastest: <strong>' + fastInt + ' ms</strong>' : '') +
      '</div>';
    summaryEl.classList.remove('hidden');
    againBtn.classList.remove('hidden');
    shareBtn.classList.remove('hidden');
    startBtn.textContent = 'Start';

    var newly = CPSD.checkAchievements({ cps: cps, clicks: clicks, dur: actual, cons: cons, newPB: r.newPB, hadPB: r.hadPB });
    achToast(newly);

    if (daily) {
      var cfg = CPSD.dailyConfig();
      var dNew = CPSD.completeDaily(cps);
      achToast(dNew);
      toast(cps >= cfg.target ? 'Daily target reached: ' + cps + ' CPS!' : 'Daily Challenge complete: ' + cps + ' CPS');
      daily = false;
    }

    lastShare = 'ReflexLab CPS Test\n' + cps + ' CPS · ' + clicks + ' clicks in ' + actual + 's (' + r.cat + ')\n' +
      'Personal Best: ' + (CPSD.data.pb || '—') + ' CPS\n' +
      'Try it: https://reflexlab.tobiascent.workers.dev/tests/cps/cps.html';

    renderAll();
  }

  /* ---------- input ---------- */
  area.addEventListener('pointerdown', function (e) { e.preventDefault(); handleInput(); });
  area.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('keydown', function (e) {
    if (captureKey) { e.preventDefault(); CPSD.set('key', e.code); captureKey = false; buildSettings(); return; }
    if (!CPSD.data.settings.kb) return;
    if (e.code === CPSD.data.settings.key && !e.repeat) {
      if (state === 'active' || state === 'armed') e.preventDefault();
      handleInput();
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'active') {
      cancelTimers();
      setState('idle');
      big.textContent = 'Test cancelled';
      sub.textContent = 'Tab switch detected — start again for a fair result';
    }
  });

  /* ---------- buttons ---------- */
  startBtn.addEventListener('click', function () {
    if (mode === 'endless' && state === 'active') { finish(); return; }
    arm();
  });
  againBtn.addEventListener('click', arm);
  shareBtn.addEventListener('click', function () {
    if (navigator.share) navigator.share({ text: lastShare }).catch(function () {});
    else if (window.copyText) window.copyText(lastShare).then(function () { toast('Result copied to clipboard'); });
  });

  /* ---------- duration / mode ---------- */
  var durBtns = document.querySelectorAll('.cp-dur');
  var modeBtns = document.querySelectorAll('.cp-mode');
  function setActive(list, btn) { for (var i = 0; i < list.length; i++) list[i].classList.remove('active'); btn.classList.add('active'); }
  for (var i = 0; i < durBtns.length; i++) durBtns[i].addEventListener('click', function () {
    var v = this.getAttribute('data-dur');
    dur = v === 'custom' ? Number(CPSD.data.settings.customDur) || 8 : Number(v);
    CPSD.set('dur', dur);
    setActive(durBtns, this);
    if (state !== 'idle') { cancelTimers(); setState('idle'); big.textContent = 'Click Speed Test'; sub.textContent = 'Press Start, then click as fast as you can'; }
  });
  for (var m = 0; m < modeBtns.length; m++) modeBtns[m].addEventListener('click', function () {
    mode = this.getAttribute('data-mode');
    CPSD.set('mode', mode);
    setActive(modeBtns, this);
    cancelTimers(); setState('idle');
    big.textContent = 'Click Speed Test';
    sub.textContent = mode === 'endless' ? 'Endless: start, click, and press End when done' : 'Press Start, then click as fast as you can';
  });

  /* ---------- quick buttons ---------- */
  $('cpSound').addEventListener('click', function () {
    CPSD.set('sound', !CPSD.data.settings.sound);
    this.textContent = CPSD.data.settings.sound ? '🔊' : '🔇';
    this.classList.toggle('off', !CPSD.data.settings.sound);
  });
  $('cpTheme').addEventListener('click', function () {
    CPSD.set('theme', CPSD.data.settings.theme === 'dark' ? 'light' : 'dark');
  });
  $('cpFull').addEventListener('click', function () {
    var shell = document.querySelector('.cp-shell');
    if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); }
    else if (shell.requestFullscreen) shell.requestFullscreen();
  });
  $('cpSettingsBtn').addEventListener('click', function () { $('cpSettings').classList.remove('hidden'); buildSettings(); });
  $('cpSettingsClose').addEventListener('click', function () { $('cpSettings').classList.add('hidden'); });
  $('cpSettings').addEventListener('click', function (e) { if (e.target === this) this.classList.add('hidden'); });

  /* ---------- tabs ---------- */
  var tabBtns = document.querySelectorAll('.cp-tabbtn');
  for (var t = 0; t < tabBtns.length; t++) tabBtns[t].addEventListener('click', function () {
    for (var x = 0; x < tabBtns.length; x++) {
      tabBtns[x].classList.remove('active');
      $('tab-' + tabBtns[x].getAttribute('data-tab')).classList.add('hidden');
    }
    this.classList.add('active');
    $('tab-' + this.getAttribute('data-tab')).classList.remove('hidden');
  });

  /* ---------- settings ---------- */
  var captureKey = false;
  function row(label, ctrl) { return '<div class="cp-srow"><span>' + label + '</span>' + ctrl + '</div>'; }
  function onoff(val) { return '<select><option value="1"' + (val ? ' selected' : '') + '>On</option><option value="0"' + (!val ? ' selected' : '') + '>Off</option></select>'; }
  function buildSettings() {
    var s = CPSD.data.settings;
    var h = '';
    h += row('Sound', onoff(s.sound).replace('<select>', '<select data-s="sound">'));
    h += row('Volume', '<input type="range" min="5" max="100" value="' + Math.round(s.volume * 100) + '" data-s="volume">');
    h += row('Click tick sound', onoff(s.clickTick).replace('<select>', '<select data-s="clickTick">'));
    h += row('Countdown', onoff(s.countdown).replace('<select>', '<select data-s="countdown">'));
    h += row('Keyboard clicking', onoff(s.kb).replace('<select>', '<select data-s="kb">'));
    h += row('Keyboard key', '<button class="btn btn-ghost cp-keybtn" id="cpKeyBtn">' + keyName() + '</button>');
    h += row('Custom duration (s)', '<input type="number" min="2" max="120" value="' + s.customDur + '" data-s="customDur">');
    h += row('Theme', '<select data-s="theme"><option value="dark"' + (s.theme === 'dark' ? ' selected' : '') + '>Dark</option><option value="light"' + (s.theme === 'light' ? ' selected' : '') + '>Light</option></select>');
    h += row('High contrast', onoff(s.hc).replace('<select>', '<select data-s="hc">'));
    h += row('Reduced motion', onoff(s.rm).replace('<select>', '<select data-s="rm">'));
    h += row('Visual effects', onoff(s.fx).replace('<select>', '<select data-s="fx">'));
    h += row('Reset statistics', '<button class="btn btn-ghost" id="cpResetStats">Reset</button>');
    h += row('Reset achievements', '<button class="btn btn-ghost" id="cpResetAch">Reset</button>');
    h += row('Clear ALL local data', '<button class="btn btn-ghost" id="cpResetAll">Clear</button>');
    $('cpSettingsBody').innerHTML = h;

    var sels = $('cpSettingsBody').querySelectorAll('select');
    for (var i = 0; i < sels.length; i++) sels[i].addEventListener('change', function () {
      var k = this.getAttribute('data-s');
      var v = this.value;
      if (k !== 'theme') v = v === '1';
      CPSD.set(k, v);
    });
    $('cpSettingsBody').querySelector('[data-s="volume"]').addEventListener('input', function () { CPSD.set('volume', Number(this.value) / 100); });
    $('cpSettingsBody').querySelector('[data-s="customDur"]').addEventListener('change', function () {
      var v = Math.max(2, Math.min(120, Number(this.value) || 8));
      CPSD.set('customDur', v);
      this.value = v;
    });
    $('cpKeyBtn').addEventListener('click', function () { captureKey = true; this.textContent = 'Press any key…'; });
    $('cpResetStats').addEventListener('click', function () {
      if (confirm('Reset all CPS statistics and history?')) { CPSD.resetStats(); renderAll(); }
    });
    $('cpResetAch').addEventListener('click', function () {
      if (confirm('Reset all achievements?')) { CPSD.resetAch(); renderAll(); }
    });
    $('cpResetAll').addEventListener('click', function () {
      if (confirm('Clear ALL local CPS data?')) { CPSD.resetAll(); CPSD.applyPrefs(); renderAll(); }
    });
  }
  function keyName() { var k = CPSD.data.settings.key; return k === 'Space' ? 'SPACE' : k.replace('Key', '').toUpperCase(); }

  /* ---------- render ---------- */
  function timeAgo(ts) {
    var d = Math.round((Date.now() - ts) / 1000);
    if (d < 60) return 'just now';
    if (d < 3600) return Math.round(d / 60) + 'm ago';
    if (d < 86400) return Math.round(d / 3600) + 'h ago';
    return Math.round(d / 86400) + 'd ago';
  }

  function renderStats() {
    var s = CPSD.getStats();
    if (s.tests === 0) {
      $('cpProfile').innerHTML = '<div class="cp-empty">No tests yet — play your first test to build your profile.</div>';
      $('cpStatsGrid').innerHTML = '';
      $('cpGraph').innerHTML = '';
      return;
    }
    $('cpProfile').innerHTML =
      '<strong>CPS Profile</strong><br>' +
      'Personal best <strong>' + (s.pb || '—') + ' CPS</strong> (' + (s.pb ? CPSD.category(s.pb) : '—') + ') · ' +
      'Average <strong>' + (s.avg || '—') + ' CPS</strong><br>' +
      'Total clicks <strong>' + s.totalClicks + '</strong> · Total tests <strong>' + s.tests + '</strong> · ' +
      'Best streak <strong>' + s.bestStreak + '</strong><br>' +
      'Improvement <strong>' + (s.improvement === null ? '—' : (s.improvement > 0 ? '+' : '') + s.improvement + '%') + '</strong>';
    var tiles = [
      ['Best CPS', s.pb === null ? '—' : s.pb],
      ['Avg CPS', s.avg === null ? '—' : s.avg],
      ['Lowest', s.lowest === null ? '—' : s.lowest],
      ['Best clicks', s.bestClicks === null ? '—' : s.bestClicks],
      ['Avg clicks', s.avgClicks === null ? '—' : s.avgClicks],
      ['Today best', s.todayBest === null ? '—' : s.todayBest],
      ['Consistency', s.lastCons === null ? '—' : s.lastCons + '%'],
      ['Fastest int.', s.lastFastInt === null ? '—' : s.lastFastInt + ' ms']
    ];
    var h = '';
    for (var i = 0; i < tiles.length; i++) h += '<div class="cp-stat"><b>' + tiles[i][1] + '</b><span>' + tiles[i][0] + '</span></div>';
    $('cpStatsGrid').innerHTML = h;

    var recent = CPSD.data.history.slice(0, 20);
    var max = 0, best = 0;
    for (var b = 0; b < recent.length; b++) { if (recent[b].cps > max) max = recent[b].cps; if (recent[b].cps > best) best = recent[b].cps; }
    var g = '';
    for (var k = 0; k < recent.length; k++) {
      var hh = Math.max(6, Math.round(recent[k].cps / max * 100));
      g += '<div class="cp-bar' + (recent[k].cps === best ? ' best' : '') + '" style="height:' + hh + '%" title="' + recent[k].cps + ' CPS"></div>';
    }
    $('cpGraph').innerHTML = g;
  }

  function renderHistory() {
    var h = CPSD.data.history;
    if (!h.length) { $('cpHistList').innerHTML = '<div class="cp-empty">No tests yet.</div>'; return; }
    var list = '';
    for (var r = 0; r < Math.min(h.length, 12); r++) {
      list += '<div class="cp-hrow"><span>' + timeAgo(h[r].t) + ' · ' + h[r].dur + 's</span><span>' + CPSD.category(h[r].cps) + '</span><b>' + h[r].cps + ' CPS (' + h[r].clicks + ')</b></div>';
    }
    $('cpHistList').innerHTML = list;
  }

  function renderAch() {
    var list = CPSD.achList();
    var h = '';
    for (var i = 0; i < list.length; i++) {
      h += '<div class="cp-ach ' + (list[i].on ? 'on' : 'locked') + '"><b>' + (list[i].on ? '✓ ' : '') + list[i].name + '</b>' + list[i].desc + '</div>';
    }
    $('cpAchGrid').innerHTML = h;
  }

  function renderDaily() {
    var cfg = CPSD.dailyConfig();
    var d = CPSD.data.daily;
    var done = d.today === cfg.date;
    $('cpDaily').innerHTML =
      '<strong>Daily Challenge — ' + cfg.date + '</strong><br>' +
      'Today: <strong>' + cfg.dur + '-second</strong> test · target <strong>' + cfg.target + ' CPS</strong>.<br>' +
      'Status: ' + (done ? '<strong>Completed</strong> · best ' + d.best + ' CPS' : 'Not completed yet') + '<br>' +
      'Challenge streak: <strong>' + d.dayStreak + ' day(s)</strong> · Total completed: <strong>' + d.doneTotal + '</strong><br>' +
      (done ? '' : '<button class="btn btn-primary" id="cpDailyPlay">Play Daily Challenge</button>');
    var btn = $('cpDailyPlay');
    if (btn) btn.addEventListener('click', function () {
      dur = cfg.dur;
      daily = true;
      mode = 'classic';
      toast('Daily armed: ' + cfg.dur + 's · target ' + cfg.target + ' CPS');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      arm();
    });
  }

  function renderAll() { renderStats(); renderHistory(); renderAch(); renderDaily(); }

  /* ---------- init ---------- */
  function init() {
    CPSD.applyPrefs();
    var s = CPSD.data.settings;
    $('cpSound').textContent = s.sound ? '🔊' : '🔇';
    $('cpSound').classList.toggle('off', !s.sound);
    dur = s.dur || 5;
    mode = s.mode || 'classic';
    for (var i = 0; i < durBtns.length; i++) {
      var dv = durBtns[i].getAttribute('data-dur');
      durBtns[i].classList.toggle('active', (dv === 'custom' && s.customDur === dur) || Number(dv) === dur);
    }
    for (var d = 0; d < modeBtns.length; d++) modeBtns[d].classList.toggle('active', modeBtns[d].getAttribute('data-mode') === mode);
    if (!localStorage.getItem('rl-cps-onboard')) $('cpOnboard').classList.remove('hidden');
    $('cpOnboardOk').addEventListener('click', function () {
      $('cpOnboard').classList.add('hidden');
      try { localStorage.setItem('rl-cps-onboard', '1'); } catch (e) {}
    });
    renderAll();
  }
  init();
})();