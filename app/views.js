// Friday Proof — view templates. Pure functions of the deal data: cards,
// the detail page, the compare table and the methodology page. No network,
// no images — every tile is CSS, every string is in data.js. Each card shows
// the full receipt: sale price, usual price, discount, dollars saved, the
// verdict with its evidence, when the price was checked, where it was read,
// and the last day of the sale.
import { VERDICTS, discountPct, money, saved } from "./data.js";

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

export function verdictBox(d) {
  const v = VERDICTS[d.verdict];
  return `<div class="verdict verdict-${d.verdict}"><b>${v.label} &middot; REALLY A DEAL?</b>${esc(d.evidence)}</div>`;
}

export function card(d, compared) {
  const pct = discountPct(d);
  const unit = d.unit ? `<small>${esc(d.unit)}</small>` : "";
  return `<article class="card">
    <div class="tile ${TILE_CLASS[d.category] || "tile-home"}"><span class="mono">${monogram(d.category)}</span><span class="cat">${esc(d.category)}</span></div>
    <div class="card-body">
      <div class="store-row"><span class="store">${esc(d.store)}</span><span>${esc(d.category)}</span><span class="ends">Ends ${esc(d.ends)}</span></div>
      <h2><a href="#/deal/${d.id}">${esc(d.title)}</a></h2>
      <div class="prices"><span class="now">${money(d.price)}${unit}</span><span class="was">${money(d.was)}${unit}</span><span class="off">−${pct}%</span></div>
      <div class="save">You save ${money(saved(d))}${d.unit ? " a month" : ""}</div>
      ${verdictBox(d)}
      <p class="checked">Checked 27 Nov 2026 &middot; Source: ${esc(d.source)}</p>
      <div class="card-actions">
        <a class="btn btn-primary" href="${esc(d.url)}" target="_blank" rel="noopener">View at ${esc(d.store)} &rarr;</a>
        <button class="btn cmp" data-cmp="${d.id}" aria-pressed="${compared ? "true" : "false"}">${compared ? "✓ Compared" : "Compare"}</button>
      </div>
    </div>
  </article>`;
}

