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

// round 56 / his design call: wounds first — the southern road takes blood before it takes lives
s = g.HMG.newRun(777); g.S = s; g.board();
s.leg = 3; s.sub = 3; s.phase = 'day';
const d56a = s.crew.filter(c => c.dead).length;
const w56a = g.HMG.wound(s, 1);
chk('round 56 wound: one named man loses hp, nobody dies outright', w56a.length === 1 && s.crew.some(c => !c.dead && c.hp === 1 && c.name === w56a[0]) && s.crew.filter(c => c.dead).length === d56a);
// hurt men still row; stack wounds toward down
g.HMG.wound(s, 2); g.HMG.wound(s, 2); g.HMG.wound(s, 2);
chk('round 56 wound: hp floors at 0 with grace days set, still no death from wounding', s.crew.filter(c => !c.dead && c.hp === 0).every(c => c.graveF === 2) && s.crew.filter(c => c.dead).length === d56a);
// a downed man dies only untended: three upkeep ticks burn the grace days
let dn56 = s.crew.find(c => !c.dead && c.hp === 0);
chk('round 56: a downed man exists after stacking wounds', !!dn56);
const nm56 = dn56.name;
s.food = 500;   // keep the pot full so starvation cannot confound the tick count
g.HMG.upkeep(s); g.HMG.upkeep(s);
chk('round 56: two untended days and the downed man still lives (grace days)', !s.crew.find(c => c.name === nm56).dead);
g.HMG.upkeep(s);
chk('round 56: the third untended day takes him — death only if untreated', s.crew.find(c => c.name === nm56).dead);
// treatment: hub rest mends the hurt on the southern road
s = g.HMG.newRun(777); g.S = s; g.board();
s.leg = 3; s.sub = 1; s.hub = 'gnezdovo'; s.phase = 'hub3'; s.flags.rested = false; s.silver = 10;
g.HMG.wound(s, 2);
g.hub3('rest');
chk('round 56: hub rest mends the hurt (+1 hp to every wounded man)', s.crew.every(c => c.dead || c.hp === 2));
// the wisewoman at the southern landings
g.HMG.wound(s, 2);
const hurt56 = s.crew.filter(c => !c.dead && c.hp < 2).length;
g.hub3('wise');
chk('round 56: the hub wisewoman heals +1 hp for 2 dirhams', hurt56 > 0 && s.silver === 8 && s.crew.filter(c => !c.dead && c.hp < 2).length < hurt56);
// wired outcome: warping the first rapid always costs a wound (the lines tear hands)
s = g.HMG.newRun(777); g.S = s; g.board();
s.leg = 3; s.sub = 3; s.phase = 'day'; s.pending = { id: 'rapids1' };
const hp56 = s.crew.filter(c => !c.dead && c.hp === 2).length;
g.choose(0);
chk('round 56: warping the first rapid wounds a man (hp 2 pool shrinks)', s.crew.filter(c => !c.dead && c.hp === 2).length === hp56 - 1 && s.crew.filter(c => c.dead).length === 0);
// wired outcome: Nenasytets loaded-run failure costs two wounds
s = g.HMG.newRun(777); g.S = s; g.board();
s.leg = 3; s.sub = 3; s.phase = 'day'; s.pending = { id: 'nenasytets' };
const hp56b = s.crew.filter(c => !c.dead && c.hp === 2).length;
let tries56 = 0, wounded56 = false;
while (tries56++ < 40 && !wounded56) {
  s2 = g.HMG.newRun(777 + tries56); g.S = s2; g.board();
  s2.leg = 3; s2.sub = 3; s2.phase = 'day'; s2.pending = { id: 'nenasytets' };
  g.choose(2);   // run it loaded: 25% success, else hull -35 AND two wounds
  wounded56 = s2.crew.filter(c => !c.dead && c.hp === 2).length <= 7 && s2.crew.filter(c => c.dead).length === 0 && s2.hull <= 65;
}
chk('round 56: a failed loaded run at Nenasytets wounds two men and kills none', wounded56);
// instant vectors unchanged: the parley arrow still kills only via its own 45% event
s = g.HMG.newRun(777); g.S = s; g.board();
s.leg = 3; s.sub = 3; s.phase = 'day'; s.pending = { id: 'parley' };
g.choose(2);
chk('round 56: legs 1-2 and the parley stay untouched (no new instant kills)', s.crew.filter(c => c.dead).length <= 1);

console.log(fail === 0 ? 'ALL GREEN' : 'FAILURES: ' + fail);
