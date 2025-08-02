/**
 * Script to seed default categories for organizations
 * Run this after adding the categories system to populate default categories
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Default category structure
const DEFAULT_CATEGORIES = {
  income: [
    { name: '급여', displayOrder: 1 },
    { name: '사업수입', displayOrder: 2 },
    { name: '투자수익', displayOrder: 3 },
    { name: '기타수입', displayOrder: 4 },
  ],
  savings: [
    { name: '비상자금', displayOrder: 1 },
    { name: '예적금', displayOrder: 2 },
    { name: '투자', displayOrder: 3 },
  ],
  fixed_expense: [
    {
      name: '주거비',
      displayOrder: 1,
      children: [
        { name: '월세/전세', displayOrder: 1 },
        { name: '관리비', displayOrder: 2 },
        { name: '공과금', displayOrder: 3 },
      ],
    },
    {
      name: '보험료',
      displayOrder: 2,
      children: [
        { name: '건강보험', displayOrder: 1 },
        { name: '자동차보험', displayOrder: 2 },
        { name: '생명보험', displayOrder: 3 },
      ],
    },
    {
      name: '통신비',
      displayOrder: 3,
      children: [
        { name: '휴대폰', displayOrder: 1 },
        { name: '인터넷', displayOrder: 2 },
      ],
    },
    {
      name: '구독료',
      displayOrder: 4,
      children: [
        { name: '스트리밍', displayOrder: 1 },
        { name: '소프트웨어', displayOrder: 2 },
      ],
    },
  ],
  variable_expense: [
    {
      name: '식비',
      displayOrder: 1,
      children: [
        { name: '외식', displayOrder: 1 },
        { name: '배달', displayOrder: 2 },
        { name: '장보기', displayOrder: 3 },
      ],
    },
    {
      name: '교통비',
      displayOrder: 2,
      children: [
        { name: '대중교통', displayOrder: 1 },
        { name: '택시', displayOrder: 2 },
        { name: '주유비', displayOrder: 3 },
      ],
    },
    {
      name: '쇼핑',
      displayOrder: 3,
      children: [
        { name: '의류', displayOrder: 1 },
        { name: '화장품', displayOrder: 2 },
        { name: '생활용품', displayOrder: 3 },
      ],
    },
    { name: '의료비', displayOrder: 4 },
    {
      name: '문화생활',
      displayOrder: 5,
      children: [
        { name: '영화', displayOrder: 1 },
        { name: '도서', displayOrder: 2 },
        { name: '여행', displayOrder: 3 },
      ],
    },
  ],
} as const

type CategoryType = keyof typeof DEFAULT_CATEGORIES
type CategoryData = {
  name: string
  displayOrder: number
  children?: CategoryData[]
}

async function seedCategoriesForOrganization(organizationId: string) {
  console.log(`Seeding categories for organization: ${organizationId}`)

  for (const [type, categories] of Object.entries(DEFAULT_CATEGORIES)) {
    console.log(`  Creating ${type} categories...`)

    for (const categoryData of categories as readonly CategoryData[]) {
      // Create parent category
      const parentCategory = await prisma.category.create({
        data: {
          organizationId,
          name: categoryData.name,
          type: type as CategoryType,
          displayOrder: categoryData.displayOrder,
        },
      })

      console.log(`    Created parent category: ${categoryData.name}`)

      // Create child categories if they exist
      if (categoryData.children) {
        for (const childData of categoryData.children) {
          await prisma.category.create({
            data: {
              organizationId,
              name: childData.name,
              type: type as CategoryType,
              parentId: parentCategory.id,
              displayOrder: childData.displayOrder,
            },
          })
          console.log(`      Created child category: ${childData.name}`)
        }
      }
    }
  }

  console.log(
    `✅ Categories seeded successfully for organization: ${organizationId}`
  )
}

async function seedAllOrganizations() {
  try {
    console.log('🌱 Starting category seeding process...')

    // Get all organizations
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true },
    })

    if (organizations.length === 0) {
      console.log(
        '❌ No organizations found. Please create an organization first.'
      )
      return
    }

    console.log(`Found ${organizations.length} organization(s):`)
    organizations.forEach(org => console.log(`  - ${org.name} (${org.id})`))

    for (const org of organizations) {
      // Check if categories already exist for this organization
      const existingCategories = await prisma.category.count({
        where: { organizationId: org.id },
      })

      if (existingCategories > 0) {
        console.log(
          `⚠️  Organization ${org.name} already has ${existingCategories} categories. Skipping...`
        )
        continue
      }

      await seedCategoriesForOrganization(org.id)
    }

    console.log('🎉 Category seeding completed!')
  } catch (error) {
    console.error('❌ Error seeding categories:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedAllOrganizations().catch(error => {
    console.error(error)
    process.exit(1)
  })
}

export { seedAllOrganizations, seedCategoriesForOrganization }
