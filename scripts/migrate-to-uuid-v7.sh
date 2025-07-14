#!/bin/bash

# UUID v7 마이그레이션 실행 스크립트
# MoneyFlow 프로젝트를 UUID v7로 전환합니다.

set -e  # 에러 발생 시 스크립트 중단

echo "🔄 MoneyFlow UUID v7 마이그레이션 시작..."
echo "================================================"

# 현재 디렉토리 확인
if [ ! -f "package.json" ]; then
    echo "❌ 에러: MoneyFlow 프로젝트 루트 디렉토리에서 실행해주세요."
    exit 1
fi

# 환경 변수 확인
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL 환경 변수가 설정되지 않았습니다."
    echo "   .env.local 파일을 확인해주세요."
fi

echo "📋 마이그레이션 단계:"
echo "1. UUID v7 함수 생성"
echo "2. 기존 테이블을 UUID v7로 전환"
echo "3. 인덱스 최적화"
echo ""

# 사용자 확인
read -p "계속 진행하시겠습니까? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "마이그레이션이 취소되었습니다."
    exit 0
fi

echo ""
echo "🚀 마이그레이션 실행 중..."

# 1. Prisma 마이그레이션 상태 확인
echo "📊 현재 마이그레이션 상태 확인 중..."
pnpm prisma migrate status || echo "⚠️  마이그레이션 상태를 확인할 수 없습니다."

# 2. 마이그레이션 실행
echo ""
echo "🔧 UUID v7 마이그레이션 적용 중..."

# UUID v7 함수 생성 마이그레이션
echo "  → UUID v7 함수 생성..."
pnpm prisma db execute --file prisma/migrations/20250714131907_add_uuid_v7_function/migration.sql

# UUID v7 전환 마이그레이션
echo "  → 테이블 기본값을 UUID v7로 전환..."
pnpm prisma db execute --file prisma/migrations/20250714132050_transition_to_uuid_v7/migration.sql

# 3. Prisma 클라이언트 재생성
echo ""
echo "🔄 Prisma 클라이언트 재생성 중..."
pnpm prisma generate

# 4. 마이그레이션 상태 업데이트
echo ""
echo "📝 마이그레이션 상태 업데이트 중..."
pnpm prisma migrate resolve --applied 20250714131907_add_uuid_v7_function || echo "⚠️  첫 번째 마이그레이션 상태 업데이트 실패"
pnpm prisma migrate resolve --applied 20250714132050_transition_to_uuid_v7 || echo "⚠️  두 번째 마이그레이션 상태 업데이트 실패"

echo ""
echo "✅ UUID v7 마이그레이션 완료!"
echo "================================================"
echo ""
echo "📊 변경 사항:"
echo "  • 새로운 레코드는 UUID v7 사용 (시간순 정렬 지원)"
echo "  • 기존 UUID v4 레코드는 호환성을 위해 유지"
echo "  • 성능 최적화를 위한 인덱스 추가"
echo ""
echo "🧪 테스트 방법:"
echo "  1. 새 조직 생성: curl -X POST .../api/organizations"
echo "  2. UUID v7 확인: curl .../api/utils/uuid-v7?action=generate"
echo "  3. 성능 테스트: 거래 목록 조회 속도 확인"
echo ""
echo "🔄 롤백 방법 (필요시):"
echo "  ALTER TABLE [table_name] ALTER COLUMN id SET DEFAULT gen_random_uuid();"
echo ""
echo "Happy coding with UUID v7! 🎉"
