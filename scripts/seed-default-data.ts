#!/usr/bin/env tsx

/**
 * 기본 카테고리 데이터를 데이터베이스에 삽입하는 스크립트
 *
 * 사용법: pnpm tsx scripts/seed-default-data.ts
 */

import { PrismaClient } from '@prisma/client'
import {
  defaultAssetCategories,
  defaultTransactionCategories,
} from '../lib/seed-data'

const prisma = new PrismaClient()

async function seedDefaultAssetCategories() {
  console.log('🏦 기본 자산 카테고리 데이터 삽입 중...')

  for (const categoryData of defaultAssetCategories) {
    const existing = await prisma.defaultAssetCategory.findFirst({
      where: { name: categoryData.name },
    })

    if (!existing) {
      await prisma.defaultAssetCategory.create({
        data: categoryData,
      })
      console.log(`✅ 자산 카테고리 생성: ${categoryData.name}`)
    } else {
      console.log(`⚠️  자산 카테고리 이미 존재: ${categoryData.name}`)
    }
  }
}

async function seedDefaultTransactionCategories() {
  console.log('💰 기본 거래 카테고리 데이터 삽입 중...')

  for (const categoryData of defaultTransactionCategories) {
    const existing = await prisma.defaultCategory.findFirst({
      where: {
        name: categoryData.name,
        transactionType: categoryData.transactionType,
      },
    })

    if (!existing) {
      await prisma.defaultCategory.create({
        data: categoryData,
      })
      console.log(
        `✅ 거래 카테고리 생성: ${categoryData.name} (${categoryData.transactionType})`
      )
    } else {
      console.log(
        `⚠️  거래 카테고리 이미 존재: ${categoryData.name} (${categoryData.transactionType})`
      )
    }
  }
}

async function main() {
  try {
    console.log('🚀 기본 데이터 삽입 시작...')

    await seedDefaultAssetCategories()
    await seedDefaultTransactionCategories()

    console.log('✨ 기본 데이터 삽입 완료!')
  } catch (error) {
    console.error('❌ 기본 데이터 삽입 실패:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
