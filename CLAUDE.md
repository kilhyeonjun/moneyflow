# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
pnpm dev              # Start development server with Turbo mode
pnpm build            # Build for production
pnpm start            # Start production server
```

### Code Quality
```bash
pnpm check-all        # Run all checks (type-check + lint + format:check)
pnpm type-check       # TypeScript type checking
pnpm lint             # ESLint checking
pnpm lint:fix         # ESLint with auto-fix
pnpm format           # Format code with Prettier
pnpm format:check     # Check formatting without changes
```

### Database Operations
```bash
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database (for development)
pnpm db:pull          # Pull schema from database
pnpm db:migrate       # Run database migrations (development)
pnpm db:migrate:deploy # Deploy migrations (production)
pnpm db:migrate:status # Check migration status
pnpm db:migrate:reset # Reset database and run all migrations
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Seed database with initial data
```

### UUID v7 Management
```bash
pnpm migrate:uuid-v7  # Migrate existing data to UUID v7
pnpm uuid:generate    # Generate a UUID v7 for testing
pnpm uuid:test        # Test UUID v7 generation with timestamp
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router and React 19
- **Database**: PostgreSQL via Supabase with Prisma ORM
- **Authentication**: Supabase Auth (hybrid approach with Prisma for data operations)
- **UI**: HeroUI components with Tailwind CSS
- **State Management**: TanStack Query for server state, TanStack Form for form state
- **Charts**: Recharts for data visualization

### Key Architectural Patterns

#### Multi-Tenant Organization System
The application uses a multi-tenant architecture where:
- Every data model (except `organizations`) has an `organization_id` foreign key
- Organization-based access control is enforced through API routes and Prisma queries
- Organization membership is managed through `organization_members` table
- Invitation system uses token-based links with 7-day expiration

#### Authentication Flow (Hybrid Architecture)
1. **Server-side protection**: `middleware.ts` intercepts requests and validates Supabase sessions
2. **Client-side verification**: Dashboard layout performs additional auth checks
3. **Protected routes**: `/dashboard`, `/analytics`, `/transactions`, `/assets`, `/settings`
4. **Auto-redirect**: Unauthenticated users → `/login`, Authenticated users on auth pages → `/dashboard`
5. **API route protection**: All API routes verify Supabase Auth tokens before processing Prisma operations

#### Database Schema Design
- **UUID v7 identifiers**: Time-ordered UUIDs for better performance and debugging
- **Hierarchical categories**: Self-referencing `categories` table with `parent_id`
- **Transaction system**: Core `transactions` table linked to categories, payment methods, and organizations
- **Asset management**: Separate `assets` and `debts` tables with category classification
- **Organization-based access control**: Enforced through API routes and Prisma queries with organization membership validation

### Critical File Structure

#### Route Groups
- `app/(auth)/` - Public authentication pages (login, signup)
- `app/(dashboard)/` - Protected application pages with shared layout
- `app/api/` - API routes for data operations

#### Key Components
- `middleware.ts` - Server-side authentication and route protection
- `app/(dashboard)/layout.tsx` - Client-side auth verification and sidebar layout
- `components/sidebar.tsx` - Main navigation component
- `lib/supabase.ts` and `lib/supabase-server.ts` - Supabase client configurations
- `lib/prisma.ts` - Prisma client setup

#### Data Layer
- `prisma/schema.prisma` - Complete database schema with RLS annotations
- `lib/initial-data.ts` - Default categories and seed data structure
- API routes follow REST conventions with Supabase integration

### Environment Configuration

#### Local Development
- Use `.env.local` with Supabase project credentials
- Database URL points to Supabase PostgreSQL instance
- Development features enabled (debug mode, etc.)

#### Production
- `.env.production` configured for Vercel deployment
- PWA enabled, debug mode disabled
- Proper CORS and security headers

### Authentication & Security
- **Supabase Auth**: Email/password authentication with session management
- **API Route Protection**: All database operations protected by Supabase Auth token verification
- **Middleware Protection**: Server-side route protection before page rendering
- **Client Verification**: Additional auth checks in protected layouts
- **Organization Isolation**: All user data scoped to organization membership via Prisma queries

### Data Flow Patterns
1. **Server Actions**: Use Next.js Server Actions for form submissions and data mutations with Supabase Auth for authorization
2. **API Routes**: Use Prisma for database operations with Supabase Auth for authorization (legacy endpoints)
3. **Client Components**: Use Server Actions for mutations, fetch API for queries with Supabase Auth tokens
4. **Form Handling**: TanStack Form with Server Actions for submission, or native form actions
5. **Server State**: TanStack Query for caching and synchronization
6. **Optimistic Updates**: Immediate UI updates with server reconciliation

### Server Actions Implementation

#### Core Principles
- **Server-first**: All data mutations happen on the server with proper authentication
- **Progressive Enhancement**: Forms work without JavaScript, enhanced with client-side features
- **Type Safety**: Full TypeScript support with automatic type inference
- **Error Handling**: Structured error responses with validation feedback

#### Authentication Pattern
```typescript
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function myServerAction(formData: FormData) {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }
  
  // Your server action logic here
}
```

