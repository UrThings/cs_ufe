import { prisma } from "@/lib/prisma";

const SERIALIZABLE_RETRIES = 2;
const RANDOM_SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
type TournamentTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type SeedRoundOptions = {
  tournamentId: number;
  round: number;
  teamIds: number[];
  scheduledAt: Date;
};
type TournamentJoinRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
type TournamentSettings = {
  teamLimit: number;
  matchBestOf: number;
  finalBestOf: number;
};

const DEFAULT_TOURNAMENT_SETTINGS: TournamentSettings = {
  teamLimit: 16,
  matchBestOf: 1,
  finalBestOf: 1,
};

export class TournamentServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isTournamentServiceError(
  error: unknown,
): error is TournamentServiceError {
  return error instanceof TournamentServiceError;
}

function getPrismaErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  if (!("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function randomString(length: number, alphabet: string) {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    value += alphabet[randomIndex];
  }
  return value;
}

function buildSlug(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return base || "tournament";
}

function shuffleArray<T>(input: T[]) {
  const result = [...input];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = temp;
  }

  return result;
}

async function runSerializableTransaction<T>(
  operation: () => Promise<T>,
  retries = SERIALIZABLE_RETRIES,
) {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      if (getPrismaErrorCode(error) === "P2034" && attempt < retries) {
        attempt += 1;
        continue;
      }

      throw error;
    }
  }

  throw new TournamentServiceError(500, "Transaction failed after retries.");
}

function mapPrismaError(error: unknown, fallbackMessage: string) {
  const code = getPrismaErrorCode(error);

  if (code === "P2002") {
    return new TournamentServiceError(
      409,
      "Tournament operation conflicts with existing data.",
    );
  }

  if (code === "P2025") {
    return new TournamentServiceError(404, "Requested tournament data was not found.");
  }

  if (isTournamentServiceError(error)) {
    return error;
  }

  return new TournamentServiceError(500, fallbackMessage);
}

function mapJoinRequestTableError(error: unknown) {
  const code = getPrismaErrorCode(error);
  if (code === "42P01") {
    return new TournamentServiceError(
      500,
      "Tournament join request table is missing. Run database migrations.",
    );
  }

  return null;
}

function mapTournamentSettingsTableError(error: unknown) {
  const code = getPrismaErrorCode(error);
  if (code === "42P01") {
    return new TournamentServiceError(
      500,
      "Tournament settings table is missing. Run database migrations.",
    );
  }

  return null;
}

async function loadTournamentSettings(
  tx: TournamentTransaction,
  tournamentId: number,
): Promise<TournamentSettings> {
  const rows = await tx.$queryRaw<
    Array<{ teamLimit: number; matchBestOf: number; finalBestOf: number }>
  >`
    SELECT
      "teamLimit",
      "matchBestOf",
      "finalBestOf"
    FROM "TournamentSettings"
    WHERE "tournamentId" = ${tournamentId}
    LIMIT 1
  `;

  const settings = rows[0];
  if (!settings) {
    return DEFAULT_TOURNAMENT_SETTINGS;
  }

  return {
    teamLimit: settings.teamLimit,
    matchBestOf: settings.matchBestOf,
    finalBestOf: settings.finalBestOf,
  };
}

