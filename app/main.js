// Friday Proof — app logic, v3. Hash routes, so every view is a shareable link
// and a screenshot can open any state directly:
//
//   #/                                  all deals
//   #/?q=airpods&cat=Audio&store=Amazon&min=10&sort=strength&verdict=new-low
//   #/deal/<id>                         one deal
//   #/compare?a=..&b=..&c=..            side-by-side comparison
//   #/check?sale=149&was=249&usual=199  check your own deal
//   #/how                               how we check prices
//   #/?proof=<id>                       all deals, with that deal's 90-day
//                                       history drawer open (shareable link)
//
// window.__shotReady is false while a view renders and true once it is on
// screen, so a screenshot script knows when to capture. All state lives in
// the hash; nothing is fetched, nothing leaves the page. Typing in the search
// box updates only the grid and the count line (never the toolbar itself),
// so the input keeps focus while you type. The checker re-renders only its
// result area on input, for the same reason. The hero (intro + KPI strip)
// shows only on the deal list — detail, compare, check and how pages get a
// compact header so their content starts at the top of the viewport.
//
// v3 — the 90-day history drawer. Every card and detail page has a
// "View 90d Curve & Store Matrix" button that opens a modal drawer with
// the deal's 90-day price curve and cross-store matrix (proofDrawer from
// views.js). One modal shell is rendered per view; opening it fills the
// shell and records ?proof=<id> in the hash (replaceState, no re-render),
// closing it removes the param again. On the pristine main view (#/ with
// no search, filter or sort) the featured AirPods 4 drawer opens by
// default, so the proof is visible without a click; the same holds on the
// AirPods 4 detail page. Escape, the ✕ button and a click on the dimmed
// backdrop all close it. Focus moves into the drawer when it opens and
// back to the card's button when it closes, so keyboard users never lose
// their place.
//
// v4 — three new modules, all state in the hash (shareable links):
//   A. Cart Reality Audit. "?cart=<id1,id2>" (max 5) holds the cart; the
//      "+ Cart" toggle on every card and detail page adds/removes a deal
//      without a re-render (updateCartUI refreshes only the cart bar, the
//      cart drawer and the buttons, so scroll and search focus survive).
//      "?cartview=1" opens the cart drawer on load (screenshot #3).
//   B. Category Fake-Markdown Radar (radarPanel) renders above the grid.
//   C. Timing badges render on every card (views.js). The checker gains
//      a 5% cashback stacker ("?stack=1" pre-enables it).
import { CATEGORIES, CHECKED_LABEL, STORES, VERDICTS, VERDICT_RANK, belowTypicalPct, cartAudit, checkDeal, deals, money, realSaved, CART_MAX } from "./data.js";
import { card, cartBarHtml, cartDrawerHtml, checkerPage, checkerResult, compareTable, detail, howPage, missing, proofDrawer, radarPanel } from "./views.js";

const app = document.getElementById("app");
const statsEl = document.getElementById("stats");

function renderStats() {
  const realTotal = deals.reduce((s, d) => s + realSaved(d), 0);
  const newLows = deals.filter((d) => d.verdict === "new-low").length;
  const skips = deals.filter((d) => d.verdict === "skip").length;
  const best = [...deals].sort((a, b) => belowTypicalPct(b) - belowTypicalPct(a) || realSaved(b) - realSaved(a))[0];
  statsEl.innerHTML =
    `<div class="stat hot"><b>${deals.length}</b><span>deals checked today</span></div>` +
    `<div class="stat"><b>${money(Math.round(realTotal))}</b><span>real savings vs typical street price*</span></div>` +
    `<div class="stat"><b>${newLows}</b><span>new all-time lows</span></div>` +
    `<div class="stat"><b>${skips}</b><span>fake "was" markups flagged</span></div>` +
    `<div class="stat"><b>${STORES.length} stores</b><span>${STORES.join(" · ")}</span></div>` +
    `<div class="stat"><b>−${belowTypicalPct(best)}%</b><span>biggest real cut: ${best.title.slice(0, 34)}…</span></div>`;
}

