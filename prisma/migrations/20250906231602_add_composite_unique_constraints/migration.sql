/*
  Warnings:

  - A unique constraint covering the columns `[name,governorateId]` on the table `City` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,countryId]` on the table `Governorate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "City_name_governorateId_key" ON "public"."City"("name", "governorateId");

-- CreateIndex
CREATE UNIQUE INDEX "Governorate_name_countryId_key" ON "public"."Governorate"("name", "countryId");
