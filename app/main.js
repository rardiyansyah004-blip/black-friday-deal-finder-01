// Friday Proof — app logic. Hash routes, so every view is a shareable link
// and a screenshot can open any state directly:
//
//   #/                                  all deals
//   #/?q=airpods&cat=Audio&store=Amazon&min=50&sort=discount&verdict=new-low&lows=1
//   #/deal/<id>                         one deal
//   #/compare?a=..&b=..&c=..            side-by-side comparison
//   #/how                               how we check prices
//
// window.__shotReady is false while a view renders and true once it is on
// screen, so a screenshot script knows when to capture. All state lives in
// the hash; nothing is fetched, nothing leaves the page. Typing in the search
// box updates only the grid and the count line (never the toolbar itself),
// so the input keeps focus while you type.
import { CATEGORIES, CHECKED_LABEL, STORES, VERDICTS, deals, discountPct, money, saved } from "./data.js";
import { card, compareTable, detail, howPage, missing } from "./views.js";

const app = document.getElementById("app");
const statsEl = document.getElementById("stats");

function renderStats() {
  const totalSaved = deals.reduce((s, d) => s + saved(d), 0);
  const newLows = deals.filter((d) => d.verdict === "new-low").length;
  const best = [...deals].sort((a, b) => discountPct(b) - discountPct(a))[0];
  statsEl.innerHTML =
    `<div class="stat hot"><b>${deals.length}</b><span>deals checked today</span></div>` +
    `<div class="stat"><b>${money(Math.round(totalSaved))}</b><span>total savings if you bought one of each*</span></div>` +
    `<div class="stat"><b>${newLows}</b><span>new all-time lows</span></div>` +
    `<div class="stat"><b>${STORES.length} stores</b><span>${STORES.join(" · ")}</span></div>` +
    `<div class="stat"><b>−${discountPct(best)}%</b><span>biggest cut: ${best.title.slice(0, 34)}…</span></div>` +
    `<div class="stat"><b>${CHECKED_LABEL}</b><span>every price checked</span></div>`;
}

function parseQuery(hash) {
  const q = hash.split("?")[1] || "";
  const p = new URLSearchParams(q);
  return {
    q: p.get("q") || "",
    cat: p.get("cat") || "",
    store: p.get("store") || "",
    min: Number(p.get("min") || 0),
    sort: p.get("sort") || "discount",
    verdict: p.get("verdict") || "",
    lows: p.get("lows") === "1",
  };
}

function stateToHash(s) {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.cat) p.set("cat", s.cat);
  if (s.store) p.set("store", s.store);
  if (s.min) p.set("min", String(s.min));
  if (s.sort !== "discount") p.set("sort", s.sort);
  if (s.verdict) p.set("verdict", s.verdict);
  if (s.lows) p.set("lows", "1");
  const qs = p.toString();
  return "#/" + (qs ? "?" + qs : "");
}

function applyFilters(list, s) {
  let out = list.slice();
  if (s.q) {
    const needle = s.q.toLowerCase();
    out = out.filter((d) => (d.title + " " + d.store + " " + d.category).toLowerCase().includes(needle));
  }
  if (s.cat) out = out.filter((d) => d.category === s.cat);
  if (s.store) out = out.filter((d) => d.store === s.store);
  if (s.min) out = out.filter((d) => discountPct(d) >= s.min);
  if (s.verdict) out = out.filter((d) => d.verdict === s.verdict);
  if (s.lows) out = out.filter((d) => d.verdict === "new-low");
  if (s.sort === "discount") out.sort((a, b) => discountPct(b) - discountPct(a));
  else if (s.sort === "saved") out.sort((a, b) => saved(b) - saved(a));
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
  if (s.min) bits.push(`−${s.min}% or more`);
  if (s.verdict) bits.push(VERDICTS[s.verdict].label.toLowerCase() + "s");
  if (s.lows && s.verdict !== "new-low") bits.push("new lows");
  return `Showing <b>${shown.length} of ${deals.length} deals</b>${bits.length ? ` — ${bits.join(" · ")}` : ""}${shown.length !== deals.length ? ` <a class="clear" href="#/">Clear filters</a>` : ""}`;
}

function gridHtml(shown) {
  if (shown.length === 0) {
    return `<div class="empty"><b>No deals match that.</b>Try a different search, or clear the filters — all ${deals.length} deals are still here.<br><a href="#/">Show all deals &rarr;</a></div>`;
  }
  return `<div class="grid">${shown.map((d) => card(d, compare.has(d.id))).join("")}</div>`;
}