// --- v4: the cart lives in the hash -----------------------------------------
// The hash is the source of truth: render() rebuilds the Set from it on
// every hashchange, and toggles update it via replaceState (no re-render).
let cart = new Set();
let cartOpen = false;
const dealById = (id) => deals.find((d) => d.id === id);
function cartDeals() {
  return [...cart].map(dealById).filter(Boolean);
}
function cartAuditNow() {
  return cartAudit(cartDeals());
}

function parseQuery(hash) {
  const q = hash.split("?")[1] || "";
  const p = new URLSearchParams(q);
  let sort = p.get("sort") || "strength";
  if (sort === "discount") sort = "below"; // v1 links used "discount" (vs was)
  const verdict = p.get("verdict") || (p.get("lows") === "1" ? "new-low" : "");
  // v4: ?cart=<id1,id2> — only real deal ids, deduped, max CART_MAX.
  const cartIds = (p.get("cart") || "")
    .split(",")
    .map((s) => s.trim())
    .filter((id) => id && dealById(id));
  const cartSet = new Set(cartIds.slice(0, CART_MAX));
  return {
    q: p.get("q") || "",
    cat: p.get("cat") || "",
    store: p.get("store") || "",
    min: Number(p.get("min") || 0),
    sort,
    verdict,
    proof: p.get("proof") || "",
    cart: cartSet,
    cartview: p.get("cartview") === "1",
    stack: p.get("stack") === "1",
  };
}

function stateToHash(s) {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.cat) p.set("cat", s.cat);
  if (s.store) p.set("store", s.store);
  if (s.min) p.set("min", String(s.min));
  if (s.sort !== "strength") p.set("sort", s.sort);
  if (s.verdict) p.set("verdict", s.verdict);
  if (s.proof) p.set("proof", s.proof);
  if (s.cart && s.cart.size) p.set("cart", [...s.cart].join(","));
  if (s.cartview) p.set("cartview", "1");
  if (s.stack) p.set("stack", "1");
  const qs = p.toString();
  return "#/" + (qs ? "?" + qs : "");
}

// Rewrite only the cart/cartview params of the current hash, keeping every
// other param (search, filters, proof) intact. Used by cart toggles, which
// must not re-render the view.
function syncCartHash() {
  const hash = location.hash || "#/";
  const [base, query] = hash.split("?");
  const p = new URLSearchParams(query || "");
  if (cart.size) p.set("cart", [...cart].join(","));
  else p.delete("cart");
  if (cartOpen) p.set("cartview", "1");
  else p.delete("cartview");
  const qs = p.toString();
  history.replaceState(null, "", base + (qs ? "?" + qs : ""));
}

function applyFilters(list, s) {
  let out = list.slice();
  if (s.q) {
    const needle = s.q.toLowerCase();
    out = out.filter((d) => (d.title + " " + d.store + " " + d.category).toLowerCase().includes(needle));
  }
  if (s.cat) out = out.filter((d) => d.category === s.cat);
  if (s.store) out = out.filter((d) => d.store === s.store);
  if (s.min) out = out.filter((d) => belowTypicalPct(d) >= s.min);
  if (s.verdict) out = out.filter((d) => d.verdict === s.verdict);
  if (s.sort === "strength") out.sort((a, b) => VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] || belowTypicalPct(b) - belowTypicalPct(a));
  else if (s.sort === "below") out.sort((a, b) => belowTypicalPct(b) - belowTypicalPct(a));
  else if (s.sort === "saved") out.sort((a, b) => realSaved(b) - realSaved(a));
  else if (s.sort === "price") out.sort((a, b) => a.price - b.price);
  else if (s.sort === "price-desc") out.sort((a, b) => b.price - a.price);
  return out;
}

let compare = new Set();
try {
  compare = new Set(JSON.parse(sessionStorage.getItem("fp-compare") || "[]"));
} catch {
  compare = new Set();
}
function saveCompare() {
  try {
    sessionStorage.setItem("fp-compare", JSON.stringify([...compare]));
  } catch {
    /* storage unavailable — compare still works for this page view */
  }
}

