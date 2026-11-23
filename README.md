# Holmgard and Beyond

Viking merchant-crew route-survival game, 911/912 AD (Oregon Trail structure): Birka to the river routes east. One-way trip per the round-10 decision.

## Status

**0.1 "The Crossing" (ADOPTED, Nov 23, 2026)** in `prototype/0.1-the-crossing/index.html` — Birka to Aldeigjuborg core loop: one leg, one market, one death chain. Ship canon = Aifur-class (9.5 m) with knarr for the open Baltic. Company of ten (skipper + 9 named crew). Deaths cost speed (~10% each), rations scale with living crew, replacements hireable at markets (5 marks). Score + skippers’ board persisted in the save slot.

## Layout

- `prototype/` — playable builds (single-file HTML, the canvas source)
- `knowledge/` — project decisions (KNOWLEDGE.md), research digests and reports
- `tools/` — headless verification scripts (node; execute the page script with DOM stubs)

## Verify

Run the regression suites from the repo root:

```bash
node tools/verify-score.js && node tools/verify-wired.js && node tools/verify-death.js && node tools/sweep9.js
```

Anchors: careful seed 777 = Full settlement day 22, score 4,620; neglect = Halfr lost, Weighted scales 20.

## Conventions

- Plain-language rule: every player choice spells out its tradeoff in everyday words, mechanical effect in brackets.
- Art: full-res masters live in the Drive folder; 520px versions embedded in builds.
- Decisions log: `knowledge/holmgard-game/KNOWLEDGE.md` is the source of truth.
