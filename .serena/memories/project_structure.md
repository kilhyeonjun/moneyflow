# 프로젝트 구조 및 아키텍처

## 디렉토리 구조
```
moneyflow/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 관련 페이지 그룹
│   │   ├── login/         # 로그인 페이지
│   │   └── signup/        # 회원가입 페이지
│   ├── (dashboard)/       # 대시보드 관련 페이지 그룹
│   │   ├── dashboard/     # 메인 대시보드
│   │   └── layout.tsx     # 대시보드 레이아웃
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx          # 홈페이지 (랜딩)
│   └── providers.tsx     # 전역 프로바이더
├── components/            # 재사용 가능한 컴포넌트
│   └── sidebar.tsx       # 사이드바 컴포넌트
├── lib/                  # 유틸리티 및 설정
│   ├── supabase.ts      # Supabase 클라이언트
│   └── supabase-server.ts # 서버사이드 Supabase
├── types/               # TypeScript 타입 정의
│   └── database.ts      # 데이터베이스 타입
├── .q-hooks/           # Amazon Q CLI 훅
├── .vscode/            # VS Code 설정
└── .amazonq/           # Amazon Q 설정
```

## 주요 컴포넌트
- **HomePage**: 랜딩 페이지 (한국어 UI)
- **LoginPage**: 로그인 페이지
- **SignupPage**: 회원가입 페이지
- **DashboardPage**: 메인 대시보드
- **DashboardLayout**: 대시보드 레이아웃 (사이드바 포함)
- **Sidebar**: 네비게이션 사이드바

## 데이터베이스 스키마 (예정)
- `organizations`: 조직 정보
- `organization_members`: 조직 멤버 관계
- `categories`: 3단계 계층 분류 체계
- `payment_methods`: 결제수단
- `transactions`: 거래 내역

## 라우팅 구조
- `/` - 랜딩 페이지
- `/login` - 로그인
- `/signup` - 회원가입
- `/dashboard` - 대시보드
- `/transactions` - 거래 관리 (예정)
- `/analytics` - 통계 분석 (예정)
- `/organization` - 조직 관리 (예정)
- `/settings` - 설정 (예정)