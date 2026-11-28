# Holmgard — Trading Design Brief (v1 DRAFT, for his sign-off)
Status: DRAFT — awaiting his verdicts on open calls T1–T6. Scope agreed: A+B+C+D all in; lands AFTER the Baghdad branch, as its own round. Nothing here touches code until signed.

## Locked constraints (standing design rules this brief must obey)
- **Survival stays the core; trading is a survival means, not a profit engine** (Nov 19 reframe). No mechanic may make silver the win condition; the score already weights silver, so every new money source needs a survival cost or a decision attached.
- **Plain-language rule**: every tradeoff spelled out in everyday words, mechanical effect in brackets. Period flavor in narration only.
- **Provenance labels**: no prices are attested anywhere (Run 13: "prices: none attested at ANY hub for anything"). All prices stay design-tuned with the footer saying so; news/rumor is invention flagged as such.
- **One purse, one decision window per hub** (round-15/21 rule): all new trade actions live inside the existing hub screens; no separate trading UI layer.
- **Board and score economy**: greek pays net +3/+60 score per unit; a fur is still net +3/+60 but needs capital. New cargos must not exceed the Miklagard payoff ladder (furs 5, captives 12) or holding cargo stops being the prosperity play.

## Diagnosis (why trading reads light today)
1. Prices are fixed, public, printed on the buttons: buy 2 / sell 5 is on the help card. No surprise survives the first run.
2. The merchant's real craft is missing: our own research (Runs 12–15) says the historical skill was information and social access — road news, who's buying, tolls, where the court is. None of it is in the game.
3. One visit per hub means no market-learning arc; news bought upstream can't inform a purchase downstream.

## A. Road news as trade intelligence
- Extend the existing news items (bank-road news at Gnezdovo, the Chud kinsman's news-for-a-dirham): some items now carry TRADE meaning.
- Items come in two grades: SOLID (names a number or a fact: "the fleet factor is paying 4 for furs this year, not 3") and RUMOR ("they say the Greek factor's hold is nearly full"). Rumors are true most of the time but can be wrong — buying the rumor and acting on it is the player's risk.
- News is paid for (1 dirham) or earned via the kinsman/factor relationships; it can also arrive FREE but STALE (news from upriver describes last month's market).
- Implementation: text events + a small price-modifier table; zero new mechanics classes.

## B. Prices that move with the season and the world
- Factor prices drift by ARRIVAL DATE and WORLD STATE, not by player action:
  - Kiev fleet factor: best terms inside the June fleet window, worse after (the buyer knows you're desperate — plain-language label "he knows the fleet is gone").
  - Cherson greek price: rises as the sea-closing deadline nears ( sellers thin out ), capped so the finale ladder survives.
  - GLUT/SHORTAGE events, world-seeded per run: a Volga caravan flooded the fur market at Kiev; a bad year for hides at Cherson. One seeded drift per hub per run, hidden until arrival; news items (A) can reveal them early — A and B feed each other.
- Every printed price on a button shows the number that applies NOW; the drift deltas are printed in the same plain style ("+1 — the fleet is in").

## C. More cargo, hub-specialized
- Candidate palette (research-anchored specialties, prices design-tuned):
  - WAX and HONEY (Gnezdovo/Kiev belt — Run 13/14 documented chain into Cherson), 1 hold unit, modest payoff.
  - BEADS (Holmgard/Kiev; Run 15: glass moves north mainly as beads/culpt; the parked bead-stock idea can ride here), 0 hold units? No: 1 unit, cheap, low payoff — the "small change" cargo.
  - SWORDS (Holmgard factor, Run 15 documented: Rus sell swords southbound; legality flavor at Cherson — the kommerkion asks).
  - SALT (bought at Cherson toward home... one-way run: salt goes ON the southern leg as trade TO Cherson? Cherson has salt works — salt is a CHERSON good; on a one-way run it can only be freight or a red-sell to the fleet factor).
  - ISINGLASS (Itil — the one uniquely Khazar export; goes in the Baghdad branch palette, listed here so the system is designed with it in mind).
- Rules for new cargo: max value stays under the fur/captive ladder; each new good must create a HOLD CONFLICT or a CASH-FLOW choice the existing goods don't; none may have a same-hub sell (round-53 loop rule).
- Design-tuned pricing note per Run 8: pelt ~2–2.5 dirhams band is our only anchor; keep the ladder internally consistent rather than historically claimed.

## D. Credit and time-sensitive contracts
- FREIGHT+ (extends the working freight system): time-sensitive contracts — standard 2/unit, or 3–4/unit if delivered by the fleet window (plain label: "pays double if you sail with the fleet — the buyer won't wait"); miss the window, pay drops to 1. Silver becomes a SCHEDULE decision.
- CREDIT: "buy now, pay at settlement" at the Holmgard factor only, small cap (one bale), plain-language terms; if the run fails before settlement the debt dies with it (fail states must not gain a debt-collection mechanic). Optional flavor: a creditor's agent at Kiev asks after it (morale hit, no money).
- NO moneylending system (Run 14 explicitly rejected moneylending for 911; credit stays a single named factor's arrangement, flagged reconstruction).

## East-road fit (added after round 57 shipped)
The Baghdad branch is now live and its Bulgar market already IS a seasonal-price structure: sales eat days, the ruler's tenth bites, the day-135 gate sets a lesser ending. The trading round must treat the two roads as ONE economy — arm B's drift applies east too (e.g. Bulgar terms worsen past the gate), arm C's isinglass lands at Itil, arm D's time-contracts get an east twin (Freight+ delivering by the Bulgar window). Nothing in this brief may break the round-57 fork guards or the east endings.

## What this brief does NOT include (ranked and parked)
- Haggle events with named merchants (E): most text-expensive, least evidence-anchored; revisit only if A–D feel thin after play.
- Player-caused price impact (selling 10 furs crashes the fur price): wrong fit for one-visit hubs.
- Any change to the finale payout ladder.

## Open calls for him
- T1: Rumor reliability: how often may a RUMOR be wrong? (rec: 1 in 4)
- T2: Glut/shortage drift size: (rec: ±1 dirham on the hub's main good)
- T3: Cargo palette for round 1: (rec: wax at Gnezdovo + beads at Kiev first, swords later, isinglass with Baghdad)
- T4: Freight+ bonus window: fleet-only (rec) or a second deadline at Cherson?
- T5: Credit cap: 1 bale at Holmgard (rec) or skip credit entirely?
- T6: News cost: flat 1 dirham per item (rec) or free-but-stale by default with paid-fresh news?

## Evidence footnotes
- Runs 12–15 (research-digests.md): socially mediated trade, no attested prices, news-and-access as the merchant skill, isinglass as unique Khazar export, beads moving north as glass, DAI ch.6 Cherson goods list.
- Run 8: pelt price band, sorochok as design-space accounting unit (squirrel stays color; numbers stay dirhams per his Nov 27 rule).
- Run 14: furs-as-money at Novgorod — supports squirrel flavor, prices stay dirham-denominated in UI.
