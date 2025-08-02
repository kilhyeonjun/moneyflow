-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "category_id" UUID;

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "parent_id" UUID,
    "display_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_categories_org_id" ON "categories"("organization_id");

-- CreateIndex
CREATE INDEX "idx_categories_type" ON "categories"("type");

-- CreateIndex
CREATE INDEX "idx_categories_parent_id" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "idx_categories_org_id_type" ON "categories"("organization_id", "type");

-- CreateIndex
CREATE INDEX "idx_categories_org_id_parent_id" ON "categories"("organization_id", "parent_id");

-- CreateIndex
CREATE INDEX "idx_transactions_category_id" ON "transactions"("category_id");

-- CreateIndex
CREATE INDEX "idx_transactions_org_id_category_id" ON "transactions"("organization_id", "category_id");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
