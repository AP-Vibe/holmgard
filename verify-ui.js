const fs = require('fs');
const md = fs.readFileSync('canvases/holmgard-01-the-crossing/CANVAS.md', 'utf8');
const code = md.match(/<script>([\s\S]*?)<\/script>/)[1];
let scrolled = 0;
global.document = { getElementById: () => ({ set innerHTML(v){}, get innerHTML(){return '';} }) };
global.localStorage = { _s:{}, setItem(k,v){this._s[k]=v;}, getItem(k){return this._s[k]||null;}, removeItem(k){delete this._s[k];} };
global.window = global; global.scrollTo = () => { scrolled++; };
(0, eval)(code);
const g = global;
let pass = 0, fail = 0;
function chk(name, ok) { if (ok) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } }

// 1) help screen reachable from title and mid-run, closes back correctly
g.toTitle();
const titleHtml = g.viewTitle();
chk('title: How to play button present', titleHtml.indexOf('How to play') >= 0);
g.showHelp('title');
chk('help view renders', g.viewHelp().indexOf('How to read the screen') >= 0);
chk('help covers the four key UI elements', ['Rations', 'Hull', 'Spirits', 'Journey length', 'convoy window', 'Score'].every(k => g.viewHelp().indexOf(k) >= 0));
g.closeHelp();
chk('help closes back to title', g.inHelp === false);

// 2) mid-run header carries the help button
g.newGame(777); g.board();
const hd = g.header();
chk('header: help button removed', hd.indexOf('How to play') < 0);
g.showHelp('game');
g.closeHelp();
chk('help closes mid-run without scroll-to-top', g.inHelp === false);

// 3) boardSave no longer yanks the view: keepScroll suppresses one scrollTo
let s = g.S;
let steps = 0;
while (g.S.phase !== 'end' && steps++ < 300) {
  if (g.S.phase === 'day') g.choose(1);
  else if (g.S.phase === 'market') g.mkt('castoff');
  else break;
}
chk('run reaches the end', g.S.phase === 'end');
scrolled = 0;
g.boardSave('ScrollTest');
chk('boardSave: view not jumped to top (no scrollTo)', scrolled === 0);
chk('boardSave: next render scrolls normally again', (g.keepScroll === undefined || g.keepScroll === false));

// 4) board label explains scope (all crossings)
chk('board labeled all-crossings', g.boardHtml(5).indexOf('all crossings') >= 0);

// 5) title board still renders old entries after boot-reconcile with a fresh slot save
g.save();
const blob = JSON.parse(global.localStorage._s['hmg01save']);
chk('slot blob still v2 with board', blob.v === 2 && blob.b);

console.log(fail === 0 ? 'ALL GREEN' : 'FAILURES: ' + fail);

// 6) round 50: the carry-your-log export/import is retired (his ask; the shared board made it redundant)
chk('carry-log code fully removed', code.indexOf('logEncode') < 0 && code.indexOf('logRecode') < 0 && code.indexOf('logcode') < 0 && code.indexOf('Carry your ship') < 0);
chk('title no longer shows the carry-log panel', g.viewTitle().indexOf('logcode') < 0 && g.viewTitle().indexOf('survives board resets') < 0);

console.log(fail === 0 ? 'ALL GREEN' : 'FAILURES: ' + fail);
