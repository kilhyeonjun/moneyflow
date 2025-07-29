import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

export interface AssetChangeEvent {
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  assetId: string
  previousValue?: number
  currentValue: number
  assetType: string
}

export interface FinancialGoal {
  id: string
  organizationId: string
  name: string
  category: string | null
  targetAmount: number
  currentAmount: number
  targetDate: Date | null
  priority: string
  status: string
  description: string | null
  createdBy: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

/**
 * 목표-자산 데이터 동기화 관리자
 * 자산 변경 시 재정 목표의 달성률을 실시간으로 업데이트
 */
export class GoalSyncManager {
  /**
   * 자산 변경 시 목표 동기화 트리거
   */
  static async triggerSync(organizationId: string, event: AssetChangeEvent): Promise<void> {
    try {
      console.log(`🔄 목표 동기화 시작: ${organizationId}, 이벤트: ${event.type}`)
      
      // 트랜잭션으로 원자성 보장
      await prisma.$transaction(async (tx) => {
        // 1. 총 자산 재계산
        const totalAssets = await this.calculateTotalAssets(tx, organizationId)
        console.log(`💰 총 자산 계산: ₩${totalAssets.toLocaleString()}`)
        
        // 2. 활성 목표들 조회
        const activeGoals = await tx.financialGoal.findMany({
          where: { 
            organizationId, 
            status: { in: ['active', 'paused'] } 
          }
        })
        console.log(`🎯 업데이트할 목표 개수: ${activeGoals.length}`)
        
        // 3. 각 목표별 달성률 업데이트
        for (const goal of activeGoals) {
          const currentAmount = this.calculateGoalAmount(goal, totalAssets)
          const achievementRate = goal.targetAmount > 0 
            ? (currentAmount / Number(goal.targetAmount)) * 100 
            : 0
          
          // 목표 달성 시 상태 자동 변경
          const newStatus = achievementRate >= 100 ? 'completed' : goal.status
          
          await tx.financialGoal.update({
            where: { id: goal.id },
            data: {
              currentAmount,
              status: newStatus,
              updatedAt: new Date()
            }
          })
          
          console.log(`✅ 목표 "${goal.name}" 업데이트: ${achievementRate.toFixed(1)}% (₩${currentAmount.toLocaleString()})`)
          
          // 목표 달성 시 로그
          if (newStatus === 'completed' && goal.status !== 'completed') {
            console.log(`🎉 목표 달성! "${goal.name}" - ₩${Number(goal.targetAmount).toLocaleString()}`)
          }
        }
      }, {
        timeout: 10000 // 10초 타임아웃
      })
      
      console.log(`✅ 목표 동기화 완료: ${organizationId}`)
    } catch (error) {
      console.error(`❌ 목표 동기화 실패 (${organizationId}):`, error)
      throw new Error(`목표 동기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  /**
   * 조직의 총 자산 계산
   */
  private static async calculateTotalAssets(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], 
    organizationId: string
  ): Promise<number> {
    const result = await tx.asset.aggregate({
      where: { 
        organizationId, 
        isActive: true 
      },
      _sum: { 
        currentValue: true 
      }
    })
    
    return Number(result._sum.currentValue || 0)
  }

  /**
   * 목표 유형별 현재 달성 금액 계산
   */
  private static calculateGoalAmount(goal: FinancialGoal, totalAssets: number): number {
    switch (goal.category) {
      case 'asset_growth':
        // 자산 증가 목표: 전체 자산이 달성 기준
        return totalAssets
        
      case 'savings':
        // 저축 목표: 전체 자산이 달성 기준 (단순화)
        return totalAssets
        
      case 'debt_reduction':
        // 부채 감소 목표: 향후 부채 데이터와 연동 필요
        // 현재는 자산 증가로 간주
        return totalAssets
        
      case 'expense_reduction':
        // 지출 절약 목표: 향후 거래 데이터와 연동 필요
        // 현재는 자산 증가로 간주
        return totalAssets
        
      default:
        // 기본값: 전체 자산
        return totalAssets
    }
  }

  /**
   * 특정 조직의 모든 목표 강제 동기화
   * 데이터 불일치 해결이나 초기 설정 시 사용
   */
  static async syncAllGoals(organizationId: string): Promise<void> {
    console.log(`🔄 전체 목표 동기화 시작: ${organizationId}`)
    
    await this.triggerSync(organizationId, {
      type: 'UPDATE',
      assetId: 'sync-all',
      currentValue: 0,
      assetType: 'sync'
    })
  }

  /**
   * 목표별 현재 달성 금액 개별 계산
   * API에서 실시간 계산이 필요할 때 사용
   */
  static async calculateCurrentAmount(goalId: string): Promise<number> {
    const goal = await prisma.financialGoal.findUnique({
      where: { id: goalId }
    })
    
    if (!goal) {
      throw new Error(`목표를 찾을 수 없습니다: ${goalId}`)
    }
    
    // 단일 쿼리로 총 자산 계산
    const result = await prisma.asset.aggregate({
      where: { 
        organizationId: goal.organizationId, 
        isActive: true 
      },
      _sum: { 
        currentValue: true 
      }
    })
    
    const totalAssets = Number(result._sum.currentValue || 0)
    return this.calculateGoalAmount(goal as FinancialGoal, totalAssets)
  }

  /**
   * 조직의 목표 달성 통계 계산
   */
  static async getGoalStats(organizationId: string) {
    const goals = await prisma.financialGoal.findMany({
      where: { organizationId }
    })
    
    const activeGoals = goals.filter(g => g.status === 'active')
    const completedGoals = goals.filter(g => g.status === 'completed')
    const averageAchievement = goals.length > 0 
      ? goals.reduce((sum, goal) => {
          const rate = goal.targetAmount > 0 
            ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 
            : 0
          return sum + Math.max(0, rate)
        }, 0) / goals.length
      : 0
    
    return {
      totalGoals: goals.length,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      averageAchievement: Math.round(averageAchievement * 10) / 10 // 소수점 1자리
    }
  }
}

/**
 * 자산 변경 이벤트 생성 헬퍼
 */
export function createAssetChangeEvent(
  type: AssetChangeEvent['type'],
  assetId: string,
  currentValue: number,
  assetType: string,
  previousValue?: number
): AssetChangeEvent {
  return {
    type,
    assetId,
    currentValue,
    assetType,
    previousValue
  }
}