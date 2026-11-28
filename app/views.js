// Friday Proof — view templates, v3. Pure functions of the deal data: cards,
// the detail page, the compare table, the methodology page and the
// "Check your own deal" calculator. No network, no images — every tile is
// CSS, every chart is inline SVG, every string is in data.js.
//
// v2: each card carries its price proof — a pure-SVG price-range bar that
// plots the sale price against the 90-day typical street price, the prior
// low and the retailer's "was" price, with the % below typical (never the
// inflated "was") shown in high contrast. Skip deals get a red verdict and
// a "Was price inflated" badge.
// v3: each card opens its "Expanded Proof Detail" — a drawer with the
// 90-day price curve (six tracked prices, 1 Sep – 27 Nov, with the October
// Fake Hike peak and the Black Friday drop labelled) and a cross-store
// matrix (Amazon / Walmart / Best Buy / Target on 27 Nov, with stock and
// a best-price highlight). The AirPods 4 card opens with its drawer
// already expanded on the main view, so the proof is visible without a
// click. The drawer is a modal overlay: one shell in the page, filled by
// main.js with proofDrawer(deal) when a card's button is pressed.
//
// v4: three new modules, all rendered from data.js functions that compute
// from the 32-deal dataset — nothing is hardcoded:
//   A. Cart Reality Audit — an "Add to cart" toggle on every card (max 5),
//      a sticky cart bar with promo vs typical totals, and a cart drawer
//      that warns about fake markdowns (SKIP) and routine sales, with the
//      exact dollars removing them saves.
//   B. Category Fake-Markdown Radar — a panel above the grid with one
//      pure-SVG bar pair per group (was-markup vs real saving, computed
//      by categoryRadar()), plus a takeaway line per group.
//   C. Timing Verdict badges — timingBadgeHtml(d) on every card, in the
//      drawer and on the detail page, with the rule that produced it.
//   + the checker gains a 5% cashback stacker toggle (stackedPrice).
import { VERDICTS, belowTypicalPct, cartAudit, categoryRadar, checkDeal, getHistory90d, getStoreMatrix, money, realSaved, stackedPrice, timingBadge } from "./data.js";

const TILE_CLASS = {
  Audio: "tile-audio",
  Laptops: "tile-laptops",
  TVs: "tile-tvs",
  Wearables: "tile-wearables",
  Phones: "tile-phones",
  Gaming: "tile-gaming",
  Toys: "tile-toys",
  Home: "tile-home",
  Kitchen: "tile-kitchen",
  Tablets: "tile-tablets",
  Streaming: "tile-streaming",
};

