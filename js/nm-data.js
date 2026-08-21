/* ============================================
   NUMBER MEMORY - DATA LAYER
   ============================================ */
var NMD = (function () {
  var KEY = 'rl-nmdata-v1';

  var defaults = {
    settings: {
      sound: true, volume: 0.6, speed: 'auto', chunk: false,
      theme: 'dark', hc: 0, rm: 0, fx: 1, mode: 'classic'
    },
    pb: null,
    history: [],
    totals: { games: 0, rounds: 0, correct: 0, wrong: 0, digits: 0, bestRoundStreak: 0 },
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
  function mean(a) { if (!a.length) return null; var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return Math.round(s / a.length * 10) / 10; }

  function category(digits) {
    if (digits < 4) return 'Beginner';
    if (digits < 6) return 'Developing';
    if (digits < 8) return 'Good';
    if (digits < 10) return 'Strong';
    if (digits < 12) return 'Excellent';
    return 'Exceptional';
  }

  /* ---------- recording ---------- */
  function recordGame(r) {
    var hadPB = data.pb !== null;
    var newPB = !hadPB || r.digits > data.pb;
    if (newPB) data.pb = r.digits;

    data.history.unshift({
      digits: r.digits, acc: r.acc, mode: r.mode, rounds: r.rounds,
      bestRecall: r.bestRecall === undefined ? null : r.bestRecall, t: Date.now()
    });
    if (data.history.length > 200) data.history.length = 200;

    data.totals.games++;
    data.totals.rounds += r.rounds;
    data.totals.correct += r.correct;
    data.totals.wrong += r.wrong;
    data.totals.digits += r.digitsRecalled;
    if (r.roundStreak && r.roundStreak > data.totals.bestRoundStreak) data.totals.bestRoundStreak = r.roundStreak;

    var td = todayStr();
    if (data.today.date !== td) data.today = { date: td, best: null, n: 0 };
    data.today.n++;
    if (data.today.best === null || r.digits > data.today.best) data.today.best = r.digits;

    save();
    return { newPB: newPB, hadPB: hadPB, cat: category(r.digits) };
  }

  /* ---------- achievements ---------- */
  var ACH = [
    ['first', 'First Test', 'Complete your first number memory game', function (d) { return d.totals.games >= 1; }],
    ['d5', '5 Digits', 'Recall a 5-digit number', function (d) { return d.pb !== null && d.pb >= 5; }],
    ['d7', '7 Digits', 'Recall a 7-digit number', function (d) { return d.pb !== null && d.pb >= 7; }],
    ['d10', '10 Digits', 'Recall a 10-digit number', function (d) { return d.pb !== null && d.pb >= 10; }],
    ['d12', '12 Digits', 'Recall a 12-digit number', function (d) { return d.pb !== null && d.pb >= 12; }],
    ['d15', '15 Digits', 'Recall a 15-digit number', function (d) { return d.pb !== null && d.pb >= 15; }],
    ['d20', '20 Digits', 'Recall a 20-digit number', function (d) { return d.pb !== null && d.pb >= 20; }],
    ['perfect', 'Steel Trap', 'Reach 10+ digits with zero mistakes in one game', function (d, x) { return (x && x.digits >= 10 && x.wrong === 0) || d.ach.perfect; }],
    ['rev8', 'Reverse Master', 'Recall 8+ digits in Reverse mode', function (d, x) { return (x && x.mode === 'reverse' && x.digits >= 8) || d.ach.rev8; }],
    ['fast', 'Quick Recall', 'Recall 8+ digits with best recall under 2.5s', function (d, x) { return (x && x.digits >= 8 && x.bestRecall !== null && x.bestRecall < 2.5) || d.ach.fast; }],
    ['pb', 'Record Breaker', 'Beat your personal best digit count', function (d, x) { return (x && x.newPB && x.hadPB) || d.ach.pb; }],
    ['streak10', 'Hot Streak', '10 correct rounds in a row', function (d, x) { return (x && x.roundStreak >= 10) || d.totals.bestRoundStreak >= 10; }],
    ['digits1k', 'Digit Hoarder', 'Recall 1,000 total digits', function (d) { return d.totals.digits >= 1000; }],
    ['t10', 'Regular', 'Complete 10 games', function (d) { return d.totals.games >= 10; }],
    ['t50', 'Dedicated', 'Complete 50 games', function (d) { return d.totals.games >= 50; }],
    ['t100', 'Veteran', 'Complete 100 games', function (d) { return d.totals.games >= 100; }],
    ['daily1', 'Daily Devotion', 'Complete a Daily Challenge', function (d) { return d.daily.doneTotal >= 1; }],
    ['dstreak3', 'Habit Forming', '3-day daily challenge streak', function (d) { return d.daily.dayStreak >= 3; }]
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
    var modes = ['classic', 'lives', 'reverse'];
    var speeds = ['auto', 'normal', 'fast'];
    return { date: t, mode: modes[seed % 3], speed: speeds[seed % 3] };
  }
  function completeDaily(digits) {
    var t = todayStr();
    if (data.daily.today !== t) {
      data.daily.doneTotal++;
      data.daily.dayStreak = (data.daily.lastDone === todayStr(-1)) ? data.daily.dayStreak + 1 : 1;
      data.daily.lastDone = t;
      data.daily.today = t;
      data.daily.best = digits;
    } else if (digits > data.daily.best) {
      data.daily.best = digits;
    }
    save();
    return checkAchievements();
  }

  /* ---------- stats ---------- */
  function getStats() {
    var ds = [];
    for (var i = 0; i < data.history.length; i++) ds.push(data.history[i].digits);
    var recent = ds.slice(0, 5), older = ds.slice(5, 20);
    var avgR = mean(recent), avgO = mean(older.length ? older : ds);
    var impr = (avgO && avgR) ? Math.round((avgR - avgO) / avgO * 100) : null;
    return {
      pb: data.pb,
      games: data.totals.games,
      rounds: data.totals.rounds,
      correct: data.totals.correct,
      wrong: data.totals.wrong,
      digits: data.totals.digits,
      bestRoundStreak: data.totals.bestRoundStreak,
      avgDigits: mean(ds),
      acc: data.totals.correct + data.totals.wrong > 0
        ? Math.round(data.totals.correct / (data.totals.correct + data.totals.wrong) * 100) : null,
      improvement: impr,
      todayBest: data.today.date === todayStr() ? data.today.best : null
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
      if (name === 'show') tone(520, 0.15);
      else if (name === 'correct') { tone(650, 0.08, 'sine', 0); tone(850, 0.12, 'sine', 0.09); }
      else if (name === 'wrong') tone(160, 0.25, 'sawtooth');
      else if (name === 'over') tone(220, 0.3, 'triangle');
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
    data.pb = null; data.history = [];
    data.totals = { games: 0, rounds: 0, correct: 0, wrong: 0, digits: 0, bestRoundStreak: 0 };
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
    data: data, save: save, set: set, applyPrefs: applyPrefs,
    recordGame: recordGame, checkAchievements: checkAchievements, achList: achList,
    dailyConfig: dailyConfig, completeDaily: completeDaily,
    getStats: getStats, category: category, mean: mean,
    audio: audio, todayStr: todayStr,
    resetStats: resetStats, resetAch: resetAch, resetAll: resetAll
  };
})();