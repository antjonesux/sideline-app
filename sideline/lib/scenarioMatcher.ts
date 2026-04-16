/**
 * Scenario and field zone derivation for logged plays (DB trigger + API mirror).
 * Re-exported here for call sites that follow the play-logger module layout.
 */
export { deriveFieldZone, deriveScenario, type Side } from "@/lib/derivePlayContext";
