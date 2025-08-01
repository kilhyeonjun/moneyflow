/*
  Warnings:

  - You are about to drop the `financial_goals` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "financial_goals" DROP CONSTRAINT "financial_goals_organization_id_fkey";

-- DropTable
DROP TABLE "financial_goals";
