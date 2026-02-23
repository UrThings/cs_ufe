import { z } from "zod";

const teamIdSchema = z.coerce.number().int().positive();

export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Team name must be at least 2 characters.")
    .max(80, "Team name must be 80 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(280, "Description must be 280 characters or fewer.")
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const joinTeamSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, "Team code must be 6 uppercase letters or numbers."),
});

export const teamParamsSchema = z.object({
  teamId: teamIdSchema,
});

export const teamMemberParamsSchema = z.object({
  teamId: teamIdSchema,
  memberId: teamIdSchema,
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type JoinTeamInput = z.infer<typeof joinTeamSchema>;

const updateNameSchema = z
  .string()
  .trim()
  .min(2, "Team name must be at least 2 characters.")
  .max(80, "Team name must be 80 characters or fewer.");

export const updateTeamSchema = z
  .object({
    name: updateNameSchema.optional(),
    description: z
      .string()
      .trim()
      .max(240, "Description must be 240 characters or fewer.")
      .nullable()
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "Provide at least one field to update.",
  });
