# MoneyFlow

조직(가족/팀) 단위의 종합 가계부 관리 시스템

## 🚀 기능

- **조직 단위 관리**: 가족/팀 단위로 재정을 공유하고 관리
- **3단계 분류 체계**: 대분류(수입/저축/지출) → 중분류 → 세분류로 체계적 관리
- **실시간 동기화**: 조직 내 모든 구성원의 입력이 실시간으로 반영
- **목표 지향적**: 자산 증가 목표 설정 및 달성률 추적
- **직관적 UX**: 복잡한 재정 관리를 간단하게 만드는 사용자 경험

## 🛠️ 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: HeroUI, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Data Fetching**: TanStack Query
- **Forms**: TanStack Form
- **Charts**: Recharts
- **Icons**: Lucide React

## 📦 설치 및 실행

1. 의존성 설치:
```bash
pnpm install
```

2. 환경 변수 설정:
```bash
cp .env.example .env.local
```

`.env.local` 파일에 Supabase 설정을 추가하세요.

3. 개발 서버 실행:
```bash
pnpm dev
```

## 🗄️ 데이터베이스 설정

Supabase 프로젝트를 생성하고 다음 테이블들을 생성해야 합니다:

- `organizations`: 조직 정보
- `organization_members`: 조직 멤버 관계
- `categories`: 3단계 계층 분류 체계
- `payment_methods`: 결제수단
- `transactions`: 거래 내역

자세한 스키마는 `types/database.ts` 파일을 참고하세요.

## 📱 주요 화면

- `/` - 랜딩 페이지
- `/login` - 로그인
- `/signup` - 회원가입
- `/dashboard` - 대시보드
- `/transactions` - 거래 관리
- `/analytics` - 통계 분석
- `/organization` - 조직 관리
- `/settings` - 설정

## 🎯 개발 로드맵

### Phase 1: MVP (현재)
- ✅ 기본 인증 시스템
- ✅ 기본 UI 구조
- ⏳ 조직 생성 및 관리
- ⏳ 거래 CRUD 기능
- ⏳ 간단한 분류 시스템

### Phase 2: 핵심 기능
- 소셜 로그인 (구글/카카오)
- 3단계 분류 체계 완성
- 자산/부채 관리
- 권한 시스템
- 고급 대시보드 및 차트

### Phase 3: 고도화
- 실시간 동기화
- 성능 최적화
- 모바일 반응형 완성
- 추가 기능 및 UX 개선

## 📄 라이선스

MIT License