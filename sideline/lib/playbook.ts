export type PlaybookEntry = {
  play_id: string;
  formation: string;
  group: string;
  play_name: string;
  play_type: "RUN" | "PASS" | "RPO";
};

export function inferPlayType(name: string): PlaybookEntry["play_type"] {
  const n = name.toLowerCase();
  if (n.includes("rpo")) return "RPO";
  if (
    n.includes("pass") ||
    n.includes("mesh") ||
    n.includes("slant") ||
    n.includes("stick") ||
    n.includes("spot") ||
    n.includes("drive") ||
    n.includes("flood") ||
    n.includes("curl") ||
    n.includes("vert") ||
    n.includes("cross") ||
    n.includes("spacing") ||
    n.includes("post")
  ) {
    return "PASS";
  }
  if (
    n.includes("zone") ||
    n.includes("dive") ||
    n.includes("power") ||
    n.includes("sneak") ||
    n.includes("iso") ||
    n.includes("counter") ||
    n.includes("sweep")
  ) {
    return "RUN";
  }
  return "RUN";
}

export function deriveFormationGroup(formation: string): string {
  const f = formation.toLowerCase();
  if (f.includes("gun")) return "Gun";
  if (f.includes("pistol")) return "Pistol";
  if (f.includes("singleback")) return "Singleback";
  if (f.includes("shotgun")) return "Shotgun";
  if (f.includes("i form") || f === "i" || f.startsWith("i ")) return "I Form";
  return "Other";
}
