(function () {
  var sent = {};
  window.submitScore = function (test, score) {
    if (!test || score === null || score === undefined) return;
    var key = test + ':' + Math.round(score * 100);
    if (sent[key]) return;
    sent[key] = true;
    fetch('/api/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: test, score: score })
    }).catch(function () {});
  };
})();
