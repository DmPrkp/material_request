-- CreateTable
CREATE TABLE "Zaiavka" (
    "id" SERIAL NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user" INTEGER,
    "editKeyHash" TEXT,

    CONSTRAINT "Zaiavka_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Zaiavka_user_idx" ON "Zaiavka"("user");

