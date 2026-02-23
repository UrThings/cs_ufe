import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

export const createTournamentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Tournament title must be at least 3 characters.")
    .max(80, "Tournament title must be 80 characters or fewer."),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  headliner: z
    .string()
    .trim()
    .max(120, "Headliner must be 120 characters or fewer.")
    .optional()
    .transform((value) => (value ? value : undefined)),
  teamLimit: z
    .coerce.number()
    .int()
    .min(2, "Team limit must be at least 2.")
    .max(64)
    .optional()
    .default(16),
  matchBestOf: z.union([z.literal(1), z.literal(3)]).optional().default(1),
  finalBestOf: z.union([z.literal(1), z.literal(3), z.literal(5)]).optional().default(3),
});

export const tournamentParamsSchema = z.object({
  tournamentId: idSchema,
});

export const tournamentTeamParamsSchema = z.object({
  tournamentId: idSchema,
  teamId: idSchema,
});

export const seedTournamentSchema = z.object({
  shuffle: z.boolean().optional().default(true),
});

export const joinTournamentSchema = z.object({
  teamId: idSchema,
});

export const matchParamsSchema = z.object({
  tournamentId: idSchema,
  matchId: idSchema,
});

export const tournamentRequestParamsSchema = z.object({
  tournamentId: idSchema,
  requestId: idSchema,
});

export const pickWinnerSchema = z.object({
  winnerTeamId: idSchema,
  homeScore: z.coerce.number().int().min(0).max(99).optional(),
  awayScore: z.coerce.number().int().min(0).max(99).optional(),
});

export const updateTournamentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Tournament title must be at least 3 characters.")
      .max(80, "Tournament title must be 80 characters or fewer.")
      .optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullable().optional(),
    headliner: z
      .string()
      .trim()
      .max(120, "Headliner must be 120 characters or fewer.")
      .nullable()
      .optional(),
    teamLimit: z.coerce.number().int().min(2).max(64).optional(),
    matchBestOf: z.union([z.literal(1), z.literal(3)]).optional(),
    finalBestOf: z.union([z.literal(1), z.literal(3), z.literal(5)]).optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.headliner !== undefined ||
      data.teamLimit !== undefined ||
      data.matchBestOf !== undefined ||
      data.finalBestOf !== undefined,
    {
      message: "Provide at least one field to update.",
    },
  );
