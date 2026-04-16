import type { ScoutingFormationReportRow, ScoutingReportRow } from "@/lib/tendenciesServer";

function pct(n: number): string {
  const x = Math.round(n * 10) / 10;
  return Number.isInteger(x) ? `${x}%` : `${x.toFixed(1)}%`;
}

type ScenarioKind =
  | "red_zone"
  | "goal_line"
  | "backed_up"
  | "first_down"
  | "fourth"
  | "third"
  | "second"
  | "other";

function scenarioKind(scenario: string): ScenarioKind {
  const s = scenario.trim().toLowerCase();
  if (s === "red zone") return "red_zone";
  if (s === "goal line") return "goal_line";
  if (s === "backed up") return "backed_up";
  if (s === "1st down") return "first_down";
  if (s === "4th down") return "fourth";
  if (s.startsWith("3rd")) return "third";
  if (s.startsWith("2nd")) return "second";
  return "other";
}

function lowTierClosing(row: ScoutingReportRow, passHeavy: boolean, runHeavy: boolean, balanced: boolean): string {
  const tp = row.top_play;
  if (tp && tp.success_rate >= 45 && tp.uses >= 2) {
    return `${tp.play_name} is converting at ${tp.success_rate}% here — lean into it more until the defense has to honor it.`;
  }
  if (tp && tp.success_rate >= 35 && tp.uses >= 2) {
    return `Your top rep (${tp.play_name}) is only at ${tp.success_rate}% — sequence a hard counter off it so you’re not predictable.`;
  }
  const k = scenarioKind(row.scenario);
  if (passHeavy) {
    if (k === "red_zone" || k === "goal_line") {
      return `Consider adding a downhill run or RPO so safeties can’t sit on routes near the goal line.`;
    }
    return `Try mixing in more run plays and screens to slow the pass rush and make linebackers hesitate.`;
  }
  if (runHeavy) {
    return `Work in quick play-action or a shot off play-action — you need answers when they load the box.`;
  }
  if (balanced) {
    return `Narrow the menu to two concepts you trust and call them with conviction until the numbers turn.`;
  }
  return `Find one explosive play you can hang your hat on here, then build counters off of it.`;
}

function lowTierLead(
  row: ScoutingReportRow,
  kind: ScenarioKind,
  passHeavy: boolean,
  runHeavy: boolean,
  balanced: boolean,
): string {
  const { scenario, run_pct, pass_pct, success_pct } = row;
  const rp = pct(run_pct);
  const pp = pct(pass_pct);
  const sp = pct(success_pct);

  if (kind === "red_zone") {
    if (passHeavy) {
      return `You’re passing ${pp} of the time in the red zone, but only ${sp} of those snaps hit the success standard.`;
    }
    if (runHeavy) {
      return `You’re running ${rp} of the time in the red zone, yet only ${sp} of those plays are efficient by down-and-distance.`;
    }
    return `In the red zone you’re ${rp} run and ${pp} pass, and only ${sp} of those plays are clearing the bar.`;
  }

  if (kind === "goal_line") {
    return `Inside the goal line you’re ${rp} run / ${pp} pass, with just ${sp} hitting success — every inch matters here.`;
  }

  if (kind === "backed_up") {
    return `Backed up you’re ${rp} run against ${pp} pass, and only ${sp} are successful — field position is fragile.`;
  }

  if (kind === "first_down") {
    if (balanced) {
      return `Your 1st-down calls are ${rp} run and ${pp} pass — balanced on paper — but only ${sp} are successful.`;
    }
    if (passHeavy) {
      return `On 1st down you’re throwing ${pp} of the time, and only ${sp} of those plays are winning the down.`;
    }
    return `On 1st down you’re running ${rp} of the time, yet only ${sp} are hitting the success standard.`;
  }

  if (kind === "third") {
    return `On ${scenario.toLowerCase()} you’re ${rp} run / ${pp} pass, and you’re only converting the down ${sp} of the time by efficiency.`;
  }

  if (kind === "fourth") {
    return `On 4th down you’re ${rp} run / ${pp} pass, with ${sp} successful — these snaps have to be sharp.`;
  }

  if (kind === "second") {
    return `In ${scenario} you’re sitting ${rp} run and ${pp} pass, but only ${sp} of those plays stay ahead of the chains.`;
  }

  if (passHeavy) {
    return `In ${scenario} you’re passing ${pp} of the time while only ${sp} of snaps qualify as successful.`;
  }
  if (runHeavy) {
    return `In ${scenario} you’re running ${rp} of the time, yet success is only ${sp} — the efficiency isn’t matching the commitment.`;
  }
  return `In ${scenario} you’re ${rp} run / ${pp} pass, and only ${sp} of those plays are winning the down.`;
}

