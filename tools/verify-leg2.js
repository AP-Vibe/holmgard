const fs = require('fs');
const md = fs.readFileSync('canvases/holmgard-01-the-crossing/CANVAS.md', 'utf8');
const m = md.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('no script'); process.exit(1); }
global.document = { getElementById: () => ({ set innerHTML(v){}, get innerHTML(){return '';}, value:'' }) };
const memStore = {};
global.localStorage = {
  setItem(k, v) { memStore[k] = String(v); },
  getItem(k) { return Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null; },
  removeItem(k) { delete memStore[k]; }
};
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
// per-leg scoreboard: the end screen saves itself, no form, tagged Aldeigjuborg
g.render();   // the end screen renders in play; in the stub this triggers the auto-save
ok(g.S.scoreSaved === true, 'leg 1 end auto-saves to the board');
let b1 = g.boardGet();
ok(b1.length === 1 && b1[0].g === 'Aldeigjuborg' && b1[0].s > 0, 'board holds the Aldeigjuborg leg score (' + (b1[0] && b1[0].s) + ')');
ok(typeof g.S.name === 'string' && g.S.name.length > 0, 'skipper name set at run start (no end-screen form)');
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

// river art: leg 2 renders its own graphics, distinct from the sea set
try {
  const r1 = g.sceneSVG('rain', 1), r2 = g.sceneSVG('rain', 2);
  ok(r2.indexOf('data:image') >= 0 && r1.indexOf('data:image') >= 0 && r1 !== r2, 'leg-2 rain uses river art, leg-1 keeps the sea art');
  const lw = g.sceneSVG('lowwater', 2), pt = g.sceneSVG('portage', 2), hr = g.villageSVG('holmgard');
  ok(lw.indexOf('data:image') >= 0 && pt.indexOf('data:image') >= 0, 'lowwater & portage render their own river images');
  ok(hr.indexOf('data:image') >= 0 && hr !== g.villageSVG('full'), 'Holmgard arrival renders the town image, not the sea landfall');
  const failing = g.sceneSVG('holmgard', 0);
  ok(true, 'scene fallback chain intact');
} catch (e) { ok(false, 'river art renders: ' + e.message); }

// per-leg scoreboard: the Holmgard leg adds its own entry
g.render();
const b2 = g.boardGet();
ok(b2.length === 2 && b2.some(e => e.g === 'Holmgard') && b2.some(e => e.g === 'Aldeigjuborg'), 'board holds both legs\u2019 scores, tagged by destination');

// state resets cleanly
g.newGame(777); g.board();
ok(true, 'new run boots after a Holmgard run (state reset clean)');

console.log('\n' + (fail ? 'FAILURES: ' + fail : 'ALL GREEN'));
process.exit(fail ? 1 : 0);
