(function () {
  var boxes = document.querySelectorAll('[data-stats]');
  for (var i = 0; i < boxes.length; i++) {
    var test = boxes[i].getAttribute('data-stats');
    (function (box, test) {
      fetch('/api/stats?test=' + test)
        .then(function (r) { return r.json(); })
        .then(function (s) {
          if (!s || !s.n) return;
          box.innerHTML =
            '<div style="margin:20px 0;padding:16px;background:#0f172a;border:1px solid #22d3ee;border-radius:10px">' +
            '<div style="color:#22d3ee;font-weight:700;margin-bottom:8px">📊 ReflexLab Live Stats</div>' +
            '<div style="color:#cbd5e1;font-size:14px">Based on <strong style="color:#fff">' + s.n + '</strong> real tests on our site:</div>' +
            '<div style="margin-top:8px;color:#e2e8f0">• Average: <strong style="color:#fff">' + s.avg + '</strong></div>' +
            '<div style="color:#e2e8f0">• Best: <strong style="color:#fff">' + s.best + '</strong></div>' +
            '<div style="margin-top:12px"><a href="/tests/' + test + '/' + test + '" style="color:#22d3ee;font-weight:600;text-decoration:none">Try the ' + test.replace('-', ' ') + ' test →</a></div>' +
            '</div>';
        })
        .catch(function () {});
    })(boxes[i], test);
  }
})();
