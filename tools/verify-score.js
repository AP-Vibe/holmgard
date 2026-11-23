const fs = require('fs');
const md = fs.readFileSync('canvases/holmgard-01-the-crossing/CANVAS.md', 'utf8');
const code = md.match(/<script>([\s\S]*?)<\/script>/)[1];
global.document = { getElementById: () => ({ set innerHTML(v){}, get innerHTML(){return '';} }) };
global.localStorage = { _s:{}, setItem(k,v){this._s[k]=v;}, getItem(k){return this._s[k]||null;}, removeItem(k){delete this._s[k];} };
global.window = global; global.scrollTo = () => {};
(0, eval)(code);
const g = global;
// drive a careful run to the end (render() runs after every choice => viewEnd exercised)
let s = g.newGame(777); g.board();
let pol = { storm:1, calm:1, fog:0, seals:0, chud:0, seam:0, squall:1, w1:0, w2:0 };
let steps = 0;
while (g.S.phase !== 'end' && steps++ < 200) {
  if (g.S.phase === 'day') { g.choose(pol[g.HMG.currentEvent(g.S).id] || 0); }
  else if (g.S.phase === 'market') { if (!g.S.flags.rested) g.mkt('rest'); g.mkt('castoff'); }
}
const sc = g.runScore(g.S.result);
console.log('end tier:', g.S.result.tier, 'score:', sc.total, '(alive', sc.alive, ', speed bonus', sc.speed, ')');
g.boardSave('Andrzej');
console.log('board after save:', JSON.stringify(g.boardGet()));
console.log('boardHtml rows:', (g.boardHtml(10).match(/class="row"/g) || []).length);
// title screen now includes board?
g.toTitle();
console.log('title rendered ok, board on title:', g.viewTitle().indexOf('Skippers') >= 0);
// formula sanity: full d22, 9 alive, marks 38
const expect = g.S.result.marks*100 + 9*50 + (32-22)*25 + g.S.result.silver*20;
console.log('formula check:', sc.total === expect, 'expected', expect);
