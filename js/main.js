// Page wiring: input → clean → split → decode → layout B rendering.
// Pure formatting lives in ui.js/i18n.js; this file only touches the DOM.
import { normalizeHexDump } from "./parser/cleaner.js";
import { splitMessages } from "./parser/splitter.js";
import { parseMessage } from "./parser/decode.js";
import { maskPan, amountChipText, fieldColor, buildSummary } from "./ui.js";
import { setLang, getLang, t } from "./i18n.js";
import { SAMPLE_DUMP } from "../test/vectors.mjs";

const $ = (sel) => document.querySelector(sel);
const input = $("#input");
const messagesEl = $("#messages");
const errorEl = $("#error");
const encodingEl = $("#encoding");
let encoding = "ascii";

const KIND_KEYS = {
  request: "msg.request",
  response: "msg.response",
  advice: "msg.advice",
  "advice-response": "msg.adviceResponse",
};

function applyLang() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  $("#lang-toggle").textContent = getLang() === "en" ? "Tiếng Việt" : "English";
  document.documentElement.lang = getLang();
}

function showError(key) {
  errorEl.textContent = t(key);
  errorEl.classList.add("show");
}

function hideError() {
  errorEl.classList.remove("show");
  errorEl.textContent = "";
}

function localize(meaning) {
  return meaning ? meaning[getLang()] || meaning.en : "";
}

function chip(label, value) {
  const c = document.createElement("span");
  c.className = "chip";
  const l = document.createElement("span");
  l.className = "chip-label";
  l.textContent = label;
  const v = document.createElement("span");
  v.textContent = value;
  c.append(l, v);
  return c;
}

function buildSummaryStrip(r, s) {
  const strip = document.createElement("div");
  strip.className = "summary";

  const kind = document.createElement("span");
  kind.className = "kindbadge";
  kind.textContent = t(KIND_KEYS[r.kind] || "msg.unknown");
  strip.appendChild(kind);

  if (s.mti) strip.appendChild(chip(t("summary.mti"), `${s.mti}${localize(r.mtiMeaning) ? ` — ${localize(r.mtiMeaning)}` : ""}`));

  if (s.processingCode != null) {
    const f3 = r.fields.find((f) => f.de === 3);
    const meaning = f3 ? localize(f3.meaning) : "";
    strip.appendChild(chip(t("summary.proc"), s.processingCode + (meaning ? ` — ${meaning}` : "")));
  }
  if (s.responseCode != null) {
    const f39 = r.fields.find((f) => f.de === 39);
    const meaning = f39 ? localize(f39.meaning) : "";
    strip.appendChild(chip(t("summary.resp"), s.responseCode + (meaning ? ` — ${meaning}` : "")));
  }
  if (s.amount != null) {
    const f49 = r.fields.find((f) => f.de === 49);
    const code = f49 ? f49.value : null;
    strip.appendChild(chip(t("summary.amount"), amountChipText(s.amount, code, getLang())));
  }
  if (s.pan) strip.appendChild(chip(t("summary.pan"), maskPan(s.pan)));
  if (s.stan != null) strip.appendChild(chip(t("summary.stan"), s.stan));
  if (s.rrn != null) strip.appendChild(chip(t("summary.rrn"), s.rrn));
  return strip;
}

function buildHexPanel(r, m) {
  const wrap = document.createElement("div");
  wrap.className = "hex";
  const h = document.createElement("h2");
  h.textContent = t("hex.title");
  wrap.appendChild(h);

  const grid = document.createElement("div");
  grid.className = "hex-grid";
  const bytes = m.hex.length / 2;
  const idxByDe = new Map(r.fields.map((f, i) => [f.de, i]));
  const byteDe = new Array(bytes).fill(null);
  for (const f of r.fields) {
    for (let b = f.startByte; b < f.endByte && b < bytes; b++) {
      if (byteDe[b] === null) byteDe[b] = f.de;
    }
  }
  for (let rowStart = 0; rowStart < bytes; rowStart += 16) {
    const row = document.createElement("div");
    row.className = "hex-row";
    const off = document.createElement("span");
    off.className = "hex-off";
    off.textContent = rowStart.toString(16).padStart(4, "0").toUpperCase();
    row.appendChild(off);
    for (let b = rowStart; b < rowStart + 16; b++) {
      const sp = document.createElement("span");
      sp.className = "b";
      if (b >= bytes) {
        sp.classList.add("pad");
        sp.textContent = "  ";
      } else {
        sp.textContent = m.hex.substr(b * 2, 2).toUpperCase();
        const de = byteDe[b];
        if (de !== null) {
          sp.dataset.de = String(de);
          sp.style.background = fieldColor(idxByDe.get(de));
        } else {
          sp.classList.add("neutral");
        }
      }
      row.appendChild(sp);
    }
    grid.appendChild(row);
  }
  wrap.appendChild(grid);
  return wrap;
}

