import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth/token";
import type { CurrentUser } from "@/lib/auth/get-current-user";
import { hashPassword, verifyPassword } from "@/features/auth/services/password.service";
import type { LoginInput, RegisterInput } from "@/features/auth/schemas";

export type AuthUser = Pick<CurrentUser, "id" | "email" | "name" | "avatar" | "role">;

export type AuthSession = {
  user: AuthUser;
  token: string;
};

export type AuthServiceErrorCode = "USER_EXISTS" | "INVALID_CREDENTIALS" | "UNEXPECTED";

export class AuthServiceError extends Error {
  constructor(public code: AuthServiceErrorCode, message: string) {
    super(message);
    this.name = "AuthServiceError";
  }
}

function buildAuthSession(user: AuthUser): AuthSession {
  const token = signAuthToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return { user, token };
}

const authUserSelect = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  role: true,
} as const;

const loginUserSelect = { ...authUserSelect, hashedPassword: true } as const;
let hasExtendedRegisterColumns: boolean | null = null;

function getDatabaseErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  if (!("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

async function canUseExtendedRegisterColumns() {
  if (hasExtendedRegisterColumns !== null) {
    return hasExtendedRegisterColumns;
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT "column_name"
      FROM "information_schema"."columns"
      WHERE lower("table_name") = lower('User')
        AND "column_name" IN ('phone', 'studentCode')
    `;

    const columnNames = new Set(rows.map((row) => row.column_name));
    hasExtendedRegisterColumns =
      columnNames.has("phone") && columnNames.has("studentCode");
    return hasExtendedRegisterColumns;
  } catch {
    hasExtendedRegisterColumns = false;
    return false;
  }
}

export async function registerAuthSession(input: RegisterInput): Promise<AuthSession> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AuthServiceError("USER_EXISTS", "Email is already in use.");
  }

  const useExtendedColumns = await canUseExtendedRegisterColumns();

  if (useExtendedColumns) {
    const [existingPhone, existingStudentCode] = await Promise.all([
      prisma.$queryRaw<Array<{ id: number }>>`
        SELECT "id"
        FROM "User"
        WHERE "phone" = ${input.phone}
        LIMIT 1
      `,
      prisma.$queryRaw<Array<{ id: number }>>`
        SELECT "id"
        FROM "User"
        WHERE "studentCode" = ${input.studentCode}
        LIMIT 1
      `,
    ]);

    if (existingPhone.length > 0) {
      throw new AuthServiceError("USER_EXISTS", "Phone number is already in use.");
    }

    if (existingStudentCode.length > 0) {
      throw new AuthServiceError("USER_EXISTS", "Student code is already in use.");
    }
  }

  const hashedPassword = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      hashedPassword,
    },
    select: authUserSelect,
  });

  if (useExtendedColumns) {
    try {
      await prisma.$executeRaw`
        UPDATE "User"
        SET "phone" = ${input.phone},
            "studentCode" = ${input.studentCode}
        WHERE "id" = ${user.id}
      `;
    } catch (error) {
      const code = getDatabaseErrorCode(error);

      if (code === "23505") {
        throw new AuthServiceError("USER_EXISTS", "Phone number or student code is already in use.");
      }

      if (code === "42703") {
        hasExtendedRegisterColumns = false;
        return buildAuthSession(user);
      }

      throw error;
    }
  }

  return buildAuthSession(user);
}

export async function loginAuthSession(input: LoginInput): Promise<AuthSession> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: loginUserSelect,
  });

  if (!user) {
    throw new AuthServiceError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const isPasswordValid = await verifyPassword(input.password, user.hashedPassword);

  if (!isPasswordValid) {
    throw new AuthServiceError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const { hashedPassword, ...publicUser } = user;
  void hashedPassword;
  const authUser: AuthUser = publicUser;

  return buildAuthSession(authUser);
}
