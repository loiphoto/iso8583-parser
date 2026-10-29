import { test } from "node:test";
import assert from "node:assert/strict";
import { splitMessages, resplitAt } from "../js/parser/splitter.js";
import { normalizeHexDump } from "../js/parser/cleaner.js";
import { SAMPLE_DUMP, SAMPLE_LOG, PAIR_HEX, FRAMED_REQUEST, TPDU, REQUEST_MSG, RESPONSE_MSG } from "./vectors.mjs";

test("hexdump pair with length headers + TPDU splits into request and response", () => {
  const msgs = splitMessages(normalizeHexDump(SAMPLE_DUMP));
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].mti, "0200");
  assert.equal(msgs[0].kind, "request");
  assert.equal(msgs[0].startByte, 7);   // length header 2 + TPDU 5
  assert.equal(msgs[0].messageStart, 7);
  assert.equal(msgs[0].endByte, 175);   // 7 + 169 − 1
  assert.equal(msgs[1].mti, "0210");
  assert.equal(msgs[1].kind, "response");
  assert.equal(msgs[1].startByte, 183); // 176 + 7
  assert.equal(msgs[1].messageStart, 183);
  assert.equal(msgs[1].endByte, 275);   // 183 + 93 − 1
  assert.equal(msgs[0].ok, true);
  assert.equal(msgs[1].ok, true);
});

test("app-log lines with timestamps and SEND/RECV labels split cleanly", () => {
  const msgs = splitMessages(normalizeHexDump(SAMPLE_LOG));
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].mti, "0200");
  assert.equal(msgs[1].mti, "0210");
});

test("bare pair without headers splits on MTI anchors", () => {
  const msgs = splitMessages(REQUEST_MSG + RESPONSE_MSG);
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].mti, "0200");
  assert.equal(msgs[1].mti, "0210");
});

test("TPDU-anchored pair without length headers splits", () => {
  const msgs = splitMessages(TPDU + REQUEST_MSG + TPDU + RESPONSE_MSG);
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].mti, "0200");
  assert.equal(msgs[0].startByte, 0);   // TPDU start
  assert.equal(msgs[0].messageStart, 5); // message slice starts after the TPDU
  assert.equal(msgs[1].mti, "0210");
  assert.equal(msgs[1].startByte, 174); // 5 + 169
  assert.equal(msgs[1].messageStart, 179);
});

test("manual starts re-split at the given boundaries", () => {
  const msgs = splitMessages(PAIR_HEX, { manualStarts: [7, 183] });
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].mti, "0200");
  assert.equal(msgs[0].ok, true);
  assert.equal(msgs[0].messageStart, 7);
  assert.equal(msgs[1].mti, "0210");
  assert.equal(msgs[1].ok, true);
  assert.equal(msgs[1].messageStart, 183);
});

test("junk prefix is skipped", () => {
  const msgs = splitMessages("DEADBEEFCAFE" + FRAMED_REQUEST);
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].mti, "0200");
  assert.equal(msgs[0].startByte, 13); // 6 junk + 2 length + 5 TPDU
});

test("unparseable stream falls back to one unknown message", () => {
  const msgs = splitMessages("11223344556677889900AABBCCDDEEFF");
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].ok, false);
  assert.equal(msgs[0].mti, null);
});

test("manual starts override heuristics", () => {
  const msgs = splitMessages(PAIR_HEX, { manualStarts: [0] });
  assert.equal(msgs.length, 1);
});

test("resplitAt on an existing boundary is a no-op", () => {
  const hex = normalizeHexDump(SAMPLE_DUMP);
  const msgs = resplitAt(hex, 183);
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].ok, true);
  assert.equal(msgs[0].messageStart, 7);
  assert.equal(msgs[1].ok, true);
  assert.equal(msgs[1].messageStart, 183);
});

test("resplitAt forces a new boundary at the clicked byte", () => {
  const hex = normalizeHexDump(SAMPLE_DUMP);
  const msgs = resplitAt(hex, 190); // inside message 1 — not an auto boundary
  assert.equal(msgs.length, 3);
  assert.deepEqual(msgs.map((m) => m.messageStart), [7, 183, 190]);
  assert.equal(msgs[0].ok, true);
  assert.equal(msgs[1].ok, false); // cut short by the forced boundary
  assert.equal(msgs[2].ok, false); // mid-message start, no clean end
});

test("resplitAt with an out-of-range offset keeps the auto split", () => {
  const hex = normalizeHexDump(SAMPLE_DUMP);
  const msgs = resplitAt(hex, 9999);
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].ok, true);
  assert.equal(msgs[1].ok, true);
});
