import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELDS } from "../js/data/fields.mjs";
import { lookupField, lookupMti, lookupProcessingCode, lookupResponseCode, lookupCurrency } from "../js/parser/lookups.js";

test("field dictionary: pinned formats", () => {
  assert.deepEqual(FIELDS[2], { name: { en: "Primary Account Number", vi: "Số tài khoản thẻ" }, format: "llvar", type: "n", maxLen: 19 });
  assert.equal(FIELDS[3].format, "fixed");
  assert.equal(FIELDS[3].len, 6);
  assert.equal(FIELDS[52].type, "b");
  assert.equal(FIELDS[52].len, 8);
  assert.equal(FIELDS[55].format, "lllvar");
  assert.equal(FIELDS[36].maxLen, 104);
  assert.equal(FIELDS[100].format, "unknown");
});

test("mti meanings", () => {
  assert.equal(lookupMti("0200").en, "Financial Request");
  assert.equal(lookupMti("0210").en, "Financial Response");
  assert.equal(lookupMti("9999"), null);
});

test("processing codes", () => {
  assert.equal(lookupProcessingCode("000000").en, "Purchase");
  assert.equal(lookupProcessingCode("310000").en, "Balance Inquiry");
  assert.equal(lookupProcessingCode("011020").en.includes("Savings"), true);
  assert.equal(lookupProcessingCode("999999"), null);
});

test("response codes", () => {
  assert.equal(lookupResponseCode("00").en, "Approved");
  assert.equal(lookupResponseCode("51").en, "Insufficient funds");
  assert.equal(lookupResponseCode("ZZ"), null);
});

test("currencies", () => {
  assert.equal(lookupCurrency("704").exponent, 0);
  assert.equal(lookupCurrency("840").exponent, 2);
  assert.equal(lookupCurrency("704").name.vi, "Đồng Việt Nam");
  assert.equal(lookupCurrency("000"), null);
});

test("lookupField override", () => {
  const def = lookupField(3, { 3: { format: "llvar", type: "an", maxLen: 9 } });
  assert.equal(def.format, "llvar");
  assert.equal(def.maxLen, 9);
});
