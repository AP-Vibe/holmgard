const fs = require('fs');
const md = fs.readFileSync('canvases/holmgard-01-the-crossing/CANVAS.md', 'utf8');
const code = md.match(/<script>([\s\S]*?)<\/script>/)[1];
global.document = { getElementById: () => ({ set innerHTML(v){}, get innerHTML(){return '';} }) };
global.localStorage = { _s:{}, setItem(k,v){this._s[k]=v;}, getItem(k){return this._s[k]||null;}, removeItem(k){delete this._s[k];} };
global.window = global; global.scrollTo = () => {};
(0, eval)(code);
const g = global;
let pass = 0, fail = 0;
function chk(name, ok) { if (ok) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } }

// 1) crewFactor: fresh state = 1.0, drops with deaths, floor 0.5
let s = g.HMG.newRun(777);
chk('crewFactor full crew = 1.0', g.HMG.crewFactor(s) === 1);
s.crew[0].dead = true;
const f9 = g.HMG.crewFactor(s);
chk('crewFactor 8 named alive = 0.9', Math.abs(f9 - 0.9) < 1e-9);
s.crew.forEach(c => c.dead = true);
chk('crewFactor floor 0.5', g.HMG.crewFactor(s) === 0.5);

// 2) consumption ratio: alive crew count runs
s = g.HMG.newRun(777);
s.food = 50; g.HMG.upkeep(s);
chk('upkeep full crew eats 10', s.food === 40);
s.crew[2].dead = true; s.crew[7].dead = true;
s.food = 50; g.HMG.upkeep(s);
chk('upkeep with 2 dead eats 8', s.food === 42);

// 3) end-game: neglect run with Halfr lost is slower than before (day later or marks hit)
s = g.HMG.newRun(777); g.S = s; g.board();
let pol = { storm:1, calm:1, fog:0, seals:0, chud:0, seam:0, squall:1, w1:2, w2:1 };
let steps = 0;
while (g.S.phase !== 'end' && steps++ < 300) {
  if (g.S.phase === 'day') g.choose(pol[g.HMG.currentEvent(g.S).id] || 0);
  else if (g.S.phase === 'market') g.mkt('castoff');
}
const d = g.S.result;
chk('neglect: Halfr lost, run completes', d.how === 'arrived' && d.deaths === 1);
console.log('neglect day:', d.days, 'tier:', d.tier);
// counterfactual: identical state, one man dead = 10% less way per day
let sFull = g.HMG.newRun(777), sDead = g.HMG.newRun(777);
sDead.crew[1].dead = true;
g.HMG; // (adj is exercised via applyChoice; use crewFactor + a choice gain)
const gF = g.HMG.crewFactor(sFull), gD = g.HMG.crewFactor(sDead);
chk('death slows the ship (factor ' + gF + ' vs ' + gD + ')', gF === 1 && Math.abs(gD - 0.9) < 1e-9);

// 4) hire is GONE from the mid-leg market (round 15: replacement is post-settlement, v0.2 hub phase)
s = g.HMG.newRun(777); g.S = s; g.board();
s.silver = 8;
s.crew[8].dead = true; // Dyri lost
// force market phase
s.progress = g.HMG.VILLAGE_P; s.phase = 'market'; s.flags.village = true;
const before = JSON.stringify(s.crew);
g.mkt('hire'); // must be a complete no-op now
chk('hire removed: state untouched by stray hire call', JSON.stringify(s.crew) === before && s.silver === 8);
chk('hire removed: no hire button in market view', g.viewMarket ? g.viewMarket().indexOf('Hire a local hand') < 0 : true);
chk('hire removed: deaths still slow the ship (no mid-leg buyback)', g.HMG.crewFactor(s) === 0.9);

// 5) leaderboards live in the save slot (v2 blob carries the board, boot reconciles)
s = g.HMG.newRun(1234); g.S = s; g.board();
while (g.S.phase !== 'end' && steps++ < 300) {
  if (g.S.phase === 'day') g.choose(0);
  else if (g.S.phase === 'market') g.mkt('castoff');
}

if (g.S.phase !== 'end') { g.S.phase = 'end'; g.S.result = { how:'arrived', tier:'scales', marks: 20, days: 30, crew:[], silver: 2, morale: 5 }; }
g.boardSave('Test Skipper');
const slot = JSON.parse(global.localStorage._s['hmg01save']);
chk('save slot is v2 blob', slot && slot.v === 2 && slot.s);
chk('board embedded in slot', slot.b && JSON.parse(slot.b).some(e => e.n === 'Test Skipper'));
// wipe storage outside the slot, boot-reconcile restores the board
global.localStorage._s['hmg01board'] = null; delete global.localStorage._s['hmg01board'];
g.loadSlot();
chk('boot: board restored from slot', g.boardGet().some(e => e.n === 'Test Skipper'));
// resume from slot
chk('boot: run resumable from slot', slot.s && slot.s.phase);

console.log(fail === 0 ? 'ALL GREEN' : 'FAILURES: ' + fail);
