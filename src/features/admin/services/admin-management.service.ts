import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

const SERIALIZABLE_RETRIES = 2;
const SLUG_SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
type AdminTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class AdminManagementError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isAdminManagementError(
  error: unknown,
): error is AdminManagementError {
  return error instanceof AdminManagementError;
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

function mapPrismaError(error: unknown, fallbackMessage: string) {
  const code = getPrismaErrorCode(error);

  if (code === "P2002") {
    return new AdminManagementError(
      409,
      "Request conflicts with existing data (unique field already in use).",
    );
  }

  if (code === "P2025") {
    return new AdminManagementError(404, "Requested resource was not found.");
  }

  if (isAdminManagementError(error)) {
    return error;
  }

  return new AdminManagementError(500, fallbackMessage);
}

function isMissingTableError(error: unknown) {
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

  return payload.includes("42p01") || payload.includes("does not exist");
}

async function optionalExecuteRaw(tx: AdminTransaction, query: Prisma.Sql) {
  try {
    await tx.$executeRaw(query);
  } catch (error) {
    if (isMissingTableError(error)) {
      return;
    }

    throw error;
  }
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

  throw new AdminManagementError(500, "Transaction failed after retries.");
}

function randomString(length: number, alphabet: string) {
  let result = "";
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    result += alphabet[randomIndex];
  }

  return result;
}

function buildTeamSlug(teamName: string) {
  const base = teamName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return base || "team";
}

async function generateUniqueTeamSlug(
  tx: AdminTransaction,
  teamName: string,
  ignoreTeamId?: number,
) {
  const base = buildTeamSlug(teamName).slice(0, 40);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix =
      attempt === 0
        ? ""
        : `-${randomString(4, SLUG_SUFFIX_ALPHABET)}`;
    const candidate = `${base}${suffix}`;
    const existing = await tx.team.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === ignoreTeamId) {
      return candidate;
    }
  }

  throw new AdminManagementError(500, "Unable to generate a unique team slug.");
}

async function deleteTournamentGraph(
  tx: AdminTransaction,
  tournamentId: number,
) {
  await tx.match.deleteMany({
    where: { tournamentId },
  });

  await tx.tournamentTeam.deleteMany({
    where: { tournamentId },
  });

  await optionalExecuteRaw(
    tx,
    Prisma.sql`DELETE FROM "TournamentJoinRequest" WHERE "tournamentId" = ${tournamentId}`,
  );

  await optionalExecuteRaw(
    tx,
    Prisma.sql`DELETE FROM "TournamentSettings" WHERE "tournamentId" = ${tournamentId}`,
  );

  await tx.tournament.delete({
    where: { id: tournamentId },
  });
}

async function deleteTeamGraph(tx: AdminTransaction, teamId: number) {
  const existingTeam = await tx.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true },
  });

  if (!existingTeam) {
    throw new AdminManagementError(404, "Team not found.");
  }

  const hostedTournaments = await tx.tournament.findMany({
    where: { teamId },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  for (const tournament of hostedTournaments) {
    await deleteTournamentGraph(tx, tournament.id);
  }

  await tx.tournament.updateMany({
    where: { championTeamId: teamId },
    data: { championTeamId: null },
  });

  await tx.match.deleteMany({
    where: {
      OR: [
        { homeTeamId: teamId },
        { awayTeamId: teamId },
        { winnerTeamId: teamId },
      ],
    },
  });

  await tx.tournamentTeam.deleteMany({
    where: { teamId },
  });

  await optionalExecuteRaw(
    tx,
    Prisma.sql`DELETE FROM "TournamentJoinRequest" WHERE "teamId" = ${teamId}`,
  );

  await tx.teamMember.deleteMany({
    where: { teamId },
  });

  await tx.team.delete({
    where: { id: teamId },
  });

  return {
    id: existingTeam.id,
    name: existingTeam.name,
    hostedTournamentCount: hostedTournaments.length,
  };
}

export async function updateUserByAdmin(input: {
  userId: number;
  name?: string;
  email?: string;
  role?: "MEMBER" | "ADMIN";
}) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: AdminTransaction) => {
          const existing = await tx.user.findUnique({
            where: { id: input.userId },
            select: {
              id: true,
              role: true,
            },
          });

          if (!existing) {
            throw new AdminManagementError(404, "User not found.");
          }

          if (existing.role === "ADMIN" && input.role === "MEMBER") {
            const adminCount = await tx.user.count({
              where: { role: "ADMIN" },
            });

            if (adminCount <= 1) {
              throw new AdminManagementError(
                400,
                "At least one admin account must remain.",
              );
            }
          }

          const updated = await tx.user.update({
            where: { id: input.userId },
            data: {
              name: input.name,
              email: input.email,
              role: input.role,
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              updatedAt: true,
            },
          });

          return updated;
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    throw mapPrismaError(error, "Unable to update user.");
  }
}