async function ensureSystemHostTeam(tx: TournamentTransaction, adminUserId: number) {
  const existing = await tx.team.findFirst({
    where: { ownerId: adminUserId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return existing.id;
  }

  const baseSlug = `system-host-${adminUserId}`;

  let slug = baseSlug;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? slug : `${baseSlug}-${randomString(4, "abcdefghijklmnopqrstuvwxyz0123456789")}`;
    const found = await tx.team.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!found) {
      slug = candidate;
      break;
    }
  }

  let teamCode = randomString(6, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const found = await tx.team.findUnique({
      where: { teamCode },
      select: { id: true },
    });

    if (!found) {
      break;
    }

    teamCode = randomString(6, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
  }

  const created = await tx.team.create({
    data: {
      name: "System Host",
      slug,
      teamCode,
      ownerId: adminUserId,
      description: "Auto-generated host team for tournaments.",
    },
    select: { id: true },
  });

  return created.id;
}

async function generateUniqueTournamentSlug(
  tx: TournamentTransaction,
  title: string,
) {
  const base = buildSlug(title).slice(0, 50);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${randomString(5, RANDOM_SUFFIX_ALPHABET)}`;
    const candidate = `${base}${suffix}`;
    const existing = await tx.tournament.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new TournamentServiceError(500, "Unable to generate a unique tournament slug.");
}

function assertUniqueTeamIds(teamIds: number[]) {
  const unique = new Set(teamIds);

  if (unique.size !== teamIds.length) {
    throw new TournamentServiceError(409, "Duplicate teams detected in bracket seeding.");
  }
}

async function createRoundMatches(
  tx: TournamentTransaction,
  options: SeedRoundOptions,
) {
  if (options.teamIds.length === 0) {
    throw new TournamentServiceError(400, "Cannot create matches for an empty round.");
  }

  assertUniqueTeamIds(options.teamIds);

  const existingCount = await tx.match.count({
    where: {
      tournamentId: options.tournamentId,
      round: options.round,
    },
  });

  if (existingCount > 0) {
    throw new TournamentServiceError(
      409,
      `Round ${options.round} matches already exist.`,
    );
  }

  let position = 1;
  const createdMatches: Array<{
    id: number;
    round: number;
    position: number;
    homeTeamId: number;
    awayTeamId: number | null;
    winnerTeamId: number | null;
    status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELED";
  }> = [];

  for (let index = 0; index < options.teamIds.length; index += 2) {
    const homeTeamId = options.teamIds[index];
    const awayTeamId = options.teamIds[index + 1] ?? null;
    const isBye = awayTeamId === null;

    const match = await tx.match.create({
      data: {
        tournamentId: options.tournamentId,
        round: options.round,
        position,
        homeTeamId,
        awayTeamId,
        winnerTeamId: isBye ? homeTeamId : null,
        scheduledAt: options.scheduledAt,
        status: isBye ? "COMPLETED" : "SCHEDULED",
        completedAt: isBye ? new Date() : null,
      },
      select: {
        id: true,
        round: true,
        position: true,
        homeTeamId: true,
        awayTeamId: true,
        winnerTeamId: true,
        status: true,
      },
    });

    createdMatches.push(match);
    position += 1;
  }

  return createdMatches;
}

type ExpectedRoundMatch = {
  position: number;
  homeTeamId: number;
  awayTeamId: number | null;
};

function buildExpectedRoundMatches(teamIds: number[]) {
  const expected: ExpectedRoundMatch[] = [];
  let position = 1;

  for (let index = 0; index < teamIds.length; index += 2) {
    expected.push({
      position,
      homeTeamId: teamIds[index],
      awayTeamId: teamIds[index + 1] ?? null,
    });
    position += 1;
  }

  return expected;
}

async function ensureNextRoundMatchesForWinners(
  tx: TournamentTransaction,
  options: {
    tournamentId: number;
    round: number;
    winnerIds: number[];
    scheduledAt: Date;
  },
) {
  const expectedMatches = buildExpectedRoundMatches(options.winnerIds);
  const existingMatches = await tx.match.findMany({
    where: {
      tournamentId: options.tournamentId,
      round: options.round,
    },
    select: {
      id: true,
      position: true,
      homeTeamId: true,
      awayTeamId: true,
      winnerTeamId: true,
      status: true,
    },
    orderBy: {
      position: "asc",
    },
  });

  if (existingMatches.length > expectedMatches.length) {
    throw new TournamentServiceError(
      409,
      `Round ${options.round} has more matches than expected.`,
    );
  }

  for (const existing of existingMatches) {
    const expected = expectedMatches[existing.position - 1];
    if (!expected) {
      throw new TournamentServiceError(
        409,
        `Round ${options.round} contains an invalid match position.`,
      );
    }

    const awayTeamId = existing.awayTeamId ?? null;
    if (
      existing.homeTeamId !== expected.homeTeamId ||
      awayTeamId !== expected.awayTeamId
    ) {
      throw new TournamentServiceError(
        409,
        `Round ${options.round} bracket data is inconsistent with previous winners.`,
      );
    }
  }

  const existingPositions = new Set(existingMatches.map((match) => match.position));

  for (const expected of expectedMatches) {
    if (existingPositions.has(expected.position)) {
      continue;
    }

    const isBye = expected.awayTeamId === null;
    await tx.match.create({
      data: {
        tournamentId: options.tournamentId,
        round: options.round,
        position: expected.position,
        homeTeamId: expected.homeTeamId,
        awayTeamId: expected.awayTeamId,
        winnerTeamId: isBye ? expected.homeTeamId : null,
        scheduledAt: options.scheduledAt,
        status: isBye ? "COMPLETED" : "SCHEDULED",
        completedAt: isBye ? new Date() : null,
      },
    });
  }

  return tx.match.findMany({
    where: {
      tournamentId: options.tournamentId,
      round: options.round,
    },
    select: {
      id: true,
      position: true,
      winnerTeamId: true,
      status: true,
    },
    orderBy: {
      position: "asc",
    },
  });
}

async function advanceTournamentIfRoundComplete(
  tx: TournamentTransaction,
  tournamentId: number,
  fromRound: number,
) {
  let currentRound = fromRound;

  while (true) {
    const currentRoundMatches = await tx.match.findMany({
      where: {
        tournamentId,
        round: currentRound,
      },
      select: {
        position: true,
        winnerTeamId: true,
      },
      orderBy: {
        position: "asc",
      },
    });

    if (currentRoundMatches.length === 0) {
      return { finished: false as const };
    }

    if (
      currentRoundMatches.some(
        (match: { winnerTeamId: number | null }) => match.winnerTeamId === null,
      )
    ) {
      return { finished: false as const };
    }

    const winnerIds = currentRoundMatches.map(
      (match: { winnerTeamId: number | null }) => match.winnerTeamId as number,
    );
    assertUniqueTeamIds(winnerIds);

    const nextRound = currentRound + 1;

    if (winnerIds.length === 1) {
      const tournament = await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          status: "FINISHED",
          championTeamId: winnerIds[0],
          finishedAt: new Date(),
          endDate: new Date(),
        },
        select: {
          id: true,
          status: true,
          championTeamId: true,
          finishedAt: true,
        },
      });

      return {
        finished: true as const,
        tournament,
      };
    }

    const nextRoundMatches = await ensureNextRoundMatchesForWinners(tx, {
      tournamentId,
      round: nextRound,
      winnerIds,
      scheduledAt: new Date(),
    });

    const allAutoCompleted = nextRoundMatches.every(
      (match) => match.winnerTeamId !== null,
    );

    if (!allAutoCompleted) {
      return {
        finished: false as const,
        generatedRound: nextRound,
      };
    }

    currentRound = nextRound;
  }
}

export async function createTournamentByAdmin(input: {
  adminUserId: number;
  title: string;
  startDate: Date;
  endDate?: Date;
  headliner?: string;
  teamLimit: number;
  matchBestOf: 1 | 3;
  finalBestOf: 1 | 3 | 5;
}) {
  if (input.endDate && input.endDate < input.startDate) {
    throw new TournamentServiceError(400, "End date must be after start date.");
  }

  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: TournamentTransaction) => {
          const hostTeamId = await ensureSystemHostTeam(tx, input.adminUserId);

          const slug = await generateUniqueTournamentSlug(tx, input.title);

          const tournament = await tx.tournament.create({
            data: {
              title: input.title,
              slug,
              format: "SINGLE_ELIMINATION",
              status: "DRAFT",
              startDate: input.startDate,
              endDate: input.endDate,
              headliner: input.headliner,
              teamId: hostTeamId,
            },
            select: {
              id: true,
              title: true,
              slug: true,
              format: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          });

          await tx.$executeRaw`
            INSERT INTO "TournamentSettings"
              ("tournamentId", "teamLimit", "matchBestOf", "finalBestOf", "updatedAt")
            VALUES
              (${tournament.id}, ${input.teamLimit}, ${input.matchBestOf}, ${input.finalBestOf}, NOW())
          `;

          return {
            ...tournament,
            settings: {
              teamLimit: input.teamLimit,
              matchBestOf: input.matchBestOf,
              finalBestOf: input.finalBestOf,
            },
          };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    const settingsTableError = mapTournamentSettingsTableError(error);
    if (settingsTableError) {
      throw settingsTableError;
    }

    throw mapPrismaError(error, "Unable to create tournament.");
  }
}

export async function updateTournamentByAdmin(input: {
  tournamentId: number;
  title?: string;
  startDate?: Date;
  endDate?: Date | null;
  headliner?: string | null;
  teamLimit?: number;
  matchBestOf?: 1 | 3;
  finalBestOf?: 1 | 3 | 5;
}) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: TournamentTransaction) => {
          const existing = await tx.tournament.findUnique({
            where: { id: input.tournamentId },
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              headliner: true,
              status: true,
              _count: {
                select: {
                  participants: true,
                },
              },
            },
          });

          if (!existing) {
            throw new TournamentServiceError(404, "Tournament not found.");
          }

          const settings = await loadTournamentSettings(tx, input.tournamentId);
          const nextStartDate = input.startDate ?? existing.startDate;
          const nextEndDate = input.endDate === undefined ? existing.endDate : input.endDate;

          if (nextEndDate && nextEndDate < nextStartDate) {
            throw new TournamentServiceError(400, "End date must be after start date.");
          }

          const nextTeamLimit = input.teamLimit ?? settings.teamLimit;
          if (nextTeamLimit < existing._count.participants) {
            throw new TournamentServiceError(
              400,
              `Team limit cannot be less than current participants (${existing._count.participants}).`,
            );
          }

          const data: {
            title?: string;
            slug?: string;
            startDate?: Date;
            endDate?: Date | null;
            headliner?: string | null;
          } = {};

          if (input.title !== undefined && input.title !== existing.title) {
            data.title = input.title;
            data.slug = await generateUniqueTournamentSlug(tx, input.title);
          }

          if (input.startDate !== undefined) {
            data.startDate = input.startDate;
          }

          if (input.endDate !== undefined) {
            data.endDate = input.endDate;
          }

          if (input.headliner !== undefined) {
            data.headliner = input.headliner;
          }

          const updatedTournament = await tx.tournament.update({
            where: { id: input.tournamentId },
            data,
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              startDate: true,
              endDate: true,
              headliner: true,
            },
          });

          await tx.$executeRaw`
            INSERT INTO "TournamentSettings"
              ("tournamentId", "teamLimit", "matchBestOf", "finalBestOf", "updatedAt")
            VALUES
              (
                ${input.tournamentId},
                ${nextTeamLimit},
                ${input.matchBestOf ?? settings.matchBestOf},
                ${input.finalBestOf ?? settings.finalBestOf},
                NOW()
              )
            ON CONFLICT ("tournamentId")
            DO UPDATE SET
              "teamLimit" = EXCLUDED."teamLimit",
              "matchBestOf" = EXCLUDED."matchBestOf",
              "finalBestOf" = EXCLUDED."finalBestOf",
              "updatedAt" = NOW()
          `;

          return {
            tournament: updatedTournament,
            settings: {
              teamLimit: nextTeamLimit,
              matchBestOf: input.matchBestOf ?? settings.matchBestOf,
              finalBestOf: input.finalBestOf ?? settings.finalBestOf,
            },
          };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    const settingsTableError = mapTournamentSettingsTableError(error);
    if (settingsTableError) {
      throw settingsTableError;
    }

    throw mapPrismaError(error, "Unable to update tournament.");
  }
}

export async function seedPaidTeamsForTournament(input: {
  tournamentId: number;
  shuffle: boolean;
}) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: TournamentTransaction) => {
          const tournament = await tx.tournament.findUnique({
            where: { id: input.tournamentId },
            select: {
              id: true,
              title: true,
              slug: true,
              format: true,
              status: true,
            },
          });

          if (!tournament) {
            throw new TournamentServiceError(404, "Tournament not found.");
          }

          if (tournament.format !== "SINGLE_ELIMINATION") {
            throw new TournamentServiceError(
              400,
              "This engine supports only single elimination tournaments.",
            );
          }

          if (tournament.status !== "DRAFT") {
            throw new TournamentServiceError(
              409,
              "Tournament has already been seeded or finished.",
            );
          }

          const existingMatches = await tx.match.count({
            where: { tournamentId: input.tournamentId },
          });

          if (existingMatches > 0) {
            throw new TournamentServiceError(
              409,
              "Tournament bracket already exists.",
            );
          }

          const settings = await loadTournamentSettings(tx, input.tournamentId);

          const approvedEntries = await tx.tournamentTeam.findMany({
            where: {
              tournamentId: input.tournamentId,
            },
            select: {
              teamId: true,
              joinedAt: true,
            },
            orderBy: {
              joinedAt: "asc",
            },
          });

          const orderedTeamIds = approvedEntries.map(
            (entry: { teamId: number; joinedAt: Date }) => entry.teamId,
          );
          assertUniqueTeamIds(orderedTeamIds);

          const limitedTeamIds =
            orderedTeamIds.length > settings.teamLimit
              ? orderedTeamIds.slice(0, settings.teamLimit)
              : orderedTeamIds;

          const teamIds = input.shuffle ? shuffleArray(limitedTeamIds) : limitedTeamIds;
          assertUniqueTeamIds(teamIds);

          if (teamIds.length < 2) {
            throw new TournamentServiceError(
              400,
              "At least 2 approved teams are required to seed the bracket.",
            );
          }

          const roundOneMatches = await createRoundMatches(tx, {
            tournamentId: input.tournamentId,
            round: 1,
            teamIds,
            scheduledAt: new Date(),
          });

          const updatedTournament = await tx.tournament.update({
            where: { id: input.tournamentId },
            data: {
              status: "ACTIVE",
              seededAt: new Date(),
            },
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              seededAt: true,
            },
          });

          const autoAdvance = await advanceTournamentIfRoundComplete(
            tx,
            input.tournamentId,
            1,
          );

          return {
            tournament: autoAdvance.finished
              ? autoAdvance.tournament
              : updatedTournament,
            seededTeamIds: teamIds,
            roundOneMatches,
            settings,
          };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    const settingsTableError = mapTournamentSettingsTableError(error);
    if (settingsTableError) {
      throw settingsTableError;
    }

    throw mapPrismaError(error, "Unable to seed teams.");
  }
}

export async function pickMatchWinnerAndAdvance(input: {
  tournamentId: number;
  matchId: number;
  winnerTeamId: number;
  homeScore?: number;
  awayScore?: number;
}) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: TournamentTransaction) => {
          const tournament = await tx.tournament.findUnique({
            where: { id: input.tournamentId },
            select: {
              id: true,
              format: true,
              status: true,
            },
          });

          if (!tournament) {
            throw new TournamentServiceError(404, "Tournament not found.");
          }

          if (tournament.format !== "SINGLE_ELIMINATION") {
            throw new TournamentServiceError(
              400,
              "This engine supports only single elimination tournaments.",
            );
          }

          if (tournament.status !== "ACTIVE") {
            throw new TournamentServiceError(
              409,
              "Tournament is not in an active state.",
            );
          }

          const match = await tx.match.findUnique({
            where: { id: input.matchId },
            select: {
              id: true,
              tournamentId: true,
              round: true,
              position: true,
              homeTeamId: true,
              awayTeamId: true,
              winnerTeamId: true,
              status: true,
            },
          });

          if (!match || match.tournamentId !== input.tournamentId) {
            throw new TournamentServiceError(404, "Match not found.");
          }

          if (match.winnerTeamId !== null || match.status === "COMPLETED") {
            throw new TournamentServiceError(
              409,
              "Winner has already been selected for this match.",
            );
          }

          if (!match.awayTeamId) {
            throw new TournamentServiceError(
              400,
              "Cannot manually resolve an auto-advanced match.",
            );
          }

          const settings = await loadTournamentSettings(tx, input.tournamentId);
          const matchesInRound = await tx.match.count({
            where: {
              tournamentId: input.tournamentId,
              round: match.round,
            },
          });
          const bestOf = matchesInRound === 1 ? settings.finalBestOf : settings.matchBestOf;
          const requiredWins = Math.floor(bestOf / 2) + 1;

          if (input.homeScore !== undefined || input.awayScore !== undefined) {
            if (input.homeScore === undefined || input.awayScore === undefined) {
              throw new TournamentServiceError(
                400,
                "Provide both homeScore and awayScore together.",
              );
            }

            if (input.homeScore === input.awayScore) {
              throw new TournamentServiceError(
                400,
                "Draw scores are not allowed in single elimination.",
              );
            }

            const maxScore = Math.max(input.homeScore, input.awayScore);
            const minScore = Math.min(input.homeScore, input.awayScore);

            if (maxScore !== requiredWins) {
              throw new TournamentServiceError(
                400,
                `For BO${bestOf}, winner score must be exactly ${requiredWins}.`,
              );
            }

            if (minScore >= requiredWins) {
              throw new TournamentServiceError(
                400,
                `For BO${bestOf}, loser score must be less than ${requiredWins}.`,
              );
            }
          }

          const allowedWinnerIds = new Set([match.homeTeamId, match.awayTeamId]);
          if (!allowedWinnerIds.has(input.winnerTeamId)) {
            throw new TournamentServiceError(
              400,
              "Winner must be one of the teams in this match.",
            );
          }

          if (input.homeScore !== undefined && input.awayScore !== undefined) {
            const winnerByScore =
              input.homeScore > input.awayScore ? match.homeTeamId : match.awayTeamId;

            if (winnerByScore !== input.winnerTeamId) {
              throw new TournamentServiceError(
                400,
                "Winner does not match the submitted score.",
              );
            }
          }

          const updatedMatch = await tx.match.update({
            where: { id: match.id },
            data: {
              winnerTeamId: input.winnerTeamId,
              homeScore: input.homeScore,
              awayScore: input.awayScore,
              status: "COMPLETED",
              completedAt: new Date(),
            },
            select: {
              id: true,
              round: true,
              position: true,
              winnerTeamId: true,
              homeScore: true,
              awayScore: true,
              status: true,
              completedAt: true,
            },
          });

          const progress = await advanceTournamentIfRoundComplete(
            tx,
            input.tournamentId,
            match.round,
          );

          return {
            match: updatedMatch,
            tournament: progress.finished ? progress.tournament : null,
            generatedRound: progress.finished ? null : progress.generatedRound ?? null,
          };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    const settingsTableError = mapTournamentSettingsTableError(error);
    if (settingsTableError) {
      throw settingsTableError;
    }

    throw mapPrismaError(error, "Unable to select winner.");
  }
}

export async function joinTournament(input: {
  userId: number;
  tournamentId: number;
  teamId: number;
}) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: TournamentTransaction) => {
          const membership = await tx.teamMember.findUnique({
            where: {
              userId_teamId: {
                userId: input.userId,
                teamId: input.teamId,
              },
            },
            select: {
              role: true,
            },
          });

          if (!membership || membership.role !== "CAPTAIN") {
            throw new TournamentServiceError(
              403,
              "Only the team captain can join a tournament.",
            );
          }

          const team = await tx.team.findUnique({
            where: { id: input.teamId },
            select: {
              id: true,
              name: true,
            },
          });

          if (!team) {
            throw new TournamentServiceError(404, "Team not found.");
          }

          const tournament = await tx.tournament.findUnique({
            where: { id: input.tournamentId },
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
            },
          });

          if (!tournament) {
            throw new TournamentServiceError(404, "Tournament not found.");
          }

          if (tournament.status !== "DRAFT") {
            throw new TournamentServiceError(
              409,
              "Tournament no longer accepts new team entries.",
            );
          }

          const settings = await loadTournamentSettings(tx, input.tournamentId);
          const approvedCount = await tx.tournamentTeam.count({
            where: {
              tournamentId: input.tournamentId,
            },
          });

          const participant = await tx.tournamentTeam.findUnique({
            where: {
              tournamentId_teamId: {
                tournamentId: input.tournamentId,
                teamId: input.teamId,
              },
            },
            select: {
              id: true,
              joinedAt: true,
            },
          });

          if (participant) {
            return {
              request: {
                status: "APPROVED" as TournamentJoinRequestStatus,
              },
              settings,
              participant,
              team: {
                id: team.id,
                name: team.name,
              },
              tournament,
            };
          }

          const existingRequests = await tx.$queryRaw<
            Array<{ id: number; status: TournamentJoinRequestStatus }>
          >`
            SELECT "id", "status"
            FROM "TournamentJoinRequest"
            WHERE "tournamentId" = ${input.tournamentId}
              AND "teamId" = ${input.teamId}
            LIMIT 1
          `;

          const existingRequest = existingRequests[0] ?? null;

          if (existingRequest?.status === "PENDING") {
            throw new TournamentServiceError(
              409,
              "Join request is already pending admin approval.",
            );
          }

          if (existingRequest?.status === "APPROVED") {
            return {
              request: {
                id: existingRequest.id,
                status: "APPROVED" as TournamentJoinRequestStatus,
              },
              settings,
              participant: null,
              team: {
                id: team.id,
                name: team.name,
              },
              tournament,
            };
          }

          if (existingRequest?.status === "REJECTED") {
            await tx.$executeRaw`
              UPDATE "TournamentJoinRequest"
              SET "status" = 'PENDING',
                  "requestedByUserId" = ${input.userId},
                  "reviewedByUserId" = NULL,
                  "reviewNote" = NULL,
                  "reviewedAt" = NULL,
                  "requestedAt" = NOW()
              WHERE "id" = ${existingRequest.id}
            `;

            return {
              request: {
                id: existingRequest.id,
                status: "PENDING" as TournamentJoinRequestStatus,
              },
              settings,
              participant: null,
              team: {
                id: team.id,
                name: team.name,
              },
              tournament,
            };
          }

          if (approvedCount >= settings.teamLimit) {
            throw new TournamentServiceError(
              409,
              `Tournament is full (${settings.teamLimit} teams).`,
            );
          }

          const inserted = await tx.$queryRaw<
            Array<{ id: number; status: TournamentJoinRequestStatus; requestedAt: Date }>
          >`
            INSERT INTO "TournamentJoinRequest"
              ("tournamentId", "teamId", "requestedByUserId", "status")
            VALUES
              (${input.tournamentId}, ${input.teamId}, ${input.userId}, 'PENDING')
            RETURNING "id", "status", "requestedAt"
          `;

          const createdRequest = inserted[0];

          return {
            request: {
              id: createdRequest.id,
              status: createdRequest.status,
              requestedAt: createdRequest.requestedAt,
            },
            settings,
            participant: null,
            team: {
              id: team.id,
              name: team.name,
            },
            tournament,
          };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    const settingsTableError = mapTournamentSettingsTableError(error);
    if (settingsTableError) {
      throw settingsTableError;
    }

    const joinRequestTableError = mapJoinRequestTableError(error);
    if (joinRequestTableError) {
      throw joinRequestTableError;
    }

    throw mapPrismaError(error, "Unable to join tournament.");
  }
}

export async function approveTournamentJoinRequest(input: {
  adminUserId: number;
  tournamentId: number;
  requestId: number;
}) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: TournamentTransaction) => {
          const requests = await tx.$queryRaw<
            Array<{
              id: number;
              tournamentId: number;
              teamId: number;
              status: TournamentJoinRequestStatus;
              tournamentStatus: "DRAFT" | "ACTIVE" | "FINISHED";
            }>
          >`
            SELECT
              r."id",
              r."tournamentId",
              r."teamId",
              r."status",
              t."status" AS "tournamentStatus"
            FROM "TournamentJoinRequest" r
            INNER JOIN "Tournament" t
              ON t."id" = r."tournamentId"
            WHERE r."id" = ${input.requestId}
            LIMIT 1
          `;

          const request = requests[0];
          if (!request || request.tournamentId !== input.tournamentId) {
            throw new TournamentServiceError(404, "Join request not found.");
          }

          if (request.tournamentStatus !== "DRAFT") {
            throw new TournamentServiceError(
              409,
              "Tournament is no longer accepting approvals.",
            );
          }

          const settings = await loadTournamentSettings(tx, request.tournamentId);
          const approvedCount = await tx.tournamentTeam.count({
            where: { tournamentId: request.tournamentId },
          });

          const participant = await tx.tournamentTeam.findUnique({
            where: {
              tournamentId_teamId: {
                tournamentId: request.tournamentId,
                teamId: request.teamId,
              },
            },
            select: { id: true, joinedAt: true },
          });

          let ensuredParticipant = participant;

          if (!ensuredParticipant) {
            if (approvedCount >= settings.teamLimit) {
              throw new TournamentServiceError(
                409,
                `Tournament is full (${settings.teamLimit} teams).`,
              );
            }

            ensuredParticipant = await tx.tournamentTeam.create({
              data: {
                tournamentId: request.tournamentId,
                teamId: request.teamId,
              },
              select: {
                id: true,
                joinedAt: true,
              },
            });
          }

          if (request.status !== "APPROVED") {
            await tx.$executeRaw`
              UPDATE "TournamentJoinRequest"
              SET "status" = 'APPROVED',
                  "reviewedByUserId" = ${input.adminUserId},
                  "reviewedAt" = NOW()
              WHERE "id" = ${request.id}
            `;
          }

          return {
            requestId: request.id,
            tournamentId: request.tournamentId,
            teamId: request.teamId,
            status: "APPROVED" as TournamentJoinRequestStatus,
            participant: ensuredParticipant,
            settings,
          };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    const settingsTableError = mapTournamentSettingsTableError(error);
    if (settingsTableError) {
      throw settingsTableError;
    }

    const joinRequestTableError = mapJoinRequestTableError(error);
    if (joinRequestTableError) {
      throw joinRequestTableError;
    }

    throw mapPrismaError(error, "Unable to approve join request.");
  }
}

export async function removeTeamFromTournamentByAdmin(input: {
  adminUserId: number;
  tournamentId: number;
  teamId: number;
}) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: TournamentTransaction) => {
          const tournament = await tx.tournament.findUnique({
            where: { id: input.tournamentId },
            select: {
              id: true,
              status: true,
              _count: {
                select: {
                  matches: true,
                },
              },
            },
          });

          if (!tournament) {
            throw new TournamentServiceError(404, "Tournament not found.");
          }

          if (tournament.status !== "DRAFT" || tournament._count.matches > 0) {
            throw new TournamentServiceError(
              409,
              "Teams can be removed only before bracket seeding starts.",
            );
          }

          const participant = await tx.tournamentTeam.findUnique({
            where: {
              tournamentId_teamId: {
                tournamentId: input.tournamentId,
                teamId: input.teamId,
              },
            },
            select: { id: true },
          });

          if (!participant) {
            throw new TournamentServiceError(
              404,
              "Team is not currently approved in this tournament.",
            );
          }

          await tx.tournamentTeam.delete({
            where: {
              tournamentId_teamId: {
                tournamentId: input.tournamentId,
                teamId: input.teamId,
              },
            },
          });

          await tx.$executeRaw`
            UPDATE "TournamentJoinRequest"
            SET "status" = 'REJECTED',
                "reviewedByUserId" = ${input.adminUserId},
                "reviewNote" = 'Removed by admin from tournament.',
                "reviewedAt" = NOW()
            WHERE "tournamentId" = ${input.tournamentId}
              AND "teamId" = ${input.teamId}
          `;

          return {
            tournamentId: input.tournamentId,
            teamId: input.teamId,
            status: "REMOVED" as const,
          };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    const joinRequestTableError = mapJoinRequestTableError(error);
    if (joinRequestTableError) {
      throw joinRequestTableError;
    }

    throw mapPrismaError(error, "Unable to remove team from tournament.");
  }
}
