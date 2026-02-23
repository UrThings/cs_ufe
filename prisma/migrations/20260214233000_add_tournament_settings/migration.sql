CREATE TABLE "TournamentSettings" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "teamLimit" INTEGER NOT NULL,
    "matchBestOf" INTEGER NOT NULL,
    "finalBestOf" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentSettings_tournamentId_key" ON "TournamentSettings"("tournamentId");
CREATE INDEX "TournamentSettings_tournamentId_idx" ON "TournamentSettings"("tournamentId");

ALTER TABLE "TournamentSettings" ADD CONSTRAINT "TournamentSettings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
