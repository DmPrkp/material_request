/*
  Warnings:

  - You are about to drop the column `uuid` on the `Zayavka` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Zayavka_uuid_key";

-- AlterTable
ALTER TABLE "Zayavka" DROP COLUMN "uuid",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Zayavka_pkey" PRIMARY KEY ("id");
