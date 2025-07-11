-- MoneyFlow 기본 데이터 추가 스크립트
-- 이 스크립트는 새로운 조직이 생성될 때 기본 카테고리와 결제수단을 추가합니다.

-- 기본 카테고리 추가 함수
CREATE OR REPLACE FUNCTION create_default_categories(org_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 수입 카테고리
    INSERT INTO categories (name, type, level, organization_id) VALUES
    ('급여', 'income', 1, org_id),
    ('부업', 'income', 1, org_id),
    ('투자수익', 'income', 1, org_id),
    ('기타수입', 'income', 1, org_id),
    
    -- 지출 카테고리
    ('식비', 'expense', 1, org_id),
    ('교통비', 'expense', 1, org_id),
    ('주거비', 'expense', 1, org_id),
    ('의료비', 'expense', 1, org_id),
    ('교육비', 'expense', 1, org_id),
    ('문화생활', 'expense', 1, org_id),
    ('쇼핑', 'expense', 1, org_id),
    ('통신비', 'expense', 1, org_id),
    ('보험료', 'expense', 1, org_id),
    ('기타지출', 'expense', 1, org_id),
    
    -- 저축 카테고리
    ('비상자금', 'savings', 1, org_id),
    ('투자', 'savings', 1, org_id),
    ('적금', 'savings', 1, org_id),
    ('연금', 'savings', 1, org_id);
END;
$$ LANGUAGE plpgsql;

-- 기본 결제수단 추가 함수
CREATE OR REPLACE FUNCTION create_default_payment_methods(org_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO payment_methods (name, type, organization_id) VALUES
    ('현금', 'cash', org_id),
    ('체크카드', 'card', org_id),
    ('신용카드', 'card', org_id),
    ('은행계좌', 'account', org_id),
    ('모바일페이', 'other', org_id);
END;
$$ LANGUAGE plpgsql;

-- 조직 생성 시 자동으로 기본 데이터 추가하는 트리거 함수
CREATE OR REPLACE FUNCTION setup_new_organization()
RETURNS TRIGGER AS $$
BEGIN
    -- 기본 카테고리 추가
    PERFORM create_default_categories(NEW.id);
    
    -- 기본 결제수단 추가
    PERFORM create_default_payment_methods(NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 조직 생성 트리거
DROP TRIGGER IF EXISTS trigger_setup_new_organization ON organizations;
CREATE TRIGGER trigger_setup_new_organization
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION setup_new_organization();

-- 기존 조직에 기본 데이터 추가 (필요한 경우)
-- 이 부분은 수동으로 실행하거나 필요에 따라 주석 해제하여 사용
/*
DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN SELECT id FROM organizations LOOP
        -- 카테고리가 없는 조직에만 추가
        IF NOT EXISTS (SELECT 1 FROM categories WHERE organization_id = org_record.id) THEN
            PERFORM create_default_categories(org_record.id);
        END IF;
        
        -- 결제수단이 없는 조직에만 추가
        IF NOT EXISTS (SELECT 1 FROM payment_methods WHERE organization_id = org_record.id) THEN
            PERFORM create_default_payment_methods(org_record.id);
        END IF;
    END LOOP;
END $$;
*/
