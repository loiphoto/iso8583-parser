// ISO 8583:1987 message decoder: hex string in, ParseResult out.
// Pure and DOM-free; all interpretation comes from the public dictionary
// (js/data) through the lookups in lookups.js.
import { lookupField, lookupMti, lookupProcessingCode, lookupResponseCode } from "./lookups.js";

// EBCDIC (cp037) → ASCII for the printable set; anything unmapped → ".".
const EBCDIC_TO_ASCII = (() => {
  const t = new Array(256).fill(".");
  t[0x40] = " ";
  const punct = {
    0x4b: ".", 0x4c: "<", 0x4d: "(", 0x4e: "+", 0x4f: "|",
    0x50: "&", 0x5a: "!", 0x5b: "$", 0x5c: "*", 0x5d: ")", 0x5e: ";",
    0x60: "-", 0x61: "/", 0x6b: ",", 0x6c: "%", 0x6d: "_", 0x6e: ">",
    0x6f: "?", 0x79: "`", 0x7a: ":", 0x7b: "#", 0x7c: "@", 0x7d: "'",
    0x7e: "=", 0x7f: '"',
  };
  for (const [k, v] of Object.entries(punct)) t[Number(k)] = v;
  for (let i = 0; i < 9; i++) t[0x81 + i] = String.fromCharCode(0x61 + i); // a-i
  for (let i = 0; i < 9; i++) t[0x91 + i] = String.fromCharCode(0x6a + i); // j-r
  for (let i = 0; i < 8; i++) t[0xa2 + i] = String.fromCharCode(0x73 + i); // s-z
  for (let i = 0; i < 9; i++) t[0xc1 + i] = String.fromCharCode(0x41 + i); // A-I
  for (let i = 0; i < 9; i++) t[0xd1 + i] = String.fromCharCode(0x4a + i); // J-R
  for (let i = 0; i < 8; i++) t[0xe2 + i] = String.fromCharCode(0x53 + i); // S-Z
  for (let i = 0; i < 10; i++) t[0xf0 + i] = String.fromCharCode(0x30 + i); // 0-9
  return t;
})();

function decodeChars(bs, start, len, encoding) {
  const out = [];
  for (let i = start; i < start + len && i < bs.length; i++) {
    out.push(encoding === "ebcdic" ? EBCDIC_TO_ASCII[bs[i]] : String.fromCharCode(bs[i]));
  }
  return out.join("");
}

function fixedByteCount(def, encoding) {
  return def.type === "n" && encoding === "bcd" ? Math.ceil(def.len / 2) : def.len;
}

function decodeValue(bs, def, encoding, contentChars) {
  if (def.type === "b") return null;
  let value;
  if (def.type === "n" && encoding === "bcd") {
    const nibs = [];
    for (const b of bs) nibs.push(b >> 4, b & 0x0f);
    value = nibs.slice(0, contentChars).join("");
  } else {
    value = decodeChars(bs, 0, bs.length, encoding).slice(0, contentChars);
    if (def.type !== "n") value = value.replace(/\s+$/, "");
  }
  return value;
}

function meaningFor(de, value) {
  if (value == null) return null;
  if (de === 3) return lookupProcessingCode(value);
  if (de === 39) return lookupResponseCode(value);
  return null;
}

