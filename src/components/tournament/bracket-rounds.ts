import type { BracketRound, BracketTeam } from "@/components/tournament/TournamentBracket";
import {
  getBracketMatchLabel,
  isThirdPlaceChampionshipRound,
} from "@/components/tournament/match-labels";

type SourceTeam = {
  id: number;
  name: string;
};

export type BracketSourceMatch = {
  id: number;
  round: number;
  position: number;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELED";
  winnerTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: SourceTeam;
  awayTeam: SourceTeam | null;
};

function toBracketStatus(status: BracketSourceMatch["status"]) {
  if (status === "COMPLETED") {
    return "COMPLETED" as const;
  }

  if (status === "LIVE") {
    return "LIVE" as const;
  }

  return "SCHEDULED" as const;
}

function buildRoundName(round: number, maxRound: number) {
  if (round === maxRound) {
    return "Final";
  }
  if (round === maxRound - 1) {
    return "Semifinal";
  }
  if (round === maxRound - 2) {
    return "Quarterfinal";
  }
  return `Round ${round}`;
}

function getNextPowerOfTwo(value: number) {
  if (value <= 2) {
    return 2;
  }

  return 2 ** Math.ceil(Math.log2(value));
}

function buildPlaceholderTeam(round: number, position: number, slot: number): BracketTeam {
  return {
    id: -1 * (round * 10000 + position * 10 + slot),
    name: "TBD",
    score: null,
  };
}

function getExpectedMatchCountForRound(round: number, bracketSize: number) {
  return Math.max(1, Math.floor(bracketSize / 2 ** round));
}

function hasPlacementStage(totalRounds: number, bracketSize: number) {
  return totalRounds >= 2 && bracketSize >= 4;
}

export function buildBracketRounds(matches: BracketSourceMatch[], teamLimit: number): BracketRound[] {
  if (matches.length === 0) {
    return [];
  }

  const roundMap = new Map<number, Map<number, BracketSourceMatch>>();

  for (const match of matches) {
    if (!roundMap.has(match.round)) {
      roundMap.set(match.round, new Map<number, BracketSourceMatch>());
    }

    roundMap.get(match.round)!.set(match.position, match);
  }

  const maxExistingRound = Math.max(...matches.map((match) => match.round), 1);
  const bracketSize = getNextPowerOfTwo(Math.max(teamLimit, 2));
  const maxRoundFromLimit = Math.max(1, Math.log2(bracketSize));
  const totalRounds = Math.max(maxExistingRound, maxRoundFromLimit);
  const showPlacementStage = hasPlacementStage(totalRounds, bracketSize);

  const rounds: BracketRound[] = [];

  for (let round = 1; round <= totalRounds; round += 1) {
    const matchesInRound = roundMap.get(round);
    const isPlacementRound = showPlacementStage && round === totalRounds;
    const expectedByLimit = isPlacementRound
      ? 2
      : getExpectedMatchCountForRound(round, bracketSize);
    const expectedCount = Math.max(expectedByLimit, matchesInRound?.size ?? 0, 1);
    const bracketMatches: BracketRound["matches"] = [];

    for (let position = 1; position <= expectedCount; position += 1) {
      const match = matchesInRound?.get(position);
      const defaultLabel =
        isPlacementRound && position === 1
          ? "Final"
          : isPlacementRound && position === 2
            ? "3rd Place"
            : null;

      if (match) {
        bracketMatches.push({
          id: `match-${match.id}`,
          label: getBracketMatchLabel(matches, match) ?? defaultLabel ?? undefined,
          status: toBracketStatus(match.status),
          winnerTeamId: match.winnerTeamId ?? undefined,
          homeTeam: {
            id: match.homeTeam.id,
            name: match.homeTeam.name,
            score: match.homeScore,
          },
          awayTeam: match.awayTeam
            ? {
                id: match.awayTeam.id,
                name: match.awayTeam.name,
                score: match.awayScore,
              }
            : null,
        });
        continue;
      }

      bracketMatches.push({
        id: `placeholder-${round}-${position}`,
        label:
          getBracketMatchLabel(matches, { round, position }) ??
          defaultLabel ??
          undefined,
        status: "SCHEDULED",
        homeTeam: buildPlaceholderTeam(round, position, 1),
        awayTeam: buildPlaceholderTeam(round, position, 2),
      });
    }

    rounds.push({
      id: `round-${round}`,
      name: isPlacementRound || isThirdPlaceChampionshipRound(matches, round)
        ? "Final & 3rd Place"
        : buildRoundName(round, totalRounds),
      matches: bracketMatches,
    });
  }

  return rounds;
}
