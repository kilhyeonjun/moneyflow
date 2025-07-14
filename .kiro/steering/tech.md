---
inclusion: always
---

# MoneyFlow Tech Stack

#[[file:package.json]]
#[[file:next.config.js]]
#[[file:tailwind.config.js]]

## Framework & Runtime
- **Next.js 15** with App Router - Full-stack React framework with latest features
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type safety throughout the application
- **Node.js** - Server runtime

## Frontend Stack
- **HeroUI** - Modern React component library for consistent UI
- **Tailwind CSS** - Utility-first CSS framework for styling
- **Framer Motion** - Animation library for smooth interactions
- **Lucide React** - Icon library for consistent iconography

## State Management & Data Fetching
- **TanStack Query (React Query)** - Server state management and caching
- **TanStack Form** - Form state management with validation
- **TanStack Table** - Advanced table functionality
- **Zod** - Schema validation for type-safe data handling

## Backend & Database
- **Supabase** - PostgreSQL database with real-time features
- **Prisma** - Type-safe ORM for database operations
- **Supabase Auth** - Authentication system with social login support
- **Row Level Security (RLS)** - Database-level security policies

## Data Visualization & UI
- **Recharts** - Chart library for financial analytics
- **React Hot Toast** - Toast notifications
- **date-fns** - Date manipulation and formatting

## Development Tools
- **ESLint** - Code linting with TypeScript support
- **Prettier** - Code formatting
- **Husky** - Git hooks for code quality
- **lint-staged** - Run linters on staged files

## Build & Deployment
- **Turbopack** - Fast bundler (Next.js built-in)
- **Vercel** - Deployment platform with analytics
- **pnpm** - Fast, disk space efficient package manager

## PWA & Performance
- **next-pwa** - Progressive Web App capabilities
- **Vercel Analytics** - Performance monitoring
- **Speed Insights** - Core Web Vitals tracking

## Common Commands

### Development
```bash
pnpm dev          # Start development server with Turbopack
pnpm build        # Build for production
pnpm start        # Start production server
pnpm type-check   # TypeScript type checking
```

### Code Quality
```bash
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix ESLint issues
pnpm format       # Format code with Prettier
pnpm format:check # Check formatting
pnpm check-all    # Run all quality checks
```

### Database
```bash
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
pnpm db:migrate   # Run database migrations
pnpm db:studio    # Open Prisma Studio
pnpm db:seed      # Seed database with initial data
```

### UUID v7 Management
```bash
pnpm migrate:uuid-v7  # Migrate to UUID v7
pnpm uuid:generate    # Generate UUID v7 for testing
pnpm uuid:test        # Test UUID v7 functionality
```

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_APP_URL` - Application URL for production

## Key Technical Decisions
- **UUID v7** for database IDs (time-sortable, 24x better index performance)
- **App Router** for modern Next.js routing and server components
- **Server Actions** for type-safe server-side operations
- **Row Level Security** for multi-tenant data isolation
- **PWA** for mobile-first experience with offline capabilities