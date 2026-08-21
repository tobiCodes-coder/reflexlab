/* ============================================
   TYPING GAME - DATA LAYER
   Local passages + storage + stats + achievements + audio
   ============================================ */
var TYPTEXTS = {
  general: [
    "The quick brown fox jumps over the lazy dog while the morning sun rises slowly behind the quiet hills.",
    "A good habit starts small and grows quietly every day until it becomes part of who you are.",
    "She opened the window and let the cool evening air fill the room with the smell of rain.",
    "Learning to type well is a marathon not a sprint so be patient and practice a little every day.",
    "The library was silent except for the soft sound of pages turning one by one.",
    "He wrote down three goals for the week and promised himself he would finish them all."
  ],
  quotes: [
    "The only way to do great work is to love what you do.",
    "It always seems impossible until it is done.",
    "Practice is not the thing you do once you are good. It is the thing you do until you are good.",
    "The future depends on what you do today.",
    "Success is the sum of small efforts repeated day in and day out.",
    "Do not watch the clock; do what it does. Keep going."
  ],
  code: [
    "function add(a, b) { return a + b; } console.log(add(2, 3));",
    "const nums = [1, 2, 3]; nums.forEach((n) => { console.log(n * 2); });",
    "let total = 0; for (let i = 0; i < 10; i++) { total += i; }",
    "if (user.age >= 18) { grant(user); } else { deny(user); }",
    "const name = 'reflex'; const lab = name.toUpperCase() + '_LAB';",
    "document.getElementById('btn').addEventListener('click', () => start());"
  ],
  numbers: [
    "Order 42 items at $19.99 each, plus 7.5% tax, before 2026-08-21.",
    "Call 555-0142 between 9:00 and 17:30; ask for room 12B, floor 3.",
    "The score was 87-85 with 0:42 left; player #23 scored 31 points.",
    "Mix 2.5 cups of flour, 1/2 tsp salt, and bake at 180C for 25 min."
  ],
  hard: [
    "Frankly, it's extraordinary: sixty-two zebras, half-wild, queued; why? Because J.X. Quinn's vexing puzzle demanded it!",
    "Dr. Smith-Jones, Ph.D., insisted: \"Measure twice, cut once\" - especially when the cost is $1,250.75 per unit.",
    "Synchronize; then verify: 98% of 'quick-fix' solutions fail, spectacularly, yet we retry, again & again.",
    "The jury's verdict (unanimous, 12-0) surprised nobody; nevertheless, O'Brien's attorney objected, loudly!"
  ]
};

