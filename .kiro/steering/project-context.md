---
inclusion: always
---

# MoneyFlow 프로젝트 컨텍스트

## 프로젝트 개요
MoneyFlow는 Next.js 15 App Router와 Supabase를 기반으로 한 **멀티테넌트 재무 관리 플랫폼**입니다. 조직(가족/팀) 단위로 데이터를 격리하여 안전한 재무 데이터 관리를 제공합니다.

## 핵심 기술 스택

### Frontend
- **Next.js 15.1.3** (App Router) - 서버 컴포넌트 우선
- **React 19** - 최신 React 기능 활용
- **TypeScript 5.7** - strict 모드, `any` 타입 금지

### UI/UX
- **HeroUI 2.6** - 기본 UI 컴포넌트 라이브러리
- **Tailwind CSS 3.4** - 유틸리티 우선 스타일링
- **Framer Motion** - 애니메이션 및 전환 효과

### Backend & Database
- **Supabase** - PostgreSQL + 인증 + RLS 보안
- **Prisma 6.11** - 타입 안전 ORM
- **UUID v7** - 시간순 정렬 가능한 식별자

### 상태 관리
- **TanStack Query 5.62** - 서버 상태 캐싱 및 동기화
- **TanStack Form** - 폼 상태 관리
- **서버 액션** - API 라우트 대신 사용

### 개발 도구
- **pnpm 9.15.0** - 패키지 매니저
- **ESLint + Prettier** - 코드 품질 관리
- **Husky + lint-staged** - pre-commit hooks

## 아키텍처 핵심 원칙

### 1. 서버 액션 중심 설계
- API 라우트 완전 제거, 모든 서버 로직을 서버 액션으로 처리
- 위치: `lib/server-actions/` 디렉토리에 도메인별 구성
- 캐시 전략: `revalidatePath()`, `revalidateTag()` 활용

### 2. 멀티테넌트 데이터 격리
- 모든 데이터 접근에 `organizationId` 필터링 필수
- RLS(Row Level Security) 정책으로 데이터베이스 레벨 보안
- 서버 액션에서 권한 검증 이중화

### 3. 타입 안전성 보장
- TypeScript strict 모드, `any` 타입 절대 금지
- Zod 스키마로 모든 입력 검증
- Prisma로 데이터베이스 타입 안전성 확보

## 프로젝트 구조

```
app/                    # Next.js App Router 페이지
├── (auth)/            # 인증 관련 페이지 그룹
├── org/[orgId]/       # 조직별 페이지 (멀티테넌트)
├── dashboard/         # 개인 대시보드
└── globals.css        # 전역 스타일

components/            # 재사용 컴포넌트
├── categories/        # 카테고리 관련 컴포넌트
├── dashboard/         # 대시보드 차트 컴포넌트
├── form/             # 폼 컴포넌트 (검증 포함)
├── payment-methods/   # 결제 수단 관리
└── ui/               # 기본 UI 컴포넌트

lib/                  # 핵심 라이브러리
├── server-actions/   # 도메인별 서버 액션
├── validation/       # Zod 스키마 정의
├── utils/           # 공통 유틸리티
├── supabase.ts      # Supabase 클라이언트 설정
└── types.ts         # 공통 타입 정의

prisma/              # 데이터베이스
├── schema.prisma    # DB 스키마 정의
└── migrations/      # 마이그레이션 파일
```

## 핵심 비즈니스 도메인

### 거래 관리 (Transaction)
- **타입**: INCOME(수입), EXPENSE(지출), SAVINGS(저축)
- **필수 필드**: amount, type, categoryId, organizationId
- **계층적 카테고리**: 3단계 구조 (type → category → subcategory)

### 조직 관리 (Organization)
- **멀티테넌트**: 모든 데이터의 격리 경계
- **권한 레벨**: OWNER, ADMIN, MEMBER, VIEWER
- **멤버 초대**: 토큰 기반 초대 시스템

### 자산 관리 (Asset)
- **유형**: 은행 계좌, 투자 계좌, 부동산 등
- **결제 수단**: 거래와 연결되는 보조 엔티티

## 개발 환경 설정

### 필수 명령어
```bash
pnpm install          # 의존성 설치
pnpm db:generate      # Prisma 클라이언트 생성
pnpm db:push          # 스키마 DB 적용
pnpm dev              # 개발 서버 실행
pnpm check-all        # 전체 코드 품질 검사
```

### 환경 변수 (필수)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 익명 키
- `DATABASE_URL` - PostgreSQL 연결 문자열

## 보안 및 성능 요구사항

### 보안 체크리스트
- [ ] 모든 쿼리에 `organizationId` 필터링 적용
- [ ] 서버 액션에 인증/권한 검증 포함
- [ ] Zod 스키마로 입력 검증
- [ ] RLS 정책으로 데이터베이스 보안

### 성능 최적화
- [ ] 서버 컴포넌트 우선 사용
- [ ] 페이지네이션 적용 (기본 20개 제한)
- [ ] TanStack Query로 적절한 캐싱
- [ ] 필요한 데이터만 select/include