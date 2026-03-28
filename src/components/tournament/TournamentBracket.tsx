"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export type BracketMatchStatus = "SCHEDULED" | "LIVE" | "COMPLETED";

export type BracketTeam = {
  id: number;
  name: string;
  score?: number | null;
};

export type BracketMatch = {
  id: string;
  label?: string;
  status: BracketMatchStatus;
  homeTeam: BracketTeam;
  awayTeam?: BracketTeam | null;
  winnerTeamId?: number | null;
};

export type BracketRound = {
  id: string;
  name: string;
  matches: BracketMatch[];
};

type TournamentBracketProps = {
  rounds: BracketRound[];
};

const COLUMN_GAP_REM = 1.25;
const CONNECTOR_OFFSET_REM = COLUMN_GAP_REM / 2;
const CONNECTOR_DOT_SIZE_REM = 0.55;

function getStatusClass(status: BracketMatchStatus) {
  if (status === "COMPLETED") {
    return "border-emerald-300/40 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "LIVE") {
    return "border-amber-300/45 bg-amber-400/10 text-amber-100";
  }

  return "border-amber-300/20 bg-zinc-950/55 text-zinc-200";
}

function TeamRow({
  team,
  isWinner,
  isEliminated,
}: {
  team: BracketTeam | null;
  isWinner: boolean;
  isEliminated: boolean;
}) {
  if (!team) {
    return (
      <div className="flex items-center justify-between rounded-md border border-dashed border-amber-300/30 bg-zinc-900/35 px-2.5 py-2 text-sm text-zinc-400">
        <span>BYE</span>
        <span>-</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-between rounded-md border px-2.5 py-2 text-sm transition-colors",
        isWinner
          ? "border-emerald-300/45 bg-emerald-500/20 text-emerald-50"
          : "border-amber-300/20 bg-zinc-900/55 text-zinc-200",
        isEliminated && "border-zinc-600/50 bg-zinc-700/25 text-zinc-400",
      )}
    >
      <span className={cn("max-w-[85%] truncate", isEliminated && "line-through decoration-red-500 decoration-2")}>
        {team.name}
      </span>
      <span className={cn("font-semibold", isWinner ? "text-emerald-100" : "text-zinc-300")}>
        {typeof team.score === "number" ? team.score : "-"}
      </span>
      {isEliminated ? (
        <span className="pointer-events-none absolute left-2 right-2 top-1/2 h-[2px] -translate-y-1/2 bg-red-500/70" />
      ) : null}
    </div>
  );
}

