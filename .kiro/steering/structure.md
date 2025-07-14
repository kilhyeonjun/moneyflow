---
inclusion: fileMatch
fileMatchPattern: "{app/**/*,components/**/*,lib/**/*,types/**/*}"
---

# MoneyFlow Project Structure

## Directory Organization

### App Router Structure
```
app/
├── (auth)/          # Authentication routes group
├── (dashboard)/     # Main dashboard routes group
├── api/            # API routes and server actions
├── globals.css     # Global styles
└── layout.tsx      # Root layout component
```

### Component Organization
```
components/
├── ui/             # Reusable UI components (HeroUI based)
├── forms/          # Form components with TanStack Form
├── charts/         # Financial chart components (Recharts)
├── layout/         # Layout-specific components
└── features/       # Feature-specific components
```

### Library Structure
```
lib/
├── auth/           # Authentication utilities
├── database/       # Database connection and utilities
├── validations/    # Zod schemas for validation
├── utils/          # General utility functions
└── constants/      # Application constants
```

### Type Definitions
```
types/
├── database.ts     # Database types (Prisma generated)
├── api.ts          # API response types
├── forms.ts        # Form validation types
└── components.ts   # Component prop types
```

## File Naming Conventions

- **Components**: PascalCase (`TransactionForm.tsx`)
- **Pages**: kebab-case (`transaction-history/page.tsx`)
- **Utilities**: camelCase (`formatCurrency.ts`)
- **Types**: PascalCase with descriptive suffixes (`TransactionFormData`)
- **Constants**: UPPER_SNAKE_CASE (`TRANSACTION_TYPES`)

## Import Organization

```typescript
// 1. React and Next.js imports
import React from 'react'
import { NextRequest } from 'next/server'

// 2. Third-party libraries
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

// 3. Internal utilities and types
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types/database'

// 4. Components (UI first, then feature components)
import { Button, Card } from '@heroui/react'
import { TransactionForm } from '@/components/forms'
```

#[[file:tsconfig.json]]