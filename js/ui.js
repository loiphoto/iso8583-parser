// Pure UI helpers: formatting and summary extraction. DOM-free so they
// run under Node's test runner; rendering lives in main.js.
import { lookupCurrency } from "./parser/lookups.js";

export function maskPan(pan) {
  const len = pan.length;
  if (len <= 4) return "*".repeat(len);
  if (len <= 10) return pan.slice(0, 2) + "*".repeat(len - 4) + pan.slice(-2);
  return pan.slice(0, 6) + "*".repeat(len - 10) + pan.slice(-4);
}

export function formatAmount(minorUnits, currencyCode) {
  const digits = minorUnits.replace(/^0+/, "") || "0";
  const cur = lookupCurrency(currencyCode);
  if (!cur) return `${digits} (${currencyCode})`;
  const grouped = (int) => int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  let value = digits;
  if (cur.exponent > 0) {
    const int = digits.slice(0, -cur.exponent) || "0";
    value = grouped(int) + "." + digits.slice(-cur.exponent);
  } else {
    value = grouped(digits);
  }
  return `${value} ${currencyCode}`;
}

export function fieldColor(index) {
  return `var(--f${(index % 10) + 1})`;
}

// Amount text for the summary chip: formatAmount's trailing currency code
// swapped for the localized currency name ("25,000 Vietnam Dong").
export function amountChipText(minorUnits, code, lang) {
  if (!code) return minorUnits;
  const cur = lookupCurrency(code);
  if (!cur) return formatAmount(minorUnits, code);
  const name = cur.name[lang] || cur.name.en;
  return formatAmount(minorUnits, code).replace(new RegExp(` ${code}$`), ` ${name}`);
}

export function buildSummary(result) {
  const byDe = (de) => {
    const f = result.fields.find((x) => x.de === de);
    return f ? f.value : null;
  };
  return {
    mti: result.mti,
    pan: byDe(2),
    amount: byDe(4),
    processingCode: byDe(3),
    responseCode: byDe(39),
    stan: byDe(11),
    rrn: byDe(37),
  };
}