function option(value, label, current) {
  return `<option value="${value}"${value === current ? " selected" : ""}>${label}</option>`;
}

function countLine(shown, s) {
  const bits = [];
  if (s.q) bits.push(`matching “${s.q}”`);
  if (s.cat) bits.push(s.cat);
  if (s.store) bits.push(s.store);
  if (s.min) bits.push(`−${s.min}% vs typical or more`);
  if (s.verdict) bits.push(VERDICTS[s.verdict].plural);
  return `Showing <b>${shown.length} of ${deals.length} deals</b>${bits.length ? ` — ${bits.join(" · ")}` : ""}${shown.length !== deals.length ? ` <a class="clear" href="#/">Clear filters</a>` : ""}`;
}

function gridHtml(shown) {
  if (shown.length === 0) {
    return `<div class="empty"><b>No deals match that.</b>Try a different search, or clear the filters — all ${deals.length} deals are still here.<br><a href="#/">Show all deals &rarr;</a></div>`;
  }
  return `<div class="grid">${shown.map((d) => card(d, compare.has(d.id), cart.has(d.id), cart.size >= CART_MAX)).join("")}</div>`;
}

function verdictCounts() {
  const c = { "": deals.length, "new-low": 0, strong: 0, routine: 0, skip: 0 };
  for (const d of deals) c[d.verdict]++;
  return c;
}

// --- v3 drawer -------------------------------------------------------------
// One modal shell per view. openDrawer fills it with proofDrawer(deal) and
// records ?proof=<id> in the hash; closeDrawer hides it and drops the
// param. The shell is rendered by listView/detail with the initial deal
// already inside when the view opens with a drawer (deep link, or the
// AirPods 4 default on the pristine main view).
function drawerShell(openDeal) {
  const inner = openDeal ? proofDrawer(openDeal) : "";
  return `<div class="drawer-overlay${openDeal ? " open" : ""}" id="drawer-overlay"><div class="drawer" role="dialog" aria-modal="true" aria-label="90-day price history and cross-store matrix" id="drawer-panel">${inner}</div></div>`;
}

function setProofParam(id) {
  const hash = location.hash || "#/";
  const [base, query] = hash.split("?");
  const p = new URLSearchParams(query || "");
  if (id) p.set("proof", id);
  else p.delete("proof");
  const qs = p.toString();
  history.replaceState(null, "", base + (qs ? "?" + qs : ""));
}

function openDrawer(id) {
  const d = deals.find((x) => x.id === id);
  const overlay = document.getElementById("drawer-overlay");
  const panel = document.getElementById("drawer-panel");
  if (!d || !overlay || !panel) return false;
  closeCart();
  panel.innerHTML = proofDrawer(d);
  overlay.classList.add("open");
  document.querySelectorAll("[data-proof]").forEach((b) => b.setAttribute("aria-expanded", b.dataset.proof === id ? "true" : "false"));
  setProofParam(id);
  // Keyboard users land on the drawer's close button when it opens.
  // preventScroll: the drawer is a fixed overlay, and focusing must not
  // move the page underneath (a screenshot of the cover caught the page
  // scrolled to the AirPods 4 card because focus() scrolled it into view).
  const closer = panel.querySelector("[data-drawer-close]");
  if (closer) closer.focus({ preventScroll: true });
  return true;
}

function closeDrawer() {
  const overlay = document.getElementById("drawer-overlay");
  if (!overlay || !overlay.classList.contains("open")) return false;
  // Remember which deal was open, so focus can return to its button.
  const openId = document.querySelector("#drawer-panel [data-deal]")?.dataset.deal || "";
  overlay.classList.remove("open");
  document.querySelectorAll("[data-proof]").forEach((b) => b.setAttribute("aria-expanded", "false"));
  setProofParam("");
  if (openId) document.querySelector(`[data-proof="${openId}"]`)?.focus({ preventScroll: true });
  return true;
}

