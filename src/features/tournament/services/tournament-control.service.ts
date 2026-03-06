import { prisma } from "@/lib/prisma";

const DEFAULT_TOURNAMENT_ENABLED = true;

type AdminControlRow = {
  id: number;
  Tournament: boolean;
};

export class TournamentControlError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isTournamentControlError(error: unknown): error is TournamentControlError {
  return error instanceof TournamentControlError;
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

function isMissingAdminControlTableError(error: unknown) {
  const code = getPrismaErrorCode(error);
  if (code !== "P2010") {
    return false;
  }

  if (typeof error !== "object" || error === null) {
    return false;
  }

  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  const meta = "meta" in error ? JSON.stringify((error as { meta?: unknown }).meta ?? "") : "";
  const payload = `${message} ${meta}`.toLowerCase();

  return payload.includes("42p01") || payload.includes("admincontrol");
}

export async function getTournamentEnabledFlag() {
  try {
    const rows = await prisma.$queryRaw<AdminControlRow[]>`
      SELECT "id", "Tournament"
      FROM "AdminControl"
      ORDER BY "id" ASC
      LIMIT 1
    `;

    return rows[0]?.Tournament ?? DEFAULT_TOURNAMENT_ENABLED;
  } catch (error) {
    if (isMissingAdminControlTableError(error)) {
      return DEFAULT_TOURNAMENT_ENABLED;
    }

    throw new TournamentControlError(500, "Unable to read tournament access control.");
  }
}

export async function setTournamentEnabledFlag(enabled: boolean) {
  try {
    return await prisma.$transaction(async (tx) => {
      const existingRows = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT "id"
        FROM "AdminControl"
        ORDER BY "id" ASC
      `;

      let targetId = existingRows[0]?.id ?? null;

      if (!targetId) {
        const inserted = await tx.$queryRaw<Array<{ id: number }>>`
          INSERT INTO "AdminControl" ("Tournament")
          VALUES (${enabled})
          RETURNING "id"
        `;

        targetId = inserted[0]?.id ?? null;
      } else {
        await tx.$executeRaw`
          UPDATE "AdminControl"
          SET "Tournament" = ${enabled}
          WHERE "id" = ${targetId}
        `;
      }

      if (!targetId) {
        throw new TournamentControlError(500, "Unable to persist tournament access control.");
      }

      await tx.$executeRaw`
        DELETE FROM "AdminControl"
        WHERE "id" <> ${targetId}
      `;

      return {
        id: targetId,
        enabled,
      };
    });
  } catch (error) {
    if (isMissingAdminControlTableError(error)) {
      throw new TournamentControlError(
        500,
        "Admin control table is missing. Run database migrations.",
      );
    }

    if (isTournamentControlError(error)) {
      throw error;
    }

    throw new TournamentControlError(500, "Unable to update tournament access control.");
  }
}
