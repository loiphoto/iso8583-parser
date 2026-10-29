// Multi-message splitter: turn a cleaned continuous hex stream into
// message slices. Detection order per the design spec: manual starts,
// length-prefixed frames, TPDU+MTI anchors, bare MTI anchors, greedy
// resolution, single-message fallback. Pure and DOM-free.
import { parseMessage } from "./decode.js";
import { lookupMti } from "./lookups.js";

function byteAt(hex, i) {
  return parseInt(hex.substr(i * 2, 2), 16);
}

function mtiAt(hex, i) {
  let s = "";
  for (let k = 0; k < 4; k++) s += String.fromCharCode(byteAt(hex, i + k));
  return s;
}

// Smallest end j (exclusive) such that parseMessage(slice(messageStart, j))
// is clean; null when no such j exists.
function findEnd(hex, total, messageStart) {
  for (let j = messageStart + 12; j <= total; j++) {
    if (parseMessage(hex.slice(messageStart * 2, j * 2)).ok) return j;
  }
  return null;
}

function messageRecord(hex, start, messageStart, end) {
  const hexSlice = hex.slice(messageStart * 2, end * 2);
  const r = parseMessage(hexSlice);
  return {
    startByte: start,
    endByte: end - 1,
    mti: r.mti,
    kind: r.kind,
    hex: hexSlice,
    ok: r.ok,
  };
}

export function splitMessages(hex, opts = {}) {
  const total = hex.length / 2;

  const manualStarts = (opts.manualStarts || [])
    .filter((s) => Number.isInteger(s) && s >= 0 && s < total);
  if (manualStarts.length) {
    const starts = [...new Set(manualStarts)].sort((a, b) => a - b);
    return starts.map((s, k) =>
      messageRecord(hex, s, s, k + 1 < starts.length ? starts[k + 1] : total));
  }

  const candidates = [];

  // Length-prefixed frames: L = 2-byte big-endian at each byte i.
  for (let i = 0; i + 2 <= total; i++) {
    const L = (byteAt(hex, i) << 8) | byteAt(hex, i + 1);
    if (L < 12) continue;
    if (i + 2 + L <= total && parseMessage(hex.slice((i + 2) * 2, (i + 2 + L) * 2)).ok) {
      candidates.push({ start: i + 2, messageStart: i + 2, end: i + 2 + L, rank: 0 });
    } else if (i + 7 + L <= total && parseMessage(hex.slice((i + 7) * 2, (i + 7 + L) * 2)).ok) {
      candidates.push({ start: i + 7, messageStart: i + 7, end: i + 7 + L, rank: 0 });
    }
  }

  // TPDU + MTI anchors (5 bytes before a known MTI) and bare MTI anchors.
  for (let i = 0; i + 4 <= total; i++) {
    const mti = mtiAt(hex, i);
    if (!/^\d{4}$/.test(mti) || byteAt(hex, i) !== 0x30 || !lookupMti(mti)) continue;
    const end = findEnd(hex, total, i);
    if (end === null) continue;
    if (i >= 5) candidates.push({ start: i - 5, messageStart: i, end, rank: 1 });
    candidates.push({ start: i, messageStart: i, end, rank: 2 });
  }

  // Greedy: earliest message wins; when several candidates describe the
  // same message, rule order decides (length frame > TPDU anchor > bare MTI),
  // matching the algorithm's "in order" list and the pinned startByte 7.
  candidates.sort((a, b) => a.messageStart - b.messageStart || a.rank - b.rank || a.end - b.end);
  const chosen = [];
  let pos = 0;
  for (const c of candidates) {
    if (c.messageStart < pos) continue;
    chosen.push(c);
    pos = c.end;
  }

  if (!chosen.length) {
    return [{ startByte: 0, endByte: total - 1, mti: null, kind: "unknown", hex, ok: false }];
  }
  return chosen.map((c) => messageRecord(hex, c.start, c.messageStart, c.end));
}