var TPD = (function () {
  var KEY = 'rl-tpdata-v1';

  var defaults = {
    settings: {
      sound: true, volume: 0.6, keyTick: false, errSound: true, strict: false,
      tsize: 'm', theme: 'dark', hc: 0, rm: 0, fx: 1, dur: '30', cat: 'general'
    },
    pb: null,
    history: [],
    totals: { tests: 0, words: 0, chars: 0, errors: 0, backspaces: 0 },
    streak: 0, bestStreak: 0,
    today: { date: '', best: null, sum: 0, n: 0, words: 0 },
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

  function category(wpm, acc) {
    if (wpm >= 80 && acc >= 95) return 'Expert';
    if (wpm >= 60) return 'Very Fast';
    if (wpm >= 45) return 'Fast';
    if (wpm >= 30) return 'Good';
    if (wpm >= 20) return 'Casual';
    return 'Beginner';
  }

  function pickText(cat, words) {
    var pool = TYPTEXTS[cat] || TYPTEXTS.general;
    var t = pool[Math.floor(Math.random() * pool.length)];
    if (words) {
      var w = t.split(' ');
      if (w.length > words) t = w.slice(0, words).join(' ');
    }
    return t;
  }

  /* ---------- recording ---------- */
  function recordTest(r) {
    var hadPB = data.pb !== null;
    var newPB = !hadPB || r.wpm > data.pb;
    if (newPB) data.pb = r.wpm;

    data.history.unshift({
      wpm: r.wpm, acc: r.acc, dur: r.dur, cat: r.cat,
      chars: r.chars, errors: r.errors, cons: r.cons === undefined ? null : r.cons,
      t: Date.now()
    });
    if (data.history.length > 200) data.history.length = 200;

    data.totals.tests++;
    data.totals.words += Math.round(r.chars / 5);
    data.totals.chars += r.chars;
    data.totals.errors += r.errors;
    data.totals.backspaces += r.backspaces;

    var td = todayStr();
    if (data.today.date !== td) data.today = { date: td, best: null, sum: 0, n: 0, words: 0 };
    data.today.n++;
    data.today.sum += r.wpm;
    data.today.words += Math.round(r.chars / 5);
    if (data.today.best === null || r.wpm > data.today.best) data.today.best = r.wpm;

    if (r.acc >= 95) { data.streak++; if (data.streak > data.bestStreak) data.bestStreak = data.streak; }
    else data.streak = 0;

    save();
    return { newPB: newPB, hadPB: hadPB, cat: category(r.wpm, r.acc) };
  }

  /* ---------- achievements ---------- */
  var ACH = [
    ['first', 'First Test', 'Complete your first typing test', function (d) { return d.totals.tests >= 1; }],
    ['w20', '20 WPM', 'Type at 20 WPM', function (d) { return d.pb !== null && d.pb >= 20; }],
    ['w30', '30 WPM', 'Type at 30 WPM', function (d) { return d.pb !== null && d.pb >= 30; }],
    ['w40', '40 WPM', 'Type at 40 WPM', function (d) { return d.pb !== null && d.pb >= 40; }],
    ['w50', '50 WPM', 'Type at 50 WPM', function (d) { return d.pb !== null && d.pb >= 50; }],
    ['w60', '60 WPM', 'Type at 60 WPM', function (d) { return d.pb !== null && d.pb >= 60; }],
    ['w80', '80 WPM', 'Type at 80 WPM', function (d) { return d.pb !== null && d.pb >= 80; }],
    ['w100', '100 WPM', 'Type at 100 WPM', function (d) { return d.pb !== null && d.pb >= 100; }],
    ['a95', 'Sharp', 'Finish a test with 95%+ accuracy', function (d, x) { return (x && x.acc >= 95) || d.ach.a95; }],
    ['a98', 'Surgeon', 'Finish a test with 98%+ accuracy', function (d, x) { return (x && x.acc >= 98) || d.ach.a98; }],
    ['a100', 'Flawless', 'Finish a test with 100% accuracy', function (d, x) { return (x && x.acc === 100 && x.chars >= 30) || d.ach.a100; }],
    ['pb', 'Record Breaker', 'Beat your personal best WPM', function (d, x) { return (x && x.newPB && x.hadPB) || d.ach.pb; }],
    ['t10', 'Regular', 'Complete 10 tests', function (d) { return d.totals.tests >= 10; }],
    ['t100', 'Veteran', 'Complete 100 tests', function (d) { return d.totals.tests >= 100; }],
    ['words1k', 'Word Smith', 'Type 1,000 total words', function (d) { return d.totals.words >= 1000; }],
    ['chars10k', 'Keyboard Warrior', 'Type 10,000 total characters', function (d) { return d.totals.chars >= 10000; }],
    ['cons90', 'Metronome', 'Reach 90%+ consistency in one test', function (d, x) { return (x && x.cons !== null && x.cons >= 90) || d.ach.cons90; }],
    ['streak5', 'Accuracy Streak', '5 tests in a row at 95%+ accuracy', function (d) { return d.bestStreak >= 5; }],
    ['code1', 'Code Typist', 'Complete a Code category test', function (d, x) { return (x && x.cat === 'code') || d.ach.code1; }],
    ['hard1', 'No Fear', 'Complete a Hard category test', function (d, x) { return (x && x.cat === 'hard') || d.ach.hard1; }],
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

  /* ---------- daily (deterministic, offline) ---------- */
  function dailyConfig() {
    var t = todayStr();
    var seed = Number(t.replace(/-/g, ''));
    var durs = ['15', '30', '60'];
    var cats = ['general', 'quotes', 'code', 'numbers', 'hard'];
    return { date: t, dur: durs[seed % 3], cat: cats[seed % 5] };
  }
  function completeDaily(wpm) {
    var t = todayStr();
    if (data.daily.today !== t) {
      data.daily.doneTotal++;
      data.daily.dayStreak = (data.daily.lastDone === todayStr(-1)) ? data.daily.dayStreak + 1 : 1;
      data.daily.lastDone = t;
      data.daily.today = t;
      data.daily.best = wpm;
    } else if (wpm > data.daily.best) {
      data.daily.best = wpm;
    }
    save();
    return checkAchievements();
  }

  /* ---------- stats for UI ---------- */
  function getStats() {
    var ws = [], accs = [];
    for (var i = 0; i < data.history.length; i++) { ws.push(data.history[i].wpm); accs.push(data.history[i].acc); }
    var recent = ws.slice(0, 5), older = ws.slice(5, 20);
    var avgR = mean(recent), avgO = mean(older.length ? older : ws);
    var impr = (avgO && avgR) ? Math.round((avgR - avgO) / avgO * 100) : null;
    return {
      pb: data.pb,
      tests: data.totals.tests,
      words: data.totals.words,
      chars: data.totals.chars,
      errors: data.totals.errors,
      backspaces: data.totals.backspaces,
      avg: mean(ws),
      avgAcc: mean(accs),
      bestAcc: accs.length ? Math.max.apply(null, accs) : null,
      streak: data.streak,
      bestStreak: data.bestStreak,
      improvement: impr,
      lastCons: data.history.length ? data.history[0].cons : null,
      todayBest: data.today.date === todayStr() ? data.today.best : null,
      todayAvg: data.today.date === todayStr() && data.today.n ? Math.round(data.today.sum / data.today.n) : null,
      todayWords: data.today.date === todayStr() ? data.today.words : 0
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
      if (name === 'tick') { if (data.settings.keyTick) tone(900, 0.02, 'square', 0, 0.25); }
      else if (name === 'err') { if (data.settings.errSound) tone(160, 0.08, 'sawtooth', 0, 0.5); }
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
    document.body.setAttribute('data-tsize', s.tsize);
  }
  function set(k, v) { data.settings[k] = v; save(); applyPrefs(); }

  /* ---------- resets ---------- */
  function resetStats() {
    data.pb = null; data.history = []; data.streak = 0; data.bestStreak = 0;
    data.totals = { tests: 0, words: 0, chars: 0, errors: 0, backspaces: 0 };
    data.today = { date: '', best: null, sum: 0, n: 0, words: 0 };
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
    pickText: pickText, recordTest: recordTest,
    checkAchievements: checkAchievements, achList: achList,
    dailyConfig: dailyConfig, completeDaily: completeDaily,
    getStats: getStats, category: category, mean: mean,
    audio: audio, todayStr: todayStr,
    resetStats: resetStats, resetAch: resetAch, resetAll: resetAll
  };
})();