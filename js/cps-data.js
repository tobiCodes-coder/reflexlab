/* ============================================
   CPS GAME - DATA LAYER (storage/stats/achievements/audio)
   ============================================ */
var CPSD = (function () {
  var KEY = 'rl-cpsdata-v1';

  var defaults = {
    settings: {
      sound: true, volume: 0.6, clickTick: false, countdown: false,
      kb: false, key: 'Space', theme: 'dark', hc: 0, rm: 0, fx: 1,
      dur: 5, customDur: 8, mode: 'classic'
    },
    pb: null,
    history: [],
    totals: { tests: 0, clicks: 0 },
    streak: 0, bestStreak: 0,
    today: { date: '', best: null, sum: 0, n: 0, clicks: 0 },
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
  function mean(a) { if (!a.length) return null; var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return Math.round(s / a.length * 10) / 10; }

  function category(cps) {
    if (cps < 3) return 'Beginner';
    if (cps < 5) return 'Casual';
    if (cps < 7) return 'Good';
    if (cps < 9) return 'Fast';
    if (cps < 12) return 'Very Fast';
    return 'Extreme';
  }

  /* ---------- recording ---------- */
  function recordTest(r) {
    var hadPB = data.pb !== null;
    var newPB = !hadPB || r.cps > data.pb;
    if (newPB) data.pb = r.cps;

    data.history.unshift({
      cps: r.cps, clicks: r.clicks, dur: r.dur,
      cons: r.cons === undefined ? null : r.cons,
      avgInt: r.avgInt === undefined ? null : r.avgInt,
      fastInt: r.fastInt === undefined ? null : r.fastInt,
      t: Date.now()
    });
    if (data.history.length > 200) data.history.length = 200;

    data.totals.tests++;
    data.totals.clicks += r.clicks;

    var td = todayStr();
    if (data.today.date !== td) data.today = { date: td, best: null, sum: 0, n: 0, clicks: 0 };
    data.today.n++;
    data.today.sum += r.cps;
    data.today.clicks += r.clicks;
    if (data.today.best === null || r.cps > data.today.best) data.today.best = r.cps;

    if (r.cps >= 5) { data.streak++; if (data.streak > data.bestStreak) data.bestStreak = data.streak; }
    else data.streak = 0;

    save();
    return { newPB: newPB, hadPB: hadPB, cat: category(r.cps) };
  }

  /* ---------- achievements ---------- */
  var ACH = [
    ['first', 'First Test', 'Complete your first CPS test', function (d) { return d.totals.tests >= 1; }],
    ['c5', '5 CPS', 'Reach 5 clicks per second', function (d) { return d.pb !== null && d.pb >= 5; }],
    ['c8', '8 CPS', 'Reach 8 clicks per second', function (d) { return d.pb !== null && d.pb >= 8; }],
    ['c10', '10 CPS', 'Reach 10 clicks per second', function (d) { return d.pb !== null && d.pb >= 10; }],
    ['c12', '12 CPS', 'Reach 12 clicks per second', function (d) { return d.pb !== null && d.pb >= 12; }],
    ['c15', '15 CPS', 'Reach 15 clicks per second', function (d) { return d.pb !== null && d.pb >= 15; }],
    ['c20', '20 CPS', 'Reach 20 clicks per second', function (d) { return d.pb !== null && d.pb >= 20; }],
    ['k100', 'Century', '100 clicks in a single test', function (d, x) { return (x && x.clicks >= 100) || d.ach.k100; }],
    ['t500', '500 Club', '500 total clicks', function (d) { return d.totals.clicks >= 500; }],
    ['t1000', 'Click Machine', '1,000 total clicks', function (d) { return d.totals.clicks >= 1000; }],
    ['pb', 'Record Breaker', 'Beat your personal best', function (d, x) { return (x && x.newPB && x.hadPB) || d.ach.pb; }],
    ['cons90', 'Consistency Master', 'Reach 90%+ click consistency in one test', function (d, x) { return (x && x.cons !== null && x.cons >= 90) || d.ach.cons90; }],
    ['burst', 'Burst King', '10+ CPS on a 1-second test', function (d, x) { return (x && x.dur === 1 && x.cps >= 10) || d.ach.burst; }],
    ['streak5', 'Warmed Up', '5 tests in a row at 5+ CPS', function (d) { return d.bestStreak >= 5; }],
    ['n10', 'Regular', 'Complete 10 tests', function (d) { return d.totals.tests >= 10; }],
    ['n50', 'Dedicated', 'Complete 50 tests', function (d) { return d.totals.tests >= 50; }],
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
    var durs = [1, 3, 5, 10];
    return { date: t, dur: durs[seed % 4], target: 5 + (seed % 4) };
  }
  function completeDaily(cps) {
    var t = todayStr();
    if (data.daily.today !== t) {
      data.daily.doneTotal++;
      data.daily.dayStreak = (data.daily.lastDone === todayStr(-1)) ? data.daily.dayStreak + 1 : 1;
      data.daily.lastDone = t;
      data.daily.today = t;
      data.daily.best = cps;
    } else if (cps > data.daily.best) {
      data.daily.best = cps;
    }
    save();
    return checkAchievements();
  }

  /* ---------- stats for UI ---------- */
  function getStats() {
    var hs = [], cs = [];
    for (var i = 0; i < data.history.length; i++) { hs.push(data.history[i].cps); cs.push(data.history[i].clicks); }
    var recent = hs.slice(0, 5), older = hs.slice(5, 20);
    var avgR = mean(recent), avgO = mean(older.length ? older : hs);
    var impr = (avgO && avgR) ? Math.round((avgR - avgO) / avgO * 100) : null;
    return {
      pb: data.pb,
      tests: data.totals.tests,
      totalClicks: data.totals.clicks,
      avg: mean(hs),
      bestClicks: cs.length ? Math.max.apply(null, cs) : null,
      avgClicks: mean(cs),
      lowest: hs.length ? Math.min.apply(null, hs) : null,
      streak: data.streak,
      bestStreak: data.bestStreak,
      improvement: impr,
      lastCons: data.history.length ? data.history[0].cons : null,
      lastAvgInt: data.history.length ? data.history[0].avgInt : null,
      lastFastInt: data.history.length ? data.history[0].fastInt : null,
      todayBest: data.today.date === todayStr() ? data.today.best : null,
      todayAvg: data.today.date === todayStr() && data.today.n ? Math.round(data.today.sum / data.today.n * 10) / 10 : null
    };
  }

  /* ---------- audio ---------- */
  var actx = null;
  function ac() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (actx && actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
    return actx;
  }
  function tone(f, dur, type, when, vol) {
    var c = ac(); if (!c) return;
    var t0 = c.currentTime + (when || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.value = f;
    var v = Math.max(0.05, data.settings.volume) * (vol || 1);
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
      else if (name === 'tick') { if (data.settings.clickTick) tone(1100, 0.03, 'square', 0, 0.35); }
      else if (name === 'end') tone(300, 0.25, 'triangle');
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
    data.totals = { tests: 0, clicks: 0 };
    data.today = { date: '', best: null, sum: 0, n: 0, clicks: 0 };
    save();
  }
  function resetAch() { data.ach = {}; save(); }
  function resetAll() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    data = JSON.parse(JSON.stringify(defaults));
    save();
  }

  return {
    data: data, save: save, set: set, applyPrefs: applyPrefs,
    recordTest: recordTest, checkAchievements: checkAchievements, achList: achList,
    dailyConfig: dailyConfig, completeDaily: completeDaily,
    getStats: getStats, category: category, mean: mean,
    audio: audio, todayStr: todayStr,
    resetStats: resetStats, resetAch: resetAch, resetAll: resetAll
  };
})();