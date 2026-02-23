BEGIN;

-- 1) Base admins
INSERT INTO "User" ("email", "name", "role", "hashedPassword", "createdAt", "updatedAt")
VALUES
  ('admin1@ufe.edu.mn', 'UFE Admin One', 'ADMIN'::"UserRole", '$2a$10$seedseedseedseedseedseedseedseedseedseedseed', NOW(), NOW()),
  ('admin2@ufe.edu.mn', 'UFE Admin Two', 'ADMIN'::"UserRole", '$2a$10$seedseedseedseedseedseedseedseedseedseedseed', NOW(), NOW())
ON CONFLICT ("email") DO NOTHING;

-- 2) 60 demo players
INSERT INTO "User" ("email", "name", "role", "hashedPassword", "createdAt", "updatedAt")
SELECT
  'player' || LPAD(g::text, 2, '0') || '@ufe.edu.mn' AS email,
  'UFE Player ' || g AS name,
  'MEMBER'::"UserRole" AS role,
  '$2a$10$seedseedseedseedseedseedseedseedseedseedseed' AS "hashedPassword",
  NOW() - ((g + 5) || ' hours')::interval AS "createdAt",
  NOW() AS "updatedAt"
FROM generate_series(1, 60) AS g
ON CONFLICT ("email") DO NOTHING;

-- 3) 20 teams (owner = every 1st user in each 3-user block)
INSERT INTO "Team"
  ("name", "slug", "teamCode", "isPaid", "paidAt", "description", "ownerId", "createdAt", "updatedAt")
SELECT
  'UFE Team ' || LPAD(t::text, 2, '0') AS name,
  'ufe-team-' || LPAD(t::text, 2, '0') AS slug,
  'UFE' || LPAD(t::text, 4, '0') AS "teamCode",
  CASE WHEN t % 3 = 0 THEN TRUE ELSE FALSE END AS "isPaid",
  CASE WHEN t % 3 = 0 THEN NOW() - (t || ' days')::interval ELSE NULL END AS "paidAt",
  'Stress-test demo team #' || t AS description,
  owner_user.id AS "ownerId",
  NOW() - ((t + 10) || ' days')::interval AS "createdAt",
  NOW() AS "updatedAt"
FROM generate_series(1, 20) AS t
JOIN "User" owner_user
  ON owner_user.email = 'player' || LPAD((((t - 1) * 3) + 1)::text, 2, '0') || '@ufe.edu.mn'
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "ownerId" = EXCLUDED."ownerId",
  "updatedAt" = NOW();

-- 4) Team members: 3 members per team (captain + admin/member + member)
INSERT INTO "TeamMember" ("userId", "teamId", "role", "joinedAt")
SELECT
  u.id AS "userId",
  tm.id AS "teamId",
  CASE
    WHEN s = 1 THEN 'CAPTAIN'::"TeamRole"
    WHEN s = 2 AND t % 5 = 0 THEN 'ADMIN'::"TeamRole"
    ELSE 'MEMBER'::"TeamRole"
  END AS role,
  NOW() - ((t + s) || ' days')::interval AS "joinedAt"
FROM generate_series(1, 20) AS t
CROSS JOIN generate_series(1, 3) AS s
JOIN "User" u
  ON u.email = 'player' || LPAD((((t - 1) * 3) + s)::text, 2, '0') || '@ufe.edu.mn'
JOIN "Team" tm
  ON tm.slug = 'ufe-team-' || LPAD(t::text, 2, '0')
ON CONFLICT ("userId") DO NOTHING;

-- 5) 5 tournaments (mixed status)
WITH tournament_seed AS (
  SELECT *
  FROM (VALUES
    ('ufe-spring-clash-2026', 'UFE Spring Clash 2026', 'SINGLE_ELIMINATION', 'DRAFT',    1, NOW() + interval '10 days', NULL::timestamp, NULL::timestamp, NULL::timestamp, 'Campus Qualifier', NULL::int),
    ('ufe-major-open-2026',   'UFE Major Open 2026',   'SINGLE_ELIMINATION', 'ACTIVE',   2, NOW() - interval '2 days',  NULL::timestamp, NOW() - interval '2 days', NULL::timestamp, 'Main Stage', NULL::int),
    ('ufe-finance-cup-2026',  'UFE Finance Cup 2026',  'DOUBLE_ELIMINATION', 'ACTIVE',   3, NOW() - interval '5 days',  NULL::timestamp, NOW() - interval '5 days', NULL::timestamp, 'Faculty Clash', NULL::int),
    ('ufe-winter-finals-2025','UFE Winter Finals 2025','SINGLE_ELIMINATION', 'FINISHED', 4, NOW() - interval '60 days', NOW() - interval '50 days', NOW() - interval '60 days', NOW() - interval '50 days', 'Championship Night', 18),
    ('ufe-freshmen-cup-2026', 'UFE Freshmen Cup 2026', 'ROUND_ROBIN',         'DRAFT',    5, NOW() + interval '20 days', NULL::timestamp, NULL::timestamp, NULL::timestamp, 'New Students', NULL::int)
  ) AS v(
    slug, title, format, status, host_team_no, start_at, end_at, seeded_at, finished_at, headliner, champion_team_no
  )
)
INSERT INTO "Tournament"
  ("title", "slug", "format", "status", "startDate", "endDate", "seededAt", "finishedAt", "championTeamId", "headliner", "teamId", "createdAt", "updatedAt")