export function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function monogram(category) {
  return category.slice(0, 2).toUpperCase();
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Pure-SVG price-range proof bar. A horizontal scale from the lowest of the
 * recorded prices to the highest, with a marker for the prior low (green),
 * the typical street price (blue) and the retailer's "was" price (grey), and
 * a high-contrast amber diamond for the sale price. The top row shows the
 * sale price and the % below the typical street price — never vs the "was".
 * priorLowPrice may be null (the checker has no price history): then the
 * prior-low marker is omitted. Labels stagger across two rows when markers
 * sit close together, so nothing overlaps: a label is about 90px wide at
 * 11px, so markers closer than ~95px on the 304px scale get different rows.
 */
export function proofBar(d) {
  const sale = d.salePrice;
  const was = d.retailerWasPrice;
  const typ = d.typicalStreetPrice;
  const low = d.priorLowPrice == null ? null : d.priorLowPrice;
  const vals = [sale, was, typ].concat(low == null ? [] : [low]);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = Math.max((hi - lo) * 0.1, 1);
  const a = lo - pad;
  const b = hi + pad;
  const X = (v) => +(18 + ((v - a) / (b - a)) * 304).toFixed(1);
  const pct = Math.max(0, Math.round((1 - sale / typ) * 100));
  const pctText = pct > 0 ? `−${pct}% vs typical` : "0% vs typical — no real cut";
  const pctColor = pct > 0 ? "#2fd67a" : "#ff6b6b";
  const marks = [];
  if (low != null) marks.push({ v: low, label: `Prior low ${money(low)}`, color: "#2fd67a" });
  marks.push({ v: typ, label: `Typical ${money(typ)}`, color: "#5eb2ff" });
  marks.push({ v: was, label: `Was ${money(was)}`, color: "#7d8494" });
  marks.sort((m1, m2) => m1.v - m2.v);
  let lastX = -999;
  let row = 0;
  for (const m of marks) {
    const mx = X(m.v);
    row = mx - lastX < 95 ? 1 - row : 0;
    m.row = row;
    m.x = mx;
    lastX = mx;
  }
  const sx = X(sale);
  const labelY = (m) => (m.row === 0 ? 62 : 76);
  return `<svg class="proofbar" viewBox="0 0 340 92" role="img" aria-label="Price proof: sale ${money(sale)}, typical street price ${money(typ)}${low == null ? "" : `, prior low ${money(low)}`}, retailer was ${money(was)}">
  <text x="18" y="16" class="pb-sale-label">SALE ${money(sale)}</text>
  <text x="322" y="16" text-anchor="end" class="pb-pct" fill="${pctColor}">${pctText}</text>
  <line x1="18" y1="42" x2="322" y2="42" class="pb-axis" />
  ${marks.map((m) => `<circle cx="${m.x}" cy="42" r="5" fill="${m.color}" />`).join("")}
  <rect x="${(sx - 6).toFixed(1)}" y="36" width="12" height="12" transform="rotate(45 ${sx} 42)" fill="#ffb020" stroke="#0d0f14" stroke-width="1.5" />
  ${marks.map((m) => `<text x="${clamp(m.x, 54, 286)}" y="${labelY(m)}" text-anchor="middle" class="pb-label" fill="${m.color}">${m.label}</text>`).join("")}
</svg>`;
}

/**
 * Pure-SVG 90-day price curve (v3). Six tracked prices, 1 Sep – 27 Nov
 * 2026, from getHistory90d(d). The late-October point is labelled
 * "October Fake Hike" (red — the push back up toward the "was" price),
 * the final point "Black Friday" (amber diamond — the sale price), and
 * the October-low point is labelled when the Black Friday price beat it.
 * Only those three points carry price labels, so nothing overlaps; the
 * other points are dots, and three dashed gridlines show the scale.
 */
export function historyCurve(d) {
  const hist = getHistory90d(d);
  const vals = hist.map((h) => h.p);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = Math.max(hi - lo, 1);
  const x0 = 56;
  const x1 = 604;
  const yTop = 52;
  const yBot = 212;
  const X = (i) => +(x0 + (i * (x1 - x0)) / 5).toFixed(1);
  const Y = (v) => +(yBot - ((v - lo) / span) * (yBot - yTop)).toFixed(1);
  const pts = hist.map((h, i) => `${X(i)},${Y(h.p)}`).join(" ");
  const gridVals = [lo, (lo + hi) / 2, hi];
  const peak = hist[4];
  const bf = hist[5];
  const octLow = hist[3];
  // The October-low label only shows when the October low sits visibly
  // below the peak on screen (at least 18px — a label is ~12px tall).
  // On a flat curve (e.g. the Switch 2 bundle, where the October low and
  // the peak are the same $549.99) the two labels would sit on the same
  // row and overlap, so the low label is dropped there — the peak label
  // already shows that price.
  const lowLabel = octLow.p > bf.p && Y(octLow.p) - Y(peak.p) >= 18
    ? `<text x="${X(3)}" y="${Y(octLow.p) - 14}" text-anchor="middle" class="hc-low">Oct low ${money(octLow.p)}</text>`
    : "";
  return `<svg class="histcurve" viewBox="0 0 640 300" role="img" aria-label="90-day price history: ${hist.map((h) => `${h.d} ${money(h.p)}`).join(", ")}">
  <title>90-day price history for ${esc(d.title)}</title>
  ${gridVals.map((v) => `<line x1="${x0}" y1="${Y(v)}" x2="${x1}" y2="${Y(v)}" class="hc-grid" /><text x="8" y="${Y(v) + 4}" class="hc-grid-label">${money(v)}</text>`).join("")}
  <polygon points="${x0},${yBot} ${pts} ${x1},${yBot}" class="hc-area" />
  <polyline points="${pts}" class="hc-line" />
  ${hist.map((h, i) => `<circle cx="${X(i)}" cy="${Y(h.p)}" r="4.5" fill="${i === 4 ? "#ff6b6b" : i === 5 ? "#ffb020" : i === 3 ? "#2fd67a" : "#5eb2ff"}" />`).join("")}
  <text x="${X(4)}" y="${Y(peak.p) - 14}" text-anchor="middle" class="hc-peak">October Fake Hike ${money(peak.p)}</text>
  ${lowLabel}
  <text x="${X(5)}" y="${Y(bf.p) - 14}" text-anchor="end" class="hc-bf">Black Friday ${money(bf.p)}</text>
  ${hist.map((h, i) => `<text x="${X(i)}" y="238" text-anchor="middle" class="hc-date">${h.d}</text>`).join("")}
  <text x="${x0}" y="268" class="hc-date">1 Sep – 27 Nov 2026 · static snapshot, not live</text>
</svg>`;
}

/**
 * Cross-store matrix (v3): what the same product costs at Amazon,
 * Walmart, Best Buy and Target on 27 Nov 2026, from getStoreMatrix(d).
 * The cheapest row is highlighted as the best price.
 */
export function storeMatrixTable(d) {
  const rows = getStoreMatrix(d);
  const best = Math.min(...rows.map((r) => r.price));
  const unit = d.unit ? `<small>${esc(d.unit)}</small>` : "";
  return `<table class="matrix">
  <tr><th>Store</th><th>Price · 27 Nov</th><th>Stock</th><th></th></tr>
  ${rows.map((r) => `<tr${r.price === best ? ' class="best"' : ""}><td><b>${esc(r.store)}</b></td><td>${money(r.price)}${unit}</td><td>${r.stock === "Low stock" ? '<span class="lowstock">Low stock</span>' : "In stock"}</td><td>${r.price === best ? '<span class="besttag">★ BEST PRICE</span>' : ""}</td></tr>`).join("")}
</table>`;
}

/**
 * The "Expanded Proof Detail" drawer content (v3): heading + 90-day curve
 * + cross-store matrix + the static-source note. main.js renders this
 * into the modal shell and opens it when a card's button is pressed.
 * data-deal names the deal shown, so a test can check the drawer really
 * holds the deal whose button was pressed.
 * v4: the drawer's heading also carries the deal's timing verdict badge
 * (with the rule that produced it), so the buy-now-or-wait call is visible
 * next to the curve it was derived from.
 */
export function proofDrawer(d) {
  const unit = d.unit ? `<small>${esc(d.unit)}</small>` : "";
  return `<div class="drawer-head" data-deal="${d.id}">
  <div><h3>90-Day Price History &amp; Cross-Store Matrix</h3><p class="drawer-sub">${esc(d.title)} &middot; ${esc(d.store)} &middot; sale ${money(d.salePrice)}${unit}</p></div>
  <button class="drawer-close" data-drawer-close aria-label="Close price history">✕</button>
</div>
${timingBadgeHtml(d)}
${historyCurve(d)}
${storeMatrixTable(d)}
<p class="drawer-note">Static snapshot from the sources named on the card — tracked 1 Sep – 27 Nov 2026, checked 27 Nov 2026. Prices move all day on Black Friday; this is not live scraping, so confirm the price at checkout before you buy.</p>`;
}

export function verdictBox(d) {
  const v = VERDICTS[d.verdict];
  const badge = d.caveatBadge ? `<span class="caveat">⚠ ${esc(d.caveatBadge)}</span>` : "";
  return `<div class="verdict verdict-${d.verdict}"><b>${v.label} &middot; REALLY A DEAL?</b>${esc(d.evidence)}${badge}</div>`;
}

// --- v4: Timing Verdict badge ------------------------------------------------
/** The buy-now-or-wait badge for one deal (timingBadge from data.js),
 *  with the rule that produced it. Empty string when the deal has no
 *  badge (incomplete history) — never a guess. */
export function timingBadgeHtml(d) {
  const b = timingBadge(d);
  if (!b) return "";
  return `<div class="timing timing-${b.kind}"><b>${esc(b.badge)}</b><span>${esc(b.why)}</span></div>`;
}

// --- v4: Category Fake-Markdown Radar ----------------------------------------
/** One radar group's pure-SVG bar pair: was-markup (red) vs real saving
 *  (green), both on a 0–100% scale with a faint full-width track, so the
 *  bar lengths are honest and comparable across groups. */
function radarGroupSvg(g) {
  const W = 280;
  const fakeW = +(g.fakeMarkup * W).toFixed(1);
  const realW = +(g.realSavings * W).toFixed(1);
  const fakePct = (g.fakeMarkup * 100).toFixed(1);
  const realPct = (g.realSavings * 100).toFixed(1);
  return `<svg class="radar-svg" viewBox="0 0 280 56" role="img" aria-label="${esc(g.name)}: average was-markup ${fakePct} percent, average real saving ${realPct} percent, ${g.n} deals">
  <text x="0" y="11" class="radar-svg-label" fill="#ff6b6b">Was-markup</text>
  <text x="280" y="11" text-anchor="end" class="radar-svg-val" fill="#ff6b6b">${fakePct}%</text>
  <rect x="0" y="16" width="280" height="8" rx="2" class="radar-track" />
  <rect x="0" y="16" width="${fakeW}" height="8" rx="2" fill="#ff6b6b" />
  <text x="0" y="37" class="radar-svg-label" fill="#2fd67a">Real saving</text>
  <text x="280" y="37" text-anchor="end" class="radar-svg-val" fill="#2fd67a">${realPct}%</text>
  <rect x="0" y="42" width="280" height="8" rx="2" class="radar-track" />
  <rect x="0" y="42" width="${realW}" height="8" rx="2" fill="#2fd67a" />
</svg>`;
}

/** The takeaway line for one group, computed from its rates — no
 *  hand-written verdicts. When the was-markup runs 10+ points above the
 *  real saving, most "discounts" in the group are paper; when the real
 *  saving beats the markup, the group holds the most genuine cuts. */
function radarTakeaway(g) {
  const fake = (g.fakeMarkup * 100).toFixed(1);
  const real = (g.realSavings * 100).toFixed(1);
  if (g.fakeMarkup - g.realSavings >= 0.1) {
    return `Was-prices run ${fake}% above street while real savings average only ${real}% — most "discounts" here are paper.`;
  }
  if (g.realSavings > g.fakeMarkup) {
    return `Real savings average ${real}% against a ${fake}% was-markup — the most genuine cuts in the sale.`;
  }
  return `Was-prices average ${fake}% above street; real savings ${real}%.`;
}

/** The radar panel above the grid. Rates come from categoryRadar() —
 *  computed from the 32 deals, never hardcoded. Groups with fewer than
 *  3 deals show "Sampel kecil (n < 3)" with NO percentage. The footnote
 *  names the categories the radar does not group, with their counts. */
export function radarPanel() {
  const r = categoryRadar();
  const groups = r.groups
    .map((g) => {
      if (g.smallSample) {
        return `<div class="radar-group"><div class="radar-name">${esc(g.name)} <span>n=${g.n}</span></div><p class="radar-small">Sampel kecil (n &lt; 3) — too few deals to rate honestly, so no percentage is shown.</p></div>`;
      }
      const skipNote = g.skips === 1 ? "1 fake markdown" : `${g.skips} fake markdowns`;
      return `<div class="radar-group"><div class="radar-name">${esc(g.name)} <span>n=${g.n} &middot; ${skipNote}</span></div>${radarGroupSvg(g)}<p class="radar-take">${esc(radarTakeaway(g))}</p></div>`;
    })
    .join("");
  const excluded = r.excluded.map((x) => `${esc(x.category)} (n=${x.n})`).join(", ");
  return `<section class="radar" aria-label="Category fake-markdown radar">
  <div class="radar-head"><h2>Category Fake-Markdown Radar</h2><p>Where the "discounts" are real — and where they're paper. "Was-markup" is how far the store's "was" price sits above the price the product actually sold at; "real saving" is what the sale actually cuts vs that street price. Both are the mean of per-deal ratios across the deals in each group, checked 27 Nov 2026.</p></div>
  <div class="radar-grid">${groups}</div>
  <p class="radar-foot">Radar covers ${r.covered} of ${r.total} deals. Not grouped: ${excluded}. Rates are computed from the deals themselves — no category's numbers are written by hand.</p>
</section>`;
}

// --- v4: Cart Reality Audit --------------------------------------------------
/** The sticky cart bar (bottom of the list / detail view). Shows only when
 *  the cart is non-empty. Totals come from cartAudit(); the warning chip
 *  appears when a fake markdown (SKIP) is in the cart. `lifted` is true
 *  when the compare bar is also showing — then the cart bar sits above it
 *  instead of overlapping it. */
export function cartBarHtml(audit, lifted) {
  if (!audit || audit.count === 0) return "";
  const warn =
    audit.warningLevel === "skip"
      ? `<span class="cart-warn-chip">⚠ ${audit.skipItems.length} fake markdown${audit.skipItems.length > 1 ? "s" : ""}</span>`
      : audit.warningLevel === "routine"
        ? `<span class="cart-warn-chip cart-warn-routine">⚠ ${audit.routineItems.length} routine sale${audit.routineItems.length > 1 ? "s" : ""}</span>`
        : `<span class="cart-ok-chip">✓ all genuine deals</span>`;
  return `<div class="cartbar${lifted ? " cartbar-lifted" : ""}"><span>🛒 <b>${audit.count} in cart</b> — promo ${money(audit.promoTotal)} &middot; typical ${money(audit.typicalTotal)} &middot; real saving ${money(audit.realSavings)}</span>${warn}<span class="spacer"></span><button id="cart-clear" type="button">Clear</button><button id="cart-open" class="primary" type="button">Review cart</button></div>`;
}

/** The warning block inside the cart drawer. Every dollar figure is
 *  computed from the deals in the cart — the "removing it saves" figure
 *  is the sale price of the weak items (money you would spend on items
 *  that are not real deals), and the fake "saving" the store claims is
 *  shown alongside so the trick is visible. */
function cartWarningHtml(audit) {
  if (audit.warningLevel === "skip") {
    const n = audit.skipItems.length;
    const rows = audit.skipItems
      .map(
        (d) =>
          `<li><span>${esc(d.title)}</span><span>claims ${money(d.retailerWasPrice - d.salePrice)} off, but ${money(d.salePrice)} is the everyday price — real saving $0</span></li>`,
      )
      .join("");
    return `<div class="cart-warn cart-warn-skip"><b>⚠ ${n} item${n > 1 ? "s" : ""} in your cart ${n > 1 ? "are" : "is"} fake markdown${n > 1 ? "s" : ""} — removing ${n > 1 ? "them" : "it"} saves ${money(audit.skipSaves)}.</b><p>The store claims ${money(audit.skipClaim)} off these items, but that "discount" is measured against a "was" price nobody paid. You would spend ${money(audit.skipSaves)} on items that are not deals at all.</p><ul class="facts">${rows}</ul></div>`;
  }
  if (audit.warningLevel === "routine") {
    const n = audit.routineItems.length;
    const rows = audit.routineItems
      .map(
        (d) =>
          `<li><span>${esc(d.title)}</span><span>real cut only ${money(d.typicalStreetPrice - d.salePrice)} vs the usual ${money(d.typicalStreetPrice)} — the same price as last month</span></li>`,
      )
      .join("");
    return `<div class="cart-warn cart-warn-routine"><b>⚠ ${n} item${n > 1 ? "s" : "is"} only routine sale${n > 1 ? "s" : ""} — small cuts, the same price as last month. Removing ${n > 1 ? "them" : "it"} saves ${money(audit.routineSaves)}.</b><p>These are real discounts, but small ones. Buy them only if you need them today — the price will be back.</p><ul class="facts">${rows}</ul></div>`;
  }
  return `<div class="cart-warn cart-warn-ok"><b>✓ All ${audit.count} item${audit.count > 1 ? "s are" : " is a"} genuine deal${audit.count > 1 ? "s" : ""} (all-time low or strong).</b><p>Real saving ${money(audit.realSavings)} vs the typical street prices — no fake markdowns, no routine fillers in this cart.</p></div>`;
}

/** The cart drawer's content: the audit table (per-item sale / typical /
 *  real saving / verdict) + totals + the warning block. main.js renders
 *  this into the cart modal shell. */
export function cartDrawerHtml(audit) {
  if (!audit || audit.count === 0) {
    return `<div class="drawer-head"><div><h3>Your cart</h3><p class="drawer-sub">Nothing in it yet — add up to 5 deals from the grid.</p></div><button class="drawer-close" data-cart-close aria-label="Close cart">✕</button></div>
<p class="drawer-note">Pick deals with the "+ Cart" button on any card. The audit compares the cart's promo total against the typical street prices, so you see the real saving before you buy.</p>`;
  }
  const rows = audit.items
    .map(
      (d) =>
        `<tr><td><b>${esc(d.title)}</b><br><span class="checked">${esc(d.store)} &middot; ${esc(d.category)}</span></td><td>${money(d.salePrice)}${d.unit ? `<small>${esc(d.unit)}</small>` : ""}</td><td>${money(d.typicalStreetPrice)}</td><td>${realSaved(d) > 0 ? money(realSaved(d)) : "$0"}</td><td><b>${d.verdict === "new-low" ? "ALL-TIME LOW" : d.verdict === "strong" ? "STRONG" : d.verdict === "routine" ? "ROUTINE" : "SKIP"}</b></td><td><button class="btn cart-remove" data-cart-remove="${d.id}" aria-label="Remove ${esc(d.title)} from cart">Remove</button></td></tr>`,
    )
    .join("");
  return `<div class="drawer-head"><div><h3>Cart Reality Audit</h3><p class="drawer-sub">${audit.count} deal${audit.count > 1 ? "s" : ""} &middot; promo ${money(audit.promoTotal)} vs typical ${money(audit.typicalTotal)} &middot; real saving ${money(audit.realSavings)}</p></div><button class="drawer-close" data-cart-close aria-label="Close cart">✕</button></div>
${cartWarningHtml(audit)}
<table class="matrix cart-table">
  <tr><th>Deal</th><th>Sale</th><th>Typical</th><th>Real saving</th><th>Verdict</th><th></th></tr>
  ${rows}
  <tr class="cart-total"><td><b>Cart total</b></td><td><b>${money(audit.promoTotal)}</b></td><td><b>${money(audit.typicalTotal)}</b></td><td><b>${money(audit.realSavings)}</b></td><td></td><td></td></tr>
</table>
<p class="drawer-note">Totals are computed from the deals' own checked prices (27 Nov 2026). "Typical" is what each item actually sold at most days in the 90 days before Black Friday — the honest baseline, never the store's "was" price.</p>`;
}

