import { DriveCardOutcomeBadge } from "@/components/film/DriveCardOutcomeBadge";
import { DriveSideBadge } from "@/components/film/DriveSideBadge";
import {
  filmDriveDetailCardDriveLabelClass,
  filmDriveDetailCardMetaLineClass,
  filmDriveDetailCardOuterClass,
} from "@/components/film/filmDriveDetailCardClasses";

/** Compact Drive Summary snapshot — matches `/film/[gameId]` game detail. */
export function FilmRoomOnboardingMockup() {
  const drives = [
    {
      n: 1,
      side: "offense" as const,
      outcome: "TD",
      meta: "Q1 · 7-0 · 5 calls",
    },
    {
      n: 2,
      side: "defense" as const,
      outcome: "INTERCEPTION",
      meta: "Q1 · 7-0 · 7 calls",
    },
    {
      n: 3,
      side: "offense" as const,
      outcome: "TD",
      meta: "Q2 · 14-0 · 4 calls",
    },
  ];

  return (
    <div className="w-full max-w-[420px] space-y-2">
      <div className="min-w-0 px-0.5">
        <p className="truncate font-heading text-[13px] font-bold uppercase tracking-[0.1em] text-slate-100">
          Ohio State
          <span className="mx-1.5 font-body font-normal normal-case tracking-normal text-slate-500">
            vs
          </span>
          Michigan
        </p>
        <p className="mt-0.5 font-body text-[11px] text-slate-400">W · 14 - 0</p>
        <p className="mt-1 font-sans text-[10px] uppercase tracking-wide text-slate-500">
          <span className="font-mono tabular-nums text-slate-300">16</span>
          <span className="ml-1">calls</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span className="font-mono tabular-nums">3</span>
          <span className="ml-1">drives</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span className="font-mono tabular-nums">214</span>
          <span className="ml-1">yds</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span className="font-mono tabular-nums">2</span>
          <span className="ml-1">TD</span>
        </p>
      </div>

      <div className="space-y-1.5">
        {drives.map((d) => (
          <div key={d.n} className={filmDriveDetailCardOuterClass}>
            <div className="flex items-center gap-1 px-2 py-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-1">
                <div className="flex min-w-0 flex-nowrap items-center gap-2">
                  <span className={`${filmDriveDetailCardDriveLabelClass} inline-flex items-center leading-none`}>
                    DRIVE {d.n}
                  </span>
                  <span className="inline-flex shrink-0 items-center">
                    <DriveSideBadge side={d.side} />
                  </span>
                  <span className="inline-flex shrink-0 items-center">
                    <DriveCardOutcomeBadge label={d.outcome} />
                  </span>
                </div>
                <span className={filmDriveDetailCardMetaLineClass}>{d.meta}</span>
              </div>
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#62748E]"
                aria-hidden
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WelcomeFilmRoomMockup() {
  return <FilmRoomOnboardingMockup />;
}