SELECT
  v.title,
  v.slug,
  v.format::"TournamentFormat",
  v.status::"TournamentStatus",
  v.start_at,
  v.end_at,
  v.seeded_at,
  v.finished_at,
  champ.id AS "championTeamId",
  v.headliner,
  host.id AS "teamId",
  NOW() AS "createdAt",
  NOW() AS "updatedAt"
FROM tournament_seed v
JOIN "Team" host
  ON host.slug = 'ufe-team-' || LPAD(v.host_team_no::text, 2, '0')
LEFT JOIN "Team" champ
  ON champ.slug = CASE WHEN v.champion_team_no IS NULL THEN NULL ELSE 'ufe-team-' || LPAD(v.champion_team_no::text, 2, '0') END
ON CONFLICT ("slug") DO UPDATE
SET
  "title" = EXCLUDED."title",
  "format" = EXCLUDED."format",
  "status" = EXCLUDED."status",
  "startDate" = EXCLUDED."startDate",
  "endDate" = EXCLUDED."endDate",
  "seededAt" = EXCLUDED."seededAt",
  "finishedAt" = EXCLUDED."finishedAt",
  "championTeamId" = EXCLUDED."championTeamId",
  "headliner" = EXCLUDED."headliner",
  "teamId" = EXCLUDED."teamId",
  "updatedAt" = NOW();

-- 6) Tournament settings (required)
WITH settings_seed AS (
  SELECT *
  FROM (VALUES
    ('ufe-spring-clash-2026', 16, 1, 3),
    ('ufe-major-open-2026',   16, 1, 3),
    ('ufe-finance-cup-2026',  12, 3, 5),
    ('ufe-winter-finals-2025', 8, 3, 5),
    ('ufe-freshmen-cup-2026', 20, 1, 1)
  ) AS v(slug, team_limit, match_bo, final_bo)
)
INSERT INTO "TournamentSettings"
  ("tournamentId", "teamLimit", "matchBestOf", "finalBestOf", "createdAt", "updatedAt")
SELECT
  t.id,
  s.team_limit,
  s.match_bo,
  s.final_bo,
  NOW(),
  NOW()
FROM settings_seed s
JOIN "Tournament" t ON t.slug = s.slug
ON CONFLICT ("tournamentId") DO UPDATE
SET
  "teamLimit" = EXCLUDED."teamLimit",
  "matchBestOf" = EXCLUDED."matchBestOf",
  "finalBestOf" = EXCLUDED."finalBestOf",
  "updatedAt" = NOW();

-- 7) Tournament participants (some teams in, some out)
WITH entry_seed AS (
  SELECT *
  FROM (VALUES
    ('ufe-spring-clash-2026', 1), ('ufe-spring-clash-2026', 2), ('ufe-spring-clash-2026', 3), ('ufe-spring-clash-2026', 4), ('ufe-spring-clash-2026', 5), ('ufe-spring-clash-2026', 6),
    ('ufe-major-open-2026',   2), ('ufe-major-open-2026',   4), ('ufe-major-open-2026',   6), ('ufe-major-open-2026',   8), ('ufe-major-open-2026',  10), ('ufe-major-open-2026',  12), ('ufe-major-open-2026', 14), ('ufe-major-open-2026', 16),
    ('ufe-finance-cup-2026',  1), ('ufe-finance-cup-2026',  3), ('ufe-finance-cup-2026',  5), ('ufe-finance-cup-2026',  7), ('ufe-finance-cup-2026',   9), ('ufe-finance-cup-2026', 11), ('ufe-finance-cup-2026', 13), ('ufe-finance-cup-2026', 15),
    ('ufe-winter-finals-2025',4), ('ufe-winter-finals-2025',5), ('ufe-winter-finals-2025',8), ('ufe-winter-finals-2025',9), ('ufe-winter-finals-2025',12), ('ufe-winter-finals-2025',13), ('ufe-winter-finals-2025',17), ('ufe-winter-finals-2025',18)
  ) AS v(t_slug, team_no)
)
INSERT INTO "TournamentTeam" ("tournamentId", "teamId", "joinedAt")
SELECT
  tr.id,
  tm.id,
  NOW() - ((v.team_no % 7 + 1) || ' days')::interval