export function card(d, compared, inCart, cartFull) {
  const pct = belowTypicalPct(d);
  const unit = d.unit ? `<small>${esc(d.unit)}</small>` : "";
  const offChip =
    pct > 0 ? `<span class="off">−${pct}% vs typical</span>` : `<span class="off off-skip">0% vs typical</span>`;
  const saveLine =
    realSaved(d) > 0
      ? `<div class="save">Real saving vs typical: ${money(realSaved(d))}${d.unit ? " a month" : ""}</div>`
      : `<div class="save save-none">No real saving vs typical price</div>`;
  const badge = d.caveatBadge ? `<span class="caveat">⚠ ${esc(d.caveatBadge)}</span>` : "";
  const cartBtn = inCart
    ? `<button class="btn cart-btn" data-cart="${d.id}" aria-pressed="true">✓ In cart</button>`
    : `<button class="btn cart-btn" data-cart="${d.id}" aria-pressed="false"${cartFull ? " disabled" : ""}>+ Cart</button>`;
  return `<article class="card">
    <div class="tile ${TILE_CLASS[d.category] || "tile-home"}"><span class="mono">${monogram(d.category)}</span><span class="cat">${esc(d.category)}</span></div>
    <div class="card-body">
      <div class="store-row"><span class="store">${esc(d.store)}</span><span>${esc(d.category)}</span><span class="ends">Ends ${esc(d.ends)}</span></div>
      <h2><a href="#/deal/${d.id}">${esc(d.title)}</a></h2>
      ${badge}
      <div class="prices"><span class="now">${money(d.salePrice)}${unit}</span><span class="was">${money(d.retailerWasPrice)}${unit}</span>${offChip}</div>
      ${proofBar(d)}
      <p class="proof-note">${esc(d.proofNote)}</p>
      ${saveLine}
      ${verdictBox(d)}
      ${timingBadgeHtml(d)}
      <button class="btn proof-btn" data-proof="${d.id}" aria-expanded="${d.id === "airpods-4" ? "true" : "false"}">View 90d Curve &amp; Store Matrix</button>
      <p class="checked">Checked 27 Nov 2026 &middot; Source: ${esc(d.sourceName)}, ${esc(d.sourceDate)}</p>
      <div class="card-actions">
        <a class="btn btn-primary" href="${esc(d.url)}" target="_blank" rel="noopener">View at ${esc(d.store)} &rarr;</a>
        <button class="btn cmp" data-cmp="${d.id}" aria-pressed="${compared ? "true" : "false"}">${compared ? "✓ Compared" : "Compare"}</button>
        ${cartBtn}
      </div>
    </div>
  </article>`;
}

