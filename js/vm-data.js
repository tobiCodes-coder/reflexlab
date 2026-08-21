/* ============================================
   VISUAL MEMORY - DATA LAYER
   ============================================ */
var VMD = (function () {
  var KEY = 'rl-vmdata-v1';

  var defaults = {
    settings: {
      sound: true, volume: 0.6, speed: 'normal',
      theme: 'dark', hc: 0, rm: 0, fx: 1, mode: 'classic', diff: 'normal'
    },
    pb: null,
    bestScore: 0,
    history: [],
    totals: { games: 0, rounds: 0, mistakes: 0, tiles: 0, bestRoundStreak: 0 },
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

  function category(level) {
    if (level < 5) return 'Beginner';
    if (level < 8) return 'Developing';
    if (level < 10) return 'Good';
    if (level < 13) return 'Strong';
    if (level < 16) return 'Excellent';
    return 'Exceptional';
  }

  /* ---------- recording ---------- */
  function recordGame(r) {
    var hadPB = data.pb !== null;
    var newPB = !hadPB || r.level > data.pb;
    if (newPB) data.pb = r.level;
    if (r.score > data.bestScore) data.bestScore = r.score;

    data.history.unshift({
      level: r.level, pattern: r.pattern, score: r.score, acc: r.acc,
      mode: r.mode, rounds: r.rounds, t: Date.now()
    });
    if (data.history.length > 200) data.history.length = 200;

    data.totals.games++;
    data.totals.rounds += r.rounds;
    data.totals.mistakes += r.mistakes;
    data.totals.tiles += r.tiles;
    if (r.roundStreak && r.roundStreak > data.totals.bestRoundStreak) data.totals.bestRoundStreak = r.roundStreak;

    var td = todayStr();
    if (data.today.date !== td) data.today = { date: td, best: null, n: 0 };
    data.today.n++;
    if (data.today.best === null || r.level > data.today.best) data.today.best = r.level;

    save();
    return { newPB: newPB, hadPB: hadPB, cat: category(r.level) };
  }

  /* ---------- achievements ---------- */
  var ACH = [
    ['first', 'First Game', 'Complete your first visual memory game', function (d) { return d.totals.games >= 1; }],
    ['l5', 'Level 5', 'Reach level 5', function (d) { return d.pb !== null && d.pb >= 5; }],
    ['l8', 'Level 8', 'Reach level 8', function (d) { return d.pb !== null && d.pb >= 8; }],
    ['l10', 'Level 10', 'Reach level 10', function (d) { return d.pb !== null && d.pb >= 10; }],
    ['l12', 'Level 12', 'Reach level 12', function (d) { return d.pb !== null && d.pb >= 12; }],
    ['l15', 'Level 15', 'Reach level 15', function (d) { return d.pb !== null && d.pb >= 15; }],
    ['perfect', 'Photographic', 'Reach level 10+ in a single game', function (d, x) { return (x && x.level >= 10) || d.ach.perfect; }],
    ['clean5', 'Clean Eye', '5 perfect rounds in a row (no wrong taps)', function (d, x) { return (x && x.roundStreak >= 5) || d.totals.bestRoundStreak >= 5; }],
    ['fast', 'Quick Eye', 'Recall a level 8+ pattern in under 2.5s', function (d, x) { return (x && x.level >= 8 && x.fastRecall !== null && x.fastRecall < 2.5) || d.ach.fast; }],
    ['biggrid', 'Large Grid Master', 'Clear a round on a 6×6+ grid', function (d, x) { return (x && x.grid >= 6) || d.ach.biggrid; }],
    ['acc95', 'Precision Eye', '95%+ accuracy over 10+ rounds in one game', function (d, x) { return (x && x.acc >= 95 && x.rounds >= 10) || d.ach.acc95; }],
    ['pb', 'Record Breaker', 'Beat your personal best level', function (d, x) { return (x && x.newPB && x.hadPB) || d.ach.pb; }],
    ['g10', 'Regular', 'Complete 10 games', function (d) { return d.totals.games >= 10; }],
    ['g50', 'Dedicated', 'Complete 50 games', function (d) { return d.totals.games >= 50; }],
    ['g100', 'Veteran', 'Complete 100 games', function (d) { return d.totals.games >= 100; }],
    ['tiles1k', 'Tile Collector', 'Recall 1,000 total tiles', function (d) { return d.totals.tiles >= 1000; }],
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
    var modes = ['classic', 'timed', 'nomistake', 'shape'];
    var diffs = ['easy', 'normal', 'hard', 'expert'];
    return { date: t, mode: modes[seed % 4], diff: diffs[seed % 4] };
  }
  function completeDaily(level) {
    var t = todayStr();
    if (data.daily.today !== t) {
      data.daily.doneTotal++;
      data.daily.dayStreak = (data.daily.lastDone === todayStr(-1)) ? data.daily.dayStreak + 1 : 1;
      data.daily.lastDone = t;
      data.daily.today = t;
      data.daily.best = level;
    } else if (level > data.daily.best) {
      data.daily.best = level;
    }
    save();
    return checkAchievements();
  }

  /* ---------- stats ---------- */
  function getStats() {
    var ls = [];
    for (var i = 0; i < data.history.length; i++) ls.push(data.history[i].level);
    var recent = ls.slice(0, 5), older = ls.slice(5, 20);
    var avgR = mean(recent), avgO = mean(older.length ? older : ls);
    var impr = (avgO && avgR) ? Math.round((avgR - avgO) / avgO * 100) : null;
    return {
      pb: data.pb,
      bestScore: data.bestScore,
      games: data.totals.games,
      rounds: data.totals.rounds,
      mistakes: data.totals.mistakes,
      tiles: data.totals.tiles,
      bestRoundStreak: data.totals.bestRoundStreak,
      avgLevel: mean(ls),
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
      if (name === 'show') tone(520, 0.18);
      else if (name === 'sel') tone(760, 0.05, 'triangle', 0, 0.6);
      else if (name === 'bad') tone(160, 0.25, 'sawtooth');
      else if (name === 'level') { tone(600, 0.08, 'sine', 0); tone(800, 0.12, 'sine', 0.09); }
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
    data.pb = null; data.bestScore = 0; data.history = [];
    data.totals = { games: 0, rounds: 0, mistakes: 0, tiles: 0, bestRoundStreak: 0 };
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