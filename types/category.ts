import type { Category } from '@prisma/client'

// 계층형 카테고리를 위한 확장된 타입
export interface HierarchicalCategory extends Category {
  children?: HierarchicalCategory[]
  isExpanded?: boolean
}

// 카테고리 선택 컴포넌트의 props 타입
export interface HierarchicalCategorySelectProps {
  categories: Category[]
  selectedCategoryId?: string
  onSelectionChange: (categoryId: string) => void
  transactionType?: string
  label?: string
  placeholder?: string
  isRequired?: boolean
  isDisabled?: boolean
  className?: string
}

// 카테고리 표시 옵션
export interface CategoryDisplayOptions {
  showIcons?: boolean
  showHierarchySymbols?: boolean
  indentSize?: number
  expandable?: boolean
  showPath?: boolean
}

// 카테고리 트리 구조 변환을 위한 유틸리티 타입
export interface CategoryTreeNode {
  id: string
  name: string
  icon?: string
  level: number
  parentId?: string
  transactionType: string
  children: CategoryTreeNode[]
  isExpanded: boolean
  path: string[] // 루트부터 현재까지의 경로
}

// 카테고리 필터링 옵션
export interface CategoryFilterOptions {
  transactionType?: string
  level?: number
  parentId?: string
  searchTerm?: string
}
