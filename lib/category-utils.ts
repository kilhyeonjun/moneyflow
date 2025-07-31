import type { Category } from '@prisma/client'
import type { 
  HierarchicalCategory, 
  CategoryTreeNode, 
  CategoryFilterOptions 
} from '@/types/category'

/**
 * 플랫 카테고리 배열을 트리 구조로 변환
 */
export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const categoryMap = new Map<string, CategoryTreeNode>()
  const rootNodes: CategoryTreeNode[] = []

  // 모든 카테고리를 맵에 저장하고 초기 노드 생성
  categories.forEach(category => {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      icon: category.icon || undefined,
      level: category.level,
      parentId: category.parentId || undefined,
      transactionType: category.transactionType,
      children: [],
      isExpanded: false,
      path: []
    })
  })

  // 부모-자식 관계 설정 및 경로 생성
  categories.forEach(category => {
    const node = categoryMap.get(category.id)!
    
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId)
      if (parent) {
        parent.children.push(node)
        // 부모 경로 + 현재 노드 이름으로 경로 생성
        node.path = [...parent.path, node.name]
      }
    } else {
      rootNodes.push(node)
      node.path = [node.name]
    }
  })

  return rootNodes.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * 카테고리 필터링
 */
export function filterCategories(
  categories: Category[], 
  options: CategoryFilterOptions
): Category[] {
  return categories.filter(category => {
    if (options.transactionType && category.transactionType !== options.transactionType) {
      return false
    }
    
    if (options.level !== undefined && category.level !== options.level) {
      return false
    }
    
    if (options.parentId !== undefined && category.parentId !== options.parentId) {
      return false
    }
    
    if (options.searchTerm) {
      const searchLower = options.searchTerm.toLowerCase()
      return category.name.toLowerCase().includes(searchLower)
    }
    
    return true
  })
}

/**
 * 카테고리의 계층형 표시 문자열 생성 (개선된 버전)
 */
export function formatCategoryDisplay(
  category: { 
    name: string
    level: number
    icon?: string | null
    parentId?: string | null | undefined
  }, 
  options: {
    showIcons?: boolean
    showHierarchySymbols?: boolean
    indentSize?: number
    useTreeSymbols?: boolean
  } = {}
): string {
  const {
    showIcons = true,
    showHierarchySymbols = true,
    indentSize = 2,
    useTreeSymbols = true
  } = options

  const levelIndent = ' '.repeat((category.level - 1) * indentSize)
  
  // 개선된 계층 구조 표시 기호
  let hierarchySymbol = ''
  if (showHierarchySymbols && category.level > 1) {
    if (useTreeSymbols) {
      // 더 명확한 트리 구조 표시
      hierarchySymbol = category.level === 2 ? '├─ ' : '└─ '
    } else {
      hierarchySymbol = '└─ '
    }
  }
  
  const categoryIcon = showIcons && category.icon ? `${category.icon} ` : ''
  
  return `${levelIndent}${hierarchySymbol}${categoryIcon}${category.name}`
}

/**
 * 트리에서 특정 카테고리까지의 경로 찾기
 */
export function findCategoryPath(
  treeNodes: CategoryTreeNode[], 
  targetId: string
): string[] | null {
  function searchNode(node: CategoryTreeNode): string[] | null {
    if (node.id === targetId) {
      return node.path
    }
    
    for (const child of node.children) {
      const path = searchNode(child)
      if (path) return path
    }
    
    return null
  }

  for (const node of treeNodes) {
    const path = searchNode(node)
    if (path) return path
  }
  
  return null
}

/**
 * 트리 노드의 펼침/접힘 상태 토글
 */
export function toggleNodeExpansion(
  treeNodes: CategoryTreeNode[], 
  targetId: string
): CategoryTreeNode[] {
  function updateNode(node: CategoryTreeNode): CategoryTreeNode {
    if (node.id === targetId) {
      return { ...node, isExpanded: !node.isExpanded }
    }
    
    return {
      ...node,
      children: node.children.map(updateNode)
    }
  }

  return treeNodes.map(updateNode)
}

/**
 * 모든 노드를 펼치거나 접기
 */
export function expandAllNodes(
  treeNodes: CategoryTreeNode[], 
  expanded: boolean = true
): CategoryTreeNode[] {
  function updateNode(node: CategoryTreeNode): CategoryTreeNode {
    return {
      ...node,
      isExpanded: expanded,
      children: node.children.map(updateNode)
    }
  }

  return treeNodes.map(updateNode)
}

/**
 * 카테고리 레벨별 정렬
 */
export function sortCategoriesByLevel(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => {
    // 먼저 레벨별로 정렬
    if (a.level !== b.level) {
      return a.level - b.level
    }
    
    // 같은 레벨 내에서는 이름순 정렬
    return a.name.localeCompare(b.name)
  })
}