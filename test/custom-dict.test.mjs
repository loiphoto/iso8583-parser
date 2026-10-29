import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeFields, validateCustomFields, loadCustomDict, saveCustomDict } from "../js/custom-dict.js";
import { FIELDS } from "../js/data/fields.mjs";

const mem = () => ({ getItem: () => null, setItem: () => {} });

test("validateCustomFields accepts a valid overlay", () => {
  const r = validateCustomFields({ 3: { format: "llvar", type: "an", maxLen: 9 } });
  assert.equal(r.ok, true);
  assert.equal(r.errors.length, 0);
});

test("validateCustomFields rejects bad overlays with DE-naming errors", () => {
  assert.equal(validateCustomFields("nope").ok, false);
  assert.equal(validateCustomFields({ 999: { format: "fixed", type: "n", len: 2 } }).ok, false);
  assert.equal(validateCustomFields({ 3: { format: "fixed", type: "n" } }).ok, false); // missing len
  assert.equal(validateCustomFields({ 3: { format: "wat", type: "n", len: 2 } }).ok, false);
});

test("mergeFields overrides per DE", () => {
  const merged = mergeFields(FIELDS, { 3: { format: "llvar", type: "an", maxLen: 9 } });
  assert.equal(merged[3].format, "llvar");
  assert.equal(merged[3].maxLen, 9);
  assert.equal(merged[2].format, "llvar"); // untouched
});

test("loadCustomDict survives corrupt storage", () => {
  const storage = { getItem: (k) => (k === "napasCustom" ? "{corrupt" : null) };
  assert.equal(loadCustomDict(storage), null);
  const storage2 = { getItem: () => JSON.stringify({ 3: { format: "llvar", type: "an", maxLen: 9 } }) };
  assert.equal(loadCustomDict(storage2)[3].format, "llvar");
  assert.doesNotThrow(() => saveCustomDict(mem(), { 3: { format: "fixed", type: "n", len: 2 } }));
});
