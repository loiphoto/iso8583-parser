// Input normalization: turn pasted log text into a continuous uppercase hex string.
//
// Per line, in order:
// 0. Naked hex line (only hex chars, >= 4 chars) -> taken as-is.
// 1. Offset-prefixed line (hexdump/xxd): drop the offset token, then take
//    consecutive 2- or 4-hex-char byte groups until a non-hex token (the
//    gutter column always breaks the run).
// 2. Otherwise: longest run of even-length hex tokens (2+ chars, optional
//    leading 0x/0X stripped); anything else (timestamps, words, separators)
//    breaks the run.
// 3. Join; drop a final odd nibble.

const HEX_ONLY = /^[0-9a-fA-F]+$/;
const OFFSET_PREFIX = /^[0-9a-fA-F]{4,}[: ]/;
const BYTE2 = /^[0-9a-fA-F]{2}$/;
const BYTE4 = /^[0-9a-fA-F]{4}$/;

export function normalizeHexDump(text) {
  const bytes = [];
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (HEX_ONLY.test(line) && line.length >= 4) {
      bytes.push(...line);
      continue;
    }
    const tokens = line.split(/\s+/);
    if (OFFSET_PREFIX.test(line)) {
      for (let i = 1; i < tokens.length; i++) {
        const tok = tokens[i];
        if (BYTE2.test(tok) || BYTE4.test(tok)) bytes.push(...tok);
        else break;
      }
      continue;
    }
    let best = "";
    let cur = "";
    for (const tok of tokens) {
      const norm = tok.replace(/^0[xX]/, "");
      if (HEX_ONLY.test(norm) && norm.length >= 2 && norm.length % 2 === 0) cur += norm;
      else {
        if (cur.length > best.length) best = cur;
        cur = "";
      }
    }
    if (cur.length > best.length) best = cur;
    if (best.length >= 4) bytes.push(...best);
  }
  let hex = bytes.join("").toUpperCase();
  if (hex.length % 2 !== 0) hex = hex.slice(0, -1);
  return hex;
}
