# 개발 명령어 가이드

## 필수 명령어

### 개발 서버
```bash
pnpm dev          # 개발 서버 실행 (Turbopack 사용)
pnpm build        # 프로덕션 빌드
pnpm start        # 프로덕션 서버 실행
```

### 코드 품질 관리
```bash
pnpm lint         # ESLint 검사
pnpm lint:fix     # ESLint 자동 수정
pnpm format       # Prettier 포맷팅
pnpm format:check # Prettier 검사
pnpm type-check   # TypeScript 타입 검사
pnpm check-all    # 모든 검사 실행 (타입체크 + 린트 + 포맷 검사)
```

### 패키지 관리
```bash
pnpm install      # 의존성 설치
pnpm add <pkg>    # 패키지 추가
pnpm remove <pkg> # 패키지 제거
```

### Git 관련
```bash
git status        # 상태 확인
git add .         # 모든 변경사항 스테이징
git commit -m ""  # 커밋 (pre-commit 훅으로 자동 린팅)
```

### 환경 설정
```bash
cp .env.example .env.local  # 환경 변수 파일 생성
```

## 시스템 명령어 (macOS)
```bash
ls -la           # 파일 목록 (상세)
find . -name     # 파일 찾기
grep -r          # 텍스트 검색
cd               # 디렉토리 이동
pwd              # 현재 경로
```