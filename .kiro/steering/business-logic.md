---
inclusion: manual
---

# MoneyFlow Business Logic & Conventions

#[[file:package.json]]

## Financial Data Standards

### Currency Handling
- Store all monetary values in smallest currency unit (cents for USD)
- Use consistent currency formatting throughout the application
- Support multiple currencies per organization with proper conversion
- Display amounts with proper locale-specific formatting

### Transaction Classification
```typescript
// 3-tier classification system
enum TransactionType {
  INCOME = 'INCOME',     // Money coming in
  EXPENSE = 'EXPENSE',   // Money going out
  SAVINGS = 'SAVINGS',   // Money set aside
  TRANSFER = 'TRANSFER'  // Between accounts/categories
}

// Category hierarchy: Type → Category → Subcategory
interface CategoryHierarchy {
  type: TransactionType;
  category: Category;
  subcategory?: Subcategory;
}
```

### Date & Time Handling
- Use organization's timezone for all date calculations
- Store dates in UTC in the database
- Display dates in user's local timezone
- Support fiscal year calculations based on organization settings

## Organization Management Rules

### Member Permissions
```typescript
enum OrganizationRole {
  OWNER = 'OWNER',       // Full access, can delete organization
  ADMIN = 'ADMIN',       // Manage members, settings, all financial data
  MEMBER = 'MEMBER',     // Add/edit transactions, view reports
  VIEWER = 'VIEWER'      // Read-only access to financial data
}

// Permission matrix
const PERMISSIONS = {
  OWNER: ['*'], // All permissions
  ADMIN: ['manage_members', 'manage_settings', 'manage_categories', 'manage_transactions', 'view_reports'],
  MEMBER: ['manage_transactions', 'view_reports'],
  VIEWER: ['view_reports']
};
```

### Data Isolation
- All financial data must be scoped to organization
- Users can only access organizations they're members of
- Implement proper RLS policies for all financial tables
- Audit all cross-organization data access attempts

## Goal & Target Management

### Asset Growth Tracking
```typescript
interface FinancialGoal {
  id: string;
  organizationId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  category: 'SAVINGS' | 'INVESTMENT' | 'DEBT_REDUCTION';
  isActive: boolean;
  createdBy: string;
}

// Achievement rate calculation
const calculateAchievementRate = (goal: FinancialGoal): number => {
  return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
};
```

### Budget Management
- Support monthly, quarterly, and annual budgets
- Track budget vs actual spending by category
- Provide alerts when approaching budget limits
- Calculate variance and trends for budget analysis

## Real-time Collaboration Features

### Synchronization Rules
- All transaction changes sync immediately across organization members
- Show who made the last change and when
- Implement conflict resolution for simultaneous edits
- Provide activity feed for organization financial changes

### Notification System
```typescript
interface NotificationRule {
  type: 'BUDGET_EXCEEDED' | 'GOAL_ACHIEVED' | 'LARGE_TRANSACTION' | 'MEMBER_JOINED';
  threshold?: number;
  recipients: OrganizationRole[];
  isActive: boolean;
}
```

## Analytics & Reporting Standards

### Key Metrics Calculation
```typescript
// Monthly financial summary
interface MonthlySummary {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  savingsRate: number; // (totalIncome - totalExpenses) / totalIncome
  topCategories: CategorySpending[];
  budgetVariance: BudgetVariance[];
}

// Trend analysis
interface TrendData {
  period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  data: {
    date: Date;
    income: number;
    expenses: number;
    savings: number;
  }[];
}
```

### Report Generation
- Generate reports in organization's timezone
- Support export to CSV/PDF formats
- Include comparative analysis (month-over-month, year-over-year)
- Provide drill-down capabilities from summary to transaction level

## Data Validation & Business Rules

### Transaction Validation
```typescript
const validateTransaction = (transaction: TransactionInput): ValidationResult => {
  const rules = [
    // Amount must be positive
    () => transaction.amount > 0,
    // Date cannot be in the future (configurable)
    () => transaction.date <= new Date(),
    // Category must belong to organization
    () => validateCategoryOwnership(transaction.categoryId, transaction.organizationId),
    // User must have permission to create transactions
    () => validateUserPermission(transaction.createdBy, 'manage_transactions')
  ];
  
  return rules.every(rule => rule());
};
```

### Category Management Rules
- Prevent deletion of categories with existing transactions
- Support category merging with transaction reassignment
- Maintain category hierarchy integrity
- Enforce unique category names within organization

## Security & Compliance

### Financial Data Protection
- Encrypt sensitive financial data at rest
- Implement audit logging for all financial operations
- Support data export for user data portability
- Provide secure data deletion with proper audit trail

### Privacy Controls
- Allow users to control data sharing within organization
- Implement granular privacy settings for different data types
- Support anonymous transaction reporting for sensitive data
- Maintain compliance with financial data protection regulations