import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

export const adminUserParamsSchema = z.object({
  userId: idSchema,
});

export const adminTeamParamsSchema = z.object({
  teamId: idSchema,
});

export const adminUpdateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(80, "Name must be 80 characters or fewer.")
      .optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Provide a valid email address.")
      .optional(),
    role: z.enum(["MEMBER", "ADMIN"]).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.email !== undefined ||
      data.role !== undefined,
    { message: "Provide at least one field to update." },
  );

export const adminUpdateTeamSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Team name must be at least 2 characters.")
      .max(80, "Team name must be 80 characters or fewer.")
      .optional(),
    description: z
      .string()
      .trim()
      .max(280, "Description must be 280 characters or fewer.")
      .nullable()
      .optional(),
    isPaid: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.isPaid !== undefined,
    { message: "Provide at least one field to update." },
  );
