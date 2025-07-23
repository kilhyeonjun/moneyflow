# MoneyFlow - 개인 재무 관리 플랫폼

## 🎯 프로젝트 개요

MoneyFlow는 Next.js 15와 Supabase를 기반으로 한 현대적인 개인 재무 관리 플랫폼입니다. 직관적인 대시보드를 통해 수입/지출 추적, 자산 관리, 부채 관리 등 종합적인 재무 관리 기능을 제공합니다.

### 주요 특징
- 🏢 **멀티 조직 지원**: 개인/가족/기업 단위 재무 관리
- 📊 **실시간 대시보드**: 차트와 통계를 통한 재무 현황 시각화
- 💰 **거래 관리**: 수입/지출 추적 및 카테고리별 분류
- 🏦 **자산 관리**: 은행 계좌, 투자, 부동산 등 자산 포트폴리오
- 📱 **PWA 지원**: 모바일 앱처럼 사용 가능
- 🔐 **보안**: Supabase 인증 + RLS(Row Level Security)

## 🛠️ 기술 스택

### Frontend
- **Next.js 15.1.3** - App Router, React 19, TypeScript
- **HeroUI 2.6** - 모던 UI 컴포넌트 라이브러리
- **TanStack Query 5.62** - 서버 상태 관리
- **Recharts 2.15** - 차트 및 데이터 시각화
- **Framer Motion 11** - 애니메이션
- **Tailwind CSS 3.4** - 유틸리티 기반 CSS

### Backend & Database
- **Supabase** - 인증, 데이터베이스, 실시간 구독
- **PostgreSQL** - 메인 데이터베이스
- **Prisma 6.11** - ORM 및 타입 안전 쿼리
- **UUID v7** - 시간 순서가 보장되는 고유 식별자

### 개발 도구
- **TypeScript 5.7** - 타입 안전성
- **ESLint + Prettier** - 코드 품질 관리
- **Husky + lint-staged** - 커밋 전 자동 검사
- **pnpm** - 패키지 매니저
- **Turbo** - 고성능 번들러

## 📁 프로젝트 구조

```
moneyflow/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # 인증 관련 페이지 그룹
│   │   ├── login/               # 로그인 페이지
│   │   └── signup/              # 회원가입 페이지
│   ├── (dashboard)/             # 보호된 대시보드 그룹
│   │   ├── page.tsx            # 메인 대시보드 (/dashboard)
│   │   ├── layout.tsx          # 대시보드 레이아웃 + 인증
│   │   ├── analytics/          # 분석 페이지
│   │   ├── transactions/       # 거래 관리
│   │   └── settings/           # 설정
│   ├── api/                     # API 라우트
│   │   ├── organizations/      # 조직 API
│   │   ├── transactions/       # 거래 API
│   │   ├── assets/            # 자산 API
│   │   └── dashboard/         # 대시보드 데이터 API
│   ├── globals.css             # 전역 스타일
│   └── layout.tsx              # 루트 레이아웃
├── components/                  # 재사용 가능한 컴포넌트
│   ├── charts/                 # 차트 컴포넌트
│   ├── forms/                  # 폼 컴포넌트
│   ├── sidebar.tsx            # 사이드바 네비게이션
│   └── ui/                     # 기본 UI 컴포넌트
├── lib/                        # 유틸리티 함수
│   ├── supabase.ts           # Supabase 클라이언트 설정
│   ├── utils.ts              # 공통 유틸리티
│   └── validations.ts        # Zod 스키마 검증
├── prisma/                     # 데이터베이스 관련
│   ├── schema.prisma         # 데이터베이스 스키마
│   └── seed.ts               # 시드 데이터
├── middleware.ts              # Next.js 미들웨어 (인증)
├── next.config.js            # Next.js 설정
├── tailwind.config.js        # Tailwind CSS 설정
└── package.json              # 프로젝트 의존성
```

## 🔐 인증 시스템

### 아키텍처
- **Supabase Auth**: 이메일/비밀번호 인증
- **이중 보안**: 서버사이드(middleware) + 클라이언트사이드(layout)
- **자동 리다이렉트**: 인증 상태에 따른 페이지 이동

### 보호된 경로
- `/dashboard` - 메인 대시보드
- `/analytics` - 분석 페이지
- `/transactions` - 거래 관리
- `/assets` - 자산 관리
- `/settings` - 설정

### 인증 플로우
1. `middleware.ts:57` - 서버사이드 사용자 인증 확인
2. `layout.tsx:20` - 클라이언트사이드 재검증
3. 비인증 시 `/login`으로 자동 리다이렉트
4. 로그인 성공 시 `/dashboard`로 이동

