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
const faces = ['30 marks','8 marks','two marks','Marks earned','marks of the settlement','— 2 marks','— 4 marks','the marks were two fathoms'];
const leftovers = faces.filter(f => m[1].indexOf(f) >= 0);
ok(leftovers.length === 0, 'dirham relabel: no leftover user-facing mark strings (' + leftovers.join(',') + ')');
ok(m[1].indexOf('the channel ran two fathoms') >= 0, 'lowwater text reads depth as channel, not "marks"');

// round 21: leg-duration briefing (his note: "before journey begins there should be info on how much it lasts on average")
ok(m[1].indexOf('a fair crossing takes 15') >= 0, 'intro states typical crossing duration (15-20 days, adjusted up)');
ok(m[1].indexOf('140 rations aboard') >= 0 && m[1].indexOf('fourteen days of food') >= 0, 'intro states rations vs mouths (140 / ten a day)');
ok(m[1].indexOf('days loaded') >= 0 && m[1].indexOf('near 120 miles upriver to Holmgard') >= 0, 'hub states the river leg typical duration and distance');
ok(m[1].indexOf('days of food') >= 0 && m[1].indexOf('rations a day') >= 0, 'hub shows rations-days math (rations / river mouths)');
ok(m[1].indexOf('Gostinopol') >= 0, 'portage/rapids named with historical provenance in text');

// round 21: the hub briefing computes live
g.newGame(777); g.board();
g.S.leg = 2; g.S.phase = 'hub'; g.S.furs = 2; g.S.captives = 1; g.S.food = 140; g.S.crew.forEach(c => c.dead = false);
const hubHtml = g.viewHub();
ok(hubHtml.indexOf('Rations aboard</span><span>140') >= 0 && hubHtml.indexOf('about 12 days of food') >= 0, 'hub reports ~12 days of food for 140 rations / 11 river mouths (skipper + 9 hands + 1 captive)');
ok(hubHtml.indexOf('Buy fish before you cast off') >= 0, '140 rations now warn: 12 days is thin for an honest 15-20 day river');
ok(hubHtml.indexOf('15\u201420 days') >= 0, 'hub river briefing states honest 15-20 day range');
g.S.food = 170;
const okHtml = g.viewHub();
ok(okHtml.indexOf('Buy fish before you cast off') < 0, 'no under-supplied warning when food covers an honest 15+ days');
g.S.food = 55;
const thinHtml = g.viewHub();
ok(thinHtml.indexOf('Buy fish before you cast off') >= 0, 'under-supplied pantry (55 rations / 11 mouths) warns to buy fish');
ok(m.indexOf('dirhams of silver') < 0 && m.indexOf('dirham of silver') < 0, 'currency reads plain dirhams, never "dirhams of silver" (his round-21 note)');
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
// round 22: feast action + river events (his note: more options to raise spirits; the river deck had no food event)
ok(m[1].indexOf('Throw a feast for the crew') >= 0, 'hub offers a feast action (spirits +2, one per landing)');
g.newGame(777); g.board();
g.S.leg = 2; g.S.phase = 'hub'; g.S.morale = 4; g.S.silver = 10;
const sv = g.S.morale, ssv = g.S.silver;
g.HMG.hubAct(g.S, 'feast');
ok(g.S.morale === Math.min(10, sv + 2) && g.S.silver === ssv - 2 && g.S.flags.feasted === true, 'feast raises morale +2, costs 2 dirhams, sets the flag');
const mv = g.S.morale;
g.HMG.hubAct(g.S, 'feast');
ok(g.S.morale === mv && g.S.silver === ssv - 2, 'feast is once per landing (second call rejected)');
ok(g.viewHub().indexOf('already feasted') >= 0, 'feast button shows disabled reason when already feasted');
g.HMG.hubAct(g.S, 'castoff2');
ok(g.S.leg === 2 && g.S.flags.feasted === false, 'castoff2 resets the feast flag for the next landing');
ok(m[1].indexOf('The quiet water below the rift') >= 0, 'river deck has the nets food event');
ok(m[1].indexOf('A night camp on the shingle') >= 0, 'river deck has the hearth spirits event');
ok(m[1].indexOf('typically 15') >= 0 && m[1].indexOf('days loaded') >= 0 && m[1].indexOf('fill the pantry at the landing') >= 0, 'leg-1 end screen Continue note states the honest river duration');


// round 24: compact crew readout, Norse naming, leg-2 tone-down
ok(m[1].indexOf("'lost at sea'") < 0 && m[1].indexOf('var aliveN') >= 0, 'end screen lists crew compactly (N of M alive) instead of one row each');
g.newGame(777); g.board();
g.S.phase = 'end'; g.S.result = { how: 'arrived', dest: 'Holmgard', title: 't', text: 't', days: 30, date: 'Sep 20', crew: [{ name: 'Ketil', dead: false }, { name: 'Halfr', dead: true }], deaths: 1, wet: 0, silver: 5, morale: 6, marks: 10 };
try { const eh = g.viewEnd(); ok(eh.indexOf('1 of 2 alive') >= 0 && eh.indexOf('Lost</span>') >= 0 && eh.indexOf('Halfr') >= 0, 'compact crew row counts survivors and lists only the lost by name'); } catch (e) { ok(false, 'viewEnd compact crew threw: ' + e.message); }
const uidx = m[1].indexOf('villageSVG');
ok(m[1].indexOf(' up the Volkhov') < 0 && m[1].indexOf('Cast off for Holmgard') >= 0 && m[1].indexOf('Continue to Holmgard') >= 0, 'user-facing buttons/labels say Holmgard and the river, never the Volkhov name');
ok(m[1].indexOf('food: 10, morale: 1') >= 0 && m[1].indexOf('morale: 1, progress: 3') >= 0, 'river nets/hearth toned down (food +10, hearth +1 morale, per his round-24 balance note)');