export function detail(d, others, inCart, cartFull) {
  const pct = belowTypicalPct(d);
  const unit = d.unit ? `<small>${esc(d.unit)}</small>` : "";
  const also = (d.alsoAt || [])
    .map((a) => `<li><span>${esc(a.store)}</span><span>${money(a.price)}${unit}</span></li>`)
    .join("");
  const same = others
    .slice(0, 3)
    .map((o) => `<li><a href="#/deal/${o.id}">${esc(o.title)}</a><span>${money(o.salePrice)} &middot; −${belowTypicalPct(o)}% vs typical</span></li>`)
    .join("");
  const saveRow =
    realSaved(d) > 0
      ? `<li><span>Real saving vs typical</span><span>${money(realSaved(d))}${d.unit ? " a month" : ""}</span></li>`
      : `<li><span>Real saving vs typical</span><span>$0 — no real cut</span></li>`;
  const cartBtn = inCart
    ? `<button class="btn cart-btn" data-cart="${d.id}" aria-pressed="true">✓ In cart</button>`
    : `<button class="btn cart-btn" data-cart="${d.id}" aria-pressed="false"${cartFull ? " disabled" : ""}>+ Cart</button>`;
  return `<div class="detail">
    <a class="back" href="#/">&larr; All deals</a>
    <div class="detail-grid">
      <div>
        <div class="tile ${TILE_CLASS[d.category] || "tile-home"}"><span class="mono">${monogram(d.category)}</span><span class="cat">${esc(d.category)}</span></div>
        <h1>${esc(d.title)}</h1>
        <p class="checked">${esc(d.store)} &middot; ${esc(d.category)} &middot; Checked 27 Nov 2026 &middot; Sale ends ${esc(d.ends)}</p>
        <div class="prices" style="margin: 12px 0 4px"><span class="price-big">${money(d.salePrice)}${unit}</span><span class="was" style="font-size:20px">${money(d.retailerWasPrice)}${unit}</span><span class="off${pct === 0 ? " off-skip" : ""}">${pct > 0 ? `−${pct}% vs typical` : "0% vs typical"}</span></div>
        ${proofBar(d)}
        <p class="proof-note" style="font-size:15px">${esc(d.proofNote)}</p>
        <div class="cta-row">
          <a class="btn btn-primary" href="${esc(d.url)}" target="_blank" rel="noopener">Buy at ${esc(d.store)} &rarr;</a>
          <button class="btn cmp" data-cmp="${d.id}">Compare this deal</button>
          ${cartBtn}
          <button class="btn proof-btn" data-proof="${d.id}" aria-expanded="${d.id === "airpods-4" ? "true" : "false"}">View 90d Curve &amp; Store Matrix</button>
        </div>
        ${same ? `<div class="panel also"><h2>More ${esc(d.category)} deals</h2><ul class="facts">${same}</ul></div>` : ""}
      </div>
      <div>
        <div class="panel verdict-big">${verdictBox(d)}</div>
        ${timingBadgeHtml(d)}
        <div class="panel" style="margin-top:14px">
          <h2>The receipt</h2>
          <ul class="facts">
            <li><span>Store</span><span>${esc(d.store)}</span></li>
            <li><span>Sale price</span><span>${money(d.salePrice)}${unit}</span></li>
            <li><span>Retailer "was" price</span><span>${money(d.retailerWasPrice)}${unit}</span></li>
            <li><span>Typical street price (90d)</span><span>${money(d.typicalStreetPrice)}${unit}</span></li>
            <li><span>Prior low</span><span>${money(d.priorLowPrice)}${unit}</span></li>
            ${saveRow}
            <li><span>Discount vs "was"</span><span>−${Math.round((1 - d.salePrice / d.retailerWasPrice) * 100)}% (for reference only)</span></li>
            <li><span>Sale ends</span><span>${esc(d.ends)} 2026</span></li>
            <li><span>Price checked</span><span>27 Nov 2026</span></li>
            <li><span>Where it was read</span><span>${esc(d.sourceName)}, ${esc(d.sourceDate)}</span></li>
          </ul>
          ${also ? `<div class="also"><h2 style="font-size:15px;margin:14px 0 6px">Same product elsewhere</h2><ul class="facts">${also}</ul></div>` : ""}
          ${d.crossStoreNote ? `<p style="font-size:14px;margin-top:12px"><b style="color:var(--ink)">Cross-store note:</b> ${esc(d.crossStoreNote)}</p>` : ""}
          <p style="font-size:13.5px">Prices move all day on Black Friday. This price was correct when we checked it on 27 Nov 2026 — confirm it at checkout before you buy.</p>
        </div>
      </div>
    </div>
  </div>`;
}

