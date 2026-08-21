/* ============================================
   AIM TRAINER - ENGINE + UI (vanilla JS)
   ============================================ */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var arena = $('amArena');
  var timeEl = $('amTime'), stateEl = $('amState'), scoreEl = $('amScore'), streakEl = $('amStreak');
  var startBtn = $('amStart'), againBtn = $('amAgain'), shareBtn = $('amShare');
  var summaryEl = $('amSummary');

  var DIFF = {
    easy: { size: 1.3, speed: 0.7, life: 1.4 },
    normal: { size: 1.0, speed: 1.0, life: 1.0 },
    hard: { size: 0.8, speed: 1.3, life: 0.8 },
    expert: { size: 0.65, speed: 1.6, life: 0.65 }
  };
  var BASE_SIZE = { precision: 56, flick: 48, micro: 26, switching: 44, tracking: 52, reaction: 52, speed: 44, moving: 44 };

  var state = 'idle';
  var mode = 'precision', diff = 'normal', durSel = '30';
  var daily = false;

  var startT = 0, uiTimer = null, moveTimer = null, spawnTimer = null, reactTimer = null;
  var targets = [], nextId = 1, lastPos = null;
  var hits = 0, misses = 0, score = 0, streak = 0, bestStreakS = 0, acqs = [], reactions = [];
  var trackOn = 0, trackTotal = 0, pointerDown = false, pointerPos = null;
  var reactPhase = 'wait', reactRound = 0, falseStarts = 0, lastShare = '';

  function durSec() { return Number(durSel); }
  function isCountMode() { return durSel === 't30'; }
  function targetCount() { return 30; }
  function sizeMult() { var t = AMD.data.settings.tsize; return t === 's' ? 0.85 : t === 'l' ? 1.2 : 1; }
  function fxOn() { return AMD.data.settings.fx === 1 && AMD.data.settings.rm !== 1; }

  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99;background:#16a34a;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.4)';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function achToast(l) { for (var i = 0; i < l.length; i++) toast('Achievement unlocked: ' + l[i].name); }

  /* ---------- targets ---------- */
  function arenaSize() { return { w: arena.clientWidth, h: arena.clientHeight }; }
  function clearTargets() {
    for (var i = 0; i < targets.length; i++) if (targets[i].el.parentNode) targets[i].el.parentNode.removeChild(targets[i].el);
    targets = [];
  }
  function spawnTarget(opts) {
    var o = opts || {};
    var s = arenaSize();
    var d = DIFF[diff];
    var size = Math.max(18, Math.round((o.size || BASE_SIZE[mode]) * d.size * sizeMult()));
    var r = size / 2, m = r + 6;
    var x, y, tries = 0;
    do {
      x = m + Math.random() * (s.w - m * 2);
      y = m + Math.random() * (s.h - m * 2);
      tries++;
    } while (tries < 20 && badSpawn(x, y, o));

    var el = document.createElement('div');
    el.className = 'am-target' + (o.cls ? ' ' + o.cls : '') + (fxOn() ? ' pop' : '');
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.dataset.id = nextId;
    arena.appendChild(el);

    var t = { id: nextId++, el: el, x: x, y: y, r: r, spawnT: performance.now(), vx: 0, vy: 0, life: o.life || 0 };
    if (o.moving) {
      var sp = 0.12 * d.speed * (o.speedMult || 1);
      var ang = Math.random() * Math.PI * 2;
      t.vx = Math.cos(ang) * sp;
      t.vy = Math.sin(ang) * sp;
    }
    if (t.life > 0) {
      t.expire = setTimeout(function () { expireTarget(t); }, t.life);
    }
    targets.push(t);
    lastPos = { x: x, y: y };
    return t;
  }
  function badSpawn(x, y, o) {
    if (o.far && lastPos) {
      var s = arenaSize();
      var need = 0.45 * Math.min(s.w, s.h);
      if (Math.hypot(x - lastPos.x, y - lastPos.y) < need) return true;
    }
    if (o.near && lastPos) {
      var dd = Math.hypot(x - lastPos.x, y - lastPos.y);
      if (dd < 60 || dd > 140) return true;
    }
    return false;
  }
  function removeTarget(t, hitAnim) {
    if (t.expire) clearTimeout(t.expire);
    var i = targets.indexOf(t);
    if (i !== -1) targets.splice(i, 1);
    if (hitAnim && fxOn()) {
      t.el.classList.add('hit');
      setTimeout(function () { if (t.el.parentNode) t.el.parentNode.removeChild(t.el); }, 180);
    } else if (t.el.parentNode) t.el.parentNode.removeChild(t.el);
  }
  function expireTarget(t) {
    if (state !== 'running') return;
    removeTarget(t, false);
    misses++;
    streak = 0;
    if (mode === 'speed') spawnForMode();
    hud();
  }

  /* ---------- mode spawning ---------- */
  function spawnForMode() {
    if (mode === 'precision') spawnTarget({});
    else if (mode === 'flick') spawnTarget({ far: true });
    else if (mode === 'micro') spawnTarget({ near: true });
    else if (mode === 'switching') { while (targets.length < 3) spawnTarget({}); }
    else if (mode === 'tracking') spawnTarget({ moving: true, cls: 't-track', speedMult: 0.8 });
    else if (mode === 'speed') { if (targets.length < 4) spawnTarget({ life: 1600 * DIFF[diff].life }); }
    else if (mode === 'moving') spawnTarget({ moving: true });
  }

  /* ---------- session flow ---------- */
  function startSession() {
    cancelAll();
    clearTargets();
    hits = 0; misses = 0; score = 0; streak = 0; bestStreakS = 0; acqs = []; reactions = [];
    trackOn = 0; trackTotal = 0; falseStarts = 0; reactRound = 0;
    summaryEl.classList.add('hidden');
    againBtn.classList.add('hidden');
    shareBtn.classList.add('hidden');
    arena.classList.remove('idle-note');
    AMD.audio.unlock();

    var go = function () {
      state = 'running';
      stateEl.textContent = 'Go';
      startT = performance.now();
      if (mode === 'reaction') nextReactRound();
      else spawnForMode();
      uiTimer = setInterval(tick, 100);
      if (mode === 'tracking' || mode === 'moving') moveTimer = setInterval(moveLoop, 30);
      if (mode === 'speed') spawnTimer = setInterval(function () { if (state === 'running') spawnForMode(); }, 750);
    };

    if (AMD.data.settings.countdown) {
      state = 'countdown';
      stateEl.textContent = 'Ready';
      var n = 3;
      timeEl.textContent = n;
      AMD.audio.play('count');
      var c = setInterval(function () {
        n--;
        if (n <= 0) { clearInterval(c); go(); }
        else { timeEl.textContent = n; AMD.audio.play('count'); }
      }, 500);
    } else go();
  }

  function nextReactRound() {
    reactPhase = 'wait';
    reactRound++;
    hud();
    var delay = 800 + Math.random() * 1800;
    reactTimer = setTimeout(function () {
      if (state !== 'running') return;
      reactPhase = 'go';
      var t = spawnTarget({});
      t.spawnT = performance.now();
      AMD.audio.play('go');
    }, delay);
  }

  function tick() {
    var el = (performance.now() - startT) / 1000;
    if (mode === 'reaction') {
      timeEl.textContent = 'Round ' + Math.min(reactRound, 5) + '/5';
    } else if (isCountMode()) {
      timeEl.textContent = el.toFixed(1) + 's · ' + hits + '/' + targetCount();
    } else {
      timeEl.textContent = Math.max(0, durSec() - el).toFixed(1) + 's';
      if (el >= durSec()) { finish(); return; }
    }
    if (isCountMode() && hits >= targetCount()) { finish(); return; }
    if (mode === 'tracking') {
      trackTotal += 0.1;
      if (pointerDown && pointerPos && overTrackTarget()) trackOn += 0.1;
    }
    hud();
  }

  function overTrackTarget() {
    if (!targets.length) return false;
    var t = targets[0];
    return Math.hypot(pointerPos.x - t.x, pointerPos.y - t.y) <= t.r + 4;
  }

  function moveLoop() {
    var s = arenaSize();
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t.vx && !t.vy) continue;
      t.x += t.vx * 30;
      t.y += t.vy * 30;
      if (t.x < t.r + 4) { t.x = t.r + 4; t.vx *= -1; }
      if (t.x > s.w - t.r - 4) { t.x = s.w - t.r - 4; t.vx *= -1; }
      if (t.y < t.r + 4) { t.y = t.r + 4; t.vy *= -1; }
      if (t.y > s.h - t.r - 4) { t.y = s.h - t.r - 4; t.vy *= -1; }
      t.el.style.left = t.x + 'px';
      t.el.style.top = t.y + 'px';
    }
  }

  function hud() {
    scoreEl.textContent = 'Score ' + score + ' · ' + hits + '/' + (hits + misses) + ' · ' + accNow() + '%';
    streakEl.textContent = 'Streak ' + streak;
  }
  function accNow() { return hits + misses > 0 ? Math.round(hits / (hits + misses) * 100) : 100; }

  /* ---------- input ---------- */
  arena.addEventListener('pointerdown', function (e) {
    if (!e.isPrimary) return;
    e.preventDefault();
    if (state !== 'running') return;
    pointerDown = true;
    pointerPos = relPos(e);

    if (mode === 'tracking') return;   /* tracking judged in tick() */

    if (mode === 'reaction') {
      if (reactPhase === 'wait') { falseStart(); return; }
      hitTarget(targets[0]);
      return;
    }

    var el = e.target;
    if (el.classList && el.classList.contains('am-target')) {
      var id = Number(el.dataset.id);
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].id === id) { hitTarget(targets[i]); break; }
      }
    } else {
      miss();
    }
  });
  document.addEventListener('pointermove', function (e) { pointerPos = relPos(e); });
  document.addEventListener('pointerup', function () { pointerDown = false; });
  function relPos(e) {
    var r = arena.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function hitTarget(t) {
    if (!t) return;
    var now = performance.now();
    var acq = now - t.spawnT;
    hits++;
    streak++;
    if (streak > bestStreakS) bestStreakS = streak;
    score += 100 + Math.min(50, streak * 2);
    if (mode === 'reaction') { reactions.push(Math.round(acq)); AMD.audio.play('hit'); }
    else acqs.push(acq);
    AMD.audio.play('hit');
    removeTarget(t, true);
    hud();
    if (mode === 'reaction') {
      if (reactRound >= 5) finish();
      else nextReactRound();
      return;
    }
    if (mode !== 'switching' && mode !== 'speed' && mode !== 'tracking') spawnForMode();
    else if (mode === 'switching') spawnTarget({});
  }

  function miss() {
    misses++;
    streak = 0;
    AMD.audio.play('miss');
    hud();
  }
  function falseStart() {
    falseStarts++;
    misses++;
    streak = 0;
    AMD.audio.play('miss');
    toast('Too early! Wait for the target.');
    hud();
  }

  function cancelAll() {
    clearInterval(uiTimer); clearInterval(moveTimer); clearInterval(spawnTimer);
    clearTimeout(reactTimer);
    uiTimer = moveTimer = spawnTimer = reactTimer = null;
  }

  /* ---------- finish ---------- */
  function finish() {
    if (state !== 'running') return;
    cancelAll();
    clearTargets();
    state = 'end';
    stateEl.textContent = 'Done';
    arena.classList.add('idle-note');
    AMD.audio.play('end');

    var el = Math.round((performance.now() - startT) / 1000);
    var acc = accNow();
    var avgAcq = acqs.length ? Math.round(AMD.mean(acqs)) : null;
    var fastAcq = acqs.length ? Math.round(Math.min.apply(null, acqs)) : null;
    var slowAcq = acqs.length ? Math.round(Math.max.apply(null, acqs)) : null;
    var cons = null;
    if (acqs.length >= 3) {
      var m = AMD.mean(acqs);
      var sd = Math.sqrt(acqs.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / acqs.length);
      cons = Math.max(0, Math.min(100, Math.round(100 - (sd / m) * 100)));
    }
    var trackPct = mode === 'tracking' && trackTotal > 0 ? Math.round(trackOn / trackTotal * 100) : null;
    var reactAvg = reactions.length ? Math.round(AMD.mean(reactions)) : null;
    if (mode === 'tracking') score = Math.round(trackOn * 100);

    var r = AMD.recordSession({
      mode: mode, dur: el, score: score, hits: hits, misses: misses, acc: acc,
      avgAcq: avgAcq, hitStreak: bestStreakS
    });
    if (r.newPB) { AMD.audio.play('record'); toast('New Personal Best (' + mode + '): ' + score); if (fxOn()) summaryEl.classList.add('st-pb'); }

    summaryEl.innerHTML =
      '<div class="am-big">' + score + '</div>' +
      '<div class="am-line">' + mode.toUpperCase() + ' · ' + acc + '% accuracy · ' + hits + ' hits / ' + misses + ' misses</div>' +
      '<div class="am-extra">' +
      (avgAcq !== null ? 'Avg acquisition: <strong>' + avgAcq + ' ms</strong> · Fastest: <strong>' + fastAcq + ' ms</strong> · Slowest: <strong>' + slowAcq + ' ms</strong><br>' : '') +
      (trackPct !== null ? 'Time on target: <strong>' + trackPct + '%</strong><br>' : '') +
      (reactAvg !== null ? 'Avg reaction: <strong>' + reactAvg + ' ms</strong> · False starts: <strong>' + falseStarts + '</strong><br>' : '') +
      'Consistency: <strong>' + (cons === null ? '—' : cons + '%') + '</strong> · Best streak: <strong>' + bestStreakS + '</strong><br>' +
      'Personal Best (' + mode + '): <strong>' + (AMD.data.pb[mode] || score) + '</strong>' +
      '</div>';
    summaryEl.classList.remove('hidden');
    againBtn.classList.remove('hidden');
    shareBtn.classList.remove('hidden');

    var newly = AMD.checkAchievements({
      acc: acc, hits: hits, mode: mode, trackPct: trackPct, reaction: reactAvg,
      cons: cons, hitStreak: bestStreakS, dur: el, newPB: r.newPB, prev: r.prev
    });
    achToast(newly);

    if (daily) {
      var cfg = AMD.dailyConfig();
      var dNew = AMD.completeDaily(score);
      achToast(dNew);
      toast('Daily Challenge complete: ' + score + ' pts');
      daily = false;
    }

    lastShare = 'ReflexLab Aim Trainer\n' + mode + ': ' + score + ' pts · ' + acc + '% accuracy' +
      (avgAcq !== null ? ' · avg ' + avgAcq + ' ms' : '') + '\n' +
      'PB (' + mode + '): ' + (AMD.data.pb[mode] || score) + '\n' +
      'Try it: https://reflexlab.tobiascent.workers.dev/tests/aim/aim.html';

    renderAll();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'running') {
      cancelAll();
      clearTargets();
      state = 'idle';
      stateEl.textContent = 'Cancelled';
      arena.classList.add('idle-note');
    }
  });

  /* ---------- buttons ---------- */
  startBtn.addEventListener('click', startSession);
  againBtn.addEventListener('click', startSession);
  shareBtn.addEventListener('click', function () {
    if (navigator.share) navigator.share({ text: lastShare }).catch(function () {});
    else if (window.copyText) window.copyText(lastShare).then(function () { toast('Result copied to clipboard'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && state !== 'running' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
      e.preventDefault();
      startSession();
    }
  });

  /* ---------- pills ---------- */
  var modeBtns = document.querySelectorAll('.am-mode');
  var durBtns = document.querySelectorAll('.am-dur');
  var diffBtns = document.querySelectorAll('.am-diff');
  function setActive(list, btn) { for (var i = 0; i < list.length; i++) list[i].classList.remove('active'); btn.classList.add('active'); }
  function resetIdle() {
    cancelAll(); clearTargets();
    state = 'idle';
    stateEl.textContent = 'Ready';
    arena.classList.add('idle-note');
  }
  for (var i = 0; i < modeBtns.length; i++) modeBtns[i].addEventListener('click', function () {
    mode = this.getAttribute('data-mode');
    AMD.set('mode', mode);
    setActive(modeBtns, this);
    resetIdle();
  });
  for (var d = 0; d < durBtns.length; d++) durBtns[d].addEventListener('click', function () {
    durSel = this.getAttribute('data-dur');
    AMD.set('dur', durSel);
    setActive(durBtns, this);
    resetIdle();
  });
  for (var f = 0; f < diffBtns.length; f++) diffBtns[f].addEventListener('click', function () {
    diff = this.getAttribute('data-diff');
    AMD.set('diff', diff);
    setActive(diffBtns, this);
    resetIdle();
  });

  /* ---------- quick buttons ---------- */
  $('amSound').addEventListener('click', function () {
    AMD.set('sound', !AMD.data.settings.sound);
    this.textContent = AMD.data.settings.sound ? '🔊' : '🔇';
    this.classList.toggle('off', !AMD.data.settings.sound);
  });
  $('amTheme').addEventListener('click', function () { AMD.set('theme', AMD.data.settings.theme === 'dark' ? 'light' : 'dark'); });
  $('amFull').addEventListener('click', function () {
    var shell = document.querySelector('.am-shell');
    if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); }
    else if (shell.requestFullscreen) shell.requestFullscreen();
  });
  $('amSettingsBtn').addEventListener('click', function () { $('amSettings').classList.remove('hidden'); buildSettings(); });
  $('amSettingsClose').addEventListener('click', function () { $('amSettings').classList.add('hidden'); });
  $('amSettings').addEventListener('click', function (e) { if (e.target === this) this.classList.add('hidden'); });

  /* ---------- tabs ---------- */
  var tabBtns = document.querySelectorAll('.am-tabbtn');
  for (var t = 0; t < tabBtns.length; t++) tabBtns[t].addEventListener('click', function () {
    for (var x = 0; x < tabBtns.length; x++) {
      tabBtns[x].classList.remove('active');
      $('tab-' + tabBtns[x].getAttribute('data-tab')).classList.add('hidden');
    }
    this.classList.add('active');
    $('tab-' + this.getAttribute('data-tab')).classList.remove('hidden');
  });

  /* ---------- settings ---------- */
  function row(label, ctrl) { return '<div class="am-srow"><span>' + label + '</span>' + ctrl + '</div>'; }
  function onoff(val) { return '<select><option value="1"' + (val ? ' selected' : '') + '>On</option><option value="0"' + (!val ? ' selected' : '') + '>Off</option></select>'; }
  function buildSettings() {
    var s = AMD.data.settings;
    var h = '';
    h += row('Sound', onoff(s.sound).replace('<select>', '<select data-s="sound">'));
    h += row('Volume', '<input type="range" min="5" max="100" value="' + Math.round(s.volume * 100) + '" data-s="volume">');
    h += row('Target size', '<select data-s="tsize"><option value="s"' + (s.tsize === 's' ? ' selected' : '') + '>Small</option><option value="m"' + (s.tsize === 'm' ? ' selected' : '') + '>Medium</option><option value="l"' + (s.tsize === 'l' ? ' selected' : '') + '>Large</option></select>');
    h += row('Countdown', onoff(s.countdown).replace('<select>', '<select data-s="countdown">'));
    h += row('Theme', '<select data-s="theme"><option value="dark"' + (s.theme === 'dark' ? ' selected' : '') + '>Dark</option><option value="light"' + (s.theme === 'light' ? ' selected' : '') + '>Light</option></select>');
    h += row('High contrast', onoff(s.hc).replace('<select>', '<select data-s="hc">'));
    h += row('Reduced motion', onoff(s.rm).replace('<select>', '<select data-s="rm">'));
    h += row('Reset statistics', '<button class="btn btn-ghost" id="amResetStats">Reset</button>');
    h += row('Reset achievements', '<button class="btn btn-ghost" id="amResetAch">Reset</button>');
    h += row('Clear ALL local data', '<button class="btn btn-ghost" id="amResetAll">Clear</button>');
    $('amSettingsBody').innerHTML = h;

    var sels = $('amSettingsBody').querySelectorAll('select');
    for (var i = 0; i < sels.length; i++) sels[i].addEventListener('change', function () {
      var k = this.getAttribute('data-s');
      var v = this.value;
      if (k !== 'theme' && k !== 'tsize') v = v === '1';
      AMD.set(k, v);
    });
    $('amSettingsBody').querySelector('[data-s="volume"]').addEventListener('input', function () { AMD.set('volume', Number(this.value) / 100); });
    $('amResetStats').addEventListener('click', function () { if (confirm('Reset all aim statistics?')) { AMD.resetStats(); renderAll(); } });
    $('amResetAch').addEventListener('click', function () { if (confirm('Reset all achievements?')) { AMD.resetAch(); renderAll(); } });
    $('amResetAll').addEventListener('click', function () { if (confirm('Clear ALL local aim data?')) { AMD.resetAll(); AMD.applyPrefs(); renderAll(); } });
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
    var s = AMD.getStats();
    if (s.sessions === 0) {
      $('amProfile').innerHTML = '<div class="am-empty">No sessions yet — run your first drill to build your profile.</div>';
      $('amSkillBars').innerHTML = '';
      $('amStatsGrid').innerHTML = '';
      return;
    }
    $('amProfile').innerHTML =
      '<strong>Aim Profile</strong><br>' +
      'Best mode: <strong>' + s.bestMode + '</strong> (' + s.bestOverall + ' pts) · ' +
      'Overall accuracy <strong>' + (s.acc === null ? '—' : s.acc + '%') + '</strong><br>' +
      'Total targets <strong>' + s.hits + '</strong> · Practice time <strong>' + s.practiceMin + ' min</strong> · ' +
      'Best hit streak <strong>' + s.bestHitStreak + '</strong><br>' +
      'Improvement <strong>' + (s.improvement === null ? '—' : (s.improvement > 0 ? '+' : '') + s.improvement + '%') + '</strong>';

    var max = 1;
    for (var m in s.pb) if (s.pb[m] > max) max = s.pb[m];
    var bars = '';
    for (var i = 0; i < AMD.MODES.length; i++) {
      var md = AMD.MODES[i];
      var v = s.pb[md] || 0;
      bars += '<div class="am-skill"><span class="sk-label">' + md + '</span>' +
        '<div class="sk-bar"><div class="sk-fill" style="width:' + Math.round(v / max * 100) + '%"></div></div>' +
        '<span class="sk-val">' + v + '</span></div>';
    }
    $('amSkillBars').innerHTML = bars;

    var tiles = [
      ['Sessions', s.sessions],
      ['Total hits', s.hits],
      ['Total misses', s.misses],
      ['Accuracy', s.acc === null ? '—' : s.acc + '%'],
      ['Avg acq.', s.avgAcq === null ? '—' : s.avgAcq + ' ms'],
      ['Best streak', s.bestHitStreak],
      ['Practice', s.practiceMin + 'm'],
      ['Today best', s.todayBest === null ? '—' : s.todayBest]
    ];
    var g = '';
    for (var k = 0; k < tiles.length; k++) g += '<div class="am-stat"><b>' + tiles[k][1] + '</b><span>' + tiles[k][0] + '</span></div>';
    $('amStatsGrid').innerHTML = g;
  }

  function renderHistory() {
    var h = AMD.data.history;
    if (!h.length) { $('amHistList').innerHTML = '<div class="am-empty">No sessions yet.</div>'; return; }
    var list = '';
    for (var r = 0; r < Math.min(h.length, 12); r++) {
      list += '<div class="am-hrow"><span>' + timeAgo(h[r].t) + ' · ' + h[r].mode + ' · ' + h[r].dur + 's</span><span>' + h[r].acc + '%</span><b>' + h[r].score + ' pts</b></div>';
    }
    $('amHistList').innerHTML = list;
  }

  function renderAch() {
    var list = AMD.achList();
    var h = '';
    for (var i = 0; i < list.length; i++) {
      h += '<div class="am-ach ' + (list[i].on ? 'on' : 'locked') + '"><b>' + (list[i].on ? '✓ ' : '') + list[i].name + '</b>' + list[i].desc + '</div>';
    }
    $('amAchGrid').innerHTML = h;
  }

  function renderDaily() {
    var cfg = AMD.dailyConfig();
    var d = AMD.data.daily;
    var done = d.today === cfg.date;
    $('amDaily').innerHTML =
      '<strong>Daily Challenge — ' + cfg.date + '</strong><br>' +
      'Today: <strong>' + cfg.mode + '</strong> · ' + cfg.dur + 's · <strong>' + cfg.diff + '</strong> difficulty.<br>' +
      'Status: ' + (done ? '<strong>Completed</strong> · best ' + d.best + ' pts' : 'Not completed yet') + '<br>' +
      'Challenge streak: <strong>' + d.dayStreak + ' day(s)</strong> · Total completed: <strong>' + d.doneTotal + '</strong><br>' +
      (done ? '' : '<button class="btn btn-primary" id="amDailyPlay">Play Daily Challenge</button>');
    var btn = $('amDailyPlay');
    if (btn) btn.addEventListener('click', function () {
      mode = cfg.mode; diff = cfg.diff; durSel = cfg.dur;
      daily = true;
      for (var i = 0; i < modeBtns.length; i++) modeBtns[i].classList.toggle('active', modeBtns[i].getAttribute('data-mode') === mode);
      for (var x = 0; x < diffBtns.length; x++) diffBtns[x].classList.toggle('active', diffBtns[x].getAttribute('data-diff') === diff);
      for (var y = 0; y < durBtns.length; y++) durBtns[y].classList.toggle('active', durBtns[y].getAttribute('data-dur') === durSel);
      toast('Daily armed: ' + cfg.mode + ' · ' + cfg.dur + 's · ' + cfg.diff);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      startSession();
    });
  }

  function renderAll() { renderStats(); renderHistory(); renderAch(); renderDaily(); }

  /* ---------- init ---------- */
  function init() {
    AMD.applyPrefs();
    var s = AMD.data.settings;
    $('amSound').textContent = s.sound ? '🔊' : '🔇';
    $('amSound').classList.toggle('off', !s.sound);
    mode = s.mode || 'precision';
    diff = s.diff || 'normal';
    durSel = s.dur || '30';
    for (var i = 0; i < modeBtns.length; i++) modeBtns[i].classList.toggle('active', modeBtns[i].getAttribute('data-mode') === mode);
    for (var d = 0; d < diffBtns.length; d++) diffBtns[d].classList.toggle('active', diffBtns[d].getAttribute('data-diff') === diff);
    for (var u = 0; u < durBtns.length; u++) durBtns[u].classList.toggle('active', durBtns[u].getAttribute('data-dur') === durSel);
    arena.classList.add('idle-note');
    if (!localStorage.getItem('rl-aim-onboard')) $('amOnboard').classList.remove('hidden');
    $('amOnboardOk').addEventListener('click', function () {
      $('amOnboard').classList.add('hidden');
      try { localStorage.setItem('rl-aim-onboard', '1'); } catch (e) {}
    });
    renderAll();
  }
  init();
})();