export async function deleteUserByAdmin(input: {
  userId: number;
  actingAdminId: number;
}) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: AdminTransaction) => {
          const user = await tx.user.findUnique({
            where: { id: input.userId },
            select: {
              id: true,
              role: true,
              ownedTeams: {
                select: { id: true },
              },
            },
          });

          if (!user) {
            throw new AdminManagementError(404, "User not found.");
          }

          if (user.role === "ADMIN") {
            const adminCount = await tx.user.count({
              where: { role: "ADMIN" },
            });

            if (adminCount <= 1) {
              throw new AdminManagementError(
                400,
                "At least one admin account must remain.",
              );
            }
          }

          const deletedTeams: Array<{
            id: number;
            name: string;
            hostedTournamentCount: number;
          }> = [];

          for (const team of user.ownedTeams) {
            const deletedTeam = await deleteTeamGraph(tx, team.id);
            deletedTeams.push(deletedTeam);
          }

          await tx.teamMember.deleteMany({
            where: { userId: user.id },
          });

          await optionalExecuteRaw(
            tx,
            Prisma.sql`
              UPDATE "TournamentJoinRequest"
              SET "reviewedByUserId" = NULL
              WHERE "reviewedByUserId" = ${user.id}
            `,
          );

          await optionalExecuteRaw(
            tx,
            Prisma.sql`DELETE FROM "TournamentJoinRequest" WHERE "requestedByUserId" = ${user.id}`,
          );

          await tx.user.delete({
            where: { id: user.id },
          });

          return {
            deletedUserId: user.id,
            deletedByAdminId: input.actingAdminId,
            deletedTeams,
          };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    throw mapPrismaError(error, "Unable to delete user.");
  }
}

export async function updateTeamByAdmin(input: {
  teamId: number;
  name?: string;
  description?: string | null;
  isPaid?: boolean;
}) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: AdminTransaction) => {
          const existing = await tx.team.findUnique({
            where: { id: input.teamId },
            select: {
              id: true,
              name: true,
              isPaid: true,
              paidAt: true,
            },
          });

          if (!existing) {
            throw new AdminManagementError(404, "Team not found.");
          }

          const data: {
            name?: string;
            slug?: string;
            description?: string | null;
            isPaid?: boolean;
            paidAt?: Date | null;
          } = {};

          if (input.name !== undefined && input.name !== existing.name) {
            data.name = input.name;
            data.slug = await generateUniqueTeamSlug(tx, input.name, existing.id);
          }

          if (input.description !== undefined) {
            data.description = input.description;
          }

          if (input.isPaid !== undefined) {
            data.isPaid = input.isPaid;

            if (input.isPaid && !existing.isPaid) {
              data.paidAt = new Date();
            }

            if (!input.isPaid) {
              data.paidAt = null;
            }
          }

          const updated = await tx.team.update({
            where: { id: input.teamId },
            data,
            select: {
              id: true,
              name: true,
              slug: true,
              teamCode: true,
              description: true,
              isPaid: true,
              paidAt: true,
              updatedAt: true,
            },
          });

          return updated;
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    throw mapPrismaError(error, "Unable to update team.");
  }
}

export async function deleteTeamByAdmin(input: { teamId: number }) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: AdminTransaction) => {
          const deletedTeam = await deleteTeamGraph(tx, input.teamId);

          return {
            deletedTeamId: deletedTeam.id,
            deletedTeamName: deletedTeam.name,
            removedHostedTournamentCount: deletedTeam.hostedTournamentCount,
          };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    throw mapPrismaError(error, "Unable to delete team.");
  }
}
