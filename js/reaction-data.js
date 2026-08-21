/* ============================================
   REACTION GAME - DATA LAYER (storage/stats/achievements/audio)
   ============================================ */
var RTD = (function () {
  var KEY = 'rl-rtdata-v1';

  var defaults = {
    settings: {
      sound: true, volume: 0.6, countdown: false, key: 'Space',
      theme: 'dark', hc: 0, rm: 0, fx: 1, diff: 'normal', mode: 'single'
    },
    pb: null,
    history: [],
    totals: { tests: 0, rounds: 0, falseStarts: 0, games: 0 },
    streak: 0, bestStreak: 0,
    today: { date: '', best: null, sum: 0, n: 0 },
    ach: {},
    daily: { doneTotal: 0, dayStreak: 0, lastDone: '', today: '', best: null }
  };

  var data = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaults));
      var d = JSON.parse(raw);
      var base = JSON.parse(JSON.stringify(defaults));
      for (var k in base) { if (d[k] === undefined) d[k] = base[k]; }
      for (var s in base.settings) { if (d.settings[s] === undefined) d.settings[s] = base.settings[s]; }
      for (var t in base.totals) { if (d.totals[t] === undefined) d.totals[t] = base.totals[t]; }
      return d;
    } catch (e) { return JSON.parse(JSON.stringify(defaults)); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }

  /* ---------- helpers ---------- */
  function todayStr(offset) {
    var d = new Date(Date.now() + (offset || 0) * 86400000);
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }
  function mean(a) { if (!a.length) return null; var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return Math.round(s / a.length); }
  function median(a) {
    if (!a.length) return null;
    var s = a.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
  }
  function stdev(a) {
    if (a.length < 2) return 0;
    var m = mean(a), t = 0;
    for (var i = 0; i < a.length; i++) t += (a[i] - m) * (a[i] - m);
    return Math.sqrt(t / a.length);
  }
  function consistency(a) {
    if (a.length < 2) return null;
    var m = mean(a); if (!m) return null;
    var cv = stdev(a) / m;
    return Math.max(0, Math.min(100, Math.round(100 - cv * 100)));
  }

  function category(ms) {
    if (ms < 180) return 'Extremely Fast';
    if (ms < 220) return 'Very Fast';
    if (ms < 260) return 'Fast';
    if (ms < 310) return 'Good';
    if (ms < 380) return 'Average';
    return 'Slow';
  }

  /* ---------- recording ---------- */
  function recordAttempt(ms) {
    var newPB = data.pb === null || ms < data.pb;
    if (newPB) data.pb = ms;
    data.history.unshift({ ms: ms, t: Date.now() });
    if (data.history.length > 200) data.history.length = 200;
    data.totals.tests++;
    data.totals.rounds++;

    var td = todayStr();
    if (data.today.date !== td) data.today = { date: td, best: null, sum: 0, n: 0 };
    data.today.n++;
    data.today.sum += ms;
    if (data.today.best === null || ms < data.today.best) data.today.best = ms;

    if (ms < 300) { data.streak++; if (data.streak > data.bestStreak) data.bestStreak = data.streak; }
    else data.streak = 0;

    save();
    return { newPB: newPB, cat: category(ms) };
  }

  function recordFalse() {
    data.totals.falseStarts++;
    data.streak = 0;
    save();
  }

  function recordChallenge(info) {
    data.totals.games++;
    save();
    return checkAchievements({ challenge: info });
  }

  /* ---------- achievements ---------- */
  var ACH = [
    ['first', 'First Test', 'Complete your first valid test', function (d) { return d.totals.tests >= 1; }],
    ['ch1', 'First Challenge', 'Finish a multi-round challenge', function (d) { return d.totals.games >= 1; }],
    ['s300', 'Sub-300', 'React faster than 300 ms', function (d) { return d.pb !== null && d.pb < 300; }],
    ['s250', 'Sub-250', 'React faster than 250 ms', function (d) { return d.pb !== null && d.pb < 250; }],
    ['s200', 'Sub-200', 'React faster than 200 ms', function (d) { return d.pb !== null && d.pb < 200; }],
    ['s150', 'Lightning', 'React faster than 150 ms', function (d) { return d.pb !== null && d.pb < 150; }],
    ['streak5', 'Speed Streak', '5 rounds under 300 ms in a row', function (d) { return d.bestStreak >= 5; }],
    ['streak10', 'On Fire', '10 rounds under 300 ms in a row', function (d) { return d.bestStreak >= 10; }],
    ['t10', 'Warming Up', 'Complete 10 tests', function (d) { return d.totals.tests >= 10; }],
    ['t50', 'Dedicated', 'Complete 50 tests', function (d) { return d.totals.tests >= 50; }],
    ['t100', 'Veteran', 'Complete 100 tests', function (d) { return d.totals.tests >= 100; }],
    ['nofs', 'Clean Hands', 'Finish a 5+ round challenge with zero false starts', function (d, x) { return (x && x.challenge && x.challenge.rounds >= 5 && x.challenge.falseStarts === 0) || d.ach.nofs; }],
    ['perfect', 'Perfect Round', 'Finish a challenge with 0 false starts and average under 300', function (d, x) { return (x && x.challenge && x.challenge.falseStarts === 0 && x.challenge.avg < 300) || d.ach.perfect; }],
    ['cons90', 'Consistency Master', 'Reach 90%+ consistency over a 10+ round session', function (d, x) { return (x && x.sessionCons !== null && x.sessionCons >= 90 && x.sessionN >= 10) || d.ach.cons90; }],
    ['daily1', 'Daily Devotion', 'Complete a Daily Challenge', function (d) { return d.daily.doneTotal >= 1; }]
  ];

  function checkAchievements(ctx) {
    var newly = [];
    for (var i = 0; i < ACH.length; i++) {
      var id = ACH[i][0];
      if (!data.ach[id] && ACH[i][3](data, ctx || {})) {
        data.ach[id] = Date.now();
        newly.push({ id: id, name: ACH[i][1], desc: ACH[i][2] });
      }
    }
    if (newly.length) save();
    return newly;
  }
  function achList() {
    var out = [];
    for (var i = 0; i < ACH.length; i++) {
      out.push({ id: ACH[i][0], name: ACH[i][1], desc: ACH[i][2], on: !!data.ach[ACH[i][0]] });
    }
    return out;
  }

  /* ---------- daily challenge (deterministic, offline) ---------- */
  function dailyConfig() {
    var t = todayStr();
    var seed = Number(t.replace(/-/g, ''));
    var diffs = ['easy', 'normal', 'hard', 'expert'];
    return { date: t, rounds: 3 + (seed % 3), diff: diffs[seed % 4] };
  }
  function completeDaily(best) {
    var t = todayStr();
    if (data.daily.today !== t) {
      data.daily.doneTotal++;
      data.daily.dayStreak = (data.daily.lastDone === todayStr(-1)) ? data.daily.dayStreak + 1 : 1;
      data.daily.lastDone = t;
      data.daily.today = t;
      data.daily.best = best;
    } else if (best < data.daily.best) {
      data.daily.best = best;
    }
    save();
    return checkAchievements();
  }

  /* ---------- stats for UI ---------- */
  function getStats() {
    var hs = [];
    for (var i = 0; i < data.history.length; i++) hs.push(data.history[i].ms);
    var recent = hs.slice(0, 10);
    var older = hs.slice(10, 30);
    var avgR = mean(recent), avgO = mean(older.length ? older : hs);
    var impr = (avgO && avgR) ? Math.round((avgO - avgR) / avgO * 100) : null;
    var worst = hs.length ? Math.max.apply(null, hs) : null;
    return {
      pb: data.pb,
      tests: data.totals.tests,
      rounds: data.totals.rounds,
      falseStarts: data.totals.falseStarts,
      games: data.totals.games,
      streak: data.streak,
      bestStreak: data.bestStreak,
      avg: mean(hs),
      avg10: avgR,
      median: median(hs),
      worst: worst,
      consistency: consistency(recent),
      improvement: impr,
      accuracy: data.totals.tests + data.totals.falseStarts > 0
        ? Math.round(data.totals.tests / (data.totals.tests + data.totals.falseStarts) * 100) : null,
      todayBest: data.today.date === todayStr() ? data.today.best : null,
      todayAvg: data.today.date === todayStr() && data.today.n ? Math.round(data.today.sum / data.today.n) : null
    };
  }

  /* ---------- audio (WebAudio beeps, no files) ---------- */
  var actx = null;
  function ac() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (actx && actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
    return actx;
  }
  function tone(f, dur, type, when) {
    var c = ac(); if (!c) return;
    var t0 = c.currentTime + (when || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.value = f;
    var v = Math.max(0.05, data.settings.volume);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.22 * v, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  var audio = {
    unlock: function () { ac(); },
    play: function (name) {
      if (!data.settings.sound) return;
      if (name === 'start') tone(600, 0.08);
      else if (name === 'go') tone(950, 0.12);
      else if (name === 'result') tone(520, 0.1, 'triangle');
      else if (name === 'false') tone(180, 0.22, 'sawtooth');
      else if (name === 'count') tone(420, 0.07);
      else if (name === 'record') { tone(700, 0.09, 'sine', 0); tone(900, 0.09, 'sine', 0.1); tone(1200, 0.16, 'sine', 0.2); }
    }
  };

  /* ---------- prefs ---------- */
  function applyPrefs() {
    var s = data.settings;
    document.body.setAttribute('data-theme', s.theme);
    document.body.setAttribute('data-hc', s.hc ? '1' : '0');
    document.body.setAttribute('data-rm', s.rm ? '1' : '0');
  }
  function set(k, v) { data.settings[k] = v; save(); applyPrefs(); }

  /* ---------- resets ---------- */
  function resetStats() {
    data.pb = null; data.history = []; data.streak = 0; data.bestStreak = 0;
    data.totals = { tests: 0, rounds: 0, falseStarts: 0, games: 0 };
    data.today = { date: '', best: null, sum: 0, n: 0 };
    save();
  }
  function resetAch() { data.ach = {}; save(); }
  function resetDaily() { data.daily = { doneTotal: 0, dayStreak: 0, lastDone: '', today: '', best: null }; save(); }
  function resetAll() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    data = JSON.parse(JSON.stringify(defaults));
    save();
  }

  return {
    data: data, save: save, set: set, applyPrefs: applyPrefs,
    recordAttempt: recordAttempt, recordFalse: recordFalse, recordChallenge: recordChallenge,
    checkAchievements: checkAchievements, achList: achList,
    dailyConfig: dailyConfig, completeDaily: completeDaily,
    getStats: getStats, category: category,
    consistency: consistency, mean: mean, median: median,
    audio: audio, todayStr: todayStr,
    resetStats: resetStats, resetAch: resetAch, resetDaily: resetDaily, resetAll: resetAll
  };
})();