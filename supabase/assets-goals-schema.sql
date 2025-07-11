-- 자산 및 목표 관리를 위한 스키마 확장
-- 이 파일은 Supabase SQL Editor에서 실행하세요

-- 자산 카테고리 테이블
CREATE TABLE IF NOT EXISTS asset_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('real_estate', 'financial', 'investment', 'retirement', 'cash', 'other')),
    icon VARCHAR(50),
    color VARCHAR(20),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 자산 테이블
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES asset_categories(id) ON DELETE RESTRICT,
    current_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    target_value DECIMAL(15,2),
    last_updated_value DECIMAL(15,2),
    last_updated_date DATE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 부채 테이블
CREATE TABLE IF NOT EXISTS liabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('mortgage', 'personal_loan', 'credit_card', 'student_loan', 'other')),
    current_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    original_amount DECIMAL(15,2),
    interest_rate DECIMAL(5,2),
    monthly_payment DECIMAL(15,2),
    due_date DATE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 재정 목표 테이블
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('asset_growth', 'savings', 'debt_reduction', 'expense_reduction')),
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    target_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    achievement_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN target_amount = 0 THEN 0
            ELSE ROUND((current_amount / target_amount * 100)::numeric, 2)
        END
    ) STORED,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 자산 가치 변동 이력 테이블
CREATE TABLE IF NOT EXISTS asset_value_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    value DECIMAL(15,2) NOT NULL,
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 목표 진행 이력 테이블
CREATE TABLE IF NOT EXISTS goal_progress_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_asset_categories_org_id ON asset_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_org_id ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_category_id ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_org_id ON liabilities(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_org_id ON financial_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_asset_value_history_asset_id ON asset_value_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_value_history_date ON asset_value_history(recorded_date);
CREATE INDEX IF NOT EXISTS idx_goal_progress_history_goal_id ON goal_progress_history(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_history_date ON goal_progress_history(recorded_date);

-- RLS 정책 활성화
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_value_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress_history ENABLE ROW LEVEL SECURITY;

-- 자산 카테고리 RLS 정책
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

-- 자산 RLS 정책
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

-- 부채 RLS 정책
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

-- 재정 목표 RLS 정책
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

-- 자산 가치 이력 RLS 정책
CREATE POLICY "Users can view asset value history of their organizations" ON asset_value_history
    FOR SELECT USING (
        asset_id IN (
            SELECT id FROM assets 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Organization members can manage asset value history" ON asset_value_history
    FOR ALL USING (
        asset_id IN (
            SELECT id FROM assets 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- 목표 진행 이력 RLS 정책
CREATE POLICY "Users can view goal progress history of their organizations" ON goal_progress_history
    FOR SELECT USING (
        goal_id IN (
            SELECT id FROM financial_goals 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Organization members can manage goal progress history" ON goal_progress_history
    FOR ALL USING (
        goal_id IN (
            SELECT id FROM financial_goals 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 업데이트 트리거 생성
CREATE TRIGGER update_asset_categories_updated_at BEFORE UPDATE ON asset_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liabilities_updated_at BEFORE UPDATE ON liabilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_goals_updated_at BEFORE UPDATE ON financial_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 기본 자산 카테고리 생성 함수
CREATE OR REPLACE FUNCTION create_default_asset_categories(org_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO asset_categories (name, type, icon, color, organization_id) VALUES
    ('부동산', 'real_estate', 'Home', '#3B82F6', org_id),
    ('노후/연금', 'retirement', 'PiggyBank', '#10B981', org_id),
    ('저축/투자', 'investment', 'TrendingUp', '#8B5CF6', org_id),
    ('금융자산', 'financial', 'Wallet', '#F59E0B', org_id),
    ('현금', 'cash', 'DollarSign', '#6B7280', org_id);
END;
$$ LANGUAGE plpgsql;

-- 조직 생성 시 기본 자산 카테고리 자동 생성 트리거 수정
CREATE OR REPLACE FUNCTION setup_new_organization()
RETURNS TRIGGER AS $$
BEGIN
    -- 기본 카테고리 추가
    PERFORM create_default_categories(NEW.id);
    
    -- 기본 결제수단 추가
    PERFORM create_default_payment_methods(NEW.id);
    
    -- 기본 자산 카테고리 추가
    PERFORM create_default_asset_categories(NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
