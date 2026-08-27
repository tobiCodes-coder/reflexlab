const TESTS = {
  'cps':               { min: 0.1, max: 30,   lowerBetter: false },
  'reaction':          { min: 50,  max: 2000, lowerBetter: true  },
  'typing':            { min: 1,   max: 200,  lowerBetter: false },
  'aim':               { min: 0,   max: 100000, lowerBetter: false },
  'sequence-memory':   { min: 1,   max: 30,   lowerBetter: false },
  'visual-memory':     { min: 1,   max: 30,   lowerBetter: false },
  'number-memory':     { min: 1,   max: 30,   lowerBetter: false },
  'color-vision':      { min: 0,   max: 100,  lowerBetter: false }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/result' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json({ ok: false }, 400); }
      const test = String(body.test || '');
      const score = Number(body.score);
      const cfg = TESTS[test];
      if (!cfg || !isFinite(score) || score < cfg.min || score > cfg.max) {
        return json({ ok: false }, 400);
      }
      const key = 'agg:' + test;
      let cur = null;
      try { cur = JSON.parse(await env.STATS.get(key)); } catch (e) {}
      if (!cur) cur = { n: 0, sum: 0, best: null };
      cur.n += 1;
      cur.sum = Math.round((cur.sum + score) * 10) / 10;
      if (cur.best === null) cur.best = score;
      else cur.best = cfg.lowerBetter ? Math.min(cur.best, score) : Math.max(cur.best, score);
      await env.STATS.put(key, JSON.stringify(cur));
      return json({ ok: true });
    }

    if (url.pathname === '/api/stats' && request.method === 'GET') {
      const test = url.searchParams.get('test') || '';
      if (!TESTS[test]) return json({ n: 0 });
      let cur = null;
      try { cur = JSON.parse(await env.STATS.get('agg:' + test)); } catch (e) {}
      if (!cur || !cur.n) return json({ n: 0 });
      return json({
        n: cur.n,
        avg: Math.round((cur.sum / cur.n) * 10) / 10,
        best: cur.best
      });
    }

    return env.ASSETS.fetch(request);
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' }
  });
}
