'use client'

import { useState, useMemo } from 'react'
import { Select, SelectItem } from '@heroui/react'
import type { Category } from '@prisma/client'
import type { HierarchicalCategorySelectProps } from '@/types/category'
import { 
  buildCategoryTree, 
  filterCategories, 
  formatCategoryDisplay 
} from '@/lib/category-utils'

export default function HierarchicalCategorySelect({
  categories,
  selectedCategoryId,
  onSelectionChange,
  transactionType,
  label = "카테고리",
  placeholder = "카테고리를 선택하세요",
  isRequired = false,
  isDisabled = false,
  className = ""
}: HierarchicalCategorySelectProps) {
  // 트랜잭션 타입에 따라 카테고리 필터링
  const filteredCategories = useMemo(() => {
    return filterCategories(categories, { transactionType })
  }, [categories, transactionType])

  // 카테고리를 레벨 순으로 정렬 (이미 정렬된 상태라고 가정)
  const sortedCategories = useMemo(() => {
    return [...filteredCategories].sort((a, b) => {
      // 레벨별 정렬
      if (a.level !== b.level) {
        return a.level - b.level
      }
      
      // 같은 레벨 내에서 부모가 같은 경우 이름순 정렬
      if (a.parentId === b.parentId) {
        return a.name.localeCompare(b.name)
      }
      
      return 0
    })
  }, [filteredCategories])

  // 선택 상태 처리
  const selectedKeys = selectedCategoryId ? [selectedCategoryId] : []

  const handleSelectionChange = (keys: any) => {
    const keyArray = Array.from(keys)
    if (keyArray.length > 0) {
      onSelectionChange(keyArray[0] as string)
    }
  }

  return (
    <Select
      label={label}
      placeholder={placeholder}
      selectedKeys={selectedKeys}
      onSelectionChange={handleSelectionChange}
      isRequired={isRequired}
      isDisabled={isDisabled}
      className={className}
      aria-label={`${label} 선택${transactionType ? ` (${transactionType} 타입)` : ''}`}
      aria-describedby={`${label.replace(/\s/g, '')}-description`}
      classNames={{
        listbox: "max-h-60 overflow-y-auto",
        popoverContent: "w-full min-w-[200px]",
        trigger: "focus:ring-2 focus:ring-primary-500",
        label: "text-sm font-medium"
      }}
    >
      {sortedCategories.map(category => {
        const displayText = formatCategoryDisplay(category, {
          showIcons: true,
          showHierarchySymbols: true,
          indentSize: 2
        })
        
        return (
          <SelectItem 
            key={category.id}
            textValue={category.name} // 검색을 위한 순수 텍스트
            aria-label={`${category.name}, 레벨 ${category.level}${category.parentId ? ', 하위 카테고리' : ', 최상위 카테고리'}`}
            className={`
              text-left transition-colors
              ${category.level > 1 ? 'text-sm' : 'font-medium'}
              ${category.level > 2 ? 'opacity-80' : ''}
              hover:bg-default-100
              focus:bg-default-100
              focus:outline-none
              focus:ring-2
              focus:ring-primary-500
            `}
          >
            <div className="flex items-center gap-1">
              <span 
                className="block whitespace-pre font-mono text-xs leading-tight"
                style={{ fontFamily: 'ui-monospace, monospace' }}
                aria-hidden="true"
              >
                {displayText}
              </span>
            </div>
          </SelectItem>
        )
      })}
    </Select>
  )
}

// 트리 뷰 방식의 카테고리 선택 컴포넌트 (향후 확장용)
export function HierarchicalCategoryTreeSelect({
  categories,
  selectedCategoryId,
  onSelectionChange,
  transactionType,
  label = "카테고리",
  placeholder = "카테고리를 선택하세요",
  isRequired = false,
  isDisabled = false,
  className = ""
}: HierarchicalCategorySelectProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // 트랜잭션 타입에 따라 카테고리 필터링
  const filteredCategories = useMemo(() => {
    return filterCategories(categories, { transactionType })
  }, [categories, transactionType])

  // 트리 구조 생성
  const categoryTree = useMemo(() => {
    return buildCategoryTree(filteredCategories)
  }, [filteredCategories])

  // 노드 펼침/접힘 토글
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  // TODO: 트리 뷰 UI 구현
  // 현재는 기본 Select 방식 반환
  return (
    <HierarchicalCategorySelect
      categories={categories}
      selectedCategoryId={selectedCategoryId}
      onSelectionChange={onSelectionChange}
      transactionType={transactionType}
      label={label}
      placeholder={placeholder}
      isRequired={isRequired}
      isDisabled={isDisabled}
      className={className}
    />
  )
}