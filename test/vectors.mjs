// Shared test vectors: synthetic ISO 8583:1987 messages (all values are
// invented — never real card data), plus builders for dump/log forms.
//
// Messages are raw hex, exactly what normalizeHexDump produces from a real
// log dump: MTI and data are hex-encoded ASCII, the bitmap is raw bytes.
export const hexFromAscii = (s) =>
  Array.from(s, (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("").toUpperCase();

const hx = (s) => hexFromAscii(s);
const F43 = "QUAN CAFE HA NOI" + " ".repeat(24); // exactly 40 chars

const REQ_PARTS = ["16", "9704001234567890", "000000", "000000025000", "1029145230",
  "005831", "145230", "1029", "5812", "051", "00",
  "06", "970415", "425897102914", "TERM0001", "MERCHANT1234567", F43, "704"];

const RESP_PARTS = ["000000", "000000025000", "1029145230", "005831", "145230", "1029",
  "5812", "06", "970415", "425897102914", "00", "TERM0001", "704"];

export const REQUEST_MSG =
  hx("0200") + "7238448108E08000" + REQ_PARTS.map(hx).join("");   // 169 bytes
export const RESPONSE_MSG =
  hx("0210") + "323840010A808000" + RESP_PARTS.map(hx).join("");  // 93 bytes

export const TPDU = "6000030000";
export const FRAMED_REQUEST = "00A9" + TPDU + REQUEST_MSG;   // 176 bytes
export const FRAMED_RESPONSE = "005D" + TPDU + RESPONSE_MSG; // 100 bytes
export const PAIR_HEX = FRAMED_REQUEST + FRAMED_RESPONSE;    // 276 bytes

export function toHexdumpC(hex) {
  // hexdump -C style: offset, 8 bytes, double space, 8 bytes, gutter with
  // printable chars; the last row pads 2 spaces per missing byte.
  const rows = [];
  for (let off = 0; off < hex.length; off += 32) {
    const bytes = hex.slice(off, off + 32).match(/.{2}/g) || [];
    const missing = 16 - bytes.length;
    const gutter = bytes
      .map((b) => {
        const c = parseInt(b, 16);
        return c >= 0x20 && c <= 0x7e ? String.fromCharCode(c) : ".";
      })
      .join("") + " ".repeat(missing);
    let area = bytes.slice(0, 8).join(" ");
    if (bytes.length > 8) area += "  " + bytes.slice(8).join(" ");
    area += " ".repeat(missing * 2);
    rows.push(off.toString(16).padStart(4, "0") + "  " + area + "  |" + gutter + "|");
  }
  return rows.join("\n");
}

export const SAMPLE_DUMP = toHexdumpC(PAIR_HEX);
export const SAMPLE_LOG =
  "2026-10-29 14:52:30.123 INFO  [iso] SEND: " + FRAMED_REQUEST.match(/.{2}/g).join(" ") + "\n" +
  "2026-10-29 14:52:31.456 INFO  [iso] RECV: " + FRAMED_RESPONSE.match(/.{2}/g).join(" ");