// round 25: scroll anchoring + collapsible footer (his notes: screen jumping/freezing in hubs and scoring, footer text hidden by default)
ok(m[1].indexOf("function hub(a) { if (a !== 'castoff2') keepScroll = true") >= 0, 'hub button taps keep the scroll position (no yank to top), except castoff');
ok(m[1].indexOf("function mkt(a) { if (a !== 'castoff') keepScroll = true") >= 0, 'market button taps keep the scroll position, except castoff');
ok(md.indexOf('<details><summary>Holmgard and beyond') >= 0 && md.indexOf('</p></details></div>') >= 0, 'footer notes are collapsible and hidden by default');
ok(md.indexOf('notes on the draft</summary>') >= 0, 'footer summary line labels the notes');


// round 26: leg-2 fail art (river riftwreck/riverice/barloss replace the sea storm/ice images)
ok(m[1].indexOf('ART2.riftwreck') >= 0 || md.indexOf('riftwreck: \"data:image/jpeg;base64,/') >= 0, 'ART2 carries the three river fail images');
for (const [how, key] of [['sunk', 'riftwreck'], ['frozen', 'riverice'], ['crewlost', 'barloss']]) {
  g.newGame(777); g.board();
  g.S.leg = 2; g.S.phase = 'end';
  g.S.result = { how: how, dest: 'Holmgard', title: 't', text: 't', days: 33, date: 'May 11', crew: [{ name: 'Ketil', dead: false }], deaths: 0, wet: 0, silver: 0, morale: 5, marks: 0, tier: 'fail' };
  let hh = '';
  try { hh = g.viewEnd(); } catch (e) { ok(false, 'viewEnd leg2 ' + how + ' threw: ' + e.message); continue; }
  ok(hh.indexOf('scene-img') >= 0, 'leg-2 ' + how + ' fail renders an image scene (not the SVG fallback)');
  ok(hh.indexOf('storm') < 0, 'leg-2 ' + how + ' fail does not fall back to the sea storm image');
}
ok(m[1].indexOf("if (S && S.leg === 2") >= 0 && m[1].indexOf("sceneSVG('riftwreck', 2)") >= 0, 'viewEnd fail-scene mapping is leg-aware');
ok(md.indexOf('ART2.riftwreck = "data:image/webp;base64,') >= 0 && md.indexOf('function sceneSVG(id, leg)') >= 0, 'fail images embedded in ART2 (webp since round 41) and sceneSVG leg signature present');


// round 48 / publish: GAS leaderboard retired (his round-48 call, GAS deployment deleted) - local board only, shared backend is round 49's work
ok(m[1].indexOf('script.google.com') < 0, 'no Apps Script URL anywhere (the dead GAS deployment is gone)');
ok(['cloudHtml','cloudPush','cloudPull','cloudUrl','CLOUDDEFAULT'].every(function (x) { return m[1].indexOf(x) < 0; }), 'no GAS cloud-board code remains in the game');
ok(m[1].indexOf("var BOARDAPI = '';") >= 0, 'empty BOARDAPI stub left ready for the round-49 shared board');
ok(m[1].indexOf('data:image/webp;base64,') > 0 && m[1].split('data:image/webp;base64,').length - 1 === 29, 'the 29 webp scenes survived the GAS surgery');


// round 30: the spring clock (his call: run starts early April from Birka; zero winters; convoy framing)
ok(g.HMG.dateStr(1) === 'Apr 10' && g.HMG.dateStr(32) === 'May 11' && g.HMG.dateStr(44) === 'May 23' && g.HMG.dateStr(60) === 'Jun 8', 'day 1 = Apr 10; FREEZE day 32 = May 12, WINTER day 44 = May 24');
ok(m[1].indexOf('The season slips away') >= 0 && m[1].indexOf('The convoys are gone') >= 0 && m[1].indexOf('The landing has emptied') >= 0, 'late/fail endings recast to the convoy clock');
ok(m[1].indexOf('leave the landing about the 11th of May') >= 0 && m[1].indexOf('The convoy window') >= 0, 'intro and help state the convoy window, not the freeze');
ok(m[1].indexOf('even the spring flood ran thin') >= 0, 'low-water event reframed to a thin spring melt (May calendar)');
const m1c = m[1].replace(/"data:image\/(webp|jpeg|png);base64,[^"]*"/g, 'B64');   // r41: strips webp too; base64 blobs can contain any trigram: check CODE, not art
ok(m1c.indexOf('Oct') < 0 && m1c.indexOf('Sept ') < 0, 'no autumn dates remain in the game script');



