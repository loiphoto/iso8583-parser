// Thin lookups over the data modules; every lookup returns null when the
// code is unknown so the UI can fall back to raw values.
import { FIELDS } from "../data/fields.mjs";
import { MTI_MEANINGS } from "../data/mti.mjs";
import { PROCESSING_CODES, ACCOUNT_TYPES } from "../data/processing-codes.mjs";
import { RESPONSE_CODES } from "../data/response-codes.mjs";
import { CURRENCIES } from "../data/currencies.mjs";

export function lookupField(de, overrides) {
  const base = FIELDS[de];
  const over = overrides && overrides[de];
  if (!base && !over) return null;
  return { ...base, ...over };
}

export function lookupMti(mti) {
  return MTI_MEANINGS[mti] ?? null;
}

export function lookupProcessingCode(code) {
  const trans = PROCESSING_CODES[code.slice(0, 2)];
  const fromPos = code.slice(2, 4);
  const toPos = code.slice(4, 6);
  const from = ACCOUNT_TYPES[fromPos];
  const to = toPos === "00" ? null : ACCOUNT_TYPES[toPos];
  if (!trans || !from || (toPos !== "00" && !to)) return null;
  const parts = [trans];
  if (fromPos !== "00") parts.push(from);
  if (to) parts.push(to);
  return {
    en: parts.map((p) => p.en).join(", "),
    vi: parts.map((p) => p.vi).join(", "),
  };
}

export function lookupResponseCode(code) {
  return RESPONSE_CODES[code] ?? null;
}

export function lookupCurrency(code) {
  const c = CURRENCIES[code];
  return c ? { code, name: c.name, exponent: c.exponent } : null;
}
