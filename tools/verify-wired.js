const fs = require('fs');
const md = fs.readFileSync('canvases/holmgard-01-the-crossing/CANVAS.md', 'utf8');
const m = md.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('no script'); process.exit(1); }
let code = m[1];
// DOM/localStorage stubs
global.document = { getElementById: () => ({ set innerHTML(v){}, get innerHTML(){return '';} }) };
global.localStorage = { setItem(){}, getItem(){return null;}, removeItem(){} };
global.window = global; global.scrollTo = () => {};
(0, eval)(code);
// after eval: HMG, newGame, choose, etc are defined in scope? eval in function scope keeps vars? use indirect eval to global
const g = global;
const s = g.newGame(777); g.board();
const pol = { storm:1, calm:1, fog:0, seals:0, chud:0, seam:0, squall:1, w1:0, w2:0 };
let steps = 0;
while (g.S.phase !== 'end' && steps++ < 200) {
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
console.log('careful 777:', JSON.stringify({tier: g.S.result.tier, day: g.S.result.days, marks: g.S.result.marks}));
const s2 = g.newGame(777); g.board();
const neg = { storm:0, calm:0, fog:1, seals:1, chud:1, seam:1, squall:0, w1:2, w2:1 };
steps = 0;
while (g.S.phase !== 'end' && steps++ < 200) {
  if (g.S.phase === 'day') {
    const ev = g.HMG.currentEvent(g.S);
    const i = (neg[ev.id] !== undefined ? neg[ev.id] : 0) % ev.options.length;
    g.choose(i);
  } else if (g.S.phase === 'market') { g.mkt('castoff'); }
}
console.log('neglect 777:', JSON.stringify({tier: g.S.result.tier, marks: g.S.result.marks, deaths: g.S.result.deaths}));
// art sanity: every event id maps to an image or falls back
const ids = ['fair','calm','fog','seals','chud','seam','rain','aurora','storm','squall','w1','w2'];
const missing = ids.filter(id => g.sceneSVG(id).indexOf('<img') !== 0);
console.log('ids without image:', missing.join(',') || 'NONE');
console.log('village full:', g.villageSVG('full').slice(0,30).indexOf('<img') === 0, 'ice:', g.villageSVG('ice').slice(0,30).indexOf('<img') === 0, 'market:', g.villageSVG('market').slice(0,30).indexOf('<img') === 0);