/** Single coaching paragraph: quantifies run/pass/success and matches tone to success tier. */
export function scoutingCoachingInsight(row: ScoutingReportRow): string {
  const { scenario, run_pct, pass_pct, success_pct } = row;
  const rp = pct(run_pct);
  const pp = pct(pass_pct);
  const sp = pct(success_pct);

  const passHeavy = pass_pct >= 61;
  const runHeavy = run_pct >= 61;
  const balanced = run_pct >= 40 && pass_pct >= 40 && !passHeavy && !runHeavy;
  const kind = scenarioKind(scenario);

  if (success_pct >= 60) {
    if (kind === "red_zone") {
      return `In the red zone you’re ${rp} run and ${pp} pass, and ${sp} of those snaps are successful — you’re finishing drives. This is one of your strengths — keep doing what you’re doing.`;
    }
    if (balanced) {
      return `On ${scenario} you’re ${rp} run / ${pp} pass with ${sp} success — the balance is working. This is one of your strengths — keep doing what you’re doing.`;
    }
    if (passHeavy) {
      return `You’re throwing ${pp} of the time on ${scenario} and still clearing ${sp} successful plays — defenses aren’t taking the pass away. This is one of your strengths — keep doing what you’re doing.`;
    }
    if (runHeavy) {
      return `You’re running ${rp} of the time on ${scenario} with ${sp} success — you’re controlling the line of scrimmage. This is one of your strengths — keep doing what you’re doing.`;
    }
    return `In ${scenario} you’re ${rp} run / ${pp} pass, and ${sp} of those plays hit the success standard. This is one of your strengths — keep doing what you’re doing.`;
  }

  if (success_pct >= 40) {
    if (kind === "red_zone" && passHeavy) {
      return `You’re passing ${pp} in the red zone with ${sp} success — workable, but linebackers can still key the throw. Room to improve, but you’re converting at a reasonable rate.`;
    }
    if (balanced) {
      return `Your ${scenario} plan is ${rp} run and ${pp} pass, with ${sp} success — the distribution looks healthy even if the margin is thin. Room to improve, but you’re converting at a reasonable rate.`;
    }
    return `On ${scenario} you’re ${rp} run / ${pp} pass, landing at ${sp} successful plays. Room to improve, but you’re converting at a reasonable rate.`;
  }

  const lead = lowTierLead(row, kind, passHeavy, runHeavy, balanced);
  const close = lowTierClosing(row, passHeavy, runHeavy, balanced);
  return `${lead} ${close}`;
}

export function scoutingSuccessDotClass(successPct: number): string {
  if (successPct >= 60) return "bg-emerald-500";
  if (successPct >= 40) return "bg-amber-500";
  return "bg-red-500";
}

/** Left accent for cards below 40% success (subtle, not full-card red). */
export function scoutingCardAccentClass(successPct: number): string {
  if (successPct < 40) return "border-l-[3px] border-l-red-500/75";
  return "";
}

/** Formation scouting cards — only called for rows that already matched a red-flag rule. */
export function scoutingFormationInsight(row: ScoutingFormationReportRow): string {
  const parts: string[] = [];
  const snapStr = pct(row.snap_pct);
  const passHeavy = row.pass_pct >= 80;
  const runHeavy = row.run_pct >= 80;
  const oneDim = row.flag_one_dimensional;
  const rp = pct(row.run_pct);
  const pp = pct(row.pass_pct);
  const succInt = Math.round(row.success_pct);

  if (row.flag_over_used && oneDim) {
    if (passHeavy) {
      parts.push(
        `${snapStr} of your snaps come from this formation, and you're passing ${pp} of the time out of it. That's a clear tell.`,
      );
    } else if (runHeavy) {
      parts.push(
        `${snapStr} of your snaps come from this formation, and you're running ${rp} of the time out of it. That's a clear tell.`,
      );
    } else {
      parts.push(`${snapStr} of your snaps come from this formation. Opponents will start scheming against it.`);
    }
  } else if (row.flag_over_used) {
    parts.push(`${snapStr} of your snaps come from this formation. Opponents will start scheming against it.`);
  }

  if (row.flag_under_performing) {
    parts.push(
      `You've run ${row.uses.toLocaleString("en-US")} plays out of this formation at only ${succInt}% success. Consider swapping some of these plays or using a different formation.`,
    );
  }

  if (row.flag_one_dimensional && !(row.flag_over_used && oneDim)) {
    if (passHeavy) {
      parts.push(`You pass ${pp} of the time from this formation. Adding a run play would make it less predictable.`);
    } else if (runHeavy) {
      parts.push(`You run ${rp} of the time from this formation. A play action pass could catch defenses off guard.`);
    }
  }

  return parts.join("\n\n");
}

export function scoutingFormationSnapFooter(row: ScoutingFormationReportRow): string {
  return `${pct(row.snap_pct)} of your total snaps come from this formation.`;
}
