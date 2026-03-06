CREATE TABLE "AdminControl" (
    "id" SERIAL NOT NULL,
    "Tournament" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AdminControl_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminControl_singleton_idx" ON "AdminControl" ((true));

INSERT INTO "AdminControl" ("Tournament")
VALUES (true);