function buildFieldList(r) {
  const wrap = document.createElement("div");
  wrap.className = "fields";
  const h = document.createElement("h2");
  h.textContent = t("list.title");
  wrap.appendChild(h);

  if (!r.fields.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "—";
    wrap.appendChild(empty);
    return wrap;
  }
  for (const f of r.fields) {
    const row = document.createElement("div");
    row.className = "field" + (f.uncertain ? " uncertain" : "");
    if (f.de != null) row.dataset.de = String(f.de);

    const deEl = document.createElement("span");
    deEl.className = "de";
    deEl.textContent = String(f.de);
    row.appendChild(deEl);

    const nameEl = document.createElement("span");
    nameEl.className = "name";
    nameEl.textContent = f.name ? f.name[getLang()] || f.name.en : `DE ${f.de}`;
    row.appendChild(nameEl);

    const valEl = document.createElement("span");
    valEl.className = "value";
    if (f.value !== null) {
      valEl.textContent = f.value;
      const meaning = localize(f.meaning);
      if (meaning) {
        const mm = document.createElement("span");
        mm.className = "meaning";
        mm.textContent = ` · ${meaning}`;
        valEl.appendChild(mm);
      }
    } else {
      valEl.textContent = f.uncertain ? "⚠" : "—";
    }
    row.appendChild(valEl);

    const rawEl = document.createElement("span");
    rawEl.className = "raw";
    rawEl.textContent = f.rawHex || "—";
    row.appendChild(rawEl);

    wrap.appendChild(row);
  }
  return wrap;
}

function attachHover(section) {
  section.addEventListener("mouseover", (e) => {
    const el = e.target.closest("[data-de]");
    if (!el || !el.dataset.de) return;
    section.querySelectorAll(`[data-de="${el.dataset.de}"]`).forEach((n) => n.classList.add("hl"));
  });
  section.addEventListener("mouseout", (e) => {
    const el = e.target.closest("[data-de]");
    if (!el || !el.dataset.de) return;
    section.querySelectorAll(`[data-de="${el.dataset.de}"]`).forEach((n) => n.classList.remove("hl"));
  });
}

function renderMessage(m) {
  const r = parseMessage(m.hex, { encoding });
  const section = document.createElement("section");
  section.className = "msg";

  const banners = new Set();
  for (const e of r.errors) {
    banners.add(/no public format/.test(e.message) ? "err.unknownField" : "err.uncertain");
  }
  if (!r.ok && r.fields.length === 0) banners.add("err.uncertain");

  section.appendChild(buildSummaryStrip(r, buildSummary(r)));
  for (const key of banners) {
    const b = document.createElement("div");
    b.className = "banner";
    b.textContent = t(key);
    section.appendChild(b);
  }

  const split = document.createElement("div");
  split.className = "split";
  split.append(buildHexPanel(r, m), buildFieldList(r));
  section.appendChild(split);
  attachHover(section);
  return section;
}

function parseAll() {
  const clean = normalizeHexDump(input.value);
  if (!clean) {
    messagesEl.replaceChildren();
    showError("err.empty");
    return;
  }
  hideError();
  const msgs = splitMessages(clean);
  const frag = document.createDocumentFragment();
  for (const m of msgs) frag.appendChild(renderMessage(m));
  messagesEl.replaceChildren(frag);
}

$("#parse").addEventListener("click", parseAll);
$("#sample").addEventListener("click", () => {
  input.value = SAMPLE_DUMP;
  parseAll();
});
$("#clear").addEventListener("click", () => {
  input.value = "";
  messagesEl.replaceChildren();
  hideError();
  input.focus();
});
encodingEl.addEventListener("change", () => {
  encoding = encodingEl.value;
  if (input.value) parseAll();
});
$("#lang-toggle").addEventListener("click", () => {
  const next = getLang() === "en" ? "vi" : "en";
  setLang(next);
  try {
    localStorage.setItem("lang", next);
  } catch {
    /* storage unavailable (private mode) — lang just won't persist */
  }
  applyLang();
  if (input.value) parseAll();
});

try {
  const saved = localStorage.getItem("lang");
  if (saved === "vi" || saved === "en") setLang(saved);
} catch {
  /* storage unavailable — default English */
}
applyLang();
