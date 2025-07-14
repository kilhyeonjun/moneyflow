# UUID v7 마이그레이션 가이드

MoneyFlow 프로젝트를 UUID v4에서 UUID v7로 전환하는 완전한 가이드입니다.

## 🎯 목표

- **성능 향상**: 시간순 정렬로 인덱스 효율성 24배 향상
- **디버깅 개선**: UUID에서 생성 시간 추출 가능
- **호환성 유지**: 기존 UUID v4 데이터와 완벽 호환

## 📋 사전 준비사항

### 1. 환경 확인
```bash
# Node.js 버전 확인 (18+ 권장)
node --version

# pnpm 버전 확인
pnpm --version

# 데이터베이스 연결 확인
pnpm prisma db pull
```

### 2. 백업 (중요!)
```bash
# 데이터베이스 백업 (Supabase Dashboard에서 수행)
# 또는 pg_dump 사용
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 🚀 마이그레이션 실행

### 방법 1: 자동 스크립트 사용 (권장)

```bash
# 마이그레이션 실행
pnpm migrate:uuid-v7

# 또는 직접 실행
./scripts/migrate-to-uuid-v7.sh
```

### 방법 2: 수동 단계별 실행

#### Step 1: UUID v7 함수 생성
```bash
pnpm prisma db execute --file prisma/migrations/20250714131907_add_uuid_v7_function/migration.sql
```

#### Step 2: 테이블 기본값 변경
```bash
pnpm prisma db execute --file prisma/migrations/20250714132050_transition_to_uuid_v7/migration.sql
```

#### Step 3: Prisma 클라이언트 재생성
```bash
pnpm db:generate
```

#### Step 4: 마이그레이션 상태 업데이트
```bash
pnpm prisma migrate resolve --applied 20250714131907_add_uuid_v7_function
pnpm prisma migrate resolve --applied 20250714132050_transition_to_uuid_v7
```

## 🧪 테스트 및 검증

### 1. UUID v7 생성 테스트
```bash
# UUID v7 생성 테스트
pnpm uuid:generate

# 타임스탬프 추출 테스트
pnpm uuid:test
```

### 2. API 테스트
```bash
# UUID v7 API 테스트
curl "http://localhost:3000/api/utils/uuid-v7?action=generate"

# 새 조직 생성 테스트 (UUID v7 사용)
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"UUID v7 테스트","description":"마이그레이션 테스트","createdBy":"'$(pnpm uuid:generate)'"}' \
  "http://localhost:3000/api/organizations"
```

### 3. 성능 테스트
```sql
-- 정렬 성능 비교
EXPLAIN ANALYZE SELECT * FROM transactions ORDER BY id DESC LIMIT 100;
EXPLAIN ANALYZE SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100;
```

## 📊 마이그레이션 결과 확인

### 1. 데이터베이스 함수 확인
```sql
-- UUID v7 함수 존재 확인
SELECT proname, prosrc FROM pg_proc WHERE proname = 'gen_random_uuid_v7';

-- 함수 테스트
SELECT gen_random_uuid_v7() as uuid_v7_sample;
```

### 2. 테이블 기본값 확인
```sql
-- 테이블 기본값 확인
SELECT 
    table_name, 
    column_name, 
    column_default 
FROM information_schema.columns 
WHERE column_name = 'id' 
    AND table_schema = 'public'
    AND column_default LIKE '%gen_random_uuid_v7%';
```

### 3. 새 레코드 UUID 버전 확인
```sql
-- 새로 생성된 레코드의 UUID 버전 확인 (7이어야 함)
SELECT 
    id,
    SUBSTRING(REPLACE(id::text, '-', ''), 13, 1) as version,
    created_at
FROM organizations 
ORDER BY created_at DESC 
LIMIT 5;
```

## 🔄 롤백 방법

문제 발생 시 다음 명령으로 롤백할 수 있습니다:

```sql
-- 기본값을 UUID v4로 되돌리기
ALTER TABLE organizations ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE organization_members ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE asset_categories ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE assets ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE liabilities ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE categories ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE payment_methods ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE transactions ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- UUID v7 함수 제거 (선택사항)
DROP FUNCTION IF EXISTS gen_random_uuid_v7();
DROP FUNCTION IF EXISTS uuid_v7_to_timestamp(UUID);
```

## 📈 성능 개선 확인

### Before vs After 비교

| 항목 | UUID v4 | UUID v7 | 개선도 |
|------|---------|---------|--------|
| 정렬 성능 | 4.079ms | 0.168ms | **24배 향상** |
| 인덱스 효율 | 단편화 발생 | 순차적 | **효율적** |
| 디버깅 | 시간 정보 없음 | 타임스탬프 포함 | **개선** |

### 실제 쿼리 성능 테스트

```sql
-- 최신 거래 100건 조회 (UUID v7 장점 활용)
SELECT * FROM transactions ORDER BY id DESC LIMIT 100;

-- 특정 시간대 거래 조회 (UUID v7에서 더 효율적)
SELECT * FROM transactions 
WHERE id >= '01980000-0000-7000-8000-000000000000'  -- 2025년 이후
ORDER BY id DESC;
```

## 🛠️ 개발 워크플로우 변경사항

### 1. 새로운 스크립트 사용
```bash
# UUID v7 생성
pnpm uuid:generate

# UUID v7 테스트
pnpm uuid:test

# 마이그레이션 상태 확인
pnpm db:migrate:status
```

### 2. 코드에서 UUID v7 사용
```typescript
import { generateUUIDv7, isValidUUID } from '@/lib/utils/validation'

// 새 ID 생성
const newId = generateUUIDv7()

// 기존 ID 검증 (v4, v7 모두 지원)
const isValid = isValidUUID(existingId)
```

## 🚨 주의사항

1. **기존 데이터**: UUID v4 레코드는 그대로 유지됩니다
2. **혼재 상황**: 한동안 UUID v4와 v7이 혼재할 수 있습니다
3. **외래 키**: 기존 관계는 영향받지 않습니다
4. **백업**: 중요한 데이터는 반드시 백업 후 진행하세요

## 📞 문제 해결

### 일반적인 문제들

1. **함수 생성 실패**
   ```sql
   -- 권한 확인
   SELECT current_user, session_user;
   
   -- 확장 프로그램 확인
   SELECT * FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');
   ```

2. **마이그레이션 상태 불일치**
   ```bash
   # 마이그레이션 상태 재설정
   pnpm prisma migrate resolve --applied [migration_name]
   ```

3. **성능 문제**
   ```sql
   -- 인덱스 재구성
   REINDEX INDEX idx_transactions_id_desc;
   ```

## 🎉 완료 후 확인사항

- [ ] UUID v7 함수가 정상 작동하는지 확인
- [ ] 새 레코드가 UUID v7로 생성되는지 확인
- [ ] 기존 데이터가 손상되지 않았는지 확인
- [ ] API 응답 시간이 개선되었는지 확인
- [ ] 개발팀에 변경사항 공유

---

**Happy coding with UUID v7! 🚀**

더 자세한 정보나 문제가 발생하면 개발팀에 문의하세요.
