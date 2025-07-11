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

### 1. 의존성 설치
```bash
pnpm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env.local
```

`.env.local` 파일에 Supabase 설정을 추가하세요:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://brlhackjnljqhuoqnuyt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

**API 키 확인 방법:**
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. `moneyflow` 프로젝트 선택
3. **Settings** → **API** 메뉴에서 키 복사

### 3. 개발 서버 실행
```bash
pnpm dev
```

### 4. 테스트 계정
개발 및 테스트를 위한 사전 생성된 계정:

```
이메일: admin@moneyflow.com
비밀번호: admin123
```

- ✅ 이메일 인증 완료
- ✅ 관리자 권한
- ✅ 샘플 데이터 포함 (수입 ₩3,000,000, 지출 ₩35,000)

## 🗄️ 데이터베이스 설정

### Supabase 프로젝트 정보
- **Project ID**: `brlhackjnljqhuoqnuyt`
- **Project Name**: `moneyflow`
- **Region**: `ap-northeast-2`
- **Database Host**: `db.brlhackjnljqhuoqnuyt.supabase.co`

### 테이블 생성
`supabase/schema.sql` 파일을 Supabase SQL Editor에서 실행하여 다음 테이블들을 생성하세요:

- `organizations`: 조직 정보
- `organization_members`: 조직 멤버 관계
- `categories`: 3단계 계층 분류 체계
- `payment_methods`: 결제수단
- `transactions`: 거래 내역

### Row Level Security (RLS)
모든 테이블에 RLS가 적용되어 조직별 데이터 격리가 보장됩니다.

## 📱 주요 화면

- `/` - 랜딩 페이지
- `/login` - 로그인
- `/signup` - 회원가입
- `/organizations` - 조직 선택/생성 ✨ **새로 추가**
- `/dashboard` - 대시보드 (조직 권한 검증 포함)
- `/transactions` - 거래 관리 (예정)
- `/analytics` - 통계 분석 (예정)
- `/settings` - 설정 (예정)

## 🎯 개발 로드맵

### Phase 1: MVP ✅ **완료**
- ✅ 기본 인증 시스템
- ✅ 기본 UI 구조
- ✅ 조직 생성 및 관리
- ✅ 조직 권한 시스템
- ✅ 대시보드 기본 구조

### Phase 2: 핵심 기능 (진행 중)
- ⏳ 거래 CRUD 기능
- ⏳ 3단계 분류 체계 완성
- ⏳ 자산/부채 관리
- ⏳ 고급 대시보드 및 차트

### Phase 3: 고도화
- 실시간 동기화
- 성능 최적화
- 모바일 반응형 완성
- 추가 기능 및 UX 개선

## 🔧 개발 도구

### 코드 품질 검사
```bash
pnpm check-all    # 전체 검사 (타입체크 + 린트 + 포맷)
pnpm type-check   # TypeScript 타입 검사
pnpm lint         # ESLint 검사
pnpm format       # Prettier 포맷팅
```

### 빌드
```bash
pnpm build        # 프로덕션 빌드
```

## 📄 라이선스

MIT License