// --- v4 cart drawer ----------------------------------------------------------
// A second modal shell per view, for the Cart Reality Audit. openCart fills
// it with cartDrawerHtml(audit) and records ?cartview=1 in the hash;
// closeCart hides it and drops the param. Opening one drawer closes the
// other, so the two modals never stack. Like the proof drawer, the cart
// drawer is driven by replaceState — no re-render, no scroll jump.
function cartShell(open, audit) {
  const inner = open ? cartDrawerHtml(audit) : "";
  return `<div class="drawer-overlay cart-overlay${open ? " open" : ""}" id="cart-overlay"><div class="drawer cart-drawer" role="dialog" aria-modal="true" aria-label="Cart reality audit" id="cart-panel">${inner}</div></div>`;
}

function openCart() {
  const overlay = document.getElementById("cart-overlay");
  const panel = document.getElementById("cart-panel");
  if (!overlay || !panel) return false;
  closeDrawer();
  panel.innerHTML = cartDrawerHtml(cartAuditNow());
  overlay.classList.add("open");
  cartOpen = true;
  syncCartHash();
  const closer = panel.querySelector("[data-cart-close]");
  if (closer) closer.focus({ preventScroll: true });
  return true;
}

function closeCart() {
  const overlay = document.getElementById("cart-overlay");
  if (!overlay || !overlay.classList.contains("open")) return false;
  overlay.classList.remove("open");
  cartOpen = false;
  syncCartHash();
  document.getElementById("cart-open")?.focus({ preventScroll: true });
  return true;
}

// Refresh only the cart UI after a toggle: the sticky cart bar, the cart
// drawer content (when open), every "+ Cart" button's label/state, and the
// nav cart count. The grid, the search box and the scroll position are
// untouched, so adding a deal never yanks the page.
function updateCartUI() {
  const audit = cartAuditNow();
  const bar = document.getElementById("cartbar-wrap");
  if (bar) bar.innerHTML = cartBarHtml(audit, compare.size > 0);
  const panel = document.getElementById("cart-panel");
  if (panel && cartOpen) panel.innerHTML = cartDrawerHtml(audit);
  document.querySelectorAll("[data-cart]").forEach((b) => {
    const inCart = cart.has(b.dataset.cart);
    b.setAttribute("aria-pressed", inCart ? "true" : "false");
    b.textContent = inCart ? "✓ In cart" : "+ Cart";
    b.disabled = !inCart && cart.size >= CART_MAX;
  });
  const navN = document.getElementById("nav-cart-n");
  if (navN) navN.textContent = cart.size ? ` (${cart.size})` : "";
  syncCartHash();
}

function toggleCart(id) {
  if (!dealById(id)) return;
  if (cart.has(id)) cart.delete(id);
  else if (cart.size < CART_MAX) cart.add(id);
  updateCartUI();
}

// Delegated clicks, bound once: the grid re-renders on every keystroke, so
// per-button listeners would not survive. The overlays are inside #app, so
// backdrop clicks (target === overlay) and the ✕ buttons are handled here
// too, alongside the [data-proof] open buttons, the [data-cart] toggles,
// the [data-cart-remove] buttons, and the [data-cmp] compare toggles
// (compare still re-renders the view, so it stays in render()).
app.addEventListener("click", (e) => {
  const proofBtn = e.target.closest("[data-proof]");
  if (proofBtn) {
    openDrawer(proofBtn.dataset.proof);
    return;
  }
  if (e.target.closest("[data-drawer-close]")) {
    closeDrawer();
    return;
  }
  if (e.target.id === "drawer-overlay") {
    closeDrawer();
    return;
  }
  const cartBtn = e.target.closest("[data-cart]");
  if (cartBtn) {
    toggleCart(cartBtn.dataset.cart);
    return;
  }
  const cartRemove = e.target.closest("[data-cart-remove]");
  if (cartRemove) {
    cart.delete(cartRemove.dataset.cartRemove);
    updateCartUI();
    return;
  }
  if (e.target.closest("[data-cart-close]")) {
    closeCart();
    return;
  }
  if (e.target.id === "cart-overlay") {
    closeCart();
    return;
  }
  if (e.target.id === "cart-open") {
    openCart();
    return;
  }
  if (e.target.id === "cart-clear") {
    cart.clear();
    updateCartUI();
    return;
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!closeCart()) closeDrawer();
  }
});

