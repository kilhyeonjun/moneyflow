-- Financial Goals and Assets Management Tables
-- Run this in Supabase SQL Editor

-- Asset categories table
CREATE TABLE IF NOT EXISTS asset_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('real_estate', 'financial', 'investment', 'retirement', 'cash', 'other')),
    icon VARCHAR(50),
    color VARCHAR(7),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES asset_categories(id) ON DELETE RESTRICT,
    current_value DECIMAL(15,2) DEFAULT 0,
    target_value DECIMAL(15,2),
    last_updated_value DECIMAL(15,2),
    last_updated_date DATE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Liabilities table
CREATE TABLE IF NOT EXISTS liabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('mortgage', 'personal_loan', 'credit_card', 'student_loan', 'other')),
    current_amount DECIMAL(15,2) DEFAULT 0,
    original_amount DECIMAL(15,2),
    interest_rate DECIMAL(5,2),
    monthly_payment DECIMAL(15,2),
    due_date DATE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial goals table
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('asset_growth', 'savings', 'debt_reduction', 'expense_reduction')),
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) DEFAULT 0,
    target_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    achievement_rate DECIMAL(5,2) DEFAULT 0,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asset value history table
CREATE TABLE IF NOT EXISTS asset_value_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    value DECIMAL(15,2) NOT NULL,
    recorded_date DATE DEFAULT CURRENT_DATE,
    note TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goal progress history table
CREATE TABLE IF NOT EXISTS goal_progress_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    recorded_date DATE DEFAULT CURRENT_DATE,
    note TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_asset_categories_org_id ON asset_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_org_id ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_category_id ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_org_id ON liabilities(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_org_id ON financial_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_status ON financial_goals(status);
CREATE INDEX IF NOT EXISTS idx_asset_value_history_asset_id ON asset_value_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_history_goal_id ON goal_progress_history(goal_id);

-- Row Level Security (RLS) policies
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_value_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress_history ENABLE ROW LEVEL SECURITY;

-- Asset categories policies
CREATE POLICY "Users can view asset categories of their organizations" ON asset_categories
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organization members can manage asset categories" ON asset_categories
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Assets policies
CREATE POLICY "Users can view assets of their organizations" ON assets
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organization members can manage assets" ON assets
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Liabilities policies
CREATE POLICY "Users can view liabilities of their organizations" ON liabilities
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organization members can manage liabilities" ON liabilities
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Financial goals policies
CREATE POLICY "Users can view financial goals of their organizations" ON financial_goals
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organization members can manage financial goals" ON financial_goals
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Asset value history policies
CREATE POLICY "Users can view asset value history of their organizations" ON asset_value_history
    FOR SELECT USING (
        asset_id IN (
            SELECT id FROM assets WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Organization members can manage asset value history" ON asset_value_history
    FOR ALL USING (
        asset_id IN (
            SELECT id FROM assets WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Goal progress history policies
CREATE POLICY "Users can view goal progress history of their organizations" ON goal_progress_history
    FOR SELECT USING (
        goal_id IN (
            SELECT id FROM financial_goals WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Organization members can manage goal progress history" ON goal_progress_history
    FOR ALL USING (
        goal_id IN (
            SELECT id FROM financial_goals WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Triggers for updated_at
CREATE TRIGGER update_asset_categories_updated_at BEFORE UPDATE ON asset_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liabilities_updated_at BEFORE UPDATE ON liabilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_goals_updated_at BEFORE UPDATE ON financial_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update achievement_rate when current_amount changes
CREATE OR REPLACE FUNCTION update_goal_achievement_rate()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate achievement rate as percentage
    IF NEW.target_amount > 0 THEN
        NEW.achievement_rate = (NEW.current_amount / NEW.target_amount) * 100;
    ELSE
        NEW.achievement_rate = 0;
    END IF;
    
    -- Update status based on achievement rate
    IF NEW.achievement_rate >= 100 AND NEW.status = 'active' THEN
        NEW.status = 'completed';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update achievement rate
CREATE TRIGGER update_financial_goals_achievement_rate 
    BEFORE INSERT OR UPDATE ON financial_goals
    FOR EACH ROW EXECUTE FUNCTION update_goal_achievement_rate();
