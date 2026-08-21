/* ============================================
   AIM TRAINER - DATA LAYER
   ============================================ */
var AMD = (function () {
  var KEY = 'rl-aimdata-v1';
  var MODES = ['precision', 'flick', 'micro', 'switching', 'tracking', 'reaction', 'speed', 'moving'];

  var defaults = {
    settings: {
      sound: true, volume: 0.6, tsize: 'm', countdown: false,
      theme: 'dark', hc: 0, rm: 0, fx: 1, mode: 'precision', diff: 'normal', dur: '30'
    },
    pb: {},
    history: [],
    totals: { sessions: 0, hits: 0, misses: 0, practiceSec: 0, bestHitStreak: 0 },
    today: { date: '', best: null, n: 0 },
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

  function todayStr(offset) {
    var d = new Date(Date.now() + (offset || 0) * 86400000);
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }
  function mean(a) { if (!a.length) return null; var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return Math.round(s / a.length); }

  /* ---------- recording ---------- */
  function recordSession(r) {
    var prev = data.pb[r.mode] || 0;
    var newPB = r.score > prev;
    if (newPB) data.pb[r.mode] = r.score;

    data.history.unshift({
      mode: r.mode, dur: r.dur, score: r.score, acc: r.acc,
      hits: r.hits, misses: r.misses, avgAcq: r.avgAcq || null, t: Date.now()
    });
    if (data.history.length > 200) data.history.length = 200;

    data.totals.sessions++;
    data.totals.hits += r.hits;
    data.totals.misses += r.misses;
    data.totals.practiceSec += r.dur;
    if (r.hitStreak && r.hitStreak > data.totals.bestHitStreak) data.totals.bestHitStreak = r.hitStreak;

    var td = todayStr();
    if (data.today.date !== td) data.today = { date: td, best: null, n: 0 };
    data.today.n++;
    if (data.today.best === null || r.score > data.today.best) data.today.best = r.score;

    save();
    return { newPB: newPB, prev: prev };
  }

  /* ---------- achievements ---------- */
  var ACH = [
    ['first', 'First Session', 'Complete your first training session', function (d) { return d.totals.sessions >= 1; }],
    ['acc90', 'Sharpshooter', 'Finish a session with 90%+ accuracy (10+ hits)', function (d, x) { return (x && x.acc >= 90 && x.hits >= 10) || d.ach.acc90; }],
    ['acc95', 'Deadeye', 'Finish a session with 95%+ accuracy (15+ hits)', function (d, x) { return (x && x.acc >= 95 && x.hits >= 15) || d.ach.acc95; }],
    ['prec', 'Precision Master', 'Score 1500+ in Precision', function (d) { return (d.pb.precision || 0) >= 1500; }],
    ['flick', 'Flick Master', 'Score 1500+ in Flick', function (d) { return (d.pb.flick || 0) >= 1500; }],
    ['track', 'Tracking Master', 'Reach 70%+ time-on-target in Tracking', function (d, x) { return (x && x.mode === 'tracking' && x.trackPct >= 70) || d.ach.track; }],
    ['switch', 'Switch Master', 'Score 1500+ in Switching', function (d) { return (d.pb.switching || 0) >= 1500; }],
    ['react', 'Quick Draw', 'Average reaction under 300 ms in a Reaction session', function (d, x) { return (x && x.mode === 'reaction' && x.reaction !== null && x.reaction < 300) || d.ach.react; }],
    ['speed', 'Rapid Fire', 'Score 1500+ in Speed', function (d) { return (d.pb.speed || 0) >= 1500; }],
    ['pb', 'Record Breaker', 'Beat a personal best score', function (d, x) { return (x && x.newPB && x.prev > 0) || d.ach.pb; }],
    ['streak20', 'Locked In', '20-hit streak in one session', function (d, x) { return (x && x.hitStreak >= 20) || d.totals.bestHitStreak >= 20; }],
    ['cons90', 'Metronome', 'Reach 90%+ consistency in a session', function (d, x) { return (x && x.cons !== null && x.cons >= 90) || d.ach.cons90; }],
    ['s10', 'Regular', 'Complete 10 sessions', function (d) { return d.totals.sessions >= 10; }],
    ['s50', 'Dedicated', 'Complete 50 sessions', function (d) { return d.totals.sessions >= 50; }],
    ['hits500', 'Target Down 500', 'Hit 500 total targets', function (d) { return d.totals.hits >= 500; }],
    ['hits2k', 'Target Down 2000', 'Hit 2,000 total targets', function (d) { return d.totals.hits >= 2000; }],
    ['multi', 'All-Rounder', 'Play 5 different modes', function (d) { var n = 0; for (var k in d.pb) n++; return n >= 5; }],
    ['long1', 'Marathon', 'Complete a 60s session', function (d, x) { return (x && x.dur >= 60) || d.ach.long1; }],
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

  /* ---------- daily (deterministic) ---------- */
  function dailyConfig() {
    var t = todayStr();
    var seed = Number(t.replace(/-/g, ''));
    var durs = ['15', '30'];
    var diffs = ['easy', 'normal', 'hard', 'expert'];
    return { date: t, mode: MODES[seed % 8], dur: durs[seed % 2], diff: diffs[seed % 4] };
  }
  function completeDaily(score) {
    var t = todayStr();
    if (data.daily.today !== t) {
      data.daily.doneTotal++;
      data.daily.dayStreak = (data.daily.lastDone === todayStr(-1)) ? data.daily.dayStreak + 1 : 1;
      data.daily.lastDone = t;
      data.daily.today = t;
      data.daily.best = score;
    } else if (score > data.daily.best) {
      data.daily.best = score;
    }
    save();
    return checkAchievements();
  }

  /* ---------- stats ---------- */
  function getStats() {
    var acqs = [], scores = [];
    for (var i = 0; i < data.history.length; i++) {
      if (data.history[i].avgAcq) acqs.push(data.history[i].avgAcq);
      scores.push(data.history[i].score);
    }
    var recent = scores.slice(0, 5), older = scores.slice(5, 20);
    var avgR = mean(recent), avgO = mean(older.length ? older : scores);
    var impr = (avgO && avgR) ? Math.round((avgR - avgO) / avgO * 100) : null;
    var bestOverall = 0, bestMode = '—';
    for (var m in data.pb) { if (data.pb[m] > bestOverall) { bestOverall = data.pb[m]; bestMode = m; } }
    return {
      sessions: data.totals.sessions,
      hits: data.totals.hits,
      misses: data.totals.misses,
      acc: data.totals.hits + data.totals.misses > 0
        ? Math.round(data.totals.hits / (data.totals.hits + data.totals.misses) * 100) : null,
      practiceMin: Math.round(data.totals.practiceSec / 60),
      bestHitStreak: data.totals.bestHitStreak,
      avgAcq: mean(acqs),
      bestOverall: bestOverall,
      bestMode: bestMode,
      improvement: impr,
      todayBest: data.today.date === todayStr() ? data.today.best : null,
      pb: data.pb
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
      if (name === 'hit') tone(880, 0.05, 'triangle', 0, 0.7);
      else if (name === 'miss') tone(150, 0.09, 'sawtooth', 0, 0.5);
      else if (name === 'count') tone(420, 0.07);
      else if (name === 'go') tone(950, 0.1);
      else if (name === 'end') tone(300, 0.25, 'triangle');
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

  function resetStats() {
    data.pb = {}; data.history = [];
    data.totals = { sessions: 0, hits: 0, misses: 0, practiceSec: 0, bestHitStreak: 0 };
    data.today = { date: '', best: null, n: 0 };
    save();
  }
  function resetAch() { data.ach = {}; save(); }
  function resetAll() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    data = JSON.parse(JSON.stringify(defaults));
    save();
  }

  return {
    MODES: MODES, data: data, save: save, set: set, applyPrefs: applyPrefs,
    recordSession: recordSession, checkAchievements: checkAchievements, achList: achList,
    dailyConfig: dailyConfig, completeDaily: completeDaily,
    getStats: getStats, mean: mean, audio: audio, todayStr: todayStr,
    resetStats: resetStats, resetAch: resetAch, resetAll: resetAll
  };
})();