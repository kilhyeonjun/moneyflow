---
inclusion: always
---

# MoneyFlow 도메인 가이드

## 핵심 도메인 모델

### 엔티티 관계
- **Organization**: 멀티테넌트 기본 단위, 모든 데이터의 격리 경계
- **User**: Supabase Auth 연동, organizationId로 소속 조직 식별
- **Transaction**: 핵심 비즈니스 엔티티 (amount, type, categoryId, organizationId 필수)
- **Category**: 3단계 계층 구조 (type → category → subcategory)
- **Asset/PaymentMethod**: 거래와 연결되는 보조 엔티티

### 거래 타입 시스템
```typescript
enum TransactionType {
  INCOME = 'INCOME',     // 수입: 급여, 사업소득, 투자수익
  EXPENSE = 'EXPENSE',   // 지출: 식비, 교통비, 의료비
  SAVINGS = 'SAVINGS'    // 저축: 예금, 적금, 투자
}
```

### 권한 레벨 (organizationId 기반)
- **OWNER**: 조직 생성자, 모든 권한
- **ADMIN**: 멤버 관리 외 모든 권한  
- **MEMBER**: 거래/자산 CRUD 권한
- **VIEWER**: 읽기 전용

## 필수 아키텍처 패턴

### 데이터 격리 (CRITICAL)
```typescript
// 모든 쿼리에 organizationId 필터 필수
const transactions = await prisma.transaction.findMany({
  where: { organizationId: user.organizationId }, // 필수!
  include: { category: true }
});
```

### 식별자 규칙
- **UUID v7**: `import { v7 as uuidv7 } from 'uuid'` - 시간순 정렬 가능
- **필수 필드**: `id`, `organizationId`, `createdAt`, `updatedAt`

### 보안 계층
1. **RLS 정책**: 데이터베이스 레벨 organization_id 필터링
2. **서버 액션**: 인증 + 권한 검증 + organizationId 확인
3. **입력 검증**: Zod 스키마로 모든 입력 검증

## 서버 액션 필수 템플릿

### 표준 응답 타입
```typescript
type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
```

### 필수 구현 패턴
```typescript
'use server'
export async function domainAction(formData: FormData): Promise<ActionResult<T>> {
  try {
    // 1. 인증 검증 (필수)
    const { user } = await getAuthenticatedUser();
    if (!user) return { success: false, error: '인증 필요' };

    // 2. 입력 검증 (필수)
    const data = domainSchema.parse(Object.fromEntries(formData));

    // 3. organizationId 권한 확인 (필수)
    if (data.organizationId !== user.organizationId) {
      return { success: false, error: '권한 없음' };
    }

    // 4. 비즈니스 로직
    const result = await prisma.entity.create({
      data: { ...data, id: uuidv7() }
    });

    // 5. 캐시 무효화 (필수)
    revalidatePath('/relevant-path');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}
```

### 페이지네이션 표준
- 기본: 20개, 최대: 100개
- `take: limit, skip: (page - 1) * limit`

## UI 컨벤션

### 거래 타입별 색상 (HeroUI)
```typescript
const typeColors = {
  INCOME: 'success',   // 초록색 - 수입
  EXPENSE: 'danger',   // 빨간색 - 지출  
  SAVINGS: 'primary'   // 파란색 - 저축
} as const;
```

### 금액 표시 규칙
- 양수: `+₩1,000,000` (수입/저축)
- 음수: `-₩500,000` (지출)
- 천단위 콤마 필수, 원화 기호 사용

### 폼 검증 메시지
- 금액: "0보다 큰 금액을 입력해주세요"
- 카테고리: "카테고리를 선택해주세요"
- 날짜: "유효한 날짜를 선택해주세요"

## 비즈니스 규칙

### 금액 검증
```typescript
const amountSchema = z.number()
  .positive("금액은 0보다 커야 합니다")
  .max(999999999, "금액이 너무 큽니다");
```

### 날짜 제한
- 거래 날짜: 과거~현재만 허용
- 미래 날짜 입력 시 에러 반환

### 카테고리 제약
- 3단계 계층 구조 필수 (type → category → subcategory)
- 사전 정의된 카테고리만 사용 가능
- 조직별 커스텀 카테고리 지원

## 성능 최적화 규칙

### 쿼리 최적화
```typescript
// ✅ 필요한 필드만 select
const transactions = await prisma.transaction.findMany({
  select: { id: true, amount: true, description: true },
  where: { organizationId },
  take: 20
});

// ✅ 관련 데이터 한번에 조회
include: { category: true, paymentMethod: true }
```

### 캐시 전략
- 대시보드 데이터: `revalidateTag('dashboard')`
- 거래 목록: `revalidatePath('/transactions')`
- 카테고리: 정적 데이터로 캐싱

## 에러 처리 표준

### 사용자 친화적 메시지
```typescript
const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다',
  FORBIDDEN: '권한이 없습니다',
  VALIDATION_ERROR: '입력 정보를 확인해주세요',
  DUPLICATE_ERROR: '이미 존재하는 데이터입니다'
} as const;
```