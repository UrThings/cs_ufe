ALTER TABLE "User"
ADD COLUMN "phone" TEXT,
ADD COLUMN "studentCode" TEXT;

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_studentCode_key" ON "User"("studentCode");