export function parseMessage(hex, opts = {}) {
  const { customFields, encoding = "ascii" } = opts;
  const r = {
    ok: false,
    mti: null,
    mtiMeaning: null,
    kind: "unknown",
    bitmapHex: "",
    secondaryBitmap: false,
    fields: [],
    errors: [],
    consumedBytes: 0,
    trailingBytes: 0,
  };

  if (typeof hex !== "string" || hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    r.errors.push({ startByte: 0, message: "Input is not a valid hex string" });
    return r;
  }
  const total = hex.length / 2;
  const bytes = [];
  for (let i = 0; i < total; i++) bytes.push(parseInt(hex.slice(i * 2, i * 2 + 2), 16));

  if (total < 4) {
    r.errors.push({ startByte: 0, message: "Message too short for an MTI" });
    r.trailingBytes = total;
    return r;
  }
  const mti = decodeChars(bytes, 0, 4, encoding);
  if (!/^\d{4}$/.test(mti)) {
    r.errors.push({ startByte: 0, message: "MTI is not 4 digits" });
    r.trailingBytes = total;
    return r;
  }
  r.mti = mti;
  r.mtiMeaning = lookupMti(mti);
  r.kind = { "0": "request", "1": "response", "2": "advice", "3": "advice-response" }[mti[2]] || "unknown";

  if (total < 12) {
    r.errors.push({ startByte: 4, message: "Message too short for a bitmap" });
    r.consumedBytes = 4;
    r.trailingBytes = total - 4;
    return r;
  }
  r.bitmapHex = hex.slice(8, 24).toUpperCase();
  r.secondaryBitmap = (bytes[4] & 0x80) !== 0;
  let cursor = 12;
  if (r.secondaryBitmap) {
    if (total < 20) {
      r.errors.push({ startByte: 12, message: "Message too short for the secondary bitmap" });
      r.consumedBytes = 12;
      r.trailingBytes = total - 12;
      return r;
    }
    cursor = 20;
  }

  // Collect the DE numbers to walk, in ascending order.
  const deList = [];
  for (let de = 2; de <= 64; de++) {
    if (bytes[4 + ((de - 1) >> 3)] & (0x80 >> ((de - 1) & 7))) deList.push(de);
  }
  if (r.secondaryBitmap) {
    for (let de = 65; de <= 128; de++) {
      if (bytes[12 + ((de - 65) >> 3)] & (0x80 >> ((de - 65) & 7))) deList.push(de);
    }
  }

  walk: for (const de of deList) {
    const def = lookupField(de, customFields);
    if (!def || def.format === "unknown") {
      r.fields.push({
        de,
        name: def ? def.name : null,
        rawHex: "",
        value: null,
        meaning: null,
        startByte: cursor,
        endByte: cursor,
        uncertain: true,
      });
      r.errors.push({ startByte: cursor, message: `DE ${de} has no public format; stopping the walk` });
      break walk;
    }

    const fieldStart = cursor;
    let contentChars;
    if (def.format === "fixed") {
      contentChars = def.len;
    } else {
      const llen = def.format === "llvar" ? 2 : 3;
      if (cursor + llen > total) {
        r.fields.push({ de, name: def.name, rawHex: "", value: null, meaning: null, startByte: fieldStart, endByte: cursor, uncertain: true });
        r.errors.push({ startByte: cursor, message: `DE ${de} length indicator is truncated` });
        break walk;
      }
      const lenDigits = decodeChars(bytes, cursor, llen, encoding);
      cursor += llen;
      if (!/^\d+$/.test(lenDigits)) {
        r.fields.push({ de, name: def.name, rawHex: hex.slice(fieldStart * 2, cursor * 2).toUpperCase(), value: null, meaning: null, startByte: fieldStart, endByte: cursor, uncertain: true });
        r.errors.push({ startByte: fieldStart, message: `DE ${de} has a non-numeric length` });
        break walk;
      }
      contentChars = parseInt(lenDigits, 10);
      if (contentChars > def.maxLen) {
        r.fields.push({ de, name: def.name, rawHex: hex.slice(fieldStart * 2, cursor * 2).toUpperCase(), value: null, meaning: null, startByte: fieldStart, endByte: cursor, uncertain: true });
        r.errors.push({ startByte: fieldStart, message: `DE ${de} length ${contentChars} exceeds max ${def.maxLen}` });
        break walk;
      }
    }
    const contentBytes = def.type === "n" && encoding === "bcd"
      ? Math.ceil(contentChars / 2)
      : contentChars;
    if (cursor + contentBytes > total) {
      const rawHex = hex.slice(cursor * 2).toUpperCase();
      r.fields.push({
        de,
        name: def.name,
        rawHex,
        value: decodeValue(bytes.slice(cursor), def, encoding, contentChars),
        meaning: null,
        startByte: fieldStart,
        endByte: total,
        uncertain: true,
      });
      r.errors.push({ startByte: cursor, message: `DE ${de} is truncated` });
      break walk;
    }
    const rawHex = hex.slice(cursor * 2, (cursor + contentBytes) * 2).toUpperCase();
    const value = decodeValue(bytes.slice(cursor, cursor + contentBytes), def, encoding, contentChars);
    r.fields.push({
      de,
      name: def.name,
      rawHex,
      value,
      meaning: meaningFor(de, value),
      startByte: fieldStart,
      endByte: cursor + contentBytes,
      uncertain: false,
    });
    cursor += contentBytes;
  }

  r.consumedBytes = cursor;
  r.trailingBytes = total - cursor;
  if (r.trailingBytes > 0) {
    r.errors.push({ startByte: cursor, message: `${r.trailingBytes} trailing byte(s) after the last field` });
  }
  r.ok = r.errors.length === 0 && r.trailingBytes === 0;
  return r;
}