#### Organization-Scoped Actions
```typescript
export async function createTransaction(formData: FormData) {
  // 1. Authenticate user
  const user = await authenticateUser()
  
  // 2. Get user's organization
  const orgId = await getUserOrganization(user.id)
  
  // 3. Perform database operation with organization scope
  const result = await prisma.transactions.create({
    data: {
      ...transactionData,
      organization_id: orgId
    }
  })
  
  // 4. Revalidate and redirect
  revalidatePath('/dashboard/transactions')
}
```

#### Common Patterns
- **Form Actions**: Direct form submission with `action` prop
- **Button Actions**: Programmatic calls with `useTransition` hook
- **Validation**: Zod schemas for input validation
- **Error Handling**: Return objects with success/error states
- **Revalidation**: Use `revalidatePath()` or `revalidateTag()` for cache invalidation

#### File Locations
- `actions/` - Directory containing all server actions organized by domain
- Server Actions are co-located with components when appropriate
- Shared actions in `lib/actions.ts` for common operations

### Error Handling Convention

#### Client-Side Error Handling
- **Throw Pattern**: All Server Action calls use `handleServerActionResult()` utility and throw errors
- **Error Boundary**: Global Error Boundary catches and handles all errors
- **useErrorHandler Hook**: For async functions that need UNAUTHORIZED redirect handling
- **UNAUTHORIZED**: Automatically redirects to `/login` via Error Boundary or useErrorHandler

#### Error Handling Utilities
```typescript
// Import in client components
import { handleServerActionResult, useErrorHandler } from '@/components/error/ErrorBoundary'

// For direct Server Action results (synchronous)
const data = handleServerActionResult(serverActionResult) // Throws on error

// For async error handling with automatic UNAUTHORIZED redirect
const { handleError } = useErrorHandler()

// Usage in async functions
try {
  const result = await serverAction()
  const data = handleServerActionResult(result)
  // handle success
} catch (error) {
  const errorMessage = handleError(error, 'functionName')
  if (errorMessage) {
    toast.error(errorMessage) // Only shows if not UNAUTHORIZED
  }
}
```

#### Server Action Results
- **Success**: `{ success: true, data: T }`
- **Error**: `{ success: false, error: string, message?: string }`
- **UNAUTHORIZED**: Triggers automatic redirect to login
- **FORBIDDEN**: Can be handled specifically in components if needed

#### Implementation Patterns

**For useEffect and async functions:**
```typescript
// ✅ Recommended pattern with useErrorHandler
const { handleError } = useErrorHandler()

const loadData = async () => {
  try {
    const result = await serverAction()
    const data = handleServerActionResult(result)
    setData(data)
  } catch (error) {
    const errorMessage = handleError(error, 'loadData')
    if (errorMessage) {
      toast.error(errorMessage)
    }
  }
}
```

**For direct Server Action calls:**
```typescript
// ✅ Simple pattern - Error Boundary handles all cases
const data = handleServerActionResult(await serverAction())
```

**❌ Old pattern - avoid:**
```typescript
try {
  const result = await serverAction()
  if (!result.success) {
    toast.error(result.error)
    return
  }
  // handle success
} catch (error) {
  toast.error('Error occurred')
}
```

## Form Validation & UI Convention

### Core Principles
- **Client-side Validation**: 실시간 사용자 피드백을 위한 클라이언트 사이드 validation
- **Server-side Security**: 보안을 위한 서버 사이드 validation은 필수
- **UI Consistency**: 모든 form에서 일관된 에러 표시 및 필수값 표시

### Required Field Standards
- 모든 필수 필드는 `isRequired` prop 사용
- 필수 필드 라벨에 빨간색 `*` 표시
- HeroUI의 `isInvalid` 및 `errorMessage` props 활용

### TanStack Form Integration
- 복잡한 form은 TanStack Form 사용 권장
- 실시간 validation 및 에러 핸들링
- Server Actions과의 seamless integration

### Component Standards
```typescript
// 기본 ValidatedInput 사용 패턴
<ValidatedInput
  label="필드명"
  value={value}
  onValueChange={setValue}
  isRequired={true}
  validation={(value) => !value ? '필수 입력 항목입니다' : null}
  error={errors.fieldName}
/>
```

### Error Display Patterns
- Field-level: `isInvalid` + `errorMessage` props
- Form-level: validation summary toast 또는 alert
- Server errors: Error Boundary를 통한 글로벌 핸들링

### Validation Schema Structure
- `lib/validation/schemas.ts`에서 재사용 가능한 validation 규칙 정의
- TypeScript 타입 안전성 보장
- 서버와 클라이언트 공통 validation 로직

### Accessibility Requirements
- `aria-invalid` 속성 자동 적용
- `aria-describedby`로 에러 메시지 연결
- Screen reader 친화적 에러 메시지

### Testing & Development Notes
- Test account: `admin@moneyflow.com` / `admin123`
- UUID v7 provides chronological ordering and improved database performance
- Hot reload may require server restart after folder structure changes
- Prisma generates types automatically - run `pnpm db:generate` after schema changes