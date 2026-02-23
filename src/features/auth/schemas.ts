import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Provide a valid email address.");

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{8,15}$/, "Phone number must be 8-15 digits."),
  studentCode: z
    .string()
    .trim()
    .min(3, "Student code must be at least 3 characters.")
    .max(32, "Student code must be 32 characters or fewer.")
    .transform((value) => value.toUpperCase()),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