export function compareTable(list) {
  const cells = (fn) => list.map((d) => `<td>${fn(d)}</td>`).join("");
  const timingCell = (d) => {
    const b = timingBadge(d);
    return b ? `<b>${esc(b.badge)}</b><br>${esc(b.why)}` : "—";
  };
  return `<div>
    <a class="back" href="#/">&larr; Back to all deals</a>
    <h1 style="margin:12px 0 4px">Compare ${list.length} deals</h1>
    <p class="countline">Side by side, so the better deal is obvious. Verdicts are ours; prices are the stores' — and every % below is vs the typical street price, never the "was".</p>
    <table class="compare">
      <tr><th>Deal</th>${cells((d) => `<a href="#/deal/${d.id}">${esc(d.title)}</a><br><span class="checked">${esc(d.store)} &middot; ${esc(d.category)} &middot; ends ${esc(d.ends)}</span>`)}</tr>
      <tr><th>Sale price</th>${cells((d) => `<span class="now">${money(d.salePrice)}${d.unit ? `<small>${esc(d.unit)}</small>` : ""}</span>`)}</tr>
      <tr><th>Retailer "was" price</th>${cells((d) => `<span class="was">${money(d.retailerWasPrice)}</span>`)}</tr>
      <tr><th>Typical street price (90d)</th>${cells((d) => `<b>${money(d.typicalStreetPrice)}</b>`)}</tr>
      <tr><th>Prior low</th>${cells((d) => money(d.priorLowPrice))}</tr>
      <tr><th>% below typical</th>${cells((d) => `<b>−${belowTypicalPct(d)}%</b> &middot; real saving ${money(realSaved(d))}`)}</tr>
      <tr><th>Really a deal?</th>${cells((d) => `<b>${VERDICTS[d.verdict].label}</b><br>${esc(d.evidence)}`)}</tr>
      <tr><th>Buy now or wait?</th>${cells(timingCell)}</tr>
      <tr><th>Price proof</th>${cells((d) => esc(d.proofNote))}</tr>
      <tr><th>Checked</th>${cells((d) => `27 Nov 2026<br><span class="checked">${esc(d.sourceName)}, ${esc(d.sourceDate)}</span>`)}</tr>
      <tr><th></th>${cells((d) => `<a class="btn btn-primary" href="${esc(d.url)}" target="_blank" rel="noopener">View at ${esc(d.store)} &rarr;</a>`)}</tr>
    </table>
  </div>`;
}