FROM entry_seed v
JOIN "Tournament" tr ON tr.slug = v.t_slug
JOIN "Team" tm ON tm.slug = 'ufe-team-' || LPAD(v.team_no::text, 2, '0')
ON CONFLICT ("tournamentId", "teamId") DO NOTHING;

-- 8) Join requests: pending + approved + rejected
WITH request_seed AS (
  SELECT *
  FROM (VALUES
    ('ufe-spring-clash-2026',  7, 'PENDING',  NULL,                 'Waiting list'),
    ('ufe-spring-clash-2026',  8, 'PENDING',  NULL,                 'Need payment confirmation'),
    ('ufe-spring-clash-2026',  9, 'APPROVED', 'admin1@ufe.edu.mn', 'Accepted'),
    ('ufe-spring-clash-2026', 10, 'REJECTED', 'admin1@ufe.edu.mn', 'Team profile incomplete'),
    ('ufe-major-open-2026',    1, 'REJECTED', 'admin1@ufe.edu.mn', 'Bracket already locked'),
    ('ufe-major-open-2026',    3, 'PENDING',  NULL,                 'Reserve slot'),
    ('ufe-finance-cup-2026',   2, 'APPROVED', 'admin1@ufe.edu.mn', 'Accepted as wildcard'),
    ('ufe-finance-cup-2026',   4, 'PENDING',  NULL,                 'Pending review'),
    ('ufe-finance-cup-2026',   6, 'REJECTED', 'admin1@ufe.edu.mn', 'Late submission'),
    ('ufe-freshmen-cup-2026', 11, 'PENDING',  NULL,                 'Awaiting captain check'),
    ('ufe-freshmen-cup-2026', 12, 'PENDING',  NULL,                 'Awaiting captain check'),
    ('ufe-freshmen-cup-2026', 13, 'APPROVED', 'admin2@ufe.edu.mn', 'Approved')
  ) AS v(t_slug, team_no, status, reviewer_email, note)
)
INSERT INTO "TournamentJoinRequest"
  ("tournamentId", "teamId", "requestedByUserId", "reviewedByUserId", "status", "reviewNote", "requestedAt", "reviewedAt")
SELECT
  tr.id AS "tournamentId",
  tm.id AS "teamId",
  captain."userId" AS "requestedByUserId",
  reviewer.id AS "reviewedByUserId",
  rs.status::"TournamentJoinRequestStatus" AS status,
  rs.note AS "reviewNote",
  NOW() - ((tm.id % 6 + 1) || ' days')::interval AS "requestedAt",
  CASE
    WHEN rs.status = 'PENDING' THEN NULL
    ELSE NOW() - ((tm.id % 3) || ' days')::interval
  END AS "reviewedAt"
FROM request_seed rs
JOIN "Tournament" tr ON tr.slug = rs.t_slug
JOIN "Team" tm ON tm.slug = 'ufe-team-' || LPAD(rs.team_no::text, 2, '0')
JOIN "TeamMember" captain
  ON captain."teamId" = tm.id AND captain.role = 'CAPTAIN'::"TeamRole"
LEFT JOIN "User" reviewer
  ON reviewer.email = rs.reviewer_email
ON CONFLICT ("tournamentId", "teamId") DO UPDATE
SET
  "status" = EXCLUDED."status",
  "reviewNote" = EXCLUDED."reviewNote",
  "reviewedByUserId" = EXCLUDED."reviewedByUserId",
  "reviewedAt" = EXCLUDED."reviewedAt";

-- Approved requests should appear in participants too
INSERT INTO "TournamentTeam" ("tournamentId", "teamId", "joinedAt")
SELECT
  jr."tournamentId",
  jr."teamId",
  NOW()
FROM "TournamentJoinRequest" jr
WHERE jr.status = 'APPROVED'::"TournamentJoinRequestStatus"
ON CONFLICT ("tournamentId", "teamId") DO NOTHING;

