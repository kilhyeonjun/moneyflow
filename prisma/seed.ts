// Prisma seed script for MoneyFlow application
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  try {
    // Supabase manages users in auth.users table, not in public schema
    // We'll check for existing organizations instead
    const existingOrgs = await prisma.organization.findMany()

    if (existingOrgs.length > 0) {
      console.log('✅ Organizations already exist. Seeding not needed.')
      return
    }

    // Create test organization
    console.log('📊 Creating test organization...')
    const organization = await prisma.organization.create({
      data: {
        name: '테스트 조직',
        description: '개발용 테스트 조직',
        createdBy: '018f9ad8-0172-4c5b-82e4-9fba01234567', // Placeholder UUID
      },
    })

    console.log(
      'ℹ️ Organization created. Add members via the application interface.'
    )

    console.log(
      `✅ Created organization: ${organization.name} (${organization.id})`
    )
    console.log('🎉 Database seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