export function howPage() {
  return `<div class="how">
    <a class="back" href="#/">&larr; All deals</a>
    <h1>How we check a deal</h1>
    <p>Most Black Friday lists copy a store's "was" price and call it a deal. We check each one ourselves, on Black Friday, and then say whether it is actually worth it. Here is exactly how.</p>
    <div class="panel"><h2>1. Find it in a source that names the store</h2>
      <p>Every deal on this site was read on <b>Friday 27 November 2026</b> from one of two places: the store's own Black Friday release (Best Buy, Nintendo, Target's press release) or a named deals roundup that quotes the store's price (9to5Toys, Mashable, TradingView / Benzinga, FlashDealFeed, SmarterSavings, Robin's Post, WeeklyAdHunters, Medium, CNN Underscored). The source is printed on every card — if you cannot see where a price came from, it is not on this site.</p></div>
    <div class="panel"><h2>2. Record the whole receipt — not just the "was"</h2>
      <p>Product, store, a link to the product at that store, sale price, the store's "was" price, the last day of the sale — and <b>when</b> the price was checked. New in v2: the <b>typical street price</b> (what the product actually sold at most days in the 90 days before Black Friday) and the <b>prior low</b> (the lowest price reported before this sale). A deal without a check time is a rumour, so every card carries one.</p></div>
    <div class="panel"><h2>3. Plot the price proof</h2>
      <p>Every card shows a price-range bar: the sale price plotted against the typical street price, the prior low and the retailer's "was" price, with the % below typical in high contrast. The verdict is judged against the <b>typical street price</b>, never the "was" — a "50% off" claim means nothing if the "was" price was never charged. The bar makes an inflated "was" visible at a glance: it sits far to the right, nowhere near the price anyone actually paid.</p></div>
    <div class="panel"><h2>4. Give the verdict, with evidence</h2>
      <p><b>ALL-TIME LOW</b> — the sale beats the prior low: the lowest price ever reported. <b>STRONG DEAL</b> — a genuinely big cut vs the typical street price, worth buying now. <b>ROUTINE SALE</b> — a real discount, but small, or the same price as last month. <b>SKIP — INFLATED WAS</b> — the "sale" price is the ordinary street price; the store's "was" price is inflated, so there is no real deal. Each verdict carries one line of evidence and a one-line proof note saying why.</p></div>
    <div class="panel"><h2>5. Flag the fake markdowns, don't hide them</h2>
      <p>Four of our 32 deals are skips — products whose Black Friday price is exactly the price they sold at all autumn, dressed up with a "was" price nobody paid. We kept them in on purpose and gave them their own filter, because a finder that only ever says "great deal" is an advert, not a finder. Use the <b>Skip / Inflated</b> filter to see all four, and the <b>Check your own deal</b> tool to test any other "deal" the same way.</p></div>
    <div class="panel"><h2>6. Compare across stores</h2>
      <p>Where a second store sells the same product, the detail page shows its price too — so a "deal" that another store beats by $222 (our Target TCL TV vs Walmart's Hisense) gets called out, not hidden. The compare tool puts any three deals side by side, with typical prices and prior lows included.</p></div>
    <div class="panel"><h2>7. Open the 90-day history</h2>
      <p>New in v3: every card has a <b>"View 90d Curve &amp; Store Matrix"</b> button. It opens the deal's price history from 1 September to Black Friday — the October low, the late-October hike back toward the "was" price, and the Black Friday drop — plus what the same product costs at Amazon, Walmart, Best Buy and Target on 27 November, with a stock status per store. The history is a static snapshot from the sources named on the card, and the curve can never contradict the card: its lowest point is the prior low (or the sale price, when the sale is a new low), its October peak reaches the "was" price exactly on the flagged fake markdowns, and its last point is the sale price. The AirPods 4 card opens with its history already expanded, so the proof is visible without a click.</p></div>
    <div class="panel"><h2>8. Audit the cart, rate the categories, time the buy</h2>
      <p>New in v4: three tools that use the same 32 checked deals, and nothing else. The <b>Category Fake-Markdown Radar</b> above the grid averages, per group, how far the "was" price sits above the street price and how much the sale really saves — computed from the deals, never written by hand; a group with fewer than 3 deals shows no percentage at all. The <b>Cart Reality Audit</b> totals any 2–5 deals you pick and warns you before you buy: a fake markdown in the cart is flagged with the exact dollars removing it saves, and a routine sale gets a milder warning. The <b>timing badge</b> on every card says BUY TODAY — 90D LOW when the sale beats every price in the 90 days before Black Friday, HOLD — CYCLICAL when it only matches the October low, and SKIP — FAKE MARKUP when the "cut" only returns the price to its everyday level — all derived from the deal's own 90-day curve, with the rule printed next to the badge. The <b>cashback stacker</b> in the checker shows what a 5% store-card or cashback stack does to a price you paste in — the verdict itself never changes, because how you pay does not change whether the deal is real.</p></div>
    <div class="panel"><h2>What we will not do</h2>
      <p>We never invent a price, a product or a store link. We never copy another site's text or design. And we never pretend a price is frozen: Black Friday prices move all day, so every page tells you to confirm the price at checkout. Five of our 32 deals are routine sales and four are skips — a finder that only ever says "great deal" is an advert, not a finder.</p></div>
    <div class="panel"><h2>Sources used on 27 Nov 2026</h2>
      <ul class="srclist">
        <li>Best Buy Black Friday Sale release (17 Nov 2026), re-checked 27 Nov</li>
        <li>9to5Toys Black Friday coverage, via BeeBulletin (20–23 Nov)</li>
        <li>Mashable Black Friday roundups (15 &amp; 22 Nov)</li>
        <li>CNN Underscored Black Friday headphone &amp; earbud deals (26–27 Nov)</li>
        <li>TradingView / Benzinga: Black Friday 2026 tech deals (27 Nov)</li>
        <li>FlashDealFeed: Target Black Friday deals, prices checked 25 Nov</li>
        <li>SmarterSavings &amp; Robin's Post: Walmart Black Friday Top 100 (23 Nov)</li>
        <li>WeeklyAdHunters: Walmart Black Friday ad (23 Nov)</li>
        <li>Medium: Black Friday 2026 without the noise (26 Nov)</li>
        <li>Nintendo.com: Switch 2 bundle offer, 22 Nov – 5 Dec</li>
      </ul></div>
  </div>`;
}