function listView(s) {
  const shown = applyFilters(deals, s);
  const c = verdictCounts();
  const chip = (value, label) =>
    `<button class="chip" data-verdict="${value}" aria-pressed="${s.verdict === value ? "true" : "false"}">${label} <span class="n">${c[value]}</span></button>`;
  const toolbar =
    `<div class="toolbar">
      <div class="searchrow">
        <input type="search" id="q" placeholder="Search deals — try “airpods”, “TV”, “Dyson”…" value="${s.q.replaceAll('"', "&quot;")}" aria-label="Search deals">
        <select id="cat" aria-label="Category">${option("", "All categories", s.cat)}${CATEGORIES.map((cc) => option(cc, cc, s.cat)).join("")}</select>
        <select id="store" aria-label="Store">${option("", "All stores", s.store)}${STORES.map((st) => option(st, st, s.store)).join("")}</select>
        <select id="min" aria-label="Minimum cut vs typical price">${option("0", "Any real cut", String(s.min))}${option("10", "10% below typical or more", String(s.min))}${option("20", "20% below typical or more", String(s.min))}${option("30", "30% below typical or more", String(s.min))}</select>
        <select id="sort" aria-label="Sort by">
          ${option("strength", "Verdict strength", s.sort)}
          ${option("below", "% below typical", s.sort)}
          ${option("saved", "Biggest real saving", s.sort)}
          ${option("price", "Lowest price", s.sort)}
          ${option("price-desc", "Highest price", s.sort)}
        </select>
      </div>
      <div class="chips" role="group" aria-label="Verdict filter">
        ${chip("", "All")}
        ${chip("new-low", "★ All-Time Low")}
        ${chip("strong", "Strong")}
        ${chip("routine", "Routine")}
        ${chip("skip", "Skip / Inflated")}
      </div>
      <div class="toggles">
        <span>Every deal shows its price proof and source. <a href="#/how">How we check &rarr;</a></span>
        <span>Got a deal we didn't list? <a href="#/check">Check your own deal &rarr;</a></span>
      </div>
    </div>
    <p class="countline" id="countline">${countLine(shown, s)}</p>`;

  const bar =
    compare.size > 0
      ? `<div class="comparebar"><span>${compare.size} deal${compare.size > 1 ? "s" : ""} selected to compare</span><span class="spacer"></span><button id="cmp-clear" type="button">Clear</button><button id="cmp-go" class="primary" type="button" ${compare.size < 2 ? "disabled" : ""}>Compare ${compare.size < 2 ? "(pick 2+)" : ""}</button></div>`
      : "";

  // v3: which drawer opens on load. A ?proof=<id> deep link wins; otherwise
  // the pristine main view (no search, filter or sort) opens the featured
  // AirPods 4 drawer by default.
  const pristine = !s.q && !s.cat && !s.store && !s.min && !s.verdict && s.sort === "strength";
  const openId = s.proof || (pristine ? "airpods-4" : "");
  const openDeal = openId ? deals.find((d) => d.id === openId) || null : null;
  // v4: the cart drawer opens on load only for the ?cartview=1 deep link
  // (screenshot #3) — never by default, so the cover stays clean.
  const audit = cartAuditNow();

  return toolbar + radarPanel() + `<div id="gridwrap">${gridHtml(shown)}</div>` + bar + `<div id="cartbar-wrap">${cartBarHtml(audit, compare.size > 0)}</div>` + `<p class="countline" style="margin-top:18px">*Real savings count one of each deal at its sale price vs its 90-day typical street price — not the store's "was" price. Streaming is priced per month.</p>` + drawerShell(openDeal) + cartShell(s.cartview, audit);
}

