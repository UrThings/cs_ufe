-- DropForeignKey
ALTER TABLE "TournamentJoinRequest" DROP CONSTRAINT "TournamentJoinRequest_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentJoinRequest" DROP CONSTRAINT "TournamentJoinRequest_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentSettings" DROP CONSTRAINT "TournamentSettings_tournamentId_fkey";

-- AddForeignKey
ALTER TABLE "TournamentSettings" ADD CONSTRAINT "TournamentSettings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentJoinRequest" ADD CONSTRAINT "TournamentJoinRequest_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentJoinRequest" ADD CONSTRAINT "TournamentJoinRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
