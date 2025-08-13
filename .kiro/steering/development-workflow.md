---
inclusion: always
---

# 개발 워크플로우 가이드

## 필수 개발 명령어 (우선순위 순)

### 코드 품질 검증 (변경 후 필수 실행)
```bash
pnpm check-all        # 전체 검사 - 타입체크 + 린트 + 포맷
pnpm type-check       # TypeScript 타입 검사
pnpm lint:fix         # ESLint 자동 수정
pnpm format           # Prettier 포맷팅
```

### 데이터베이스 작업
```bash
pnpm db:generate      # Prisma 클라이언트 생성 (스키마 변경 후 필수)
pnpm db:push          # 스키마를 DB에 적용
pnpm db:studio        # Prisma Studio 실행 (데이터 확인용)
```

### 개발 서버
```bash
pnpm dev              # 개발 서버 실행
pnpm build            # 프로덕션 빌드 테스트
```

## 개발 환경 초기 설정

1. **의존성 설치**: `pnpm install`
2. **환경 변수**: `.env.example`을 `.env.local`로 복사 후 설정
3. **데이터베이스**: `pnpm db:push && pnpm db:generate`
4. **개발 서버**: `pnpm dev`

## 코드 변경 후 필수 검증 절차

### 자동 검증 (AI 어시스턴트 필수 실행)
1. `pnpm type-check` - TypeScript 오류 확인
2. `pnpm lint:fix` - ESLint 규칙 자동 수정
3. `pnpm format` - 코드 포맷팅 적용

### 수동 검증 (권장)
- 브라우저에서 기능 동작 확인
- 개발자 도구 콘솔 에러 확인
- 관련 페이지 네비게이션 테스트

## 파일 구조 규칙

### 새 파일 생성 위치
- **페이지**: `app/` 디렉토리 (App Router)
- **컴포넌트**: `components/` 디렉토리
- **서버 액션**: `lib/server-actions/` 디렉토리
- **유틸리티**: `lib/utils/` 디렉토리
- **타입 정의**: `lib/types.ts` 또는 해당 파일 내부

### 명명 규칙
- **컴포넌트**: PascalCase (예: `TransactionForm.tsx`)
- **서버 액션**: camelCase (예: `createTransaction`)
- **파일명**: kebab-case 또는 PascalCase
- **변수/함수**: camelCase

## 커밋 메시지 규칙

```
feat: 새로운 기능 추가
fix: 버그 수정
refactor: 코드 리팩토링
style: 코드 포맷팅
docs: 문서 수정
chore: 빌드/설정 변경
```

## 에러 해결 우선순위

### 1. TypeScript 오류
- `pnpm type-check` 실행하여 타입 오류 확인
- `any` 타입 사용 금지, 명시적 타입 정의 필수

### 2. ESLint 오류
- `pnpm lint:fix` 자동 수정 시도
- 수동 수정 필요한 경우 ESLint 규칙 준수

### 3. 런타임 오류
- 브라우저 개발자 도구 콘솔 확인
- Next.js 터미널 로그 확인
- Supabase 대시보드에서 데이터베이스 상태 확인

## 성능 및 보안 체크리스트

### 필수 확인 사항
- [ ] organizationId 필터링 적용 (데이터 격리)
- [ ] 서버 액션에 인증 검증 포함
- [ ] Zod 스키마로 입력 검증
- [ ] revalidatePath() 캐시 무효화 적용
- [ ] TypeScript strict 모드 준수

### 성능 최적화
- [ ] 불필요한 리렌더링 방지 (memo, useMemo, useCallback)
- [ ] 데이터베이스 쿼리 최적화 (필요한 필드만 select)
- [ ] 페이지네이션 적용 (기본 20개 제한)

## 디버깅 도구 활용

### 개발 환경
- **브라우저 개발자 도구**: 콘솔, 네트워크, 성능 탭
- **Next.js 개발 모드**: 상세한 에러 스택 트레이스
- **Prisma Studio**: 데이터베이스 시각적 확인

### 프로덕션 환경
- **Vercel 대시보드**: 배포 로그 및 함수 로그
- **Supabase 대시보드**: 데이터베이스 로그 및 성능 지표