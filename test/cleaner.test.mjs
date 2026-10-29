import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeHexDump } from "../js/parser/cleaner.js";

test("hexdump -C: offset, byte columns, gutter", () => {
  const dump = [
    "0000  00 b1 60 00 03 00 00 30  32 30 30 72 38 24 81 08  |..`...0200r8$..|",
    "0010  e0 80 00 31 36 39 37 30  34 30 30 31 32 33 34 35  |...1697040012345|",
  ].join("\n");
  assert.equal(normalizeHexDump(dump), "00B16000030000303230307238248108E0800031363937303430303132333435");
});

test("hexdump -C: gutter full of ASCII digits is excluded", () => {
  const dump = "0000  31 32 33 34 35 36 37 38  39 30 31 32 33 34 35 36  |1234567890123456|";
  assert.equal(normalizeHexDump(dump), "31323334353637383930313233343536");
});

test("xxd: colon offset, grouped bytes, gutter", () => {
  const dump = "00000000: 00b1 6000 0300 0000 3032 3030 7238 2481  ..`.....0200r8$.";
  assert.equal(normalizeHexDump(dump), "00B16000030000003032303072382481");
});

test("app log: timestamp and SEND label dropped, message kept", () => {
  const line = "2026-10-29 14:52:30.123 INFO  [iso] SEND: 00 B1 60 00 03 00 00 30 32 30 30";
  assert.equal(normalizeHexDump(line), "00B1600003000030323030");
});

test("single-line spaced hex", () => {
  assert.equal(normalizeHexDump("00 B1 60 00"), "00B16000");
});

test("continuous hex, lowercased input", () => {
  assert.equal(normalizeHexDump("00b16000"), "00B16000");
});

test("odd trailing nibble dropped", () => {
  assert.equal(normalizeHexDump("00 B1 6"), "00B1");
});

test("no bytes -> empty string", () => {
  assert.equal(normalizeHexDump("hello world"), "");
  assert.equal(normalizeHexDump(""), "");
});
