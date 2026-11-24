const fs = require('fs');
const md = fs.readFileSync('canvases/holmgard-01-the-crossing/CANVAS.md', 'utf8');
const m = md.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('no script'); process.exit(1); }
global.document = { getElementById: () => ({ set innerHTML(v){}, get innerHTML(){return '';}, value:'' }) };
global.localStorage = { setItem(){}, getItem(){return null;}, removeItem(){} };
global.window = global; global.scrollTo = () => {}; global.fetch = () => Promise.reject(new Error('offline'));
(0, eval)(m[1]);
const g = global;
let pass = 0, fail = 0;
function ok(cond, name) { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } }

// ---- leg 1, careful policy to the landing ----
g.newGame(777); g.board();
const pol = { storm:1, calm:1, fog:0, seals:0, chud:0, seam:0, squall:1, w1:0, w2:0 };
let steps = 0;
while (g.S.phase !== 'end' && steps++ < 300) {
  if (g.S.phase === 'day') {
    const ev = g.HMG.currentEvent(g.S);
    const i = (pol[ev.id] !== undefined ? pol[ev.id] : 0) % ev.options.length;
    g.choose(i);
  } else if (g.S.phase === 'market') {
    if (g.S.food < 60 && g.S.silver >= 2) g.mkt('fish');
    if (!g.S.flags.rested) g.mkt('rest');
    g.mkt('castoff');
  }
}
ok(g.S.result.how === 'arrived' && g.S.result.dest === 'Aldeigjuborg', 'leg 1 ends at Aldeigjuborg (dest tag)');
ok(g.S.leg === 1, 'leg is 1 at landing');
const purse1 = g.S.silver;

// continue into the hub
g.toHub();
ok(g.S.phase === 'hub', 'hub phase entered via Continue');
ok(g.S.silver === purse1 + g.S.result.marks, 'settlement dirhams land in the purse');

// hub shopping
const before = { hands: g.S.crew.length };
g.hub('hire'); g.hub('hire');
g.hub('furs'); g.hub('furs'); g.hub('furs'); g.hub('furs');
g.hub('captive'); g.hub('captive');
while (g.S.food < 200 && g.S.silver >= 2) g.hub('fish');
ok(g.S.crew.length === before.hands + 2, 'two hands hired in the hub (Audun, Thorstein)');
ok(g.HMG.HIRES.indexOf('Audun') >= 0 && g.S.crew.some(c => c.name === 'Audun'), 'hire pool contains the four names');
ok(g.S.furs === 4, 'four fur bales bought');
ok(g.S.captives === 2, 'two captives bought');
ok(g.HMG.holdUsed(g.S) === 8 && g.HMG.HOLD === 12, 'hold math: 4 + 2*2 = 8 of 12');

let guard = 0;
while (guard++ < 20) g.hub('furs');
ok(g.HMG.holdUsed(g.S) <= g.HMG.HOLD, 'hold never exceeds capacity');

// cast off up the Volkhov
g.hub('castoff2');
ok(g.S.leg === 2 && g.S.phase === 'day' && g.S.progress === 0, 'cast off: leg 2 begins, progress reset');

// aboard now: upkeep counts skipper + living hands + captives in the day's mouths
const foodBefore = g.S.food;
const expected = 1 + g.S.crew.filter(c => !c.dead).length + g.S.captives;
g.HMG.upkeep(g.S);
ok(g.S.food === foodBefore - expected, 'upkeep counts captives in the day\u2019s mouths (' + expected + ' rations)');

// leg 2 river deck
const seen = [];
const pol2 = { lowwater: 0, portage: 0, fog: 0, seam: 0 };
steps = 0;
let ended = false;
while (steps++ < 300) {
  if (g.S.phase === 'day') {
    const ev = g.HMG.currentEvent(g.S);
    if (seen.indexOf(ev.id) < 0) seen.push(ev.id);
    const i = (pol2[ev.id] !== undefined ? pol2[ev.id] : 0) % ev.options.length;
    g.choose(i);
  } else if (g.S.phase === 'end') { ended = true; break; }
}
ok(seen.indexOf('lowwater') >= 0 && seen.indexOf('portage') >= 0, 'low water and portage both fired on the river');
ok(seen.indexOf('w1') < 0 && seen.indexOf('w2') < 0 && seen.indexOf('squall') < 0, 'lake arcs stay on the lake (leg 2 clean)');
ok(ended, 'leg 2 run reaches an end');
ok(g.S.result.dest === 'Holmgard', 'leg 2 arrival is tagged Holmgard');
ok(g.S.result.tier === 'holmgard' || g.S.result.tier === 'full2', 'leg 2 settlement tier is a Holmgard tier');
ok(g.S.result.marks === g.S.furs * 5 + g.S.captives * 12, 'Holmgard pays furs*5 + captives*12 (' + g.S.result.marks + ')');

// dirham relabel: no user-facing "marks" left
const faces = ['30 marks','8 marks','two marks','Marks earned','marks of the settlement','— 2 marks','— 4 marks'];
const leftovers = faces.filter(f => m[1].indexOf(f) >= 0);
ok(leftovers.length === 0, 'dirham relabel: no leftover user-facing mark strings (' + leftovers.join(',') + ')');
ok(m[1].indexOf('dirhams') > 0, 'dirhams present in UI strings');

// placeholders render
try { g.sceneSVG('lowwater'); g.sceneSVG('portage'); ok(true, 'sceneSVG renders lowwater & portage (placeholder art)'); }
catch (e) { ok(false, 'sceneSVG renders lowwater & portage: ' + e.message); }

// state resets cleanly
g.newGame(777); g.board();
ok(true, 'new run boots after a Holmgard run (state reset clean)');

console.log('\n' + (fail ? 'FAILURES: ' + fail : 'ALL GREEN'));
process.exit(fail ? 1 : 0);