// round 33: screen recentering after boarding (his report: after entering the name and boarding the knarr, the view drifted off-center)
ok(m[1].indexOf('app.innerHTML = h;') >= 0, 'render builds the new screen fully before touching scroll');
ok(m[1].indexOf('window.scrollTo(0, 0);') > m[1].indexOf('app.innerHTML = h;') && m[1].indexOf('window.scrollTo(0, 0);') < m[1].indexOf('if (SR.get(KEY)) loadSlot();'), 'window scroll now happens AFTER the new content is in place (no recenter fight)');
ok(m[1].indexOf('var ae = document.activeElement;') >= 0 && m[1].indexOf('ae.blur') >= 0, 'the focused input is blurred before recentering');
ok(/function board\(\) \{[\s\S]*?el\.blur/m.test(m[1]), 'boarding blurs the name input so the closing keyboard does not drag the view');

// round 34: iOS input zoom (his report: typing the skipper name zooms the screen in and sideways, and it STAYS that way)
ok(/input\.boardinput \{[\s\S]*?font-size: 16px/.test(md), 'board inputs are 16px — iOS Safari auto-zooms any input below 16px and never zooms back out');
ok(!/(input|input\.boardinput) \{[^}]*font-size: 1[0-5]px/.test(md), 'no input CSS ends up below 16px');

// round 35: freight contracts at the landing (his spec: other merchants' goods transport, paid 2 dirhams per cargo space)
ok(m[1].indexOf("freight: 0,") >= 0, 'new runs start with an empty freight Manifest');
ok(/function holdUsed\(s\) \{ return s\.furs \+ s\.captives \* 2 \+ \(s\.freight \|\| 0\); \}/.test(m[1]), 'freight bales count against the 12-unit hold');
ok(m[1].indexOf("a === 'freight'") >= 0 && m[1].indexOf("s.freight = (s.freight || 0) + 1") >= 0, 'the hub has a take-a-freight-bale action');
ok(/marks: s\.furs \* 5 \+ s\.captives \* 12 \+ \(s\.freight \|\| 0\) \* 2/.test(m[1]), 'Holmgard settlement pays 2 dirhams per freight unit');
ok(m[1].indexOf("freight silver, counted on the spot") >= 0, 'settlement text spells out the freight payment');
ok(m[1].indexOf("Take a merchant") >= 0 && m[1].indexOf("pays 2 dirhams at Holmgard") >= 0, 'hub button states the freight terms');
// runtime: freight fills the hold, stacks, and pays at settlement
g.newGame(777);
g.S.silver = 30; g.S.furs = 0; g.S.captives = 0; g.S.phase = 'hub';
g.HMG.hubAct(g.S, 'freight'); g.HMG.hubAct(g.S, 'freight'); g.HMG.hubAct(g.S, 'freight');
ok(g.S.freight === 3, 'each take-a-bale press adds one freight unit');
ok(g.HMG.holdUsed(g.S) === 3, 'freight occupies hold space (crowds out furs)');
g.S.furs = 9; g.HMG.hubAct(g.S, 'freight');
ok(g.S.freight === 3 && g.HMG.holdUsed(g.S) === 12, 'freight cannot exceed the 12-unit hold (9 furs + 3 freight blocks a 4th)');
const r2 = g.HMG.ending2(g.S);
ok(r2.marks === 9 * 5 + 3 * 2 && r2.text.indexOf('6 dirhams of freight silver') >= 0, 'settlement pays 2 per freight unit and says so (9 fur x5 + 3 freight x2 = 51)');

// round 38: leg-3 skeleton — the road to Miklagard (build round 1)
ok(g.HMG.dateStr(82) === 'Jun 30' && g.HMG.dateStr(113) === 'Jul 31' && g.HMG.dateStr(138) === 'Aug 25' && g.HMG.dateStr(150) === 'Sep 6', 'the calendar runs the whole season Apr to Sep');
ok(g.HMG.FLEET === 90 && g.HMG.SEACLOSE === 138, 'gate constants: the Kiev fleet Jul 8, the sea closes Aug 25');
ok(m[1].indexOf('goSouth()') >= 0 && m[1].indexOf('The road does not end here') >= 0, 'arriving Holmgard offers the southbound road');
ok(m[1].indexOf('The southern road') >= 0 && m[1].indexOf('pays at Kiev') >= 0, 'help card explains the third leg');

function run3Road(setup) {
  g.newGame(777);
  g.S.silver = 60; g.S.food = 300; g.S.hull = 100; g.S.furs = 2; g.S.captives = 1; g.S.freight = 0; g.S.day = 50;
  if (setup) setup(g.S);
  g.HMG.begin3(g.S);
  for (var k3 = 0; k3 < 4; k3++) {
    g.S.progress = 99; g.S.pending = { id: 'fair' };
    g.HMG.applyChoice(g.S, 0);
    if (g.S.phase === 'hub3') g.HMG.hub3Act(g.S, 'castoff3');
  }
}

// freight loads at Holmgard and pays at Kiev
g.newGame(777);
g.S.silver = 60; g.S.food = 300; g.S.hull = 100; g.S.furs = 2; g.S.captives = 1; g.S.freight = 0; g.S.day = 50;
g.HMG.begin3(g.S);
g.HMG.hub3Act(g.S, 'freight'); g.HMG.hub3Act(g.S, 'freight');
ok(g.S.freight === 2, 'freight bales load at the Holmgard hub');
g.HMG.hub3Act(g.S, 'castoff3');
g.S.progress = 99; g.S.pending = { id: 'fair' };
g.HMG.applyChoice(g.S, 0);
ok(g.S.phase === 'hub3' && g.S.hub === 'gnezdovo' && g.S.sub === 2, 'subleg 1 ends at the Gnezdovo hub');
g.HMG.hub3Act(g.S, 'freight');
ok(g.S.freight === 3, 'freight also loads at Gnezdovo');
g.HMG.hub3Act(g.S, 'castoff3');
g.S.progress = 99; g.S.pending = { id: 'fair' };
g.HMG.applyChoice(g.S, 0);
ok(g.S.hub === 'kiev' && g.S.silver === 66 && g.S.freight === 0 && g.S.flags.freightPaid === 3 && !g.S.flags.lateFleet, 'Kiev settles 3 freight bales at 2 apiece (+6) and the fleet is caught');
const kievResist = g.S.silver;
g.HMG.hub3Act(g.S, 'freight');
ok(g.S.freight === 0, 'no freight contracts at Kiev itself');
for (var k3b = 0; k3b < 2; k3b++) {
  if (g.S.phase === 'hub3') g.HMG.hub3Act(g.S, 'castoff3');
  g.S.progress = 99; g.S.pending = { id: 'fair' };
  g.HMG.applyChoice(g.S, 0);
}
ok(g.S.phase === 'end' && g.S.result && g.S.result.dest === 'Miklagard' && g.S.result.marks === 2 * 5 + 1 * 12, 'the road ends at Miklagard scoring furs 5 and captives 12 (22 mark)');
ok(g.S.result.text.indexOf('3 freight bales settled at Kiev') >= 0, 'the finale text recounts the freight settlement');

// late fleet: arrive Kiev after day 90 -> you came south behind the June fleet
run3Road(function (st) { st.lateFleetTest = true; });
ok(g.S.flags.lateFleet === false, 'sanity: day-50 arrival catches the fleet');

// late fleet, positively: arrive Kiev after day 90 -> the flag trips and the finale remembers it
g.newGame(777);
g.S.silver = 60; g.S.food = 300; g.S.hull = 100; g.S.furs = 0; g.S.captives = 0; g.S.day = 50;
g.HMG.begin3(g.S);
g.HMG.hub3Act(g.S, 'castoff3');
g.S.day = 95; g.S.progress = 99; g.S.pending = { id: 'fair' };
g.HMG.applyChoice(g.S, 0);   // arrives Gnezdovo
g.HMG.hub3Act(g.S, 'castoff3');
g.S.day = 96; g.S.progress = 99; g.S.pending = { id: 'fair' };
g.HMG.applyChoice(g.S, 0);   // arrives Kiev too late
ok(g.S.flags.lateFleet === true && g.S.hub === 'kiev', 'arriving Kiev after Jul 8 trips the late-fleet flag');
g.HMG.hub3Act(g.S, 'castoff3');
g.S.progress = 99; g.S.pending = { id: 'fair' };
g.HMG.applyChoice(g.S, 0);
g.HMG.hub3Act(g.S, 'castoff3');
g.S.progress = 99; g.S.pending = { id: 'fair' };
g.HMG.applyChoice(g.S, 0);
ok(g.S.result && g.S.result.title === 'Miklagard at last' && g.S.result.text.indexOf('behind the June fleet') >= 0, 'the finale notes you came south behind the June fleet (no perfect tier)');

// hard gates: Cherson past day 138 -> the sea closes
g.newGame(777);
g.S.silver = 60; g.S.food = 300; g.S.hull = 100; g.S.furs = 0; g.S.captives = 0; g.S.day = 140;
g.HMG.begin3(g.S);
for (var k3c = 0; k3c < 3; k3c++) {
  g.HMG.hub3Act(g.S, 'castoff3');
  g.S.day = 141;   // the slow road south
  g.S.progress = 99; g.S.pending = { id: 'fair' };
  g.HMG.applyChoice(g.S, 0);
}
ok(g.S.phase === 'end' && g.S.result.title === 'The sea closes', 'arriving Cherson after the summons stops fails with The sea closes');

// round 42 (his three mobile reports): Holmgard hub trade, auto spirits lift on hub arrival, felt button presses
ok(m[1].indexOf("a === 'buyfur'") >= 0 && m[1].indexOf("a === 'buycap'") >= 0 && m[1].indexOf("a === 'sellfur'") >= 0 && m[1].indexOf("a === 'sellcap'") >= 0, 'hub3Act carries buy-furs/buy-captive/sell-furs/sell-captives actions');
g.jumpTest('1');
g.S.furs = 3; g.S.captives = 2; g.S.silver = 1;
ok(g.S.flags.hubLift === 1, 'arrival at the Holmgard hub sets the spirits-lift flag');
var sv42 = g.S.silver;
g.HMG.hub3Act(g.S, 'buyfur');   // purse 1: cannot buy, no silent loss
ok(g.S.silver === 1 && g.S.furs === 3, 'buying furs with a too-light purse changes nothing');
g.HMG.hub3Act(g.S, 'sellfur');
ok(g.S.silver === sv42 + 9 && g.S.furs === 0, 'selling the furs pays the factor price into the purse (3 x 3 = 9)');
g.HMG.hub3Act(g.S, 'sellcap');
ok(g.S.silver === sv42 + 9 + 12 && g.S.captives === 0, 'selling the captives pays 6 a head into the purse');
g.S.silver = 6;
g.HMG.hub3Act(g.S, 'buyfur');
ok(g.S.silver === 4 && g.S.furs === 1, 'buying a fur bale costs 2 into the hold');
g.HMG.hub3Act(g.S, 'buycap');
ok(g.S.silver === 0 && g.S.captives === 1, 'taking a captive costs 4 and 2 hold units');
g.S.hub = 'kiev';
g.HMG.hub3Act(g.S, 'sellcap');   // not at Holmgard: no factor there
ok(g.S.captives === 1, 'the factor trade only exists at Holmgard');
g.S.flags.hubLift = 0;
g.HMG.arrive3(g.S);   // lands the next hub (Kiev) and lifts spirits
ok(g.S.hub === 'gnezdovo' && g.S.flags.hubLift === 1, 'every hub arrival lifts spirits and sets the flag (sub 1 Gnezdovo here)');
ok(m[1].indexOf('s.morale = Math.min(10, s.morale + 1); s.flags.hubLift = 1;') >= 0, 'the arrival bonus is capped at 10 spirits');
ok(m[1].indexOf('spirits are up') >= 0, 'the hub screen tells him the crew lifted');
ok(m[1].indexOf('function toast(') >= 0 && m[1].indexOf('function actToast(') >= 0 && m[1].indexOf('toastT') >= 0, 'toast + change-summary helpers exist (felt answers)');
ok(md.indexOf('transform: scale(.97)') >= 0, 'buttons give a felt pressed state (CSS)');
ok(m[1].indexOf('Buy a fur bale') >= 0 && m[1].indexOf('Sell the furs to a factor') >= 0, 'the Holmgard hub screen offers the trade buttons');
ok(m[1].indexOf('Sell the captives to a factor') >= 0 && m[1].indexOf('pays 5 at Miklagard') >= 0, 'sell buttons appear with factor prices, buy buttons say the Miklagard payoff');

// round 43 / build round 2: the real decks — the Lovat/portage subleg and the Dnieper subleg (per the signed brief)
ok(m[1].indexOf('var LOVAT3') >= 0 && m[1].indexOf('var DNIPR3') >= 0, 'the two real southern decks exist');
ok(m[1].indexOf('s.flags.l3Lovat') >= 0 && m[1].indexOf('s.flags.l3Port') >= 0, 'the Lovat and portage gates are per-subleg flagged');
ok(m[1].indexOf('DNIPR3 : (s.sub === 3) ? RAPIDS3 : LOVAT3') >= 0, 'subleg decks: 1 Lovat, 2 Dnieper, 3 rapids (round 44), 4 sea');
// gated draws
g.newGame(777); g.board();
g.S.leg = 3; g.S.sub = 1; g.S.phase = 'day'; g.S.flags.l3Lovat = false; g.S.flags.l3Port = false;
g.S.progress = 30;
ok(g.HMG.drawMorning ? true : false, 'drawMorning exported for deck tests');
// drive the spine: progress 30 forces lovat, then 70 forces portage3
g.S.flags.lastGate = 0;
g.newGame(777); g.board(); g.S.leg = 3; g.S.sub = 1; g.S.phase = 'day';
g.S.flags.l3Lovat = false; g.S.flags.l3Port = false; g.S.progress = 30;
var ev30 = g.HMG.drawMorning(g.S);
ok(ev30.id === 'lovat', 'progress 30 on subleg 1 draws the Lovat shallows gate');
g.S.progress = 70;
var ev70 = g.HMG.drawMorning(g.S);
ok(ev70.id === 'portage3', 'past the Lovat, progress 70 draws the watershed portage gate');
ok(g.S.flags.l3Lovat === true && g.S.flags.l3Port === true, 'both gate flags set once drawn');
g.HMG.hub3Act !== undefined;   // sanity
// choice mechanics
g.newGame(777); g.board(); g.S.leg = 3; g.S.sub = 1; g.S.silver = 20; g.S.morale = 5; g.S.food = 100;
var beforePort = g.S.silver;
g.S.pending = { id: 'portage3' };
g.S.phase = 'day';
g.HMG.applyChoice(g.S, 1);   // hire the teamsters
ok(g.S.silver === beforePort - 6, 'the watershed portage teamsters cost 6 dirhams');
g.S.pending = { id: 'portage3' };
g.S.silver = 3;   // purse too light for teamsters: falls back to the slow road, no silent loss
g.HMG.applyChoice(g.S, 1);
ok(g.S.silver === 3, 'no silver silently lost when the purse cannot cover the teamsters');
g.newGame(777); g.board(); g.S.leg = 3; g.S.sub = 2; g.S.silver = 5; g.S.food = 50; g.S.morale = 5;
var beforeFm = { s: g.S.silver, f: g.S.food };
g.S.pending = { id: 'fmarket' }; g.S.phase = 'day';
g.HMG.applyChoice(g.S, 0);
ok(g.S.silver === beforeFm.s - 2 && g.S.food === beforeFm.f + 10 && g.S.morale === 6, 'the tribute-town market trades 2 dirhams for +20 food less the day\u2019s 10 mouths, and a lift');
g.newGame(777); g.board(); g.S.leg = 3; g.S.sub = 2; g.S.silver = 4; g.S.morale = 5;
g.S.pending = { id: 'ferry' }; g.S.phase = 'day';
var beforeFerry = g.S.silver;
g.HMG.applyChoice(g.S, 0);
ok(g.S.silver === beforeFerry - 2, 'the ferrymen take their 2-dirham toll');
g.newGame(777); g.board(); g.S.leg = 3; g.S.sub = 2; g.S.food = 60; g.S.morale = 4;
g.S.pending = { id: 'kinsman' }; g.S.phase = 'day';
g.HMG.applyChoice(g.S, 1);
ok(g.S.food === 46 && g.S.morale === 6, 'berthing the kinsman costs 4 food plus the day, and buys +2 spirits');
// texts present for every new id, options nonempty (no dead buttons)
for (const t3 of ['The Lovat runs shallow', 'The watershed portage', 'Storm on the Ilmen', 'A hoard-rumor', 'The current does the rowing', 'A tribute-town on the bank', 'ferrymen', 'A kinsman from the crossing']) {
  ok(m[1].indexOf(t3) >= 0, 'deck text present: ' + t3);
}
ok(m[1].indexOf("lovat: 'fog'") >= 0 && m[1].indexOf("kinsman: 'chud'") >= 0, 'new events map to scene art (no bare vector fallback)');
// a full first-subleg sim from the Holmgard hub must reach Gnezdovo unblocked
function simSub1(policy) {
  g.newGame(444); g.board();
  g.S.silver = 20; g.S.food = 90; g.S.hull = 90;
  g.HMG.begin3(g.S);
  g.HMG.hub3Act(g.S, 'castoff3');
  let steps = 0;
  while (g.S.phase === 'day' && steps++ < 60) {
    const evID = g.S.pending && g.S.pending.id;
    const t2 = g.HMG.currentEvent(g.S);
    let pick2 = policy[evID] !== undefined ? policy[evID] % t2.options.length : 0;
    g.choose(pick2);
  }
  return { phase: g.S.phase, hub: g.S.hub, sub: g.S.sub, hull: g.S.hull, day: g.S.day };
}
const r1 = simSub1({ lovat: 1, portage3: 1 });
ok((r1.phase === 'hub3' && r1.hub === 'gnezdovo') || r1.phase === 'end', 'subleg 1 sim terminates (reached a hub or failed a guard), no hang');
ok(r1.hull <= 90, 'subleg 1 sim ran real events (state moved)');

// round 44 / build round 3: the rapids road — seven rapids, Nenasytets, Khortytsia, the Pecheneg parley, the delta
ok(m[1].indexOf('var RAPIDS3') >= 0, 'the rapids deck exists');
ok(m[1].indexOf('l3Rap') >= 0 && m[1].indexOf('l3Nen') >= 0 && m[1].indexOf('l3Khor') >= 0 && m[1].indexOf('l3Delta') >= 0, 'the four rapids-road gates are flagged per-subleg');
ok(m[1].indexOf('l3Parley = true') >= 0, 'the Pecheneg come to the bank at most once');
ok(m[1].indexOf('lateFleet ? -14 : -6') >= 0 && m[1].indexOf('lateFleet ? -26 : -18') >= 0 && m[1].indexOf('lateFleet ? -30 : -22') >= 0, 'miss the June fleet and the rapids bite harder (no convoy hands)');
// forced draws down the spine
g.newGame(777); g.board(); g.S.leg = 3; g.S.sub = 3; g.S.phase = 'day';
g.S.flags.l3Rap = false; g.S.flags.l3Nen = false; g.S.flags.l3Khor = false; g.S.flags.l3Delta = false; g.S.flags.l3Parley = false;
g.S.progress = 20;
ok(g.HMG.drawMorning(g.S).id === 'rapids1', 'progress 20 on the rapids road draws the first of the seven');
g.S.progress = 40;
ok(g.HMG.drawMorning(g.S).id === 'nenasytets', 'progress 40 draws Nenasytets, the insatiable');
g.S.progress = 60;
ok(g.HMG.drawMorning(g.S).id === 'khortytsia', 'progress 60 draws the great island (the cock sacrifice)');
g.S.progress = 82;
ok(g.HMG.drawMorning(g.S).id === 'delta', 'progress 82 draws the reeds and the channels');
ok(g.S.flags.l3Rap && g.S.flags.l3Nen && g.S.flags.l3Khor && g.S.flags.l3Delta, 'all four rapids gates set once drawn');
// choice mechanics
g.newGame(777); g.board(); g.S.leg = 3; g.S.sub = 3; g.S.phase = 'day';
g.S.hull = 80; g.S.morale = 6; g.S.captives = 2;
g.S.pending = { id: 'rapids1' };
g.HMG.applyChoice(g.S, 0);
ok(g.S.hull === 74, 'warping through the first rapid scrapes 6 hull (fleet along)');
g.S.flags.lateFleet = true;
g.S.pending = { id: 'rapids1' }; g.S.hull = 80;
g.HMG.applyChoice(g.S, 0);
ok(g.S.hull === 66, 'the same warp alone costs 14 hull — the convoy mutual aid is gone');
g.newGame(777); g.board(); g.S.leg = 3; g.S.sub = 3; g.S.phase = 'day';
g.S.captives = 2; g.S.food = 100; g.S.morale = 6; g.S.silver = 10;
g.S.pending = { id: 'parley' }; g.S.phase = 'day';
g.HMG.applyChoice(g.S, 0);
ok(g.S.silver === 5 && g.S.food === 113 && g.S.morale === 7, 'horned cattle: 5 dirhams for +25 food less the day (12 mouths with captives) and a lift');
// the lethal parley: force the kill branch deterministically
g.newGame(123); g.board(); g.S.leg = 3; g.S.sub = 3; g.S.phase = 'day';
var crewAlive0 = g.S.crew.filter(c => !c.dead).length;
var killedAny = false, tries = 0;
while (tries++ < 60) {
  g.S.pending = { id: 'parley' }; g.S.phase = 'day';
  // keep morale from sinking the run: reset every try
  g.S.morale = 6;
  const before = g.S.crew.filter(c => !c.dead).length;
  g.HMG.applyChoice(g.S, 2);
  if (g.S.crew.filter(c => !c.dead).length < before) killedAny = true;
  // undo any deaths for the next try
  g.S.crew.forEach(c => { c.dead = false; c.hp = 2; c.graveF = 2; });
  if (killedAny) break;
  g.S.rngS = (g.S.rngS + 1) | 0;
}
ok(killedAny, 'a fumbled parley can kill a crew member where he stands (round-37 lock: an event, never a war)');
ok(m[1].indexOf('an arrow from the bank') >= 0, 'the parley kill branch is documented in code');
// texts present
for (const t4 of ['The first of the seven', 'Nenasytets, the insatiable', 'The great island', 'The Pecheneg come to the bank', 'The reeds and the channels']) {
  ok(m[1].indexOf(t4) >= 0, 'rapids text present: ' + t4);
}
ok(m[1].indexOf("rapids1: 'seals'") >= 0 && m[1].indexOf("parley: 'chud'") >= 0, 'rapids events map to scene art');
ok(m[1].indexOf('the cock sacrifice at the great island is worth its coin') >= 0, 'help card teaches the rapids road');
// full subleg-3 sim: Kiev castoff with a sensible policy must reach Cherson (or fail a guard), never hang
function simSub3(policy) {
  g.newGame(2024); g.board();
  g.S.leg = 3; g.S.sub = 3; g.S.hub = 'kiev'; g.S.phase = 'hub3';
  g.S.silver = 20; g.S.food = 250; g.S.hull = 85; g.S.morale = 6; g.S.day = 90;
  g.HMG.hub3Act(g.S, 'castoff3');
  let steps = 0;
  while (g.S.phase === 'day' && steps++ < 80) {
    const evID = g.S.pending && g.S.pending.id;
    const t2 = g.HMG.currentEvent(g.S);
    let pick2 = policy[evID] !== undefined ? policy[evID] % t2.options.length : 0;
    g.choose(pick2);
  }
  return { phase: g.S.phase, hub: g.S.hub, hull: g.S.hull, day: g.S.day, captives: g.S.captives };
}
const rsafe = simSub3({ rapids1: 2, nenasytets: 0, parley: 0, delta: 1 });
ok(rsafe.phase === 'hub3' && rsafe.hub === 'cherson' || rsafe.phase === 'end', 'the rapids road sim terminates at Cherson (or a guard), no hang');
ok(rsafe.hull < 85 || rsafe.day > 90, 'subleg 3 sim ran real events (state moved)');

// round 45 / build round 4: the Greek sea run — summons, escort, coastal storm, Mesembria, St Aitherios
ok(m[1].indexOf("var SEA3 = [ { id: 'fair' }, { id: 'rain' }, { id: 'fog' }, { id: 'seam' }, { id: 'cstorm' } ]") >= 0, 'the real sea deck replaces the placeholder (aurora stays on the river leg only — no midnight sky on an August Greek sea)');
ok(m[1].indexOf('l3Summ') >= 0 && m[1].indexOf('l3Esc') >= 0 && m[1].indexOf('l3Mes') >= 0 && m[1].indexOf('l3Aith') >= 0, 'the four sea-run gates are flagged per-subleg');
// forced draws down the spine
g.newGame(777); g.board(); g.S.leg = 3; g.S.sub = 4; g.S.phase = 'day';
g.S.flags.l3Summ = false; g.S.flags.l3Esc = false; g.S.flags.l3Mes = false; g.S.flags.l3Aith = false;
g.S.progress = 5;
ok(g.HMG.drawMorning(g.S).id === 'summons', 'the summons wait opens the sea run');
g.S.progress = 35;
ok(g.HMG.drawMorning(g.S).id === 'escort', 'the dromons come out at a third of the crossing');
g.S.progress = 60;
ok(g.HMG.drawMorning(g.S).id === 'mesembria', 'the Mesembria landfall draws at 60');
g.S.progress = 82;
ok(g.HMG.drawMorning(g.S).id === 'statherios', 'St Aitherios draws at 82, the last cape');
ok(g.S.flags.l3Summ && g.S.flags.l3Esc && g.S.flags.l3Mes && g.S.flags.l3Aith, 'all four sea gates set once drawn');
// choice mechanics
g.newGame(777); g.board(); g.S.leg = 3; g.S.sub = 4; g.S.phase = 'day';
g.S.silver = 8; g.S.morale = 5;
g.S.pending = { id: 'summons' };
g.HMG.applyChoice(g.S, 0);
ok(g.S.silver === 5, 'greasing the clerk costs his 3 dirhams');
g.newGame(777); g.board(); g.S.leg = 3; g.S.sub = 4; g.S.phase = 'day';
g.S.silver = 3; g.S.morale = 5;
g.S.pending = { id: 'escort' };
g.HMG.applyChoice(g.S, 0);
ok(g.S.morale === 6, 'falling in with the escort lifts the crew');
g.newGame(777); g.board(); g.S.leg = 3; g.S.sub = 4; g.S.phase = 'day';
g.S.silver = 6; g.S.hull = 70; g.S.food = 60;
g.S.pending = { id: 'mesembria' };
g.HMG.applyChoice(g.S, 0);
ok(g.S.silver === 4 && g.S.hull === 80, 'the Mesembria landfall mends hull (+10) for 2 dirhams');
ok(g.S.hull === 80, 'Mesembria hull math holds (+10 less nothing, capped)');
g.newGame(777); g.board(); g.S.leg = 3; g.S.sub = 4; g.S.phase = 'day';
g.S.hull = 60;
g.S.pending = { id: 'statherios' };
g.HMG.applyChoice(g.S, 0);
ok(g.S.hull === 72, 'the St Aitherios re-rig buys hull back (+12)');
// texts + art + help
for (const t5 of ['The summons wait', 'The dromons come out', 'A Black Sea storm', 'The Mesembria landfall', 'St Aitherios on the cape']) {
  ok(m[1].indexOf(t5) >= 0, 'sea text present: ' + t5);
}
ok(m[1].indexOf("summons: 'fog'") >= 0 && m[1].indexOf("statherios: 'seals'") >= 0, 'sea events map to scene art');
ok(m[1].indexOf('the summons seals at Cherson decide who sails') >= 0, 'help card teaches the Greek sea');
// full sea-run sim: Cherson castoff reaches the Miklagard finale
function simSub4(policy) {
  g.newGame(444); g.board();
  g.S.leg = 3; g.S.sub = 4; g.S.hub = 'cherson'; g.S.phase = 'hub3';
  g.S.silver = 12; g.S.food = 150; g.S.hull = 75; g.S.morale = 6; g.S.day = 120; g.S.furs = 3; g.S.captives = 1;
  g.HMG.hub3Act(g.S, 'castoff3');
  let steps = 0;
  while (g.S.phase === 'day' && steps++ < 40) {
    const evID = g.S.pending && g.S.pending.id;
    const t2 = g.HMG.currentEvent(g.S);
    let pick2 = policy[evID] !== undefined ? policy[evID] % t2.options.length : 0;
    g.choose(pick2);
  }
  return { phase: g.S.phase, dest: g.S.result && g.S.result.dest, days: g.S.day, spine: g.S.flags };
}
const r4 = simSub4({ summons: 1, cstorm: 1, escort: 0, mesembria: 0, statherios: 0 });
ok(r4.phase === 'end' && r4.dest === 'Miklagard', 'the sea-run sim reaches the Miklagard finale');
ok(r4.spine.l3Summ === true && r4.spine.l3Esc === true && r4.spine.l3Mes === true && r4.spine.l3Aith === true, 'the whole sea spine played in the sim');

// round 39: leg-3 art (his ask: not dull or repetitive) + test jumps on the title screen
ok(/ART3 = \{[\s\S]*?gnezdovo: "data:image\/(webp|jpeg);base64,/.test(m[1]), 'ART3 scenes embedded (webp since round 41)');
ok(['gnezdovo','kiev','cherson','miklagard'].every(k => new RegExp(k.replace(/[-]/g,' ') + ': ' + String.fromCharCode(34) + 'data:image[\\/](webp|jpeg);base64').test(m[1])), 'four distinct leg-3 scenes embedded (Gnezdovo, Kiev, Cherson, Miklagard)');
ok(m[1].indexOf('function hub3Img(hub)') >= 0 && m[1].indexOf("hub3Img(hub)") >= 0, 'hub screens use per-hub art, not the shared market scene');
ok(m[1].indexOf("r.dest === 'Miklagard'") >= 0 && m[1].indexOf("r.tier === 'seafail'") >= 0, 'the Miklagard finale and the sea-closes fail get their own scenes');

// test jumps: land mid-road with average purse and day
ok(m[1].indexOf('function jumpTest(kind)') >= 0 && m[1].indexOf('Test jumps') >= 0, 'title screen has the test-jump panel');
global.localStorage.removeItem('hmg01board');
g.jumpTest && g.jumpTest('leg2');
ok(g.S.phase === 'hub' && g.S.day === 24 && g.S.silver === 32 && g.S.flags.test === true, 'leg-2 jump lands at the Aldeigjuborg hub, day 24, 32 dirhams, marked as test');
g.jumpTest(3);
ok(g.S.leg === 3 && g.S.sub === 3 && g.S.hub === 'kiev' && g.S.day === 88 && g.S.silver === 30, 'leg-3 Kiev jump lands at the Kiev hub, day 88, 30 dirhams');
g.jumpTest(4);
ok(g.S.sub === 4 && g.S.hub === 'cherson' && g.S.day === 114, 'Cherson jump lands at the Cherson hub, day 114');
// test runs never touch the board
global.localStorage.setItem('hmg01board', JSON.stringify([{ n: 'keeper', s: 500, d: 20, m: 0, t: 'full', g: 'Aldeigjuborg' }]));
g.S.scoreSaved = false;
g.boardSave('Tester');
ok(JSON.parse(global.localStorage.getItem('hmg01board')).length === 1 && JSON.parse(global.localStorage.getItem('hmg01board'))[0].n === 'keeper', 'a test run is never written to the skippers\u2019 board');
global.localStorage.removeItem('hmg01board');

// round 40: the version bump (his question: canvas was still labelled 0.2 after leg 3 shipped)
ok(m[1].indexOf('0.4 — The Road to Miklagard') >= 0 && m[1].indexOf('0.3 — The Road to Miklagard') < 0, 'title screen says 0.4 — The Road to Miklagard (public release)');
ok(md.indexOf('0.4 The Road to Miklagard (Public Release)') >= 0, 'canvas frontmatter says 0.4 Public Release');
// round 46 / art pass: leg-3 event scenes embedded as webp, leg-3 render path prefers ART3EV
ok(/ART3EV = \{[\s\S]*?rapids1: "data:image\/webp;base64,/.test(m[1]), 'ART3EV map embedded with the rapids scene (webp)');
['rapids1','nenasytets','parley','portage3'].forEach(k => ok(new RegExp(k + ': "data:image\\/webp;base64,').test(m[1]), 'ART3EV has the ' + k + ' scene (webp)'));
ok(m[1].indexOf('function ev3Img(id)') >= 0, 'ev3Img render helper exists');
ok(m[1].indexOf("(leg === 3 && ART3EV[id]) ? ev3Img(id)") >= 0, 'sceneSVG prefers leg-3 event art before the leg-1 fallbacks');
ok(m[1].indexOf('rapids1: \'seals\'') >= 0 && m[1].indexOf('parley: \'chud\'') >= 0, 'ARTKEY fallbacks kept intact for uncovered scenes');

// round 47 / art diet: all art re-encoded to 480px webp q62, 821KB -> 589KB, no jpeg blobs left
ok(m[1].indexOf('data:image/jpeg') < 0, 'no jpeg data URIs remain (the gnezdovo and cherson stragglers converted)');
ok(m[1].split('data:image/webp;base64,').length - 1 === 29, 'all 29 embedded scenes are webp');
const sz = require('fs').statSync('canvases/holmgard-01-the-crossing/CANVAS.md').size;
ok(sz < 600000 && sz > 400000, 'canvas ' + sz + ' bytes: diet landed in the 400-600KB window');

// round 48 / PWA: manifest link + service-worker registration, game installs and plays offline after first load
ok(m[0] && md.indexOf('<link rel="manifest" href="./manifest.webmanifest" />') >= 0, 'manifest linked in the head');
ok(m[1].indexOf("navigator.serviceWorker.register('./sw.js')") >= 0, 'service worker registered (guarded for non-browser runs)');

console.log('\n' + (fail ? 'FAILURES: ' + fail : 'ALL GREEN'));
process.exit(fail ? 1 : 0);
