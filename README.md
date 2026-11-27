# Friday Proof — Black Friday Deal Finder

23 real Black Friday 2026 deals, each price-checked on Fri 27 Nov 2026 at its
store (Amazon, Best Buy, Walmart, Target, Disney+), with sale price, usual
price, discount, store link, check time, source — and an honest verdict per
deal: **new low** (2), **strong deal** (19) or **routine sale** (2), each with
one line of evidence.

## What it does

- Dense deal grid with working search (live, keeps focus), filters by
  category / store / discount band / verdict, and sorting (biggest discount,
  biggest $ saved, lowest/highest price). Filter state lives in the URL hash,
  so any filtered view is a shareable link.
- Deal detail pages (`#/deal/<id>`) with the full receipt, a same-product
  cross-store price where one exists, and more deals in the same category.
- Compare tool: pick up to 3 deals, see them side by side
  (`#/compare?a=..&b=..&c=..`).
- "How we check" page (`#/how`): methodology, verdict definitions, and the
  full source list.
- Zero network requests: all deals, CSS and JS ship under `app/`. No images —
  card art is pure CSS.

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

`shots.json` lists the four shots: dense grid (cover), filtered grid
(Audio, 50%+ off), AirPods Pro 3 detail, and a 390×844 phone view.
