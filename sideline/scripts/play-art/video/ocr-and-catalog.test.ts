/**
 * Regression tests for game-capture play-name OCR matching.
 *
 * Run: npm run play-art:test-ocr-match
 */
import assert from "node:assert/strict";
import test from "node:test";
import { matchPlayInFormation } from "./ocr-and-catalog";

test("DUO resolves to DUO when both DUO and BDUO exist", () => {
  const r = matchPlayInFormation("DUO", ["BDUO", "DUO", "HB COUNTER"]);
  assert.equal(r.matchedPlay, "DUO");
  assert.equal(r.matchConfidence, "exact");
});

test("DUO does not suffix-match BDUO when only BDUO exists", () => {
  const r = matchPlayInFormation("DUO", ["BDUO", "HB COUNTER"]);
  assert.equal(r.matchedPlay, null);
  assert.equal(r.matchConfidence, "none");
});

test("BDUO resolves to BDUO", () => {
  const r = matchPlayInFormation("BDUO", ["BDUO", "DUO"]);
  assert.equal(r.matchedPlay, "BDUO");
  assert.equal(r.matchConfidence, "exact");
});

test("ZONE does not suffix-match glued REDZONE token", () => {
  const r = matchPlayInFormation("ZONE", ["REDZONE"]);
  assert.equal(r.matchedPlay, null);
  assert.equal(r.matchConfidence, "none");
});

test("long OCR suffix still matches spaced catalog token boundary", () => {
  const r = matchPlayInFormation("SPRINT SLOT OUT", [
    "HUSKIES SPRINT SLOT OUT",
    "MTN CROSS",
  ]);
  assert.equal(r.matchedPlay, "HUSKIES SPRINT SLOT OUT");
  assert.equal(r.matchConfidence, "fuzzy");
});

test("HB POWER O still matches without O-to-0 rewrite", () => {
  const r = matchPlayInFormation("HB POWER O", ["HB POWER O", "HB POWER G"]);
  assert.equal(r.matchedPlay, "HB POWER O");
  assert.equal(r.matchConfidence, "exact");
});

test("OVICK BASE resolves to 45 QUICK BASE", () => {
  const r = matchPlayInFormation("OVICK BASE", ["45 QUICK BASE", "ALL GO"]);
  assert.equal(r.matchedPlay, "45 QUICK BASE");
});

test("PO READ Y FLAT resolves to RPO READ Y FLAT", () => {
  const r = matchPlayInFormation("PO READ Y FLAT", [
    "RPO READ Y FLAT",
    "RPO PEEK Y FLAT",
  ]);
  assert.equal(r.matchedPlay, "RPO READ Y FLAT");
});

test("PO PEEK Y FLAT resolves to RPO PEEK Y FLAT", () => {
  const r = matchPlayInFormation("PO PEEK Y FLAT", [
    "RPO PEEK Y FLAT",
    "RPO READ Y FLAT",
  ]);
  assert.equal(r.matchedPlay, "RPO PEEK Y FLAT");
});

test("UWE COUNTER resolves to HB COUNTER", () => {
  const r = matchPlayInFormation("UWE COUNTER", ["HB COUNTER", "HB DIVE"]);
  assert.equal(r.matchedPlay, "HB COUNTER");
});

test("INSIDE ZONE SPLIT resolves to INSIDE ZONE when split variant absent", () => {
  const r = matchPlayInFormation("INSIDE ZONE SPLIT", [
    "INSIDE ZONE",
    "OUTSIDE ZONE",
  ]);
  assert.equal(r.matchedPlay, "INSIDE ZONE");
});

test("INSIDE ZONE SPLIT stays distinct when catalog includes split variant", () => {
  const r = matchPlayInFormation("INSIDE ZONE SPLIT", [
    "INSIDE ZONE",
    "INSIDE ZONE SPLIT",
  ]);
  assert.equal(r.matchedPlay, "INSIDE ZONE SPLIT");
});

test("MTN STICK WHEEL resolves to unique STICK WHEEL suffix play", () => {
  const r = matchPlayInFormation("MTN STICK WHEEL", [
    "MTN HILLTOPPERS STICK WHEEL",
    "SHALLOW CROSS",
  ]);
  assert.equal(r.matchedPlay, "MTN HILLTOPPERS STICK WHEEL");
});

test("SHALLOW CROSS stays ambiguous when Y and Z variants exist", () => {
  const r = matchPlayInFormation("SHALLOW CROSS", [
    "Y SHALLOW CROSS",
    "Z SHALLOW CROSS",
  ]);
  assert.equal(r.matchedPlay, null);
});
