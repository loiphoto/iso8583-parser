// Custom dictionary overlay: per-DE overrides of the public FIELDS table.
// Stored under localStorage key "napasCustom" so users can extend the
// parser with their own formats locally — never committed, never shipped,
// never leaves the browser.
const FORMATS = new Set(["fixed", "llvar", "lllvar", "unknown"]);

export function validateCustomFields(obj) {
  const errors = [];
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return { ok: false, errors: ["dictionary must be a plain object"] };
  }
  for (const [key, def] of Object.entries(obj)) {
    const de = Number(key);
    if (!/^\d+$/.test(key) || de < 1 || de > 128) {
      errors.push(`DE ${key} is outside 1-128`);
      continue;
    }
    if (typeof def !== "object" || def === null) {
      errors.push(`DE ${de} is not a field definition`);
      continue;
    }
    if (!FORMATS.has(def.format)) {
      errors.push(`DE ${de} has unknown format "${def.format}"`);
      continue;
    }
    if (def.format === "fixed" && typeof def.len !== "number") {
      errors.push(`DE ${de} (fixed) is missing len`);
    }
    if ((def.format === "llvar" || def.format === "lllvar") && typeof def.maxLen !== "number") {
      errors.push(`DE ${de} (${def.format}) is missing maxLen`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function mergeFields(base, custom) {
  const out = { ...base };
  for (const [key, def] of Object.entries(custom)) {
    out[Number(key)] = { ...(base[Number(key)] || {}), ...def };
  }
  return out;
}

export function loadCustomDict(storage) {
  try {
    const raw = storage.getItem("napasCustom");
    if (raw === null || raw === undefined) return null;
    const obj = JSON.parse(raw);
    return validateCustomFields(obj).ok ? obj : null;
  } catch {
    return null;
  }
}

export function saveCustomDict(storage, obj) {
  try {
    storage.setItem("napasCustom", JSON.stringify(obj));
  } catch {
    /* storage unavailable (private mode) — overlay just won't persist */
  }
}
