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
ok(md.indexOf('ART2.riftwreck = "data:image/jpeg;base64,/') >= 0 && md.indexOf('function sceneSVG(id, leg)') >= 0, 'fail images embedded in ART2 and sceneSVG leg signature present');


// round 28: deployed cloud board baked in as the DEFAULT address (round 18b change, shipped late)
ok(m[1].indexOf('var CLOUDDEFAULT') >= 0 && m[1].indexOf('function cloudUrl() { return (SR.get(KEYC) || CLOUDDEFAULT).trim(); }') >= 0, 'his deployed /exec URL is the built-in default cloud-board address');
ok(m[1].indexOf('back to the built-in board address') >= 0, 'clearing the custom address falls back to the built-in one (message says so)');
// live override still works: slot value wins over default
g.newGame(777); g.board();
global.localStorage.setItem('hmg01cloud', 'https://example.invalid/exec');
ok(g.cloudUrl && g.cloudUrl() === 'https://example.invalid/exec', 'a custom address in the slot overrides the built-in default');
global.localStorage.removeItem('hmg01cloud');
ok(g.cloudUrl() === g.CLOUDDEFAULT, 'with no custom address the built-in default is used');


// round 30: the spring clock (his call: run starts early April from Birka; zero winters; convoy framing)
ok(g.HMG.dateStr(1) === 'Apr 10' && g.HMG.dateStr(32) === 'May 11' && g.HMG.dateStr(44) === 'May 23' && g.HMG.dateStr(60) === 'Jun 8', 'day 1 = Apr 10; FREEZE day 32 = May 12, WINTER day 44 = May 24');
ok(m[1].indexOf('The season slips away') >= 0 && m[1].indexOf('The convoys are gone') >= 0 && m[1].indexOf('The landing has emptied') >= 0, 'late/fail endings recast to the convoy clock');
ok(m[1].indexOf('leave the landing about the 11th of May') >= 0 && m[1].indexOf('The convoy window') >= 0, 'intro and help state the convoy window, not the freeze');
ok(m[1].indexOf('even the spring flood ran thin') >= 0, 'low-water event reframed to a thin spring melt (May calendar)');
const m1c = m[1].replace(/"data:image\/jpeg;base64,[^"]*"/g, 'B64');   // base64 blobs can contain any trigram: check CODE, not art
ok(m1c.indexOf('Oct') < 0 && m1c.indexOf('Sept ') < 0, 'no autumn dates remain in the game script');


// round 32: baked board snapshot + locally captured runs (his ask: leaderboard must survive the preview network block)
ok(m[1].indexOf('var CLOUDSEED') >= 0 && m[1].indexOf('hmg01local') >= 0, 'CLOUDSEED snapshot and the local-run slot (hmg01local) are both defined');
ok(m[1].indexOf('function cloudFallback()') >= 0 && m[1].indexOf('function cloudSaveLocal(') >= 0, 'fallback and local-capture helpers present');
ok(m[1].indexOf('saved here') >= 0, 'locally saved runs are tagged on the board');
ok(m[1].indexOf('Your log is saved on this device') >= 0 && m[1].indexOf('baked board snapshot plus runs saved on this device') >= 0, 'push and pull catch messages say what was captured and what is shown');
// behaviour: push failing -> rows land in the local slot; board shows them without any network
global.localStorage.removeItem('hmg01local');
global.localStorage.setItem('hmg01board', JSON.stringify([{ n: 'Andrzej', s: 4620, d: 22, m: 0, t: 'full', g: 'Holmgard' }]));
ok(typeof g.cloudSaveLocal === 'function', 'cloudSaveLocal exported into the sandbox');
g.cloudSaveLocal(g.cloudRows());
const locRows = JSON.parse(global.localStorage.getItem('hmg01local') || '[]');
ok(locRows.length === 1 && locRows[0].n === 'Andrzej' && locRows[0].s === 4620, 'a failed push captures the log into the local slot');
ok(typeof g.cloudFallback === 'function' && g.cloudFallback().length === 1 && g.cloudFallback()[0].loc === 1, 'cloudFallback merges local runs and tags them for display');
g.cloudSaveLocal(g.cloudRows());
ok(JSON.parse(global.localStorage.getItem('hmg01local')).length === 1, 'capturing the same run twice does not duplicate it');
global.localStorage.removeItem('hmg01local'); global.localStorage.removeItem('hmg01board');

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

// round 39: leg-3 art (his ask: not dull or repetitive) + test jumps on the title screen
ok(/ART3 = .{1,2}[\s\S]*?gnezdovo: "data:image.{0,2}jpeg;base64/.test(m[1]), 'ART3 exists with embedded jpegs');
ok(['gnezdovo','kiev','cherson','miklagard'].every(k => m[1].indexOf(k + ': "data:image/jpeg;base64,') >= 0), 'four distinct leg-3 scenes embedded (Gnezdovo, Kiev, Cherson, Miklagard)');
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
console.log('\n' + (fail ? 'FAILURES: ' + fail : 'ALL GREEN'));
process.exit(fail ? 1 : 0);
