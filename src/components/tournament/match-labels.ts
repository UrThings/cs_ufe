type MatchLabelSource = {
  round: number;
  position: number;
};

function buildRoundSizeMap(matches: MatchLabelSource[]) {
  const roundSizeMap = new Map<number, number>();

  for (const match of matches) {
    roundSizeMap.set(match.round, (roundSizeMap.get(match.round) ?? 0) + 1);
  }

  return roundSizeMap;
}

export function isThirdPlaceChampionshipRound(
  matches: MatchLabelSource[],
  round: number,
) {
  if (round <= 1) {
    return false;
  }

  const roundSizeMap = buildRoundSizeMap(matches);
  return (
    (roundSizeMap.get(round) ?? 0) === 2 &&
    (roundSizeMap.get(round - 1) ?? 0) === 2
  );
}

export function getTournamentMatchHeading(
  matches: MatchLabelSource[],
  match: MatchLabelSource,
) {
  if (isThirdPlaceChampionshipRound(matches, match.round)) {
    if (match.position === 1) {
      return "Final";
    }

    if (match.position === 2) {
      return "3rd Place Match";
    }
  }

  const roundSizeMap = buildRoundSizeMap(matches);
  if ((roundSizeMap.get(match.round) ?? 0) === 1) {
    return "Final";
  }

  return `Round ${match.round} - Match ${match.position}`;
}

export function getBracketMatchLabel(
  matches: MatchLabelSource[],
  match: MatchLabelSource,
) {
  if (isThirdPlaceChampionshipRound(matches, match.round)) {
    if (match.position === 1) {
      return "Final";
    }

    if (match.position === 2) {
      return "3rd Place";
    }
  }

  const roundSizeMap = buildRoundSizeMap(matches);
  if ((roundSizeMap.get(match.round) ?? 0) === 1) {
    return "Final";
  }

  return null;
}
