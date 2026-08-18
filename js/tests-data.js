/* ============================================
   REFLEXLAB - TESTS LIST
   Notun test add korte: ekta object + folder
   live: true = test khela jabe
   lower: true = kom score bhalo (reaction time)
   ============================================ */

var TESTS = [
  { id: 'reaction',        icon: '⚡', name: 'Reaction Time',   desc: 'How fast do you react? Click when it turns green!', unit: 'ms',     lower: true,  live: true },
  { id: 'cps',             icon: '👆', name: 'Click Speed',     desc: 'Measure your clicks per second (CPS).',             unit: 'CPS',    lower: false, live: true },
  { id: 'typing',          icon: '⌨️', name: 'Typing Speed',    desc: 'Find out your typing speed in WPM.',                unit: 'WPM',    lower: false, live: true },
  { id: 'aim',             icon: '🎯', name: 'Aim Trainer',     desc: 'Hit targets as fast as you can.',                   unit: 'ms',     lower: true,  live: true },
  { id: 'sequence-memory', icon: '🔢', name: 'Sequence Memory', desc: 'Remember the growing number sequence.',             unit: 'level',  lower: false, live: true },
  { id: 'visual-memory',   icon: '🧠', name: 'Visual Memory',   desc: 'Recall the pattern from memory.',                   unit: 'level',  lower: false, live: true },
  { id: 'number-memory',   icon: '🎲', name: 'Number Memory',   desc: 'How many digits can you hold in mind?',             unit: 'digits', lower: false, live: true },
  { id: 'color-vision',    icon: '🎨', name: 'Color Vision',    desc: 'Spot the odd color out.',                           unit: 'level',  lower: false, live: true },
  { id: 'verbal-memory',   icon: '📝', name: 'Verbal Memory',   desc: 'Have you seen this word before?',                   unit: 'words',  lower: false, live: true }
];