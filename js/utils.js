/* ============================================
   REFLEXLAB - UTILS (helper functions)
   Sob test e reuse hobe
   ============================================ */

/* ID diye element anar shortcut */
function byId(id) {
  return document.getElementById(id);
}

/* User er personal best score localStorage theke ana */
function getBest(testId) {
  var value = localStorage.getItem('rl_' + testId);
  if (value === null) return null;
  return Number(value);
}

/* Score bhalo hole save kora. Return: true = new record!
   lowerIsBetter = true mane kom score bhalo (reaction time) */
function saveBest(testId, score, lowerIsBetter) {
  var prev = getBest(testId);

  // Age kono score nei = first record
  if (prev === null) {
    localStorage.setItem('rl_' + testId, score);
    return true;
  }

  // Dekhi notun score ta bhalo kina
  var isBetter = lowerIsBetter ? (score < prev) : (score > prev);
  if (isBetter) {
    localStorage.setItem('rl_' + testId, score);
    return true;
  }
  return false;
}

/* Text clipboard e copy kora (share button er jonno) */
function copyText(text) {
  return navigator.clipboard.writeText(text);
}

/* Number round kora (jemon 250.678 -> 251) */
function round(num, decimals) {
  return Number(num.toFixed(decimals));
}