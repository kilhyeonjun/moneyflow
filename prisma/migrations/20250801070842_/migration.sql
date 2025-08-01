/*
  Warnings:

  - You are about to drop the column `category_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the `asset_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `assets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `debts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `default_asset_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `default_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `liabilities` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "asset_categories" DROP CONSTRAINT "asset_categories_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "assets" DROP CONSTRAINT "assets_category_id_fkey";

-- DropForeignKey
ALTER TABLE "assets" DROP CONSTRAINT "assets_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "debts" DROP CONSTRAINT "debts_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "liabilities" DROP CONSTRAINT "liabilities_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_category_id_fkey";

-- DropIndex
DROP INDEX "idx_transactions_category_id";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "category_id";

-- DropTable
DROP TABLE "asset_categories";

-- DropTable
DROP TABLE "assets";

-- DropTable
DROP TABLE "categories";

-- DropTable
DROP TABLE "debts";

-- DropTable
DROP TABLE "default_asset_categories";

-- DropTable
DROP TABLE "default_categories";

-- DropTable
DROP TABLE "liabilities";
