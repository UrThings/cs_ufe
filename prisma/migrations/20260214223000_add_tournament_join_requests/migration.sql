CREATE TYPE "TournamentJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "TournamentJoinRequest" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "requestedByUserId" INTEGER NOT NULL,
    "reviewedByUserId" INTEGER,
    "status" "TournamentJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "TournamentJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentJoinRequest_tournamentId_teamId_key" ON "TournamentJoinRequest"("tournamentId", "teamId");
CREATE INDEX "TournamentJoinRequest_status_tournamentId_idx" ON "TournamentJoinRequest"("status", "tournamentId");
CREATE INDEX "TournamentJoinRequest_teamId_idx" ON "TournamentJoinRequest"("teamId");
CREATE INDEX "TournamentJoinRequest_requestedByUserId_idx" ON "TournamentJoinRequest"("requestedByUserId");

ALTER TABLE "TournamentJoinRequest" ADD CONSTRAINT "TournamentJoinRequest_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TournamentJoinRequest" ADD CONSTRAINT "TournamentJoinRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TournamentJoinRequest" ADD CONSTRAINT "TournamentJoinRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TournamentJoinRequest" ADD CONSTRAINT "TournamentJoinRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
