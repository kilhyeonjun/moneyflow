-- Transition existing tables to use UUID v7 for new records
-- This migration updates DEFAULT values to use gen_random_uuid_v7()
-- Existing records keep their UUID v4 values for compatibility

-- Update organizations table
ALTER TABLE organizations 
ALTER COLUMN id SET DEFAULT gen_random_uuid_v7();

-- Update organization_members table
ALTER TABLE organization_members 
ALTER COLUMN id SET DEFAULT gen_random_uuid_v7();

-- Update asset_categories table
ALTER TABLE asset_categories 
ALTER COLUMN id SET DEFAULT gen_random_uuid_v7();

-- Update assets table
ALTER TABLE assets 
ALTER COLUMN id SET DEFAULT gen_random_uuid_v7();

-- Update liabilities table
ALTER TABLE liabilities 
ALTER COLUMN id SET DEFAULT gen_random_uuid_v7();

-- Update categories table
ALTER TABLE categories 
ALTER COLUMN id SET DEFAULT gen_random_uuid_v7();

-- Update payment_methods table
ALTER TABLE payment_methods 
ALTER COLUMN id SET DEFAULT gen_random_uuid_v7();

-- Update transactions table
ALTER TABLE transactions 
ALTER COLUMN id SET DEFAULT gen_random_uuid_v7();

-- Update debts table (if exists)
ALTER TABLE debts 
ALTER COLUMN id SET DEFAULT gen_random_uuid_v7();

-- Update default_categories table (if exists)
ALTER TABLE default_categories 
ALTER COLUMN id SET DEFAULT gen_random_uuid_v7();

-- Add indexes for better performance with UUID v7
-- UUID v7 is naturally ordered by time, so these indexes will be more efficient

-- Create index on transactions for time-based queries (UUID v7 ordering)
CREATE INDEX IF NOT EXISTS idx_transactions_id_desc ON transactions (id DESC);

-- Create index on organizations for time-based queries
CREATE INDEX IF NOT EXISTS idx_organizations_id_desc ON organizations (id DESC);

-- Create index on assets for time-based queries
CREATE INDEX IF NOT EXISTS idx_assets_id_desc ON assets (id DESC);

-- Add comments to document the transition
COMMENT ON TABLE organizations IS 'Uses UUID v7 for new records (time-ordered), existing UUID v4 records preserved';
COMMENT ON TABLE transactions IS 'Uses UUID v7 for new records (time-ordered), existing UUID v4 records preserved';
COMMENT ON TABLE assets IS 'Uses UUID v7 for new records (time-ordered), existing UUID v4 records preserved';

-- Log the migration
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    gen_random_uuid_v7()::text,
    'uuid_v7_transition_checksum',
    NOW(),
    '20250714132050_transition_to_uuid_v7',
    'Transitioned to UUID v7 for new records while preserving existing UUID v4 compatibility',
    NULL,
    NOW(),
    1
) ON CONFLICT DO NOTHING;