## 📊 데이터베이스 구조

### 핵심 테이블
- **organizations**: 조직/가족 단위 관리
- **organization_members**: 멤버십 및 권한 관리
- **transactions**: 수입/지출 거래 데이터
- **categories**: 계층형 카테고리 (부모-자식 관계)
- **assets**: 자산 관리 (은행, 투자, 부동산)
- **debts**: 부채 및 대출 관리
- **payment_methods**: 결제 수단 관리

### 주요 특징
- **UUID v7**: 시간 순서 보장 고유 식별자
- **RLS(Row Level Security)**: 데이터 보안
- **조직별 격리**: `organization_id` 기반 멀티테넌트
- **자동 타임스탬프**: 생성/수정 시간 자동 기록

## 🚀 API 라우트

### RESTful API 엔드포인트
- `GET|POST /api/organizations` - 조직 관리
- `GET|POST /api/transactions` - 거래 CRUD
- `GET|POST /api/assets` - 자산 관리
- `GET /api/dashboard` - 대시보드 데이터
- `GET /api/transaction-categories` - 거래 카테고리

### 공통 응답 형식
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}
```

## 🎨 UI/UX 컴포넌트

### 대시보드 차트
- **TotalBalanceChart**: 총 잔액 추이
- **MonthlyExpenseChart**: 월별 지출 분석
- **CategoryChart**: 카테고리별 지출 분포
- **AssetAllocationChart**: 자산 배분 현황

### 폼 컴포넌트
- **TransactionForm**: 거래 등록/수정
- **AssetForm**: 자산 등록/수정
- **CategoryForm**: 카테고리 관리

### 레이아웃
- **Sidebar**: 네비게이션 메뉴
- **DashboardLayout**: 보호된 페이지 레이아웃
- **AuthLayout**: 인증 페이지 레이아웃

## ⚙️ 개발 가이드

### 환경 설정
```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local

# 데이터베이스 설정
pnpm db:push
pnpm db:seed

# 개발 서버 실행
pnpm dev
```

### 주요 스크립트
```bash
pnpm dev              # 개발 서버 (Turbo 모드)
pnpm build            # 프로덕션 빌드
pnpm lint:fix         # ESLint 자동 수정
pnpm format           # Prettier 포맷팅
pnpm check-all        # 타입체크 + 린트 + 포맷 검사
pnpm db:push          # 스키마를 DB에 적용
pnpm db:seed          # 시드 데이터 생성
pnpm uuid:generate    # UUID v7 생성
```

### 코드 품질 관리
- **pre-commit hooks**: Husky + lint-staged
- **타입 안전성**: TypeScript strict mode
- **코드 스타일**: ESLint + Prettier 통합
- **자동 포맷팅**: 저장 시 자동 적용

## 🌐 배포

### Vercel 배포
1. 환경 변수 설정 (`.env.production` 참조)
2. Supabase 프로젝트 설정
3. 데이터베이스 마이그레이션 실행
4. Vercel에 배포

### 환경 변수 (필수)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_postgresql_connection_string
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 🔧 최근 수정사항

### 로그인 리다이렉트 문제 해결
- **문제**: 로그인 후 `/dashboard/dashboard`로 잘못 이동
- **해결**: 
  - `next.config.js` 리다이렉트 규칙 제거
  - `login/page.tsx:46` 리다이렉트 경로 수정
  - 폴더 구조 개선 (`/dashboard/page.tsx` → `/page.tsx`)

### 인증 시스템 강화
- **middleware.ts**: 서버사이드 인증 미들웨어 추가
- **layout.tsx**: 클라이언트사이드 인증 검증 강화
- **이중 보안**: 서버/클라이언트 양쪽에서 인증 확인

### 프로덕션 환경 설정
- `.env.production` 최적화
- PWA 활성화
- 디버그 모드 비활성화

## 📝 개발자 노트

### 테스트 계정
- **이메일**: admin@moneyflow.com
- **비밀번호**: admin123

### 알려진 이슈
- 개발 서버 재시작 후 폴더 구조 변경 적용 필요
- Playwright 테스트 시 인증 토큰 컨텍스트 처리 필요

### 향후 개선사항
- [ ] 단위 테스트 추가
- [ ] E2E 테스트 자동화
- [ ] 다국어 지원
- [ ] 모바일 UX 최적화
- [ ] 실시간 알림 시스템

---

**개발자**: kilhyeonjun  
**버전**: 0.1.0  
**라이센스**: Private  
**최종 업데이트**: 2025-01-23