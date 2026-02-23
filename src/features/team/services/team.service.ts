import { prisma } from "@/lib/prisma";
import type { TeamRole } from "@/generated/prisma/enums";

const TEAM_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TEAM_CODE_LENGTH = 6;
const MAX_TEAM_MEMBERS = 5;
const SERIALIZABLE_RETRIES = 2;

type TeamTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class TeamServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isTeamServiceError(error: unknown): error is TeamServiceError {
  return error instanceof TeamServiceError;
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

function buildSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return base || "team";
}

async function generateUniqueTeamCode(tx: TeamTransaction) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = randomString(TEAM_CODE_LENGTH, TEAM_CODE_ALPHABET);
    const existing = await tx.team.findUnique({
      where: { teamCode: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new TeamServiceError(500, "Unable to generate a unique team code.");
}

async function generateUniqueTeamSlug(tx: TeamTransaction, teamName: string) {
  const base = buildSlug(teamName).slice(0, 40);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${randomString(4, "abcdefghijklmnopqrstuvwxyz0123456789")}`;
    const candidate = `${base}${suffix}`;
    const existing = await tx.team.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new TeamServiceError(500, "Unable to generate a unique team slug.");
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

  throw new TeamServiceError(500, "Transaction failed after retries.");
}

function mapPrismaError(error: unknown, fallbackMessage: string) {
  const code = getPrismaErrorCode(error);

  if (code === "P2002") {
    return new TeamServiceError(409, "Request conflicts with existing team data.");
  }

  if (code === "P2025") {
    return new TeamServiceError(404, "Requested team resource was not found.");
  }

  if (isTeamServiceError(error)) {
    return error;
  }

  return new TeamServiceError(500, fallbackMessage);
}

async function assertCaptainAccess(
  tx: TeamTransaction,
  teamId: number,
  userId: number,
) {
  const teamMember = await tx.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
    select: {
      role: true,
    },
  });

  if (!teamMember || teamMember.role !== "CAPTAIN") {
    throw new TeamServiceError(403, "Captain access is required.");
  }
}

export async function createTeamForUser(input: {
  userId: number;
  name: string;
  description?: string;
}) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: TeamTransaction) => {
          const existingMembership = await tx.teamMember.findUnique({
            where: { userId: input.userId },
            select: { id: true },
          });

          if (existingMembership) {
            throw new TeamServiceError(409, "You are already a member of another team.");
          }

          const [teamCode, slug] = await Promise.all([
            generateUniqueTeamCode(tx),
            generateUniqueTeamSlug(tx, input.name),
          ]);

          const team = await tx.team.create({
            data: {
              name: input.name,
              description: input.description,
              slug,
              teamCode,
              ownerId: input.userId,
            },
            select: {
              id: true,
              name: true,
              description: true,
              slug: true,
              teamCode: true,
            },
          });

          await tx.teamMember.create({
            data: {
              userId: input.userId,
              teamId: team.id,
              role: "CAPTAIN",
            },
          });

          return {
            ...team,
            memberCount: 1,
          };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    throw mapPrismaError(error, "Unable to create team.");
  }
}

export async function joinTeamByCode(input: {
  userId: number;
  teamCode: string;
}) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: TeamTransaction) => {
          const existingMembership = await tx.teamMember.findUnique({
            where: { userId: input.userId },
            select: { teamId: true },
          });

          if (existingMembership) {
            throw new TeamServiceError(409, "You already belong to a team.");
          }

          const team = await tx.team.findUnique({
            where: { teamCode: input.teamCode },
            select: {
              id: true,
              name: true,
              slug: true,
              teamCode: true,
            },
          });

          if (!team) {
            throw new TeamServiceError(404, "Invalid team code.");
          }

          const currentMembers = await tx.teamMember.count({
            where: { teamId: team.id },
          });

          if (currentMembers >= MAX_TEAM_MEMBERS) {
            throw new TeamServiceError(409, "Team is full. Maximum size is 5 members.");
          }

          await tx.teamMember.create({
            data: {
              userId: input.userId,
              teamId: team.id,
              role: "MEMBER",
            },
          });

          return {
            ...team,
            memberCount: currentMembers + 1,
          };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    throw mapPrismaError(error, "Unable to join team.");
  }
}

export async function removeTeamMember(input: {
  captainUserId: number;
  teamId: number;
  memberId: number;
}) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: TeamTransaction) => {
          await assertCaptainAccess(tx, input.teamId, input.captainUserId);

          if (input.memberId === input.captainUserId) {
            throw new TeamServiceError(400, "Captain cannot remove themselves.");
          }

          const member = await tx.teamMember.findUnique({
            where: {
              userId_teamId: {
                userId: input.memberId,
                teamId: input.teamId,
              },
            },
            select: {
              id: true,
              role: true,
            },
          });

          if (!member) {
            throw new TeamServiceError(404, "Member not found in this team.");
          }

          if (member.role === "CAPTAIN") {
            throw new TeamServiceError(400, "Captain cannot be removed.");
          }

          await tx.teamMember.delete({
            where: { id: member.id },
          });

          const memberCount = await tx.teamMember.count({
            where: { teamId: input.teamId },
          });

          return {
            teamId: input.teamId,
            removedMemberId: input.memberId,
            memberCount,
          };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    throw mapPrismaError(error, "Unable to remove member.");
  }
}

export async function leaveTeamForUser(userId: number) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: TeamTransaction) => {
          const membership = await tx.teamMember.findUnique({
            where: { userId },
            select: {
              id: true,
              teamId: true,
              role: true,
            },
          });

          if (!membership) {
            throw new TeamServiceError(404, "You are not currently in a team.");
          }

          if (membership.role === "CAPTAIN") {
            throw new TeamServiceError(
              400,
              "Captain cannot leave the team directly. Transfer captain role or remove members first.",
            );
          }

          await tx.teamMember.delete({
            where: { id: membership.id },
          });

          return {
            teamId: membership.teamId,
            userId,
          };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    throw mapPrismaError(error, "Unable to leave team.");
  }
}

export async function regenerateTeamCode(input: {
  captainUserId: number;
  teamId: number;
}) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: TeamTransaction) => {
          await assertCaptainAccess(tx, input.teamId, input.captainUserId);

          const nextCode = await generateUniqueTeamCode(tx);
          const updatedTeam = await tx.team.update({
            where: { id: input.teamId },
            data: {
              teamCode: nextCode,
            },
            select: {
              id: true,
              name: true,
              slug: true,
              teamCode: true,
            },
          });

          return updatedTeam;
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    throw mapPrismaError(error, "Unable to regenerate team code.");
  }
}

export async function updateTeamDetails(input: {
  captainUserId: number;
  teamId: number;
  name?: string;
  description?: string | null;
}) {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: TeamTransaction) => {
          await assertCaptainAccess(tx, input.teamId, input.captainUserId);

          const data: {
            name?: string;
            slug?: string;
            description?: string | null;
          } = {};

          if (input.name) {
            data.name = input.name;
            data.slug = await generateUniqueTeamSlug(tx, input.name);
          }

          if (input.description !== undefined) {
            data.description = input.description;
          }

          const updatedTeam = await tx.team.update({
            where: { id: input.teamId },
            data,
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              teamCode: true,
              isPaid: true,
              paidAt: true,
              ownerId: true,
            },
          });

          return updatedTeam;
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    throw mapPrismaError(error, "Unable to update team.");
  }
}

export async function markTeamAsPaid(teamId: number) {
  try {
    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        isPaid: true,
        paidAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isPaid: true,
        paidAt: true,
      },
    });

    return team;
  } catch (error) {
    throw mapPrismaError(error, "Unable to mark team as paid.");
  }
}

export type TeamMemberSummary = {
  memberId: number;
  userId: number;
  role: TeamRole;
  joinedAt: Date;
  user: {
    id: number;
    name: string | null;
    avatar: string | null;
    email: string;
  };
};

export type TeamWithMembers = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  teamCode: string;
  isPaid: boolean;
  paidAt: Date | null;
  ownerId: number;
  viewerRole: TeamRole;
  members: TeamMemberSummary[];
  tournaments: Array<{
    id: number;
    title: string;
    status: string;
    startDate: Date;
    joinedAt: Date;
  }>;
  matches: Array<{
    id: number;
    round: number;
    position: number;
    status: string;
    scheduledAt: Date;
    homeScore: number | null;
    awayScore: number | null;
    tournament: {
      id: number;
      title: string;
    };
    opponent: {
      id: number;
      name: string;
    } | null;
  }>;
};

export async function getTeamForUser(userId: number): Promise<TeamWithMembers> {
  try {
    return await runSerializableTransaction(async () =>
      prisma.$transaction(
        async (tx: TeamTransaction) => {
          const membership = await tx.teamMember.findUnique({
            where: { userId },
            select: {
              teamId: true,
              role: true,
            },
          });

          if (!membership) {
            throw new TeamServiceError(404, "You are not a member of a team.");
          }

          const team = await tx.team.findUnique({
            where: { id: membership.teamId },
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              teamCode: true,
              isPaid: true,
              paidAt: true,
              ownerId: true,
              members: {
                orderBy: {
                  joinedAt: "asc",
                },
                select: {
                  id: true,
                  userId: true,
                  role: true,
                  joinedAt: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      avatar: true,
                      email: true,
                    },
                  },
                },
              },
              tournamentEntries: {
                orderBy: {
                  joinedAt: "desc",
                },
                select: {
                  joinedAt: true,
                  tournament: {
                    select: {
                      id: true,
                      title: true,
                      status: true,
                      startDate: true,
                    },
                  },
                },
                take: 5,
              },
            },
          });

          if (!team) {
            throw new TeamServiceError(404, "Team data was not found.");
          }

          const mappedMembers: TeamMemberSummary[] = team.members.map((member) => ({
            memberId: member.id,
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt,
            user: {
              id: member.user.id,
              name: member.user.name,
              avatar: member.user.avatar,
              email: member.user.email,
            },
          }));

          const mappedTournaments = team.tournamentEntries.map((entry) => ({
            id: entry.tournament.id,
            title: entry.tournament.title,
            status: entry.tournament.status,
            startDate: entry.tournament.startDate,
            joinedAt: entry.joinedAt,
          }));

          const matches = await tx.match.findMany({
            where: {
              OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
            },
            orderBy: [{ scheduledAt: "asc" }, { round: "asc" }, { position: "asc" }],
            select: {
              id: true,
              round: true,
              position: true,
              status: true,
              scheduledAt: true,
              homeScore: true,
              awayScore: true,
              homeTeamId: true,
              homeTeam: {
                select: {
                  id: true,
                  name: true,
                },
              },
              awayTeam: {
                select: {
                  id: true,
                  name: true,
                },
              },
              tournament: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          });

          const mappedMatches = matches.map((match) => {
            const opponent = match.homeTeamId === team.id ? match.awayTeam : match.homeTeam;

            return {
              id: match.id,
              round: match.round,
              position: match.position,
              status: match.status,
              scheduledAt: match.scheduledAt,
              homeScore: match.homeScore,
              awayScore: match.awayScore,
              tournament: match.tournament,
              opponent,
            };
          });

          return {
            id: team.id,
            name: team.name,
            slug: team.slug,
            description: team.description,
            teamCode: team.teamCode,
            isPaid: team.isPaid,
            paidAt: team.paidAt,
            ownerId: team.ownerId,
            viewerRole: membership.role,
            members: mappedMembers,
            tournaments: mappedTournaments,
            matches: mappedMatches,
          };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  } catch (error) {
    throw mapPrismaError(error, "Unable to load team.");
  }
}
