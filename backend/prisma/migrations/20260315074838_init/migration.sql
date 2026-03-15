-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPositionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPositionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPositionZ" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_nickname_key" ON "players"("nickname");