export function detail(d, others) {
  const pct = discountPct(d);
  const unit = d.unit ? `<small>${esc(d.unit)}</small>` : "";
  const also = (d.alsoAt || [])
    .map((a) => `<li><span>${esc(a.store)}</span><span>${money(a.price)}${unit}</span></li>`)
    .join("");
  const same = others
    .slice(0, 3)
    .map((o) => `<li><a href="#/deal/${o.id}">${esc(o.title)}</a><span>${money(o.price)} &middot; −${discountPct(o)}%</span></li>`)
    .join("");
  return `<div class="detail">
    <a class="back" href="#/">&larr; All deals</a>
    <div class="detail-grid">
      <div>
        <div class="tile ${TILE_CLASS[d.category] || "tile-home"}"><span class="mono">${monogram(d.category)}</span><span class="cat">${esc(d.category)}</span></div>
        <h1>${esc(d.title)}</h1>
        <p class="checked">${esc(d.store)} &middot; ${esc(d.category)} &middot; Checked 27 Nov 2026 &middot; Sale ends ${esc(d.ends)}</p>
        <div class="prices" style="margin: 12px 0"><span class="price-big">${money(d.price)}${unit}</span><span class="was" style="font-size:20px">${money(d.was)}${unit}</span><span class="off">−${pct}%</span></div>
        <p class="save" style="font-size:17px">You save ${money(saved(d))}${d.unit ? " every month" : ""} off the usual price.</p>
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
            <li><span>Sale price</span><span>${money(d.price)}${unit}</span></li>
            <li><span>Usual price</span><span>${money(d.was)}${unit}</span></li>
            <li><span>Discount</span><span>−${pct}% (${money(saved(d))} off)</span></li>
            <li><span>Sale ends</span><span>${esc(d.ends)} 2026</span></li>
            <li><span>Price checked</span><span>27 Nov 2026</span></li>
            <li><span>Where it was read</span><span>${esc(d.source)}</span></li>
          </ul>
          ${also ? `<div class="also"><h2 style="font-size:15px;margin:14px 0 6px">Same product elsewhere</h2><ul class="facts">${also}</ul></div>` : ""}
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
    <p class="countline">Side by side, so the better deal is obvious. Verdicts are ours; prices are the stores'.</p>
    <table class="compare">
      <tr><th>Deal</th>${cells((d) => `<a href="#/deal/${d.id}">${esc(d.title)}</a><br><span class="checked">${esc(d.store)} &middot; ${esc(d.category)} &middot; ends ${esc(d.ends)}</span>`)}</tr>
      <tr><th>Sale price</th>${cells((d) => `<span class="now">${money(d.price)}${d.unit ? `<small>${esc(d.unit)}</small>` : ""}</span>`)}</tr>
      <tr><th>Usual price</th>${cells((d) => `<span class="was">${money(d.was)}</span>`)}</tr>
      <tr><th>Discount</th>${cells((d) => `<b>−${discountPct(d)}%</b> &middot; save ${money(saved(d))}`)}</tr>
      <tr><th>Really a deal?</th>${cells((d) => `<b>${VERDICTS[d.verdict].label}</b><br>${esc(d.evidence)}`)}</tr>
      <tr><th>Checked</th>${cells((d) => `27 Nov 2026<br><span class="checked">${esc(d.source)}</span>`)}</tr>
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
      <p>Every deal on this site was read on <b>Friday 27 November 2026</b> from one of two places: the store's own Black Friday release (Best Buy, Nintendo, Target's press release) or a named deals roundup that quotes the store's price (9to5Toys, TradingView / Benzinga, FlashDealFeed, SmarterSavings, Robin's Post, WeeklyAdHunters, Medium). The source is printed on every card — if you cannot see where a price came from, it is not on this site.</p></div>
    <div class="panel"><h2>2. Record the whole receipt</h2>
      <p>Product, store, a link to the product at that store, sale price, usual price, discount, the last day of the sale — and <b>when</b> the price was checked. A deal without a check time is a rumour, so every card carries one.</p></div>
    <div class="panel"><h2>3. Give the verdict, with evidence</h2>
      <p><b>NEW LOW</b> — the lowest price anyone has reported for this product. <b>STRONG DEAL</b> — a genuinely big cut, worth buying now. <b>ROUTINE SALE</b> — a real discount, but small, or beaten by another store on this same page. Each verdict carries one line of evidence saying why.</p></div>
    <div class="panel"><h2>4. Compare across stores</h2>
      <p>Where a second store sells the same product, the detail page shows its price too — so a "deal" that another store beats by $222 (our Target TCL TV vs Walmart's Hisense) gets called out, not hidden. The compare tool puts any three deals side by side.</p></div>
    <div class="panel"><h2>What we will not do</h2>
      <p>We never invent a price, a product or a store link. We never copy another site's text or design. And we never pretend a price is frozen: Black Friday prices move all day, so every page tells you to confirm the price at checkout. Two of our 23 deals are routine sales — we kept them in on purpose, because a finder that only ever says "great deal" is an advert, not a finder.</p></div>
    <div class="panel"><h2>Sources used on 27 Nov 2026</h2>
      <ul class="srclist">
        <li>Best Buy Black Friday Sale release (17 Nov 2026), re-checked 27 Nov</li>
        <li>9to5Toys Black Friday coverage, via BeeBulletin (20–23 Nov)</li>
        <li>TradingView / Benzinga: Black Friday 2026 tech deals (27 Nov)</li>
        <li>FlashDealFeed: Target Black Friday deals, prices checked 25 Nov</li>
        <li>SmarterSavings &amp; Robin's Post: Walmart Black Friday Top 100 (23 Nov)</li>
        <li>WeeklyAdHunters: Walmart Black Friday ad (23 Nov)</li>
        <li>Medium: Black Friday 2026 without the noise (26 Nov)</li>
        <li>Nintendo.com: Switch 2 bundle offer, 22 Nov – 5 Dec</li>
      </ul></div>
  </div>`;
}

export function missing() {
  return `<div class="empty"><b>That deal is not here.</b>The link may be old, or the deal may have sold out and been removed.<br><a href="#/">Back to all 23 deals &rarr;</a></div>`;
}
