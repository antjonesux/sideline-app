/** ESPN CDN team logos + mascots for public playbook browse. */

export type PublicTeamLogoInfo = {
  espnId: string;
  mascot: string;
  abbreviation: string;
};

const ESPN_LOGO_BASE = "https://a.espncdn.com/i/teamlogos/ncaa/500";

/** Playbook display name → ESPN team id / mascot / abbreviation. */
export const PUBLIC_TEAM_LOGOS: Record<string, PublicTeamLogoInfo> = {
  "Air Force": { espnId: "2005", mascot: "Falcons", abbreviation: "AF" },
  "Akron": { espnId: "2006", mascot: "Zips", abbreviation: "AKR" },
  "Alabama": { espnId: "333", mascot: "Crimson Tide", abbreviation: "ALA" },
  "Appalachian State": { espnId: "2026", mascot: "Mountaineers", abbreviation: "APP" },
  "Arizona": { espnId: "12", mascot: "Wildcats", abbreviation: "ARIZ" },
  "Arizona State": { espnId: "9", mascot: "Sun Devils", abbreviation: "ASU" },
  "Arkansas": { espnId: "8", mascot: "Razorbacks", abbreviation: "ARK" },
  "Arkansas State": { espnId: "2032", mascot: "Red Wolves", abbreviation: "ARST" },
  "Army": { espnId: "349", mascot: "Black Knights", abbreviation: "ARMY" },
  "Auburn": { espnId: "2", mascot: "Tigers", abbreviation: "AUB" },
  "BYU": { espnId: "252", mascot: "Cougars", abbreviation: "BYU" },
  "Ball State": { espnId: "2050", mascot: "Cardinals", abbreviation: "BALL" },
  "Baylor": { espnId: "239", mascot: "Bears", abbreviation: "BAY" },
  "Boise State": { espnId: "68", mascot: "Broncos", abbreviation: "BOIS" },
  "Boston College": { espnId: "103", mascot: "Eagles", abbreviation: "BC" },
  "Bowling Green": { espnId: "189", mascot: "Falcons", abbreviation: "BGSU" },
  "Buffalo": { espnId: "2084", mascot: "Bulls", abbreviation: "BUF" },
  "California": { espnId: "25", mascot: "Golden Bears", abbreviation: "CAL" },
  "Central Michigan": { espnId: "2117", mascot: "Chippewas", abbreviation: "CMU" },
  "Charlotte": { espnId: "2429", mascot: "49ers", abbreviation: "CLT" },
  "Cincinnati": { espnId: "2132", mascot: "Bearcats", abbreviation: "CIN" },
  "Clemson": { espnId: "228", mascot: "Tigers", abbreviation: "CLEM" },
  "Coastal Carolina": { espnId: "324", mascot: "Chanticleers", abbreviation: "CCU" },
  "Colorado": { espnId: "38", mascot: "Buffaloes", abbreviation: "COLO" },
  "Colorado State": { espnId: "36", mascot: "Rams", abbreviation: "CSU" },
  "Delaware": { espnId: "48", mascot: "Blue Hens", abbreviation: "DEL" },
  "Duke": { espnId: "150", mascot: "Blue Devils", abbreviation: "DUKE" },
  "East Carolina": { espnId: "151", mascot: "Pirates", abbreviation: "ECU" },
  "Eastern Michigan": { espnId: "2199", mascot: "Eagles", abbreviation: "EMU" },
  "Florida": { espnId: "57", mascot: "Gators", abbreviation: "FLA" },
  "Florida Atlantic": { espnId: "2226", mascot: "Owls", abbreviation: "FAU" },
  "Florida International": { espnId: "2229", mascot: "Panthers", abbreviation: "FIU" },
  "Florida State": { espnId: "52", mascot: "Seminoles", abbreviation: "FSU" },
  "Fresno State": { espnId: "278", mascot: "Bulldogs", abbreviation: "FRES" },
  "Georgia": { espnId: "61", mascot: "Bulldogs", abbreviation: "UGA" },
  "Georgia Southern": { espnId: "290", mascot: "Eagles", abbreviation: "GASO" },
  "Georgia State": { espnId: "2247", mascot: "Panthers", abbreviation: "GAST" },
  "Georgia Tech": { espnId: "59", mascot: "Yellow Jackets", abbreviation: "GT" },
  "Hawaii": { espnId: "62", mascot: "Rainbow Warriors", abbreviation: "HAW" },
  "Houston": { espnId: "248", mascot: "Cougars", abbreviation: "HOU" },
  "Illinois": { espnId: "356", mascot: "Fighting Illini", abbreviation: "ILL" },
  "Indiana": { espnId: "84", mascot: "Hoosiers", abbreviation: "IU" },
  "Iowa": { espnId: "2294", mascot: "Hawkeyes", abbreviation: "IOWA" },
  "Iowa State": { espnId: "66", mascot: "Cyclones", abbreviation: "ISU" },
  "Jacksonville State": { espnId: "55", mascot: "Gamecocks", abbreviation: "JXST" },
  "James Madison": { espnId: "256", mascot: "Dukes", abbreviation: "JMU" },
  "Kansas": { espnId: "2305", mascot: "Jayhawks", abbreviation: "KU" },
  "Kansas State": { espnId: "2306", mascot: "Wildcats", abbreviation: "KSU" },
  "Kennesaw State": { espnId: "338", mascot: "Owls", abbreviation: "KENN" },
  "Kent State": { espnId: "2309", mascot: "Golden Flashes", abbreviation: "KENT" },
  "Kentucky": { espnId: "96", mascot: "Wildcats", abbreviation: "UK" },
  "LSU": { espnId: "99", mascot: "Tigers", abbreviation: "LSU" },
  "Liberty": { espnId: "2335", mascot: "Flames", abbreviation: "LIB" },
  "Louisiana": { espnId: "309", mascot: "Ragin' Cajuns", abbreviation: "UL" },
  "Louisiana Tech": { espnId: "2348", mascot: "Bulldogs", abbreviation: "LT" },
  "Louisville": { espnId: "97", mascot: "Cardinals", abbreviation: "LOU" },
  "Marshall": { espnId: "276", mascot: "Thundering Herd", abbreviation: "MRSH" },
  "Maryland": { espnId: "120", mascot: "Terrapins", abbreviation: "MD" },
  "Memphis": { espnId: "235", mascot: "Tigers", abbreviation: "MEM" },
  "Miami": { espnId: "2390", mascot: "Hurricanes", abbreviation: "MIA" },
  "Miami OH": { espnId: "193", mascot: "RedHawks", abbreviation: "M-OH" },
  "Michigan": { espnId: "130", mascot: "Wolverines", abbreviation: "MICH" },
  "Michigan State": { espnId: "127", mascot: "Spartans", abbreviation: "MSU" },
  "Middle Tennessee": { espnId: "2393", mascot: "Blue Raiders", abbreviation: "MTSU" },
  "Minnesota": { espnId: "135", mascot: "Golden Gophers", abbreviation: "MINN" },
  "Mississippi State": { espnId: "344", mascot: "Bulldogs", abbreviation: "MSST" },
  "Missouri": { espnId: "142", mascot: "Tigers", abbreviation: "MIZ" },
  "Missouri State": { espnId: "2623", mascot: "Bears", abbreviation: "MOST" },
  "NC State": { espnId: "152", mascot: "Wolfpack", abbreviation: "NCSU" },
  "Navy": { espnId: "2426", mascot: "Midshipmen", abbreviation: "NAVY" },
  "Nebraska": { espnId: "158", mascot: "Cornhuskers", abbreviation: "NEB" },
  "Nevada": { espnId: "2440", mascot: "Wolf Pack", abbreviation: "NEV" },
  "New Mexico": { espnId: "167", mascot: "Lobos", abbreviation: "UNM" },
  "New Mexico State": { espnId: "166", mascot: "Aggies", abbreviation: "NMSU" },
  "North Carolina": { espnId: "153", mascot: "Tar Heels", abbreviation: "UNC" },
  "North Dakota State": { espnId: "2449", mascot: "Bison", abbreviation: "NDSU" },
  "North Texas": { espnId: "249", mascot: "Mean Green", abbreviation: "UNT" },
  "Northern Illinois": { espnId: "2459", mascot: "Huskies", abbreviation: "NIU" },
  "Northwestern": { espnId: "77", mascot: "Wildcats", abbreviation: "NU" },
  "Notre Dame": { espnId: "87", mascot: "Fighting Irish", abbreviation: "ND" },
  "Ohio": { espnId: "195", mascot: "Bobcats", abbreviation: "OHIO" },
  "Ohio State": { espnId: "194", mascot: "Buckeyes", abbreviation: "OSU" },
  "Oklahoma": { espnId: "201", mascot: "Sooners", abbreviation: "OU" },
  "Oklahoma State": { espnId: "197", mascot: "Cowboys", abbreviation: "OKST" },
  "Old Dominion": { espnId: "295", mascot: "Monarchs", abbreviation: "ODU" },
  "Ole Miss": { espnId: "145", mascot: "Rebels", abbreviation: "MISS" },
  "Oregon": { espnId: "2483", mascot: "Ducks", abbreviation: "ORE" },
  "Oregon State": { espnId: "204", mascot: "Beavers", abbreviation: "ORST" },
  "Penn State": { espnId: "213", mascot: "Nittany Lions", abbreviation: "PSU" },
  "Pittsburgh": { espnId: "221", mascot: "Panthers", abbreviation: "PITT" },
  "Purdue": { espnId: "2509", mascot: "Boilermakers", abbreviation: "PUR" },
  "Rice": { espnId: "242", mascot: "Owls", abbreviation: "RICE" },
  "Rutgers": { espnId: "164", mascot: "Scarlet Knights", abbreviation: "RUTG" },
  "SMU": { espnId: "2567", mascot: "Mustangs", abbreviation: "SMU" },
  "Sacramento State": { espnId: "16", mascot: "Hornets", abbreviation: "SAC" },
  "Sam Houston": { espnId: "2534", mascot: "Bearkats", abbreviation: "SHSU" },
  "San Diego State": { espnId: "21", mascot: "Aztecs", abbreviation: "SDSU" },
  "San Jose State": { espnId: "23", mascot: "Spartans", abbreviation: "SJSU" },
  "South Alabama": { espnId: "6", mascot: "Jaguars", abbreviation: "USA" },
  "South Carolina": { espnId: "2579", mascot: "Gamecocks", abbreviation: "SC" },
  "Southern Miss": { espnId: "2572", mascot: "Golden Eagles", abbreviation: "USM" },
  "Stanford": { espnId: "24", mascot: "Cardinal", abbreviation: "STAN" },
  "Syracuse": { espnId: "183", mascot: "Orange", abbreviation: "SYR" },
  "TCU": { espnId: "2628", mascot: "Horned Frogs", abbreviation: "TCU" },
  "Temple": { espnId: "218", mascot: "Owls", abbreviation: "TEM" },
  "Tennessee": { espnId: "2633", mascot: "Volunteers", abbreviation: "TENN" },
  "Texas": { espnId: "251", mascot: "Longhorns", abbreviation: "TEX" },
  "Texas A&M": { espnId: "245", mascot: "Aggies", abbreviation: "TA&M" },
  "Texas State": { espnId: "326", mascot: "Bobcats", abbreviation: "TXST" },
  "Texas Tech": { espnId: "2641", mascot: "Red Raiders", abbreviation: "TTU" },
  "Toledo": { espnId: "2649", mascot: "Rockets", abbreviation: "TOL" },
  "Troy": { espnId: "2653", mascot: "Trojans", abbreviation: "TROY" },
  "Tulane": { espnId: "2655", mascot: "Green Wave", abbreviation: "TULN" },
  "Tulsa": { espnId: "202", mascot: "Golden Hurricane", abbreviation: "TLSA" },
  "UAB": { espnId: "5", mascot: "Blazers", abbreviation: "UAB" },
  "UCF": { espnId: "2116", mascot: "Knights", abbreviation: "UCF" },
  "UCLA": { espnId: "26", mascot: "Bruins", abbreviation: "UCLA" },
  "UConn": { espnId: "41", mascot: "Huskies", abbreviation: "CONN" },
  "UL Monroe": { espnId: "2433", mascot: "Warhawks", abbreviation: "ULM" },
  "UMass": { espnId: "113", mascot: "Minutemen", abbreviation: "MASS" },
  "UNLV": { espnId: "2439", mascot: "Rebels", abbreviation: "UNLV" },
  "USC": { espnId: "30", mascot: "Trojans", abbreviation: "USC" },
  "USF": { espnId: "58", mascot: "Bulls", abbreviation: "USF" },
  "UTEP": { espnId: "2638", mascot: "Miners", abbreviation: "UTEP" },
  "UTSA": { espnId: "2636", mascot: "Roadrunners", abbreviation: "UTSA" },
  "Utah": { espnId: "254", mascot: "Utes", abbreviation: "UTAH" },
  "Utah State": { espnId: "328", mascot: "Aggies", abbreviation: "USU" },
  "Vanderbilt": { espnId: "238", mascot: "Commodores", abbreviation: "VAN" },
  "Virginia": { espnId: "258", mascot: "Cavaliers", abbreviation: "UVA" },
  "Virginia Tech": { espnId: "259", mascot: "Hokies", abbreviation: "VT" },
  "Wake Forest": { espnId: "154", mascot: "Demon Deacons", abbreviation: "WAKE" },
  "Washington": { espnId: "264", mascot: "Huskies", abbreviation: "WASH" },
  "Washington State": { espnId: "265", mascot: "Cougars", abbreviation: "WSU" },
  "West Virginia": { espnId: "277", mascot: "Mountaineers", abbreviation: "WVU" },
  "Western Kentucky": { espnId: "98", mascot: "Hilltoppers", abbreviation: "WKU" },
  "Western Michigan": { espnId: "2711", mascot: "Broncos", abbreviation: "WMU" },
  "Wisconsin": { espnId: "275", mascot: "Badgers", abbreviation: "WIS" },
  "Wyoming": { espnId: "2751", mascot: "Cowboys", abbreviation: "WYO" },
};

export function getTeamLogoInfo(playbookName: string): PublicTeamLogoInfo | null {
  const trimmed = playbookName.trim();
  if (!trimmed) return null;
  return PUBLIC_TEAM_LOGOS[trimmed] ?? null;
}

export function getTeamLogoUrl(playbookName: string): string | null {
  const info = getTeamLogoInfo(playbookName);
  if (!info) return null;
  return `${ESPN_LOGO_BASE}/${info.espnId}.png`;
}

export function getTeamMascot(playbookName: string): string | null {
  return getTeamLogoInfo(playbookName)?.mascot ?? null;
}

/** 2–4 char initials for emerald fallback circle (prefers ESPN abbreviation). */
export function getTeamInitials(playbookName: string): string {
  const info = getTeamLogoInfo(playbookName);
  const abbr = info?.abbreviation?.trim();
  if (abbr) {
    const cleaned = abbr.replace(/[^A-Za-z0-9]/g, "");
    if (cleaned.length >= 2) return cleaned.slice(0, 4).toUpperCase();
  }
  const parts = playbookName
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 3).toUpperCase();
  if (parts.length === 2) {
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
  }
  return parts
    .slice(0, 3)
    .map((p) => p[0]!)
    .join("")
    .toUpperCase();
}