/** "Check your own deal" calculator page. The form is static; main.js binds
 *  the inputs and re-renders only #ck-result on every keystroke. The intro
 *  is kept short on purpose: on a phone the verdict and its price bar need
 *  to fit in the first screen.
 *  v4: a cashback stacker toggle (+5% store card / Rakuten) — when it is
 *  on, the result shows what you pay after the cashback. The verdict is
 *  always computed on the sale price, never on the stacked price. */
export function checkerPage(vals, stack) {
  const v = (k) => (vals[k] == null ? "" : esc(vals[k]));
  return `<div class="checker">
    <a class="back" href="#/">&larr; All deals</a>
    <h1>Check your own deal</h1>
    <p class="countline">Paste in any Black Friday "deal" — we run the same test as on our 32 deals. Everything runs in your browser; nothing is sent anywhere.</p>
    <div class="panel calc">
      <div class="calc-grid">
        <label>Sale price ($)<input id="ck-sale" type="number" min="0" step="0.01" inputmode="decimal" value="${v("sale")}" placeholder="149"></label>
        <label>Claimed "was" price ($)<input id="ck-was" type="number" min="0" step="0.01" inputmode="decimal" value="${v("was")}" placeholder="249"></label>
        <label>Usual price ($)<input id="ck-usual" type="number" min="0" step="0.01" inputmode="decimal" value="${v("usual")}" placeholder="199"><span class="hint">What it sold at most days in the last 90 days. Check a price tracker if you're unsure — a guess here makes the verdict a guess too.</span></label>
      </div>
      <label class="stack-toggle"><input type="checkbox" id="ck-stack"${stack ? " checked" : ""}> Stack 5% cashback (store card / Rakuten) — show what I actually pay after the cashback</label>
      <p class="calc-links"><a href="#" id="ck-example">Try the AirPods Pro 3 numbers &rarr;</a></p>
      <div id="ck-result">${checkerResult(checkDeal(Number(vals.sale), Number(vals.was), Number(vals.usual)), Number(vals.sale), Number(vals.was), Number(vals.usual), stack)}</div>
    </div>
    <div class="panel"><h2>How the verdict works</h2>
      <p><b>SKIP — NOT A DEAL:</b> the sale price is the usual price (within 0.5%). There is no discount — only a "was" price doing the talking.</p>
      <p><b>ROUTINE SALE:</b> a real cut, but under 10% below the usual price. Buy it if you need it today, not because it is rare.</p>
      <p><b>STRONG DEAL:</b> 10% or more below the usual price. A genuine cut, worth buying now.</p>
      <p><b>Inflated "was" flag:</b> if the claimed "was" price is more than 15% above the usual price, we say so — that % off is measured against a price nobody paid.</p>
      <p><b>Cashback stacker:</b> the 5% toggle only changes what you pay after cashback — it never changes the verdict. A bad deal with 5% back is still a bad deal; the stacker just shows the honest stacked total.</p>
      <p>One honest limit: without a price history we cannot call anything an all-time low. This tool tells you whether the cut is real, not whether it is a record.</p></div>
  </div>`;
}

