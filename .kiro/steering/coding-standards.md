---
inclusion: always
---

# MoneyFlow 코딩 표준

## 핵심 아키텍처 규칙

### TypeScript 필수 사항
- **엄격 모드**: `any` 타입 절대 금지, 모든 타입 명시적 정의
- **타입 정의**: Props, 서버 액션 반환값, API 응답 모두 타입 정의
- **Zod 스키마**: 모든 입력 검증에 Zod 사용

```typescript
// ✅ 필수 패턴
type ComponentProps = {
  id: string;
  onAction?: (data: FormData) => Promise<void>;
}

const schema = z.object({
  amount: z.number().positive(),
  organizationId: z.string().uuid()
});
```

### Next.js App Router 규칙
- **서버 컴포넌트 기본**: 상태나 이벤트 핸들러 없으면 서버 컴포넌트
- **클라이언트 컴포넌트**: `'use client'` 최상단, 상호작용 필요시만
- **서버 액션**: `lib/server-actions/` 위치, `'use server'` 필수
- **파일 구조**: `app/` 라우팅, `components/` 재사용, `lib/` 유틸리티

## 데이터 처리 필수 규칙

### 식별자 및 보안
- **UUID v7**: 모든 엔티티 ID는 `import { v7 as uuidv7 } from 'uuid'` 사용
- **Organization 격리**: 모든 쿼리에 `organizationId` 필터 필수
- **RLS 정책**: 데이터베이스 레벨 보안 + 서버 액션 권한 검증

### Prisma 쿼리 패턴
```typescript
// ✅ 필수: organizationId 필터링
const data = await prisma.transaction.findMany({
  where: { organizationId: user.organizationId },
  include: { category: true },
  orderBy: { createdAt: 'desc' },
  take: 20 // 페이지네이션 필수
});
```

## 서버 액션 필수 템플릿

### 표준 구조 (모든 서버 액션 필수)
```typescript
'use server'

import { revalidatePath } from 'next/cache';
import { createServerComponentClient } from '@supabase/ssr';
import { z } from 'zod';

// 표준 응답 타입
type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
}

export async function actionName(formData: FormData): Promise<ActionResult<DataType>> {
  try {
    // 1. 인증 검증 (필수)
    const supabase = createServerComponentClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '인증이 필요합니다' };

    // 2. 입력 검증 (필수)
    const schema = z.object({
      // 스키마 정의
    });
    const data = schema.parse(Object.fromEntries(formData));

    // 3. 권한 검증 (organizationId 확인)
    // 4. 비즈니스 로직 실행
    // 5. 캐시 무효화
    revalidatePath('/relevant-path');
    
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## 폼 처리 표준 패턴

### 서버 액션 + useFormStatus 조합
```typescript
import { useFormStatus } from 'react-dom';

// ✅ 표준 폼 구조
function FormComponent({ action }: { action: (formData: FormData) => Promise<ActionResult> }) {
  return (
    <form action={action}>
      <Input name="amount" type="number" required />
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? '처리중...' : '저장'}
    </Button>
  );
}
```

### TanStack Query 상태 관리
```typescript
// ✅ 서버 상태 캐싱 패턴
function useEntityData(organizationId: string) {
  return useQuery({
    queryKey: ['entity', organizationId],
    queryFn: () => getEntityData(organizationId),
    staleTime: 5 * 60 * 1000
  });
}
```

## UI 컴포넌트 규칙

### HeroUI 활용
```typescript
import { Card, Button, Input } from '@heroui/react';

// ✅ HeroUI 컴포넌트 우선 사용
<Card className="p-6">
  <Input 
    label="금액" 
    type="number"
    variant="bordered"
    classNames={{
      input: "text-right",
      inputWrapper: "border-default-200"
    }}
  />
</Card>
```

### 스타일링 우선순위
1. **HeroUI 컴포넌트**: 기본 UI 요소
2. **Tailwind 유틸리티**: 레이아웃 및 간단한 스타일
3. **CSS 모듈**: 복잡한 커스텀 스타일 (최소화)

## 상태 관리 패턴

### TanStack Query 서버 상태
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useTransactions(organizationId: string) {
  return useQuery({
    queryKey: ['transactions', organizationId],
    queryFn: () => getTransactions(organizationId),
    staleTime: 5 * 60 * 1000, // 5분
  });
}

function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });
}
```

## 보안 체크리스트

### 입력 검증
- ✅ Zod 스키마로 모든 입력 검증
- ✅ 서버 액션에서 재검증 필수
- ✅ 금액은 양수만 허용
- ✅ UUID 형식 검증

### 인증/권한
- ✅ 서버 액션마다 사용자 인증 확인
- ✅ organization_id 기반 데이터 접근 제한
- ✅ RLS 정책으로 데이터베이스 레벨 보안

## 성능 최적화 체크리스트

### React 최적화
- ✅ `React.memo()` 적절한 사용
- ✅ `useMemo()` 비용이 큰 계산에만 사용
- ✅ `useCallback()` 자식 컴포넌트 props로 전달되는 함수에 사용

### 데이터베이스 최적화
- ✅ 필요한 필드만 select
- ✅ include로 관련 데이터 한 번에 조회
- ✅ 페이지네이션 적용 (기본 20개)

### 번들 최적화
- ✅ 동적 import로 코드 분할
- ✅ Next.js Image 컴포넌트 사용
- ✅ 불필요한 의존성 제거