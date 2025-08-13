---
inclusion: always
---

# MoneyFlow 문제 해결 가이드

## 진단 절차

### 문제 식별 체크리스트
- 에러 메시지 및 스택 트레이스 확인
- 브라우저 개발자 도구 Console/Network 탭 검사
- Next.js 터미널 로그 확인
- Supabase Dashboard 로그 검토

### 환경 검증 필수 항목
- 환경 변수 설정 (`.env.local` vs `.env.example` 비교)
- 데이터베이스 연결 상태 (`pnpm db:push` 실행)
- 인증 토큰 유효성 (Supabase Auth 섹션)
- 패키지 의존성 (`pnpm install` 재실행)

## 핵심 문제 패턴 및 해결책

### 인증 문제
**증상**: 로그인 후 리다이렉트 실패, 세션 만료
**해결**: 
- `middleware.ts`와 `app/layout.tsx` 인증 로직 검증
- Supabase 클라이언트 설정 확인 (`createClientComponentClient`)
- 환경 변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 검증

### 데이터베이스 문제
**증상**: Prisma 연결 오류, RLS 정책 위반, UUID 생성 실패
**해결**:
```bash
pnpm db:generate && pnpm db:push  # Prisma 재동기화
```
- RLS 정책: 모든 테이블에 `organization_id` 기반 정책 적용 필수
- UUID v7: `import { v7 as uuidv7 } from 'uuid'` 사용

### 서버 액션 문제
**증상**: 서버 액션 실행 실패, 캐시 무효화 안됨, 폼 상태 업데이트 안됨
**해결**:
- `'use server'` 지시어 최상단 배치 필수
- 에러 핸들링: `ActionResult<T>` 타입 반환
- 캐시 무효화: `revalidatePath()` 또는 `revalidateTag()` 필수 호출
- 폼 상태: `useFormStatus()` 훅으로 pending 상태 관리

```typescript
'use server'
export async function serverAction(): Promise<ActionResult<T>> {
  try {
    // 로직 실행
    revalidatePath('/dashboard'); // 캐시 무효화 필수
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### UI 컴포넌트 문제
**증상**: HeroUI 스타일 깨짐, 차트 렌더링 오류
**해결**:
- `tailwind.config.js`에서 HeroUI 설정 확인:
  ```javascript
  const { heroui } = require('@heroui/react');
  module.exports = {
    content: ['./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'],
    plugins: [heroui()],
  };
  ```
- Recharts 데이터 형식: `{ name: string, value: number }[]` 구조 준수

### 빌드/배포 문제
**증상**: TypeScript 컴파일 오류, Vercel 배포 실패, 환경 변수 누락
**해결**:
```bash
pnpm check-all    # 전체 검증 (타입체크 + 린트 + 포맷)
pnpm type-check   # TypeScript 오류 확인
pnpm lint:fix     # ESLint 자동 수정
```
**필수 환경 변수**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `DATABASE_URL`

## 성능 최적화 체크리스트

### 페이지 로딩 최적화
- 번들 크기 분석 (Next.js Bundle Analyzer)
- 불필요한 import 제거
- 동적 import 적용 (`next/dynamic`)
- Next.js Image 컴포넌트 사용

### 데이터베이스 최적화
- 필요한 필드만 `select` (불필요한 데이터 조회 방지)
- `include`로 관련 데이터 한 번에 조회 (N+1 문제 해결)
- 페이지네이션 적용 (기본 20개 제한)
- `organizationId` 인덱스 확인

### React 메모리 누수 방지
- `useEffect` cleanup 함수 작성
- 이벤트 리스너 정리
- 타이머/인터벌 정리
- TanStack Query 구독 해제

## 디버깅 도구 및 명령어

### 개발 환경 디버깅
```bash
# Prisma 쿼리 로그 활성화
DEBUG=prisma:query pnpm dev

# Next.js 상세 로그
NEXT_DEBUG=1 pnpm dev

# 전체 코드 품질 검사
pnpm check-all
```

### 브라우저 개발자 도구 활용
- **Console**: 에러 메시지, 서버 액션 응답 확인
- **Network**: 서버 액션 요청/응답 분석
- **Application**: 인증 토큰, 로컬 스토리지 상태
- **Performance**: 렌더링 성능 프로파일링

### Supabase Dashboard 활용
- **Logs**: 실시간 데이터베이스 쿼리 로그
- **SQL Editor**: 직접 쿼리 실행 및 테스트
- **Auth**: 사용자 세션 및 토큰 상태 확인
- **Database**: RLS 정책 및 테이블 구조 검증

## 긴급 상황 대응 프로토콜

### 프로덕션 장애 대응
1. **즉시 롤백**: Vercel Dashboard → Deployments → 이전 버전 Promote
2. **로그 분석**: Vercel Functions 로그 + Supabase Dashboard 로그 확인
3. **핫픽스**: 별도 브랜치에서 수정 후 긴급 배포
4. **검증**: 기능 동작 확인 후 모니터링 강화

### 데이터 보안 이슈 대응
1. **즉시 격리**: 해당 기능 비활성화 (환경 변수 또는 feature flag)
2. **백업 확인**: Supabase 자동 백업 상태 점검
3. **RLS 정책 검증**: 모든 테이블의 `organization_id` 기반 정책 확인
4. **감사 로그**: 데이터 접근 로그 분석

## 예방 및 모니터링

### 코드 품질 자동화
```bash
# pre-commit hook 설정 (Husky + lint-staged)
pnpm check-all  # 커밋 전 자동 실행
```

### 필수 모니터링 지표
- **성능**: Core Web Vitals (Vercel Analytics)
- **에러**: 서버 액션 실패율, 인증 오류율
- **보안**: RLS 정책 위반, 비정상 데이터 접근
- **사용성**: 페이지 로딩 시간, 폼 제출 성공률