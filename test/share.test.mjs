import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeShare, decodeShare } from "../js/share.js";

test("round-trips ascii, vietnamese, newlines", () => {
  for (const s of ["hello", "00 B1 60 00", "Xin chào — 123\nline2"]) {
    assert.equal(decodeShare(encodeShare(s)), s);
  }
});

test("malformed input returns null", () => {
  assert.equal(decodeShare("!!!"), null);
  assert.equal(decodeShare(""), null);
});
