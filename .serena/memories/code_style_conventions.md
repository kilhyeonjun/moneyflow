# 코드 스타일 및 컨벤션

## TypeScript 설정
- **Strict Mode**: 활성화
- **타입 힌트**: 모든 함수와 변수에 명시적 타입 지정 권장
- **Interface vs Type**: Interface 우선 사용

## ESLint 규칙
- `@typescript-eslint/no-unused-vars`: error
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/prefer-const`: error
- `react-hooks/exhaustive-deps`: warn
- `react/jsx-key`: error
- `no-console`: warn
- `prefer-const`: error
- `no-var`: error

## Prettier 설정
- **세미콜론**: 사용하지 않음 (`"semi": false`)
- **따옴표**: 싱글 쿼트 (`"singleQuote": true`)
- **줄 길이**: 80자 (`"printWidth": 80`)
- **탭 크기**: 2칸 (`"tabWidth": 2`)
- **탭 사용**: 스페이스 사용 (`"useTabs": false`)
- **트레일링 콤마**: ES5 스타일 (`"trailingComma": "es5"`)

## 네이밍 컨벤션
- **컴포넌트**: PascalCase (예: `HomePage`, `DashboardLayout`)
- **함수**: camelCase (예: `handleSubmit`, `createClient`)
- **상수**: UPPER_SNAKE_CASE (예: `API_URL`)
- **파일명**: kebab-case 또는 camelCase

## 컴포넌트 구조
- **함수형 컴포넌트**: 기본 사용
- **Export**: default export 사용
- **Props 타입**: interface로 정의

## 디렉토리 구조
```
app/              # Next.js App Router
├── (auth)/       # 인증 관련 페이지
├── (dashboard)/  # 대시보드 관련 페이지
components/       # 재사용 가능한 컴포넌트
lib/             # 유틸리티 및 설정
types/           # TypeScript 타입 정의
```