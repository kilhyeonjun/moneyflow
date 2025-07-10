# 작업 완료 후 체크리스트

## 코드 품질 검사
작업 완료 후 반드시 다음 명령어들을 실행하여 코드 품질을 확인해야 합니다:

### 1. 전체 검사 실행
```bash
pnpm check-all
```
이 명령어는 다음을 포함합니다:
- TypeScript 타입 검사
- ESLint 검사
- Prettier 포맷 검사

### 2. 개별 검사 (필요시)
```bash
pnpm type-check    # TypeScript 타입 검사
pnpm lint          # ESLint 검사
pnpm format:check  # Prettier 포맷 검사
```

### 3. 자동 수정
```bash
pnpm lint:fix      # ESLint 자동 수정
pnpm format        # Prettier 자동 포맷팅
```

## Git 커밋 전 확인사항
1. **Lint-staged**: 커밋 시 자동으로 실행됨 (Husky 설정)
2. **Pre-commit 훅**: 자동으로 린팅 및 포맷팅 실행
3. **커밋 메시지**: 명확하고 설명적인 메시지 작성

## 테스트 (향후 추가 예정)
현재는 테스트가 설정되지 않았지만, 향후 다음이 추가될 예정:
- Unit Tests
- Integration Tests
- E2E Tests

## 빌드 확인
```bash
pnpm build         # 프로덕션 빌드 테스트
```

## 환경 변수 확인
- `.env.local` 파일이 올바르게 설정되었는지 확인
- Supabase 연결 정보가 정확한지 확인