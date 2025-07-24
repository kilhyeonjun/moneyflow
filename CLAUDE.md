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
1. **API Routes**: Use Prisma for database operations with Supabase Auth for authorization
2. **Client Components**: Use fetch API to call backend routes, with Supabase Auth tokens for authentication
3. **Form Handling**: TanStack Form for complex forms with validation
4. **Server State**: TanStack Query for caching and synchronization
5. **Optimistic Updates**: Immediate UI updates with server reconciliation

### Testing & Development Notes
- Test account: `admin@moneyflow.com` / `admin123`
- UUID v7 provides chronological ordering and improved database performance
- Hot reload may require server restart after folder structure changes
- Prisma generates types automatically - run `pnpm db:generate` after schema changes