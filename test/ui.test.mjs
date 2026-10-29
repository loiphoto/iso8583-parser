import { test } from "node:test";
import assert from "node:assert/strict";
import { maskPan, formatAmount, amountChipText, fieldColor, buildSummary } from "../js/ui.js";
import { setLang, t, LANGS } from "../js/i18n.js";
import { parseMessage } from "../js/parser/decode.js";
import { REQUEST_MSG, RESPONSE_MSG } from "./vectors.mjs";

test("maskPan", () => {
  assert.equal(maskPan("9704001234567890"), "970400******7890");
  assert.equal(maskPan("9704001234567890123"), "970400*********0123");
  assert.equal(maskPan("123456"), "12**56");
  assert.equal(maskPan("12"), "**");
});

test("formatAmount", () => {
  assert.equal(formatAmount("000000025000", "704"), "25,000 704");
  assert.equal(formatAmount("000000025000", "840"), "250.00 840");
  assert.equal(formatAmount("000000000000", "704"), "0 704");
  assert.equal(formatAmount("000000025000", "999"), "25000 (999)");
});

test("amountChipText swaps code for localized name", () => {
  assert.equal(amountChipText("000000025000", "704", "en"), "25,000 Vietnam Dong");
  assert.equal(amountChipText("000000025000", "704", "vi"), "25,000 Đồng Việt Nam");
  assert.equal(amountChipText("000000025000", "999", "en"), "25000 (999)");
  assert.equal(amountChipText("000000025000", null, "en"), "000000025000");
});

test("fieldColor cycles 10", () => {
  assert.equal(fieldColor(0), "var(--f1)");
  assert.equal(fieldColor(10), "var(--f1)");
  assert.equal(fieldColor(4), "var(--f5)");
});

test("buildSummary extracts raw values", () => {
  const r = parseMessage(REQUEST_MSG);
  const s = buildSummary(r);
  assert.equal(s.mti, "0200");
  assert.equal(s.pan, "9704001234567890");
  assert.equal(s.amount, "000000025000");
  assert.equal(s.processingCode, "000000");
  assert.equal(s.stan, "005831");
  assert.equal(s.rrn, "425897102914");
  const r2 = parseMessage(RESPONSE_MSG);
  assert.equal(buildSummary(r2).responseCode, "00");
});

test("i18n both languages", () => {
  setLang("en");
  assert.equal(t("parse"), "Parse");
  setLang("vi");
  assert.equal(t("parse"), "Phân tích");
  assert.equal(Object.keys(LANGS.en).sort().join(), Object.keys(LANGS.vi).sort().join());
});
