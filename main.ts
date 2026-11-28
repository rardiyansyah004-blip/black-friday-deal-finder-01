// Friday Proof — a Black Friday deal finder for black-friday-deal-finder-01.
// Node 22, standard library only. The site is this directory's app/ folder:
// plain static files (index.html + ES modules + CSS, no build step), its 32
// deals held in app/data.js, nothing loaded over the network, each deal
// linking out to its store. v2 (round 2 resubmit) adds the price-proof bar
// on every card, a fourth verdict (skip — inflated was), a fake-markdown
// filter, and a static "Check your own deal" calculator at #/check.
// v3 (round 3 resubmit) adds exactly one feature: the per-deal "Expanded
// Proof Detail" drawer — a 90-day price curve (1 Sep – 27 Nov 2026, with
// the October Fake Hike peak and the Black Friday drop labelled) and a
// cross-store matrix (Amazon / Walmart / Best Buy / Target on 27 Nov),
// opened from a button on every card and open by default on the featured
// AirPods 4. The drawer is deep-linkable too: #/?proof=<deal-id> opens it
// for that deal. Nothing else changes: same 32 deals, same verdict mix
// (5 new-low / 18 strong / 5 routine / 4 skip), same KPI strip, same
// proof bar, same filters and sorts, same calculator.
// v4 (round 3 resubmit, maximal edition) adds three modules on top of v3,
// all computed from the same 32 deals — nothing hardcoded, nothing fetched:
//   A. Cart Reality Audit — "+ Cart" on every card (max 5), a sticky cart
//      bar with promo vs typical totals, and a cart drawer that warns
//      about fake markdowns (SKIP) and routine sales with the exact dollars
//      removing them saves. Deep link: #/?cart=<id1,id2>&cartview=1.
//   B. Category Fake-Markdown Radar — a panel above the grid with one
//      pure-SVG bar pair per group (was-markup vs real saving, computed
//      from the deals; groups under 3 deals show no percentage).
//   C. Timing Verdict badges — BUY TODAY — 90D LOW / HOLD — CYCLICAL /
//      SKIP — FAKE MARKUP on every card, in the drawer and on the detail
//      page, derived from each deal's own history90d + verdict — plus a
//      5% cashback stacker inside the "Check your own deal" calculator
//      (#/check?sale=..&was=..&usual=..&stack=1).
// Still nothing else changes: same 32 deals, same verdict mix, same KPI
// strip ($1,857 real savings, 4 fake "was"), same proof bar, same filters
// and sorts, same static-source note. This program hands it in: it copies
// app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json with buildDossier from vendor/makefun-frontend.ts —
// the summary the judge reads (screenshots, first-load files and bytes,
// and the source outline). Leave vendor/makefun-frontend.ts exactly as the
// kit shipped it: the scorer rebuilds the dossier with its own copy and
// compares the two byte for byte.
//
// Run it locally with `python3 -m http.server 8000 --directory app`
// (serves app/ on http://localhost:8000), or hand it in outside the grader
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(out, { recursive: true });
cpSync(join(here, "app"), join(out, "app"), { recursive: true });
mkdirSync(join(out, "screenshots"), { recursive: true });
if (existsSync(join(here, "screenshots"))) {
  cpSync(join(here, "screenshots"), join(out, "screenshots"), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files and directories in app/ or 16 MiB of app
// files — app/ counts beside /output's own 1000-entry cap, its screenshots/
// and dossier.json).
writeFileSync(
  join(out, "dossier.json"),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216,
  }),
);

// A one-line receipt on stdout, so a human running this by hand can see the
// handoff worked without opening the dossier.
const appFiles = readdirSync(join(out, "app"));
const shotFiles = readdirSync(join(out, "screenshots"));
const dossierBytes = statSync(join(out, "dossier.json")).size;
console.log(
  `Friday Proof handed in: ${appFiles.length} app files, ${shotFiles.length} screenshots, dossier.json ${dossierBytes} bytes -> ${out}`,
);