function listView(s) {
  const shown = applyFilters(deals, s);
  const toolbar =
    `<div class="toolbar">
      <div class="searchrow">
        <input type="search" id="q" placeholder="Search deals — try “airpods”, “TV”, “Dyson”…" value="${s.q.replaceAll('"', "&quot;")}" aria-label="Search deals">
        <select id="cat" aria-label="Category">${option("", "All categories", s.cat)}${CATEGORIES.map((c) => option(c, c, s.cat)).join("")}</select>
        <select id="store" aria-label="Store">${option("", "All stores", s.store)}${STORES.map((c) => option(c, c, s.store)).join("")}</select>
        <select id="min" aria-label="Minimum discount">${option("0", "Any discount", String(s.min))}${option("25", "25% off or more", String(s.min))}${option("40", "40% off or more", String(s.min))}${option("50", "50% off or more", String(s.min))}</select>
        <select id="sort" aria-label="Sort by">
          ${option("discount", "Biggest discount", s.sort)}
          ${option("saved", "Biggest $ saved", s.sort)}
          ${option("price", "Lowest price", s.sort)}
          ${option("price-desc", "Highest price", s.sort)}
        </select>
      </div>
      <div class="chips" role="group" aria-label="Verdict filter">
        <button class="chip" data-verdict="" aria-pressed="${s.verdict === "" && !s.lows ? "true" : "false"}">All verdicts</button>
        <button class="chip" data-verdict="new-low" aria-pressed="${s.verdict === "new-low" ? "true" : "false"}">★ New lows only</button>
        <button class="chip" data-verdict="strong" aria-pressed="${s.verdict === "strong" ? "true" : "false"}">Strong deals</button>
        <button class="chip" data-verdict="routine" aria-pressed="${s.verdict === "routine" ? "true" : "false"}">Routine sales</button>
      </div>
      <div class="toggles">
        <label><input type="checkbox" id="lows" ${s.lows ? "checked" : ""}> New lows only</label>
        <span>Every deal shows its check time and source. <a href="#/how">How we check &rarr;</a></span>
      </div>
    </div>
    <p class="countline" id="countline">${countLine(shown, s)}</p>`;

  const bar =
    compare.size > 0
      ? `<div class="comparebar"><span>${compare.size} deal${compare.size > 1 ? "s" : ""} selected to compare</span><span class="spacer"></span><button id="cmp-clear" type="button">Clear</button><button id="cmp-go" class="primary" type="button" ${compare.size < 2 ? "disabled" : ""}>Compare ${compare.size < 2 ? "(pick 2+)" : ""}</button></div>`
      : "";

  return toolbar + `<div id="gridwrap">${gridHtml(shown)}</div>` + bar + `<p class="countline" style="margin-top:18px">*Total savings counts one of each deal at its sale price vs its usual price. Streaming is priced per month.</p>`;
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
    lows: document.getElementById("lows").checked,
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
  document.getElementById("lows").addEventListener("change", () => go(readStateFromDom()));
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const next = readStateFromDom();
      next.verdict = chip.dataset.verdict;
      if (chip.dataset.verdict === "new-low") next.lows = true;
      else if (next.verdict === "") next.lows = false;
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

function render() {
  window.__shotReady = false;
  const hash = location.hash || "#/";
  const dealMatch = hash.match(/^#\/deal\/([^/?]+)/);
  const compareMatch = hash.startsWith("#/compare");
  const howMatch = hash.startsWith("#/how");

  if (dealMatch) {
    const found = deals.find((d) => d.id === decodeURIComponent(dealMatch[1]));
    document.title = `${found ? found.title : "Not found"} | Friday Proof`;
    app.innerHTML = found ? detail(found, deals.filter((d) => d.category === found.category && d.id !== found.id)) : missing();
    bindCompareButtons();
  } else if (compareMatch) {
    const p = new URLSearchParams(hash.split("?")[1] || "");
    const ids = ["a", "b", "c"].map((k) => p.get(k)).filter(Boolean);
    const list = ids.map((id) => deals.find((d) => d.id === id)).filter(Boolean);
    document.title = "Compare deals | Friday Proof";
    app.innerHTML = list.length >= 2 ? compareTable(list) : `<div class="empty"><b>Pick at least two deals to compare.</b><a href="#/">Back to all deals &rarr;</a></div>`;
  } else if (howMatch) {
    document.title = "How we check prices | Friday Proof";
    app.innerHTML = howPage();
  } else {
    document.title = "Friday Proof — Black Friday Deal Finder";
    const s = parseQuery(hash);
    app.innerHTML = listView(s);
    bindList();
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

renderStats();
window.addEventListener("hashchange", render);
render();