export function TournamentBracket({ rounds }: TournamentBracketProps) {
  const hasThirdPlaceMatch = rounds.some((round) =>
    round.matches.some((match) => match.label === "3rd Place"),
  );
  const firstRoundMatchCount = rounds[0]?.matches.length ?? 1;
  const positionDenominator = Math.max(firstRoundMatchCount * 2, 2);
  const bracketBodyHeightRem = Math.max(18, firstRoundMatchCount * 8.5);

  const getMatchCenterPercent = (
    round: BracketRound,
    roundIndex: number,
    matchIndex: number,
  ) => {
    const match = round.matches[matchIndex];
    const isPlacementRound = round.name === "Final & 3rd Place";

    if (isPlacementRound && match?.label === "3rd Place") {
      return ((positionDenominator - 1) / positionDenominator) * 100;
    }

    const trackPosition =
      2 ** roundIndex + matchIndex * 2 ** (roundIndex + 1);

    return (trackPosition / positionDenominator) * 100;
  };

  const renderMatchCard = (
    match: BracketMatch,
    matchIndex: number,
    roundIndex: number,
  ) => {
    const hasWinner = typeof match.winnerTeamId === "number";
    const homeWon = hasWinner && match.winnerTeamId === match.homeTeam.id;
    const awayWon =
      hasWinner &&
      !!match.awayTeam &&
      match.winnerTeamId === match.awayTeam.id;

    return (
      <motion.article
        key={match.id}
        layout
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 12 }}
        transition={{
          duration: 0.28,
          ease: "easeOut",
          delay: matchIndex * 0.035,
        }}
        className={cn(
          "relative z-10 rounded-xl border p-3",
          "bg-zinc-950/55 backdrop-blur-sm",
          hasWinner
            ? "border-emerald-300/40 shadow-[0_0_24px_rgba(16,185,129,0.18)]"
            : "border-amber-300/20",
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">
            {match.label ?? `Match ${matchIndex + 1}`}
          </p>
          <Badge className={cn("text-[10px]", getStatusClass(match.status))}>
            {match.status}
          </Badge>
        </div>

        <div className="space-y-2">
          <TeamRow
            team={match.homeTeam}
            isWinner={homeWon}
            isEliminated={hasWinner && !homeWon}
          />
          <TeamRow
            team={match.awayTeam ?? null}
            isWinner={awayWon}
            isEliminated={Boolean(match.awayTeam) && hasWinner && !awayWon}
          />
        </div>

        {roundIndex < rounds.length - 1 ? (
          <div
            className="pointer-events-none absolute top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-amber-300/70 to-amber-300/60 md:block"
            style={{
              right: `-${CONNECTOR_OFFSET_REM}rem`,
              width: `${CONNECTOR_OFFSET_REM}rem`,
            }}
          />
        ) : null}
      </motion.article>
    );
  };

  const renderConnector = (
    round: BracketRound,
    roundIndex: number,
    matchIndex: number,
  ) => {
    if (roundIndex === 0) {
      return null;
    }

    const previousRound = rounds[roundIndex - 1];
    if (!previousRound) {
      return null;
    }

    const isPlacementRound = round.name === "Final & 3rd Place";
    if (isPlacementRound && matchIndex > 0) {
      return null;
    }

    const sourceIndexes = isPlacementRound
      ? previousRound.matches.map((_, index) => index)
      : [matchIndex * 2, matchIndex * 2 + 1].filter(
          (index) => index < previousRound.matches.length,
        );
    const targetIndexes = isPlacementRound ? [0, 1] : [matchIndex];

    const sourceCenters = sourceIndexes.map((index) =>
      getMatchCenterPercent(previousRound, roundIndex - 1, index),
    );
    const targetCenters = targetIndexes
      .filter((index) => index < round.matches.length)
      .map((index) => getMatchCenterPercent(round, roundIndex, index));

    if (sourceCenters.length === 0 || targetCenters.length === 0) {
      return null;
    }

    const topPercent = Math.min(...sourceCenters, ...targetCenters);
    const bottomPercent = Math.max(...sourceCenters, ...targetCenters);

    return (
      <div
        key={`connector-${round.id}-${matchIndex}`}
        className="pointer-events-none absolute inset-0 hidden md:block"
      >
        <div
          className="absolute w-px bg-amber-300/65"
          style={{
            left: `-${CONNECTOR_OFFSET_REM}rem`,
            top: `${topPercent}%`,
            height: `${Math.max(bottomPercent - topPercent, 0)}%`,
          }}
        />

        {targetCenters.map((center, index) => (
          <div key={`connector-target-${round.id}-${index}`}>
            <div
              className="absolute h-px bg-gradient-to-r from-amber-300/70 to-amber-300/60"
              style={{
                left: `-${CONNECTOR_OFFSET_REM}rem`,
                top: `${center}%`,
                width: `${CONNECTOR_OFFSET_REM}rem`,
              }}
            />
            <div
              className="absolute rounded-full border border-amber-200/60 bg-amber-200/85 shadow-[0_0_8px_rgba(252,211,77,0.35)]"
              style={{
                left: `calc(${-CONNECTOR_OFFSET_REM}rem - ${CONNECTOR_DOT_SIZE_REM / 2}rem)`,
                top: `calc(${center}% - ${CONNECTOR_DOT_SIZE_REM / 2}rem)`,
                width: `${CONNECTOR_DOT_SIZE_REM}rem`,
                height: `${CONNECTOR_DOT_SIZE_REM}rem`,
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.22em] text-zinc-300/80">Bracket</p>
        <p className="text-xs text-zinc-400">
          {hasThirdPlaceMatch ? "Single elimination + 3rd place match" : "Single elimination"}
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className="grid min-w-[880px] gap-5 lg:min-w-0"
          style={{
            gridTemplateColumns: `repeat(${Math.max(rounds.length, 1)}, minmax(220px, 1fr))`,
          }}
          >
            {rounds.map((round, roundIndex) => (
              <motion.section
                key={round.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: roundIndex * 0.05 }}
                className="grid content-start gap-3"
              >
                <div className="rounded-lg border border-amber-300/20 bg-zinc-900/40 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">{round.name}</p>
                </div>

                <AnimatePresence initial={false}>
                  <div
                    className="relative overflow-visible"
                    style={{
                      height: `${bracketBodyHeightRem}rem`,
                    }}
                  >
                    {round.matches.map((_, matchIndex) =>
                      renderConnector(round, roundIndex, matchIndex),
                    )}
                    {round.matches.map((match, matchIndex) => {
                      return (
                        <motion.div
                          key={`slot-${match.id}`}
                          layout
                          className="absolute left-0 right-0"
                          style={{
                            top: `${getMatchCenterPercent(round, roundIndex, matchIndex)}%`,
                            transform: "translateY(-50%)",
                          }}
                        >
                          {renderMatchCard(match, matchIndex, roundIndex)}
                        </motion.div>
                      );
                    })}
                  </div>
                </AnimatePresence>
              </motion.section>
            ))}
        </div>
      </div>
    </div>
  );
}

