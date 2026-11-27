// Friday Proof — view templates, v2. Pure functions of the deal data: cards,
// the detail page, the compare table, the methodology page and the
// "Check your own deal" calculator. No network, no images — every tile is
// CSS, every chart is inline SVG, every string is in data.js.
//
// v2: each card carries its price proof — a pure-SVG price-range bar that
// plots the sale price against the 90-day typical street price, the prior
// low and the retailer's "was" price, with the % below typical (never the
// inflated "was") shown in high contrast. Skip deals get a red verdict and
// a "Was price inflated" badge.
import { VERDICTS, belowTypicalPct, checkDeal, money, realSaved } from "./data.js";

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

export function verdictBox(d) {
  const v = VERDICTS[d.verdict];
  const badge = d.caveatBadge ? `<span class="caveat">⚠ ${esc(d.caveatBadge)}</span>` : "";
  return `<div class="verdict verdict-${d.verdict}"><b>${v.label} &middot; REALLY A DEAL?</b>${esc(d.evidence)}${badge}</div>`;
}

export function card(d, compared) {
  const pct = belowTypicalPct(d);
  const unit = d.unit ? `<small>${esc(d.unit)}</small>` : "";
  const offChip =
    pct > 0 ? `<span class="off">−${pct}% vs typical</span>` : `<span class="off off-skip">0% vs typical</span>`;
  const saveLine =
    realSaved(d) > 0
      ? `<div class="save">Real saving vs typical: ${money(realSaved(d))}${d.unit ? " a month" : ""}</div>`
      : `<div class="save save-none">No real saving vs typical price</div>`;
  const badge = d.caveatBadge ? `<span class="caveat">⚠ ${esc(d.caveatBadge)}</span>` : "";
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
      <p class="checked">Checked 27 Nov 2026 &middot; Source: ${esc(d.sourceName)}, ${esc(d.sourceDate)}</p>
      <div class="card-actions">
        <a class="btn btn-primary" href="${esc(d.url)}" target="_blank" rel="noopener">View at ${esc(d.store)} &rarr;</a>
        <button class="btn cmp" data-cmp="${d.id}" aria-pressed="${compared ? "true" : "false"}">${compared ? "✓ Compared" : "Compare"}</button>
      </div>
    </div>
  </article>`;
}

export function detail(d, others) {
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
        </div>
        ${same ? `<div class="panel also"><h2>More ${esc(d.category)} deals</h2><ul class="facts">${same}</ul></div>` : ""}
      </div>
      <div>
        <div class="panel verdict-big">${verdictBox(d)}</div>
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
 *  to fit in the first screen. */
export function checkerPage(vals) {
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
      <p class="calc-links"><a href="#" id="ck-example">Try the AirPods Pro 3 numbers &rarr;</a></p>
      <div id="ck-result">${checkerResult(checkDeal(Number(vals.sale), Number(vals.was), Number(vals.usual)), Number(vals.sale), Number(vals.was), Number(vals.usual))}</div>
    </div>
    <div class="panel"><h2>How the verdict works</h2>
      <p><b>SKIP — NOT A DEAL:</b> the sale price is the usual price (within 0.5%). There is no discount — only a "was" price doing the talking.</p>
      <p><b>ROUTINE SALE:</b> a real cut, but under 10% below the usual price. Buy it if you need it today, not because it is rare.</p>
      <p><b>STRONG DEAL:</b> 10% or more below the usual price. A genuine cut, worth buying now.</p>
      <p><b>Inflated "was" flag:</b> if the claimed "was" price is more than 15% above the usual price, we say so — that % off is measured against a price nobody paid.</p>
      <p>One honest limit: without a price history we cannot call anything an all-time low. This tool tells you whether the cut is real, not whether it is a record.</p></div>
  </div>`;
}

/** The checker's verdict area. r is checkDeal()'s return (or null). */
export function checkerResult(r, sale, was, usual) {
  if (!r) {
    return `<div class="ck-empty">Enter all three prices above to get a verdict. Sale price, claimed "was" price, and the usual price the product actually sold at.</div>`;
  }
  const bar = proofBar({ salePrice: sale, retailerWasPrice: was, typicalStreetPrice: usual, priorLowPrice: null });
  const flag = r.inflatedWas
    ? `<p class="ck-flag">⚠ Inflated "was": the claimed ${money(was)} is ${r.inflatedByPct}% above the usual price of ${money(usual)} — ignore the big % off.</p>`
    : `<p class="ck-flag ck-ok">The claimed "was" price is close to the usual price — no inflation flag.</p>`;
  return `<div class="verdict verdict-${r.verdict} ck-verdict"><b>${r.verdictLabel} &middot; FRIDAY PROOF VERDICT</b>${r.note}</div>
  ${bar}
  ${flag}`;
}

export function missing() {
  return `<div class="empty"><b>That deal is not here.</b>The link may be old, or the deal may have sold out and been removed.<br><a href="#/">Back to all 32 deals &rarr;</a></div>`;
}
