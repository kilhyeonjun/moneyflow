/**
 * Date utility functions for safe date handling
 */

/**
 * Safely format a date to Korean locale string
 * @param dateValue - Date string, Date object, or null/undefined
 * @param fallback - Fallback text when date is invalid (default: '날짜 오류')
 * @returns Formatted date string or fallback text
 */
export function formatDateSafe(
  dateValue: string | Date | null | undefined, 
  fallback: string = '날짜 오류'
): string {
  if (!dateValue) return fallback
  
  const date = new Date(dateValue)
  if (isNaN(date.getTime())) return fallback
  
  return date.toLocaleDateString('ko-KR')
}

/**
 * Safely calculate days until expiration
 * @param expirationDate - Expiration date string or Date object
 * @returns Object with isValid, daysUntil, and isExpired properties
 */
export function calculateExpirationDays(
  expirationDate: string | Date | null | undefined
): {
  isValid: boolean
  daysUntil: number
  isExpired: boolean
} {
  if (!expirationDate) {
    return { isValid: false, daysUntil: 0, isExpired: true }
  }
  
  const expDate = new Date(expirationDate)
  if (isNaN(expDate.getTime())) {
    return { isValid: false, daysUntil: 0, isExpired: true }
  }
  
  const now = new Date()
  const daysUntil = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isExpired = expDate < now
  
  return { isValid: true, daysUntil, isExpired }
}

/**
 * Format expiration status text
 * @param expirationDate - Expiration date string or Date object
 * @returns Human-readable expiration status
 */
export function formatExpirationStatus(
  expirationDate: string | Date | null | undefined
): string {
  const { isValid, daysUntil, isExpired } = calculateExpirationDays(expirationDate)
  
  if (!isValid) return '날짜 오류'
  if (isExpired) return '만료됨'
  if (daysUntil === 0) return '오늘 만료'
  return `${daysUntil}일 남음`
}

/**
 * Format creation date with suffix
 * @param dateValue - Date string, Date object, or null/undefined
 * @returns Formatted creation date string
 */
export function formatCreationDate(
  dateValue: string | Date | null | undefined
): string {
  if (!dateValue) return '생성일 알 수 없음'
  
  const date = new Date(dateValue)
  if (isNaN(date.getTime())) return '생성일 알 수 없음'
  
  return `${date.toLocaleDateString('ko-KR')} 생성`
}