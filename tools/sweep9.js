const fs = require('fs');
const md = fs.readFileSync('canvases/holmgard-01-the-crossing/CANVAS.md', 'utf8');
const code = md.match(/<script>([\s\S]*?)<\/script>/)[1];
global.document = { getElementById: () => ({ set innerHTML(v){}, get innerHTML(){return '';} }) };
global.localStorage = { setItem(){}, getItem(){return null;}, removeItem(){} };
global.window = global; global.scrollTo = () => {};
(0, eval)(code);
const HMG = global.HMG;
const policies = {
  careful: { storm:1, calm:1, fog:0, seals:0, chud:0, seam:0, squall:1, w1:0, w2:0 },
  neglect: { storm:0, calm:0, fog:1, seals:1, chud:1, seam:1, squall:0, w1:2, w2:1 },
  reckless: { storm:2, calm:0, fog:1, seals:1, chud:1, seam:1, squall:0, w1:2, w2:1 }
};
let fails = 0;
function ok(c, m) { if (!c) { fails++; console.log('FAIL', m); } }
function run(seed, pol, mktFn) {
  const s = HMG.newRun(seed); HMG.begin(s); let steps = 0;
  while (s.phase !== 'end' && steps++ < 200) {
    if (s.phase === 'day') {
      const ev = HMG.currentEvent(s);
      HMG.applyChoice(s, ((pol[ev.id] !== undefined ? pol[ev.id] : 0) % ev.options.length));
    } else if (s.phase === 'market') { mktFn(s); }
  }
  ok(s.crew.length === 9, 'nine crew');
  ok(s.result.marks >= 0, 'marks non-negative');
  return s;
}
const careMkt = s => { if (s.food < 60 && s.silver >= 2) HMG.marketAct(s, 'fish'); if (!s.flags.rested) HMG.marketAct(s, 'rest'); HMG.marketAct(s, 'castoff'); };
const rushMkt = s => HMG.marketAct(s, 'castoff');
const care = [777, 12345, 42, 999, 2026].map(sd => run(sd, policies.careful, careMkt));
care.forEach(s => ok(s.result.tier === 'full' && s.result.deaths === 0, 'careful full: ' + s.result.tier + ' d' + s.result.days));
const neg = run(777, policies.neglect, rushMkt);
ok(neg.result.deaths === 1 && neg.result.marks === 20, 'neglect: deaths=' + neg.result.deaths + ' marks=' + neg.result.marks);
let negMarks = 0, worst = 0, tiers = {};
for (let sd = 1; sd <= 60; sd++) {
  for (const p of [policies.neglect, policies.reckless]) {
    const st = run(sd, p, rushMkt);
    worst = Math.max(worst, st.result.deaths);
    if (st.result.marks < 0) negMarks++;
    tiers[st.result.tier] = (tiers[st.result.tier] || 0) + 1;
  }
}
console.log('sweep: fails=' + fails, 'worstDeaths=' + worst, 'negMarks=' + negMarks, 'carefulDays=' + care.map(s => s.result.days).join(','), 'tiers=' + JSON.stringify(tiers));
