/* ============================================
   TYPING GAME - ENGINE + UI (vanilla JS)
   ============================================ */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var passageEl = $('tpPassage'), input = $('tpInput'), hint = $('tpHint');
  var timeEl = $('tpTime'), stateEl = $('tpState'), liveEl = $('tpLive');
  var newBtn = $('tpNew'), restartBtn = $('tpRestart'), shareBtn = $('tpShare');
  var summaryEl = $('tpSummary');

  var state = 'idle';
  var text = '', spans = [], pos = 0;
  var t0 = 0, elapsed = 0;
  var keystrokes = 0, correct = 0, errors = 0, backspaces = 0;
  var secSamples = [], lastSec = 0, lastCorrect = 0;
  var uiTimer = null, lastShare = '';
  var testType = '30';        // '15','30','60','120','w25','w50'
  var cat = 'general';
  var daily = false;

  function isWordMode() { return testType.charAt(0) === 'w'; }
  function wordTarget() { return Number(testType.slice(1)); }
  function durSec() { return Number(testType); }

  /* ---------- text setup ---------- */
  function loadText(same) {
    cancelTimers();
    state = 'idle';
    stateEl.textContent = 'Ready';
    if (!same || !text) text = TPD.pickText(cat, isWordMode() ? wordTarget() : null);
    passageEl.innerHTML = '';
    spans = [];
    var frag = document.createDocumentFragment();
    for (var i = 0; i < text.length; i++) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.textContent = text[i];
      frag.appendChild(s);
      spans.push(s);
    }
    passageEl.appendChild(frag);
    if (spans[0]) spans[0].classList.add('cur');
    pos = 0; keystrokes = 0; correct = 0; errors = 0; backspaces = 0;
    secSamples = []; lastSec = 0; lastCorrect = 0;
    input.value = '';
    input.disabled = false;
    hint.classList.remove('hidden');
    summaryEl.classList.add('hidden');
    shareBtn.classList.add('hidden');
    timeEl.textContent = isWordMode() ? '0:00' : fmt(durSec());
    liveEl.textContent = '0 WPM · 100%';
    passageEl.scrollTop = 0;
  }
  function fmt(s) { var m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + (r < 10 ? '0' + r : r); }
  function cancelTimers() { clearInterval(uiTimer); uiTimer = null; }

  /* ---------- flow ---------- */
  function start() {
    t0 = performance.now();
    state = 'active';
    stateEl.textContent = 'Typing';
    hint.classList.add('hidden');
    TPD.audio.unlock();
    uiTimer = setInterval(tick, 100);
  }

  function tick() {
    elapsed = (performance.now() - t0) / 1000;
    if (!isWordMode()) {
      var rem = Math.max(0, durSec() - elapsed);
      timeEl.textContent = fmt(rem);
      if (rem <= 0) { finish(); return; }
    } else {
      timeEl.textContent = fmt(elapsed);
    }
    /* per-second samples for consistency */
    var sec = Math.floor(elapsed);
    if (sec > lastSec) { secSamples.push(correct - lastCorrect); lastSec = sec; lastCorrect = correct; }
    var min = elapsed / 60;
    var wpm = min > 0.02 ? Math.round((correct / 5) / min) : 0;
    var acc = keystrokes > 0 ? Math.round((keystrokes - errors) / keystrokes * 100) : 100;
    liveEl.textContent = wpm + ' WPM · ' + acc + '%';
  }

  function finish() {
    if (state !== 'active') return;
    cancelTimers();
    state = 'end';
    stateEl.textContent = 'Done';
    input.disabled = true;
    TPD.audio.play('end');

    var el = (performance.now() - t0) / 1000;
    if (!isWordMode()) el = Math.min(el, durSec() + 0.05);
    var min = Math.max(el, 0.5) / 60;
    var wpm = Math.round((correct / 5) / min);
    var cpm = Math.round(correct / min);
    var acc = keystrokes > 0 ? Math.round((keystrokes - errors) / keystrokes * 100) : 100;

    var cons = null;
    if (secSamples.length >= 3) {
      var m = secSamples.reduce(function (a, b) { return a + b; }, 0) / secSamples.length;
      if (m > 0) {
        var sd = Math.sqrt(secSamples.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / secSamples.length);
        cons = Math.max(0, Math.min(100, Math.round(100 - (sd / m) * 100)));
      }
    }

    var prev = TPD.data.history.length ? TPD.data.history[0].wpm : null;
    var r = TPD.recordTest({ wpm: wpm, acc: acc, chars: correct, errors: errors, backspaces: backspaces, dur: Math.round(el), cat: cat, cons: cons });
    if (r.newPB) { TPD.audio.play('record'); toast('New Personal Best: ' + wpm + ' WPM'); if (fxOn()) summaryEl.classList.add('st-pb'); }

    var s = TPD.getStats();
    summaryEl.innerHTML =
      '<div class="wpm-big">' + wpm + ' WPM</div>' +
      '<div class="wpm-line">' + acc + '% Accuracy • ' + Math.round(el) + ' Seconds · ' + cpm + ' CPM</div>' +
      '<div class="wpm-cat">' + r.cat + '</div>' +
      '<div class="wpm-extra">' +
      'Correct chars: <strong>' + correct + '</strong> · Errors: <strong>' + errors + '</strong> · Backspaces: <strong>' + backspaces + '</strong><br>' +
      'Personal Best: <strong>' + (TPD.data.pb || '—') + ' WPM</strong> · Average: <strong>' + (s.avg || '—') + ' WPM</strong>' +
      (prev !== null ? ' · Previous: <strong>' + prev + ' WPM</strong>' : '') +
      (cons !== null ? '<br>Consistency: <strong>' + cons + '%</strong>' : '') +
      '</div>';
    summaryEl.classList.remove('hidden');
    shareBtn.classList.remove('hidden');

    var newly = TPD.checkAchievements({ acc: acc, chars: correct, cons: cons, cat: cat, newPB: r.newPB, hadPB: r.hadPB });
    achToast(newly);

    if (daily) {
      var cfg = TPD.dailyConfig();
      var dNew = TPD.completeDaily(wpm);
      achToast(dNew);
      toast('Daily Challenge complete: ' + wpm + ' WPM (' + cfg.cat + ')');
      daily = false;
    }

    lastShare = 'ReflexLab Typing Test\n' + wpm + ' WPM · ' + acc + '% accuracy · ' + Math.round(el) + 's (' + r.cat + ')\n' +
      'Personal Best: ' + (TPD.data.pb || '—') + ' WPM\n' +
      'Try it: https://reflexlab.tobiascent.workers.dev/tests/typing/typing.html';

    submitScore("typing", wpm);
    renderAll();
  }

  /* ---------- input processing ---------- */
  input.addEventListener('input', function () {
    if (state === 'end') { input.value = text.slice(0, pos); return; }
    var v = input.value;
    if (v.length > text.length) { v = v.slice(0, text.length); input.value = v; }
    if (state === 'idle' && v.length > 0) start();
    if (state !== 'active') return;

    var newLen = v.length;
    if (newLen > pos) {
      for (var i = pos; i < newLen; i++) {
        keystrokes++;
        if (v[i] === text[i]) {
          correct++;
          spans[i].className = 'ch ok';
          TPD.audio.play('tick');
        } else {
          errors++;
          spans[i].className = 'ch bad';
          TPD.audio.play('err');
        }
      }
    } else if (newLen < pos) {
      backspaces += pos - newLen;
      for (var j = newLen; j < pos; j++) spans[j].className = 'ch';
    }
    if (spans[pos]) spans[pos].classList.remove('cur');
    pos = newLen;
    if (spans[pos]) {
      spans[pos].classList.add('cur');
      /* keep current line visible */
      var lineH = spans[pos].offsetHeight * 1.6;
      if (spans[pos].offsetTop - passageEl.scrollTop > lineH * 2) passageEl.scrollTop = spans[pos].offsetTop - lineH * 1.5;
    }
    if (isWordMode() && pos >= text.length) finish();
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Backspace' && TPD.data.settings.strict) e.preventDefault();
  });

  passageEl.addEventListener('pointerdown', function () { input.focus(); });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'active') {
      cancelTimers();
      state = 'idle';
      stateEl.textContent = 'Cancelled';
      input.disabled = true;
      hint.textContent = 'Tab switch detected — test cancelled. Press Restart for a fair result.';
      hint.classList.remove('hidden');
    }
  });

  /* ---------- buttons ---------- */
  newBtn.addEventListener('click', function () { loadText(false); input.focus(); });
  restartBtn.addEventListener('click', function () { loadText(true); input.focus(); });
  shareBtn.addEventListener('click', function () {
    if (navigator.share) navigator.share({ text: lastShare }).catch(function () {});
    else if (window.copyText) window.copyText(lastShare).then(function () { toast('Result copied to clipboard'); });
  });

  /* ---------- pills ---------- */
  var durBtns = document.querySelectorAll('.tp-dur');
  var catBtns = document.querySelectorAll('.tp-cat');
  function setActive(list, btn) { for (var i = 0; i < list.length; i++) list[i].classList.remove('active'); btn.classList.add('active'); }
  for (var i = 0; i < durBtns.length; i++) durBtns[i].addEventListener('click', function () {
    testType = this.getAttribute('data-dur');
    TPD.set('dur', testType);
    setActive(durBtns, this);
    loadText(false);
  });
  for (var c = 0; c < catBtns.length; c++) catBtns[c].addEventListener('click', function () {
    cat = this.getAttribute('data-cat');
    TPD.set('cat', cat);
    setActive(catBtns, this);
    loadText(false);
  });

  /* ---------- quick buttons ---------- */
  $('tpSound').addEventListener('click', function () {
    TPD.set('sound', !TPD.data.settings.sound);
    this.textContent = TPD.data.settings.sound ? '🔊' : '🔇';
    this.classList.toggle('off', !TPD.data.settings.sound);
  });
  $('tpTheme').addEventListener('click', function () { TPD.set('theme', TPD.data.settings.theme === 'dark' ? 'light' : 'dark'); });
  $('tpFull').addEventListener('click', function () {
    var shell = document.querySelector('.tp-shell');
    if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); }
    else if (shell.requestFullscreen) shell.requestFullscreen();
  });
  $('tpSettingsBtn').addEventListener('click', function () { $('tpSettings').classList.remove('hidden'); buildSettings(); });
  $('tpSettingsClose').addEventListener('click', function () { $('tpSettings').classList.add('hidden'); });
  $('tpSettings').addEventListener('click', function (e) { if (e.target === this) this.classList.add('hidden'); });

  /* ---------- tabs ---------- */
  var tabBtns = document.querySelectorAll('.tp-tabbtn');
  for (var t = 0; t < tabBtns.length; t++) tabBtns[t].addEventListener('click', function () {
    for (var x = 0; x < tabBtns.length; x++) {
      tabBtns[x].classList.remove('active');
      $('tab-' + tabBtns[x].getAttribute('data-tab')).classList.add('hidden');
    }
    this.classList.add('active');
    $('tab-' + this.getAttribute('data-tab')).classList.remove('hidden');
  });

  /* ---------- settings ---------- */
  function row(label, ctrl) { return '<div class="tp-srow"><span>' + label + '</span>' + ctrl + '</div>'; }
  function onoff(val) { return '<select><option value="1"' + (val ? ' selected' : '') + '>On</option><option value="0"' + (!val ? ' selected' : '') + '>Off</option></select>'; }
  function buildSettings() {
    var s = TPD.data.settings;
    var h = '';
    h += row('Sound', onoff(s.sound).replace('<select>', '<select data-s="sound">'));
    h += row('Volume', '<input type="range" min="5" max="100" value="' + Math.round(s.volume * 100) + '" data-s="volume">');
    h += row('Key tick sound', onoff(s.keyTick).replace('<select>', '<select data-s="keyTick">'));
    h += row('Error sound', onoff(s.errSound).replace('<select>', '<select data-s="errSound">'));
    h += row('Strict mode (no Backspace)', onoff(s.strict).replace('<select>', '<select data-s="strict">'));
    h += row('Text size', '<select data-s="tsize"><option value="s"' + (s.tsize === 's' ? ' selected' : '') + '>Small</option><option value="m"' + (s.tsize === 'm' ? ' selected' : '') + '>Medium</option><option value="l"' + (s.tsize === 'l' ? ' selected' : '') + '>Large</option></select>');
    h += row('Theme', '<select data-s="theme"><option value="dark"' + (s.theme === 'dark' ? ' selected' : '') + '>Dark</option><option value="light"' + (s.theme === 'light' ? ' selected' : '') + '>Light</option></select>');
    h += row('High contrast', onoff(s.hc).replace('<select>', '<select data-s="hc">'));
    h += row('Reduced motion', onoff(s.rm).replace('<select>', '<select data-s="rm">'));
    h += row('Reset statistics', '<button class="btn btn-ghost" id="tpResetStats">Reset</button>');
    h += row('Reset achievements', '<button class="btn btn-ghost" id="tpResetAch">Reset</button>');
    h += row('Clear ALL local data', '<button class="btn btn-ghost" id="tpResetAll">Clear</button>');
    $('tpSettingsBody').innerHTML = h;

    var sels = $('tpSettingsBody').querySelectorAll('select');
    for (var i = 0; i < sels.length; i++) sels[i].addEventListener('change', function () {
      var k = this.getAttribute('data-s');
      var v = this.value;
      if (k !== 'theme' && k !== 'tsize') v = v === '1';
      TPD.set(k, v);
      if (k === 'tsize') TPD.applyPrefs();
    });
    $('tpSettingsBody').querySelector('[data-s="volume"]').addEventListener('input', function () { TPD.set('volume', Number(this.value) / 100); });
    $('tpResetStats').addEventListener('click', function () { if (confirm('Reset all typing statistics?')) { TPD.resetStats(); renderAll(); } });
    $('tpResetAch').addEventListener('click', function () { if (confirm('Reset all achievements?')) { TPD.resetAch(); renderAll(); } });
    $('tpResetAll').addEventListener('click', function () { if (confirm('Clear ALL local typing data?')) { TPD.resetAll(); TPD.applyPrefs(); renderAll(); } });
  }

  /* ---------- helpers ---------- */
  function fxOn() { return TPD.data.settings.fx === 1 && TPD.data.settings.rm !== 1; }
  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99;background:#16a34a;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.4)';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function achToast(list) { for (var i = 0; i < list.length; i++) toast('Achievement unlocked: ' + list[i].name); }
  function timeAgo(ts) {
    var d = Math.round((Date.now() - ts) / 1000);
    if (d < 60) return 'just now';
    if (d < 3600) return Math.round(d / 60) + 'm ago';
    if (d < 86400) return Math.round(d / 3600) + 'h ago';
    return Math.round(d / 86400) + 'd ago';
  }

  /* ---------- render ---------- */
  function renderStats() {
    var s = TPD.getStats();
    if (s.tests === 0) {
      $('tpProfile').innerHTML = '<div class="tp-empty">No tests yet — type your first test to build your profile.</div>';
      $('tpStatsGrid').innerHTML = '';
      $('tpGraph').innerHTML = '';
      return;
    }
    $('tpProfile').innerHTML =
      '<strong>Typing Profile</strong><br>' +
      'Personal best <strong>' + (s.pb || '—') + ' WPM</strong> · Average <strong>' + (s.avg || '—') + ' WPM</strong> · ' +
      'Avg accuracy <strong>' + (s.avgAcc || '—') + '%</strong><br>' +
      'Total words <strong>' + s.words + '</strong> · Total tests <strong>' + s.tests + '</strong> · ' +
      'Accuracy streak <strong>' + s.bestStreak + '</strong><br>' +
      'Improvement <strong>' + (s.improvement === null ? '—' : (s.improvement > 0 ? '+' : '') + s.improvement + '%') + '</strong>';
    var tiles = [
      ['Best WPM', s.pb === null ? '—' : s.pb],
      ['Avg WPM', s.avg === null ? '—' : s.avg],
      ['Best acc.', s.bestAcc === null ? '—' : s.bestAcc + '%'],
      ['Words', s.words],
      ['Characters', s.chars],
      ['Errors', s.errors],
      ['Backspaces', s.backspaces],
      ['Today best', s.todayBest === null ? '—' : s.todayBest]
    ];
    var h = '';
    for (var i = 0; i < tiles.length; i++) h += '<div class="tp-stat"><b>' + tiles[i][1] + '</b><span>' + tiles[i][0] + '</span></div>';
    $('tpStatsGrid').innerHTML = h;

    var recent = TPD.data.history.slice(0, 20);
    var max = 0, best = 0;
    for (var b = 0; b < recent.length; b++) { if (recent[b].wpm > max) max = recent[b].wpm; if (recent[b].wpm > best) best = recent[b].wpm; }
    var g = '';
    for (var k = 0; k < recent.length; k++) {
      var hh = Math.max(6, Math.round(recent[k].wpm / max * 100));
      g += '<div class="tp-bar' + (recent[k].wpm === best ? ' best' : '') + '" style="height:' + hh + '%" title="' + recent[k].wpm + ' WPM"></div>';
    }
    $('tpGraph').innerHTML = g;
  }

  function renderHistory() {
    var h = TPD.data.history;
    if (!h.length) { $('tpHistList').innerHTML = '<div class="tp-empty">No tests yet.</div>'; return; }
    var list = '';
    for (var r = 0; r < Math.min(h.length, 12); r++) {
      list += '<div class="tp-hrow"><span>' + timeAgo(h[r].t) + ' · ' + h[r].dur + 's · ' + h[r].cat + '</span><span>' + h[r].acc + '%</span><b>' + h[r].wpm + ' WPM</b></div>';
    }
    $('tpHistList').innerHTML = list;
  }

  function renderAch() {
    var list = TPD.achList();
    var h = '';
    for (var i = 0; i < list.length; i++) {
      h += '<div class="tp-ach ' + (list[i].on ? 'on' : 'locked') + '"><b>' + (list[i].on ? '✓ ' : '') + list[i].name + '</b>' + list[i].desc + '</div>';
    }
    $('tpAchGrid').innerHTML = h;
  }

  function renderDaily() {
    var cfg = TPD.dailyConfig();
    var d = TPD.data.daily;
    var done = d.today === cfg.date;
    $('tpDaily').innerHTML =
      '<strong>Daily Challenge — ' + cfg.date + '</strong><br>' +
      'Today: <strong>' + cfg.dur + 's</strong> test · category <strong>' + cfg.cat + '</strong>.<br>' +
      'Status: ' + (done ? '<strong>Completed</strong> · best ' + d.best + ' WPM' : 'Not completed yet') + '<br>' +
      'Challenge streak: <strong>' + d.dayStreak + ' day(s)</strong> · Total completed: <strong>' + d.doneTotal + '</strong><br>' +
      (done ? '' : '<button class="btn btn-primary" id="tpDailyPlay">Play Daily Challenge</button>');
    var btn = $('tpDailyPlay');
    if (btn) btn.addEventListener('click', function () {
      testType = cfg.dur;
      cat = cfg.cat;
      daily = true;
      toast('Daily armed: ' + cfg.dur + 's · ' + cfg.cat);
      loadText(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      input.focus();
    });
  }

  function renderAll() { renderStats(); renderHistory(); renderAch(); renderDaily(); }

  /* ---------- init ---------- */
  function init() {
    TPD.applyPrefs();
    var s = TPD.data.settings;
    $('tpSound').textContent = s.sound ? '🔊' : '🔇';
    $('tpSound').classList.toggle('off', !s.sound);
    testType = s.dur || '30';
    cat = s.cat || 'general';
    for (var i = 0; i < durBtns.length; i++) durBtns[i].classList.toggle('active', durBtns[i].getAttribute('data-dur') === testType);
    for (var c = 0; c < catBtns.length; c++) catBtns[c].classList.toggle('active', catBtns[c].getAttribute('data-cat') === cat);
    if (!localStorage.getItem('rl-tp-onboard')) $('tpOnboard').classList.remove('hidden');
    $('tpOnboardOk').addEventListener('click', function () {
      $('tpOnboard').classList.add('hidden');
      try { localStorage.setItem('rl-tp-onboard', '1'); } catch (e) {}
    });
    loadText(false);
    renderAll();
  }
  init();
})();