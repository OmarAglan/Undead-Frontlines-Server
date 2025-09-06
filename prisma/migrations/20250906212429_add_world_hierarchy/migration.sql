/*
  Warnings:

  - You are about to drop the column `country` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the `Sector` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `countryId` to the `Character` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Sector" DROP CONSTRAINT "Sector_countryId_fkey";

-- AlterTable
ALTER TABLE "public"."Character" DROP COLUMN "country",
ADD COLUMN     "countryId" TEXT NOT NULL,
ADD COLUMN     "currentCityId" TEXT,
ADD COLUMN     "currentGovernorateId" TEXT;

-- DropTable
DROP TABLE "public"."Sector";

-- CreateTable
CREATE TABLE "public"."Governorate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "countryId" TEXT NOT NULL,

    CONSTRAINT "Governorate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'infected',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "governorateId" TEXT NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Character" ADD CONSTRAINT "Character_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "public"."Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Governorate" ADD CONSTRAINT "Governorate_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "public"."Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."City" ADD CONSTRAINT "City_governorateId_fkey" FOREIGN KEY ("governorateId") REFERENCES "public"."Governorate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
