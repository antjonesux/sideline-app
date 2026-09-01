/**
 * Regression tests for CFB27 offensive canonical play aliases.
 *
 * Run: npm run play-art:test-offense-canonical
 */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizePlayName } from "../../../lib/utils";
import { matchPlayInFormation } from "./ocr-and-catalog";
import {
  matchOffensivePlayInFormation,
  normalizeCanonicalOffensivePlayName,
  offensivePlayIdentityKey,
  offensivePlayNamesEquivalent,
} from "./offensive-canonical-play";
import { offensiveReusableArtKey } from "./offensive-art-reuse";

test("BDUO canonicalizes to DUO", () => {
  assert.equal(normalizeCanonicalOffensivePlayName("BDUO"), "DUO");
});

test("DUO canonicalizes to DUO", () => {
  assert.equal(normalizeCanonicalOffensivePlayName("DUO"), "DUO");
});

test("BDUO and DUO produce the same offensive reuse key", () => {
  const formation = "Gun Y Off Trips Wk";
  assert.equal(
    offensiveReusableArtKey(formation, "BDUO"),
    offensiveReusableArtKey(formation, "DUO"),
  );
  assert.equal(
    offensivePlayIdentityKey(formation, "BDUO"),
    offensivePlayIdentityKey(formation, "DUO"),
  );
});

test("matchOffensivePlayInFormation maps DUO OCR to catalog BDUO", () => {
  const r = matchOffensivePlayInFormation("DUO", ["BDUO", "HB COUNTER"]);
  assert.equal(r.matchedPlay, "BDUO");
  assert.equal(r.matchConfidence, "exact");
});

test("matchOffensivePlayInFormation maps BDUO OCR to catalog BDUO", () => {
  const r = matchOffensivePlayInFormation("BDUO", ["BDUO", "DUO"]);
  assert.equal(r.matchedPlay, "BDUO");
  assert.equal(r.matchConfidence, "exact");
});

test("matchOffensivePlayInFormation prefers exact DUO when both exist", () => {
  const r = matchOffensivePlayInFormation("DUO", ["BDUO", "DUO", "HB COUNTER"]);
  assert.equal(r.matchedPlay, "DUO");
});

test("XDUO does not canonicalize to DUO", () => {
  assert.notEqual(normalizeCanonicalOffensivePlayName("XDUO"), "DUO");
  const r = matchOffensivePlayInFormation("XDUO", ["BDUO", "DUO"]);
  assert.equal(r.matchedPlay, null);
});

test("MYDUO does not canonicalize to DUO", () => {
  assert.notEqual(normalizeCanonicalOffensivePlayName("MYDUO"), "DUO");
  const r = matchOffensivePlayInFormation("MYDUO", ["BDUO", "DUO"]);
  assert.equal(r.matchedPlay, null);
});

test("base matchPlayInFormation still rejects DUO when only BDUO exists", () => {
  const r = matchPlayInFormation("DUO", ["BDUO", "HB COUNTER"]);
  assert.equal(r.matchedPlay, null);
  assert.equal(r.matchConfidence, "none");
});

test("same DUO play in different formation does not share reuse key", () => {
  assert.notEqual(
    offensiveReusableArtKey("Gun Y Off Trips Wk", "DUO"),
    offensiveReusableArtKey("Gun Bunch Quads Offset", "DUO"),
  );
});

test("offensivePlayNamesEquivalent treats BDUO and DUO as equivalent", () => {
  assert.equal(offensivePlayNamesEquivalent("BDUO", "DUO"), true);
  assert.equal(offensivePlayNamesEquivalent("DUO", "DUO"), true);
  assert.equal(offensivePlayNamesEquivalent("XDUO", "DUO"), false);
});

test("normalizePlayName still distinguishes raw BDUO and DUO strings", () => {
  assert.notEqual(normalizePlayName("BDUO"), normalizePlayName("DUO"));
});