// Re-render only the grid + count line, keeping the toolbar (and the search
// box's focus) intact. Used for live search typing.
function refreshGrid(s) {
  const shown = applyFilters(deals, s);
  const wrap = document.getElementById("gridwrap");
  const line = document.getElementById("countline");
  if (wrap) {
    wrap.innerHTML = gridHtml(shown);
    bindCompareButtons();
  }
  if (line) line.innerHTML = countLine(shown, s);
}

function readStateFromDom() {
  const q = document.getElementById("q");
  if (!q) return null;
  return {
    q: q.value,
    cat: document.getElementById("cat").value,
    store: document.getElementById("store").value,
    min: Number(document.getElementById("min").value || 0),
    sort: document.getElementById("sort").value,
    verdict: document.querySelector('.chip[aria-pressed="true"]')?.dataset.verdict || "",
    // v4: carry the cart + open drawers through search/filter changes,
    // so typing in the search box never empties the cart.
    cart: new Set(cart),
    cartview: cartOpen,
    proof: document.querySelector("#drawer-panel [data-deal]")?.dataset.deal || "",
  };
}

function bindList() {
  const go = (next) => {
    location.hash = stateToHash(next);
  };
  const q = document.getElementById("q");
  q.addEventListener("input", () => {
    const next = readStateFromDom();
    history.replaceState(null, "", stateToHash(next));
    refreshGrid(next);
  });
  for (const id of ["cat", "store", "min", "sort"]) {
    document.getElementById(id).addEventListener("change", () => go(readStateFromDom()));
  }
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const next = readStateFromDom();
      next.verdict = chip.dataset.verdict;
      go(next);
    });
  });
  bindCompareButtons();
  const clear = document.getElementById("cmp-clear");
  if (clear) {
    clear.addEventListener("click", () => {
      compare.clear();
      saveCompare();
      render();
    });
  }
  const goBtn = document.getElementById("cmp-go");
  if (goBtn) {
    goBtn.addEventListener("click", () => {
      const ids = [...compare].slice(0, 3);
      location.hash = "#/compare?" + ids.map((id, i) => `${"abc"[i]}=${id}`).join("&");
    });
  }
}

function bindCompareButtons() {
  document.querySelectorAll("[data-cmp]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.cmp;
      if (compare.has(id)) compare.delete(id);
      else if (compare.size < 3) compare.add(id);
      saveCompare();
      render();
    });
  });
}

function bindChecker(stack) {
  const saleEl = document.getElementById("ck-sale");
  const wasEl = document.getElementById("ck-was");
  const usualEl = document.getElementById("ck-usual");
  const stackEl = document.getElementById("ck-stack");
  if (!saleEl || !wasEl || !usualEl) return;
  let stackOn = !!stack;
  const update = () => {
    const sale = parseFloat(saleEl.value);
    const was = parseFloat(wasEl.value);
    const usual = parseFloat(usualEl.value);
    stackOn = stackEl ? stackEl.checked : stackOn;
    const p = new URLSearchParams();
    if (saleEl.value) p.set("sale", saleEl.value);
    if (wasEl.value) p.set("was", wasEl.value);
    if (usualEl.value) p.set("usual", usualEl.value);
    if (stackOn) p.set("stack", "1");
    history.replaceState(null, "", "#/check" + (p.toString() ? "?" + p.toString() : ""));
    const res = document.getElementById("ck-result");
    if (res) res.innerHTML = checkerResult(checkDeal(sale, was, usual), sale, was, usual, stackOn);
  };
  for (const el of [saleEl, wasEl, usualEl]) el.addEventListener("input", update);
  if (stackEl) stackEl.addEventListener("change", update);
  const ex = document.getElementById("ck-example");
  if (ex) {
    ex.addEventListener("click", (e) => {
      e.preventDefault();
      saleEl.value = "149";
      wasEl.value = "249";
      usualEl.value = "199";
      update();
    });
  }
}