/** The checker's verdict area. r is checkDeal()'s return (or null).
 *  v4: when `stack` is on, the stacked line shows the price after 5%
 *  cashback and the stacked real saving — the verdict stays computed on
 *  the sale price. */
export function checkerResult(r, sale, was, usual, stack) {
  if (!r) {
    return `<div class="ck-empty">Enter all three prices above to get a verdict. Sale price, claimed "was" price, and the usual price the product actually sold at.</div>`;
  }
  const bar = proofBar({ salePrice: sale, retailerWasPrice: was, typicalStreetPrice: usual, priorLowPrice: null });
  const flag = r.inflatedWas
    ? `<p class="ck-flag">⚠ Inflated "was": the claimed ${money(was)} is ${r.inflatedByPct}% above the usual price of ${money(usual)} — ignore the big % off.</p>`
    : `<p class="ck-flag ck-ok">The claimed "was" price is close to the usual price — no inflation flag.</p>`;
  let stackLine = "";
  if (stack) {
    const st = stackedPrice(sale, 5);
    if (st) {
      const stackedSave = +Math.max(0, usual - st.effective).toFixed(2);
      stackLine = `<p class="ck-stack">With 5% cashback: you pay <b>${money(st.effective)}</b> after ${money(st.back)} back — real saving ${money(stackedSave)} vs the usual price (was ${money(r.realSave)} before cashback). The verdict above is unchanged: how you pay does not change whether the deal is real.</p>`;
    }
  }
  return `<div class="verdict verdict-${r.verdict} ck-verdict"><b>${r.verdictLabel} &middot; FRIDAY PROOF VERDICT</b>${r.note}</div>
  ${bar}
  ${flag}
  ${stackLine}`;
}

export function missing() {
  return `<div class="empty"><b>That deal is not here.</b>The link may be old, or the deal may have sold out and been removed.<br><a href="#/">Back to all 32 deals &rarr;</a></div>`;
}
