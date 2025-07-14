---
inclusion: fileMatch
fileMatchPattern: "{app/api/**/*,actions/**/*,lib/**/*,prisma/**/*}"
---

# MoneyFlow API & Data Patterns

#[[file:prisma/schema.prisma]]

## Server Actions Design

### Action Structure
- Use descriptive action names that clearly indicate their purpose
- Group related actions in feature-specific files
- Always return consistent response objects with success/error states
- Implement proper error handling with user-friendly messages

### Authentication & Authorization
```typescript
// Always verify user and organization access
const user = await getCurrentUser();
if (!user) throw new Error('Unauthorized');

const hasAccess = await verifyOrganizationAccess(user.id, organizationId);
if (!hasAccess) throw new Error('Insufficient permissions');
```

### Data Validation Pattern
```typescript
// Use Zod schemas for all input validation
const schema = z.object({
  amount: z.number().positive(),
  categoryId: z.string().uuid(),
  organizationId: z.string().uuid()
});

const validatedData = schema.parse(formData);
```

## Database Patterns

### Entity Relationships
- All user data must be associated with an organization
- Use UUID v7 for all primary keys for better performance
- Implement soft deletes for financial records (audit trail)
- Use proper foreign key constraints and cascading rules

### Row Level Security (RLS)
```sql
-- Example RLS policy for transactions
CREATE POLICY "Users can only access their organization's transactions"
ON transactions FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  )
);
```

### Audit Trail Pattern
- Track all financial data changes with created_at/updated_at
- Store user_id for all modifications
- Implement version history for critical financial records
- Use database triggers for automatic audit logging

## Financial Data Modeling

### Transaction Structure
```typescript
interface Transaction {
  id: string; // UUID v7
  organizationId: string;
  amount: number; // Store in smallest currency unit (cents)
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  categoryId: string;
  subcategoryId?: string;
  description: string;
  date: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Category Hierarchy
```typescript
interface Category {
  id: string;
  organizationId: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'SAVINGS';
  color: string;
  icon?: string;
  parentId?: string; // For subcategories
  isActive: boolean;
}
```

### Organization & Member Management
```typescript
interface Organization {
  id: string;
  name: string;
  currency: string; // ISO 4217 currency code
  timezone: string;
  settings: OrganizationSettings;
  createdAt: Date;
}

interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  permissions: string[];
  joinedAt: Date;
}
```

## Real-time Synchronization

### Supabase Realtime Setup
- Subscribe to organization-specific channels only
- Filter real-time events by user permissions
- Implement proper cleanup for subscriptions
- Handle connection states and reconnection logic

### Optimistic Updates Pattern
```typescript
// Update UI immediately, rollback on error
const optimisticUpdate = {
  ...transaction,
  id: generateTempId(),
  status: 'pending'
};

// Update local state
updateTransactionList(optimisticUpdate);

try {
  const result = await createTransaction(data);
  // Replace optimistic update with real data
  replaceTransaction(optimisticUpdate.id, result);
} catch (error) {
  // Rollback optimistic update
  removeTransaction(optimisticUpdate.id);
  showError(error.message);
}
```

## Error Handling Standards

### Client-Side Error Handling
- Use React Error Boundaries for component-level errors
- Implement global error handling for unhandled promises
- Show user-friendly error messages with recovery options
- Log errors for debugging while protecting user privacy

### Server-Side Error Handling
- Return structured error responses with error codes
- Log detailed errors server-side for debugging
- Never expose sensitive information in error messages
- Implement proper HTTP status codes for different error types