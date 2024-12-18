-- CreateTable
CREATE TABLE "Zayavka" (
    "uuid" TEXT NOT NULL,
    "data" JSONB NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Zayavka_uuid_key" ON "Zayavka"("uuid");
