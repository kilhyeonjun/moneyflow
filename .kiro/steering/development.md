---
inclusion: fileMatch
fileMatchPattern: "*.{ts,tsx,js,jsx}"
---

# MoneyFlow Development Guidelines

## Code Organization Principles

### File Structure Standards
- Use kebab-case for file and folder names
- Group related components in feature-based folders
- Keep server actions in dedicated `actions/` directories
- Place types in `types/` with clear naming conventions

### Component Architecture
- Prefer server components by default, use client components only when needed
- Extract reusable logic into custom hooks
- Use composition over inheritance for component design
- Keep components focused on single responsibilities

### Database & API Patterns
- Always use UUID v7 for new entities (better performance, time-sortable)
- Implement Row Level Security (RLS) for all user data
- Use Prisma for type-safe database operations
- Leverage Supabase real-time features for collaborative features

### State Management
- Use TanStack Query for server state management
- Keep client state minimal and local when possible
- Use TanStack Form for complex form handling with validation
- Implement optimistic updates for better UX

## Security Best Practices

### Authentication & Authorization
- Always verify user authentication in server actions
- Implement organization-level access control
- Use Supabase RLS policies for data isolation
- Validate user permissions before data operations

### Data Validation
- Use Zod schemas for all data validation
- Validate both client and server-side inputs
- Sanitize user inputs before database operations
- Implement proper error handling and user feedback

## Performance Guidelines

### Optimization Strategies
- Use Next.js Image component for all images
- Implement proper loading states and skeleton screens
- Leverage React Suspense for data fetching
- Use dynamic imports for code splitting

### Database Performance
- Design efficient database queries with proper indexing
- Use Prisma's include/select to fetch only needed data
- Implement pagination for large data sets
- Cache frequently accessed data with TanStack Query

## Testing Standards

### Component Testing
- Write tests for critical user flows
- Test error states and edge cases
- Mock external dependencies properly
- Use meaningful test descriptions

### Integration Testing
- Test database operations with proper setup/teardown
- Verify authentication flows work correctly
- Test real-time synchronization features
- Validate form submissions and data persistence