import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMessage } from "../js/parser/decode.js";
import { REQUEST_MSG, RESPONSE_MSG, PAIR_HEX, hexFromAscii } from "./vectors.mjs";

const field = (r, de) => r.fields.find((f) => f.de === de);

test("vectors: pinned byte lengths", () => {
  assert.equal(REQUEST_MSG.length / 2, 169);
  assert.equal(RESPONSE_MSG.length / 2, 93);
  assert.equal(PAIR_HEX.length / 2, 276);
});

test("request message decodes fully and exactly", () => {
  const r = parseMessage(REQUEST_MSG);
  assert.equal(r.ok, true);
  assert.equal(r.mti, "0200");
  assert.equal(r.kind, "request");
  assert.equal(r.mtiMeaning.en, "Financial Request");
  assert.deepEqual(r.fields.map((f) => f.de), [2,3,4,7,11,12,13,18,22,25,32,37,41,42,43,49]);
  assert.equal(field(r, 2).value, "9704001234567890");
  assert.equal(field(r, 3).meaning.en, "Purchase");
  assert.equal(field(r, 4).value, "000000025000");
  assert.equal(field(r, 43).value, "QUAN CAFE HA NOI"); // right-trimmed
  assert.equal(field(r, 49).value, "704");
  assert.equal(r.consumedBytes, 169);
  assert.equal(r.trailingBytes, 0);
  assert.equal(r.errors.length, 0);
});

test("response message: kind, response code meaning", () => {
  const r = parseMessage(RESPONSE_MSG);
  assert.equal(r.mti, "0210");
  assert.equal(r.kind, "response");
  assert.equal(field(r, 39).value, "00");
  assert.equal(field(r, 39).meaning.en, "Approved");
  assert.equal(r.consumedBytes, 93);
});

test("unknown DE stops the walk and is flagged", () => {
  // MTI + primary bitmap bit1 set + secondary bitmap bit65 set + no data
  const hex = hexFromAscii("0200") + "8000000000000000" + "8000000000000000";
  const r = parseMessage(hex);
  assert.equal(r.ok, false);
  assert.equal(r.secondaryBitmap, true);
  assert.equal(r.fields.length, 1);
  assert.equal(r.fields[0].de, 65);
  assert.equal(r.fields[0].uncertain, true);
  assert.equal(r.errors.length >= 1, true);
});

test("truncated message: no crash, tail flagged", () => {
  const r = parseMessage(REQUEST_MSG.slice(0, -6)); // 3 bytes short
  assert.equal(r.ok, false);
  assert.equal(r.errors.length >= 1, true);
  assert.equal(r.trailingBytes >= 0, true);
});

test("BCD encoding unpacks numeric fields", () => {
  const h = hexFromAscii("0200") + "3000000000000000" + "000000" + "000000025000";
  const r = parseMessage(h, { encoding: "bcd" });
  assert.equal(field(r, 3).value, "000000");
  assert.equal(field(r, 4).value, "000000025000");
  assert.equal(r.ok, true);
});

test("EBCDIC encoding decodes MTI and numeric field", () => {
  const mti = "F0F2F0F0";               // EBCDIC "0200"
  const f3 = "F0F0F0F0F0F0";            // EBCDIC "000000"
  const r = parseMessage(mti + "2000000000000000" + f3, { encoding: "ebcdic" });
  assert.equal(r.mti, "0200");
  assert.equal(field(r, 3).value, "000000");
  assert.equal(r.ok, true);
});