function render() {
  window.__shotReady = false;
  const hash = location.hash || "#/";
  const dealMatch = hash.match(/^#\/deal\/([^/?]+)/);
  const compareMatch = hash.startsWith("#/compare");
  const howMatch = hash.startsWith("#/how");
  const checkMatch = hash.startsWith("#/check");
  const isList = !dealMatch && !compareMatch && !howMatch && !checkMatch;
  // Compact header on sub-pages: the hero (intro + KPI strip) belongs to the
  // deal list; hiding it on detail/compare/check/how keeps their content at
  // the top of the viewport (and inside the screenshot frame).
  document.body.classList.toggle("compact", !isList);
  // v4: the cart is rebuilt from the hash on every render (hashchange), so
  // a deep link (?cart=…&cartview=1) and a plain navigation always agree.
  const s = parseQuery(hash);
  cart = s.cart;
  cartOpen = s.cartview;

  if (dealMatch) {
    const found = deals.find((d) => d.id === decodeURIComponent(dealMatch[1]));
    document.title = `${found ? found.title : "Not found"} | Friday Proof`;
    // v3: the drawer opens on the AirPods 4 detail page by default, or
    // for whichever deal a ?proof=<id> deep link names.
    const qp = new URLSearchParams(hash.split("?")[1] || "");
    const proofId = qp.get("proof") || (found && found.id === "airpods-4" ? "airpods-4" : "");
    const openDeal = proofId ? deals.find((d) => d.id === proofId) || null : null;
    const audit = cartAuditNow();
    app.innerHTML = found
      ? detail(found, deals.filter((d) => d.category === found.category && d.id !== found.id), cart.has(found.id), cart.size >= CART_MAX) +
        drawerShell(openDeal) +
        `<div id="cartbar-wrap">${cartBarHtml(audit, compare.size > 0)}</div>` +
        cartShell(cartOpen, audit)
      : missing();
    bindCompareButtons();
  } else if (compareMatch) {
    const p = new URLSearchParams(hash.split("?")[1] || "");
    const ids = ["a", "b", "c"].map((k) => p.get(k)).filter(Boolean);
    const list = ids.map((id) => deals.find((d) => d.id === id)).filter(Boolean);
    document.title = "Compare deals | Friday Proof";
    app.innerHTML = list.length >= 2 ? compareTable(list) : `<div class="empty"><b>Pick at least two deals to compare.</b><a href="#/">Back to all deals &rarr;</a></div>`;
  } else if (checkMatch) {
    const p = new URLSearchParams(hash.split("?")[1] || "");
    const vals = { sale: p.get("sale") || "", was: p.get("was") || "", usual: p.get("usual") || "" };
    const stack = p.get("stack") === "1";
    document.title = "Check your own deal | Friday Proof";
    app.innerHTML = checkerPage(vals, stack);
    bindChecker(stack);
  } else if (howMatch) {
    document.title = "How we check prices | Friday Proof";
    app.innerHTML = howPage();
  } else {
    document.title = "Friday Proof — Black Friday Deal Finder";
    app.innerHTML = listView(s);
    bindList();
  }
  // v4: keep the nav cart count in sync after every render.
  const navN = document.getElementById("nav-cart-n");
  if (navN) navN.textContent = cart.size ? ` (${cart.size})` : "";
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

// v4: the nav "Cart" link opens the cart drawer. On a view that renders
// the cart shell (list / detail) it opens in place; on compare / check /
// how it navigates to the list with the cart deep link (?cart=…&cartview=1).
const navCart = document.getElementById("nav-cart");
if (navCart) {
  navCart.addEventListener("click", (e) => {
    e.preventDefault();
    if (document.getElementById("cart-overlay")) {
      openCart();
    } else {
      const p = new URLSearchParams();
      if (cart.size) p.set("cart", [...cart].join(","));
      p.set("cartview", "1");
      location.hash = "#/?" + p.toString();
    }
  });
}

renderStats();
window.addEventListener("hashchange", render);
render();
