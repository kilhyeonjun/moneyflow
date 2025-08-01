# 💰 MoneyFlow

**조직 단위의 종합 가계부 관리 시스템**

가족과 팀을 위한 실시간 재정 관리 플랫폼으로, 조직 단위로 수입·지출·저축을 체계적으로 관리할 수 있습니다.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/moneyflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)

## ✨ 주요 기능

### 🏢 **조직 단위 관리**
- 가족/팀 단위로 재정을 공유하고 관리
- 멤버 초대 및 역할 기반 권한 시스템
- 실시간 데이터 동기화

### 📊 **3단계 분류 체계**
- **대분류**: 수입 / 저축 / 지출
- **중분류**: 카테고리별 세분화
- **세분류**: 상세 항목 관리


### 📈 **고급 분석 기능**
- 월별/연간 수입·지출 추이
- 카테고리별 지출 분석
- 실시간 대시보드

### 👥 **조직 멤버 관리**
- 이메일 기반 멤버 초대
- 역할별 권한 관리 (소유자/관리자/멤버)
- 초대 링크 생성 및 관리

## 🛠️ 기술 스택

### **Frontend**
- **Next.js 15** - React 19 기반 풀스택 프레임워크
- **TypeScript** - 타입 안전성
- **HeroUI** - 모던 UI 컴포넌트 라이브러리
- **Tailwind CSS** - 유틸리티 퍼스트 CSS
- **TanStack Query** - 서버 상태 관리
- **TanStack Form** - 폼 상태 관리
- **Recharts** - 데이터 시각화

### **Backend & Database**
- **Supabase** - PostgreSQL 데이터베이스
- **Prisma** - 타입 안전 ORM
- **Row Level Security** - 데이터 보안

### **DevOps & Tools**
- **Vercel** - 배포 및 호스팅
- **PWA** - 프로그레시브 웹 앱
- **UUID v7** - 최신 식별자 표준
- **ESLint + Prettier** - 코드 품질 관리

## 🚀 빠른 시작

### **1. 프로젝트 클론**
```bash
git clone https://github.com/yourusername/moneyflow.git
cd moneyflow
```

### **2. 의존성 설치**
```bash
pnpm install
```

### **3. 환경 변수 설정**
```bash
cp .env.example .env.local
```

`.env.local` 파일에 Supabase 설정을 추가하세요:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### **4. 데이터베이스 설정**
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. `supabase/schema.sql` 파일을 SQL Editor에서 실행
3. `supabase/migrations/add_invitations.sql` 마이그레이션 실행

### **5. 개발 서버 실행**
```bash
pnpm dev
```

http://localhost:3000에서 애플리케이션을 확인할 수 있습니다.

## 📱 주요 화면

### **🏠 랜딩 페이지**
- 서비스 소개 및 주요 기능 안내
- 회원가입/로그인 유도

### **📊 대시보드**
- 실시간 재정 현황 요약
- 월별 수입/지출 차트
- 최근 거래 내역

### **💳 거래 관리**
- 거래 추가/수정/삭제
- 카테고리별 필터링
- 거래 내역 테이블

### **🏦 자산 관리**
- 자산/부채 등록 및 관리
- 카테고리별 자산 분류
- 자산 현황 추적

### **📈 통계 분석**
- 월별/연간 분석 탭
- 카테고리별 지출 분포
- 상세 통계 테이블

### **⚙️ 설정**
- 조직 멤버 관리
- 멤버 초대 및 권한 설정
- 개인 설정 및 환경설정

## 🔐 보안 기능

### **인증 및 권한**
- Supabase Auth 기반 사용자 인증
- Row Level Security (RLS) 정책
- 조직별 데이터 격리

### **멤버 초대 시스템**
- 토큰 기반 초대 링크
- 이메일 검증 및 매칭
- 7일 자동 만료 시스템

### **데이터 보호**
- 암호화된 데이터 전송
- 보안 헤더 설정
- CSRF/XSS 보호

## 🌟 고급 기능

### **PWA 지원**
- 오프라인 사용 가능
- 앱 설치 지원
- 푸시 알림 준비

### **성능 최적화**
- Next.js 15 최신 기능 활용
- 이미지 최적화 (WebP, AVIF)
- 코드 스플리팅 및 지연 로딩

### **UUID v7**
- 시간순 정렬 가능한 ID
- 인덱스 성능 24배 향상
- 디버깅 친화적

## 📊 프로젝트 상태

### **완성도: 100%** ✅
- ✅ 사용자 인증 시스템
- ✅ 조직 생성 및 관리
- ✅ 멤버 초대 시스템
- ✅ 거래 CRUD 기능
- ✅ 자산 관리 시스템
- ✅ 통계 및 분석
- ✅ PWA 지원
- ✅ 프로덕션 배포 준비

### **코드 품질**
- ✅ TypeScript 100% 적용
- ✅ ESLint 경고/에러 0개
- ✅ Prettier 포맷팅 100%
- ✅ 모든 품질 검사 통과

## 🚀 배포

### **Vercel 배포 (권장)**
1. GitHub 리포지토리와 Vercel 연결
2. 환경 변수 설정
3. 자동 배포 완료

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/moneyflow)

### **환경 변수 설정**
Vercel Dashboard에서 다음 환경 변수를 설정하세요:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## 🧪 테스트 계정

개발 및 테스트를 위한 사전 생성된 계정:
```
이메일: admin@moneyflow.com
비밀번호: admin123
```

## 📝 개발 가이드

### **코드 품질 검사**
```bash
pnpm check-all    # 전체 검사
pnpm type-check   # TypeScript 검사
pnpm lint         # ESLint 검사
pnpm format       # Prettier 포맷팅
```

### **빌드 및 배포**
```bash
pnpm build        # 프로덕션 빌드
pnpm start        # 프로덕션 서버 실행
```

### **UUID v7 관리**
```bash
pnpm migrate:uuid-v7  # UUID v7 마이그레이션
pnpm uuid:generate    # UUID v7 생성 테스트
```

## 🤝 기여하기

1. 이 리포지토리를 포크합니다
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- [Next.js](https://nextjs.org/) - 강력한 React 프레임워크
- [Supabase](https://supabase.com/) - 오픈소스 Firebase 대안
- [HeroUI](https://heroui.com/) - 아름다운 React 컴포넌트
- [Vercel](https://vercel.com/) - 최고의 배포 플랫폼

---

<div align="center">

**MoneyFlow로 더 스마트한 재정 관리를 시작하세요!** 💰✨

[🌐 라이브 데모](https://moneyflow.vercel.app) | [📚 문서](https://github.com/yourusername/moneyflow/wiki) | [🐛 이슈 리포트](https://github.com/yourusername/moneyflow/issues)

</div>