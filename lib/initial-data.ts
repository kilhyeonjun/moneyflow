// 조직 생성 시 기본 결제수단을 생성하는 유틸리티

import { prisma } from './prisma'
import { PaymentMethod } from '@prisma/client'
import { defaultPaymentMethods } from './seed-data'

/**
 * 조직에 기본 결제수단을 생성하는 함수
 */
async function createPaymentMethodsFromDefaults(organizationId: string) {
  try {
    console.log('기본 결제수단 생성 시작')

    const createdPaymentMethods: PaymentMethod[] = []

    for (const methodData of defaultPaymentMethods) {
      // 중복 확인
      const existingMethod = await prisma.paymentMethod.findFirst({
        where: {
          name: methodData.name,
          organizationId: organizationId,
        },
      })

      if (!existingMethod) {
        const paymentMethod = await prisma.paymentMethod.create({
          data: {
            organizationId: organizationId,
            name: methodData.name,
            type: methodData.type,
            isActive: true,
          },
        })

        createdPaymentMethods.push(paymentMethod)
        console.log(`결제수단 생성 완료: ${methodData.name}`)
      }
    }

    console.log(
      `총 ${createdPaymentMethods.length}개의 결제수단이 생성되었습니다.`
    )
    return createdPaymentMethods
  } catch (error) {
    console.error('결제수단 생성 중 오류 발생:', error)
    throw error
  }
}

/**
 * 새 조직에 대한 모든 기본 데이터를 생성하는 메인 함수
 */
export async function createInitialData(organizationId: string) {
  try {
    console.log(`조직 ${organizationId}에 대한 초기 데이터 생성 시작`)

    const paymentMethods =
      await createPaymentMethodsFromDefaults(organizationId)

    console.log('모든 초기 데이터 생성 완료')

    return {
      paymentMethods,
      summary: {
        paymentMethodsCount: paymentMethods.length,
      },
    }
  } catch (error) {
    console.error('초기 데이터 생성 실패:', error)
    throw error
  }
}