-- 9) Matches for active + finished tournaments
WITH match_seed AS (
  SELECT *
  FROM (VALUES
    -- ufe-major-open-2026 (ACTIVE)
    ('ufe-major-open-2026',   1, 1,  2,  4,  4, 'COMPLETED', 1, 2, -36),
    ('ufe-major-open-2026',   1, 2,  6,  8,  6, 'COMPLETED', 2, 0, -35),
    ('ufe-major-open-2026',   1, 3, 10, 12, NULL::int, 'SCHEDULED', NULL::int, NULL::int,  6),
    ('ufe-major-open-2026',   1, 4, 14, 16, NULL::int, 'LIVE',      1, 0,  1),

    -- ufe-finance-cup-2026 (ACTIVE)
    ('ufe-finance-cup-2026',  1, 1,  1,  3,  1, 'COMPLETED', 2, 1, -28),
    ('ufe-finance-cup-2026',  1, 2,  5,  7, NULL::int, 'SCHEDULED', NULL::int, NULL::int,  8),
    ('ufe-finance-cup-2026',  1, 3,  9, 11, NULL::int, 'LIVE',      0, 0,  2),
    ('ufe-finance-cup-2026',  1, 4, 13, 15, NULL::int, 'SCHEDULED', NULL::int, NULL::int, 10),

    -- ufe-winter-finals-2025 (FINISHED)
    ('ufe-winter-finals-2025',1, 1,  4,  5,  4, 'COMPLETED', 2, 0, -1400),
    ('ufe-winter-finals-2025',1, 2,  8,  9,  9, 'COMPLETED', 1, 2, -1398),
    ('ufe-winter-finals-2025',1, 3, 12, 13, 12, 'COMPLETED', 2, 1, -1396),
    ('ufe-winter-finals-2025',1, 4, 17, 18, 18, 'COMPLETED', 0, 2, -1394),
    ('ufe-winter-finals-2025',2, 1,  4,  9,  9, 'COMPLETED', 1, 2, -1392),
    ('ufe-winter-finals-2025',2, 2, 12, 18, 18, 'COMPLETED', 0, 2, -1390),
    ('ufe-winter-finals-2025',3, 1,  9, 18, 18, 'COMPLETED', 1, 2, -1388)
  ) AS v(t_slug, round_no, pos_no, home_team_no, away_team_no, winner_team_no, status, home_score, away_score, hour_offset)
)
INSERT INTO "Match"
  ("tournamentId", "round", "position", "homeTeamId", "awayTeamId", "winnerTeamId", "scheduledAt", "status", "homeScore", "awayScore", "completedAt", "createdAt", "updatedAt")
SELECT
  tr.id AS "tournamentId",
  ms.round_no AS round,
  ms.pos_no AS position,
  home.id AS "homeTeamId",
  away.id AS "awayTeamId",
  winner.id AS "winnerTeamId",
  NOW() + (ms.hour_offset || ' hours')::interval AS "scheduledAt",
  ms.status::"MatchStatus" AS status,
  ms.home_score AS "homeScore",
  ms.away_score AS "awayScore",
  CASE
    WHEN ms.status = 'COMPLETED' THEN NOW() + ((ms.hour_offset + 1) || ' hours')::interval
    ELSE NULL
  END AS "completedAt",
  NOW() AS "createdAt",
  NOW() AS "updatedAt"
FROM match_seed ms
JOIN "Tournament" tr ON tr.slug = ms.t_slug
JOIN "Team" home ON home.slug = 'ufe-team-' || LPAD(ms.home_team_no::text, 2, '0')
LEFT JOIN "Team" away
  ON away.slug = CASE WHEN ms.away_team_no IS NULL THEN NULL ELSE 'ufe-team-' || LPAD(ms.away_team_no::text, 2, '0') END
LEFT JOIN "Team" winner
  ON winner.slug = CASE WHEN ms.winner_team_no IS NULL THEN NULL ELSE 'ufe-team-' || LPAD(ms.winner_team_no::text, 2, '0') END
ON CONFLICT ("tournamentId", "round", "position") DO UPDATE
SET
  "homeTeamId" = EXCLUDED."homeTeamId",
  "awayTeamId" = EXCLUDED."awayTeamId",
  "winnerTeamId" = EXCLUDED."winnerTeamId",
  "scheduledAt" = EXCLUDED."scheduledAt",
  "status" = EXCLUDED."status",
  "homeScore" = EXCLUDED."homeScore",
  "awayScore" = EXCLUDED."awayScore",
  "completedAt" = EXCLUDED."completedAt",
  "updatedAt" = NOW();

COMMIT;
