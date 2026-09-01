/**
 * Regression tests for game-capture play-name OCR matching.
 *
 * Run: npm run play-art:test-ocr-match
 */
import assert from "node:assert/strict";
import test from "node:test";
import { parseHeaderOcrText } from "../formation-ocr";
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

test("SPRINT SLOT OUT resolves exactly when catalog uses SPRINT SLOT OUT", () => {
  const r = matchPlayInFormation("SPRINT SLOT OUT", [
    "SPRINT SLOT OUT",
    "MTN CROSS",
  ]);
  assert.equal(r.matchedPlay, "SPRINT SLOT OUT");
  assert.equal(r.matchConfidence, "exact");
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

test("PO BUBBLE Y POP resolves to RPO BUBBLE Y POP", () => {
  const r = matchPlayInFormation("PO BUBBLE Y POP", [
    "RPO BUBBLE Y POP",
    "RPO READ BUBBLE",
    "BUBBLE DOUBLE GO",
  ]);
  assert.equal(r.matchedPlay, "RPO BUBBLE Y POP");
  assert.equal(r.matchConfidence, "exact");
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

test("MTN STICK WHEEL resolves exactly when catalog uses MTN STICK WHEEL", () => {
  const r = matchPlayInFormation("MTN STICK WHEEL", [
    "MTN STICK WHEEL",
    "SHALLOW CROSS",
  ]);
  assert.equal(r.matchedPlay, "MTN STICK WHEEL");
  assert.equal(r.matchConfidence, "exact");
});

test("STRONG FLOOD XCROSS normalizes to STRONG FLOOD X-CROSS", () => {
  const r = matchPlayInFormation("STRONG FLOOD XCROSS", [
    "STRONG FLOOD X-CROSS",
    "HB MID DRAW",
  ]);
  assert.equal(r.matchedPlay, "STRONG FLOOD X-CROSS");
  assert.equal(r.matchConfidence, "exact");
});

test("SMASU normalizes to SMASH when SMASH is in formation catalog", () => {
  const r = matchPlayInFormation("SMASU", ["SMASH", "SPEED OPTION"]);
  assert.equal(r.matchedPlay, "SMASH");
  assert.equal(r.matchConfidence, "exact");
});

test("SHALLOW CROSS stays ambiguous when Y and Z variants exist", () => {
  const r = matchPlayInFormation("SHALLOW CROSS", [
    "Y SHALLOW CROSS",
    "Z SHALLOW CROSS",
  ]);
  assert.equal(r.matchedPlay, null);
});

test("617 resolves from numeric play header OCR", () => {
  const parsed = parseHeaderOcrText("GUN SPREAD OFFSET\n\n617");
  assert.equal(parsed.playNameText, "617");
  const r = matchPlayInFormation(parsed.playNameText, ["617", "ALL GO"]);
  assert.equal(r.matchedPlay, "617");
});

test("7 SHALLOW CROSS resolves to Z SHALLOW CROSS", () => {
  const r = matchPlayInFormation("7 SHALLOW CROSS", [
    "Y SHALLOW CROSS",
    "Z SHALLOW CROSS",
  ]);
  assert.equal(r.matchedPlay, "Z SHALLOW CROSS");
});

test("467CROSS resolves to 46 Z CROSS when Y variant also exists", () => {
  const r = matchPlayInFormation("467CROSS", ["46 Y CROSS", "46 Z CROSS"]);
  assert.equal(r.matchedPlay, "46 Z CROSS");
});

test("467CROSS does not map to 46 Y CROSS", () => {
  const r = matchPlayInFormation("467CROSS", ["46 Y CROSS"]);
  assert.equal(r.matchedPlay, null);
});

test("1TRAP resolves to 0 1 TRAP", () => {
  const r = matchPlayInFormation("1TRAP", ["0 1 TRAP", "HB DRAW"]);
  assert.equal(r.matchedPlay, "0 1 TRAP");
});

test("PN DEEP CURTIS MS resolves to PA DEEP CURLS", () => {
  const r = matchPlayInFormation("PN DEEP CURTIS MS", [
    "PA DEEP CURLS",
    "INSIDE ZONE",
  ]);
  assert.equal(r.matchedPlay, "PA DEEP CURLS");
});
