# Friday Proof — Black Friday Deal Finder

32 real Black Friday 2026 deals, each price-checked on Fri 27 Nov 2026 at its
store (Amazon, Best Buy, Walmart, Target, Disney+), with sale price, the
store's "was" price, the 90-day typical street price and the prior low — plus
a price-proof bar on every card, an honest verdict per deal, and a fake-
markdown detector: **all-time low** (5), **strong deal** (18), **routine
sale** (5) or **skip — inflated was** (4), each with one line of evidence and
a one-line proof note.

## What changed in v2 (round 2 resubmit)

- 23 → 32 deals: 9 added (AirPods 4, Watch SE 3, two Kindles, Roku stick,
  and the 4 flagged skips: Dyson Supersonic, Samsung 75" Crystal UHD, Ninja
  CREAMi, AirPods Max 2). Three v1 "strong" deals promoted to all-time low
  (Switch 2 bundle, Dyson Airwrap, Beats Studio Pro) — each beats its prior
  low on the price record.
- Price-proof bar (pure inline SVG) on every card and detail page: sale
  price plotted against the typical street price, the prior low and the
  retailer's "was" price, with the % below typical in high contrast.
- Fourth verdict: **skip — inflated was**, with a red card style and a
  "Was price inflated" badge; its own filter chip with live counts.
- KPI strip now shows real savings vs typical street price ($1,857) and the
  fake "was" markups flagged (4). Sorting is by verdict strength, % below
  typical, or biggest real saving — never by the inflated "was" discount.
- "Check your own deal" (`#/check`): a static calculator that runs the same
  verdict test on any three prices, with the same SVG proof bar.
- Sub-pages (deal, compare, check, how) use a compact header so their
  content starts at the top of the viewport.

## What it does

- Dense deal grid with working search (live, keeps focus), filters by
  category / store / cut-vs-typical / verdict (with live counts), and sorting
  (verdict strength, % below typical, biggest real saving, lowest/highest
  price). Filter state lives in the URL hash, so any filtered view is a
  shareable link.
- Price-proof bar on every card and detail page: a pure-SVG range that plots
  the sale price against the typical street price, the prior low and the
  retailer's "was" price, with the % below typical in high contrast — never
  vs the inflated "was".
- Deal detail pages (`#/deal/<id>`) with the full receipt (sale, "was",
  typical, prior low, real saving), a same-product cross-store price where
  one exists, and more deals in the same category.
- Fake-markdown detector: the Skip / Inflated filter shows the 4 deals whose
  "sale" price is just the ordinary street price with an inflated "was".
- "Check your own deal" (`#/check`): a static calculator — enter a sale
  price, a claimed "was" price and the usual price, and get an instant
  Friday Proof verdict with the same SVG price bar. 100% static JS, no
  network.
- Compare tool: pick up to 3 deals, see them side by side
  (`#/compare?a=..&b=..&c=..`), including typical prices and prior lows.
- "How we check" page (`#/how`): methodology, the four verdicts, the price
  proof, and the full source list.
- Zero network requests: all deals, CSS and JS ship under `app/`. No images —
  card art is pure CSS, charts are inline SVG.

## Run it

```sh
python3 -m http.server 8000 --directory app
# open http://localhost:8000/
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` + `screenshots/` to the output dir and writes
`dossier.json` via the kit's `vendor/makefun-frontend.ts` (unchanged).

## Screenshots

`shots.json` lists the four shots: hero + proof stats + verdict filter bar
(cover), AirPods Pro 3 detail with the SVG price-proof bar, the Skip /
Inflated fake-markdown view, and the Deal Math Checker on a 390×844 phone.
