/**
 * UUID v7 생성 및 검증 유틸리티
 * UUID v7은 시간순 정렬이 가능한 UUID 형식입니다.
 */

import { v7 as uuidv7, validate as validateUUID } from "uuid";

/**
 * UUID v7 생성
 * 시간순 정렬이 가능한 UUID를 생성합니다.
 */
export function generateUUIDv7(): string {
	return uuidv7();
}

/**
 * UUID 형식 검증
 * @param uuid - 검증할 UUID 문자열
 * @returns UUID가 유효한 형식인지 여부
 */
export function isValidUUID(uuid: string): boolean {
	if (!uuid || typeof uuid !== "string") {
		return false;
	}

	return validateUUID(uuid);
}

/**
 * UUID v7 여부 확인
 * @param uuid - 확인할 UUID 문자열
 * @returns UUID v7 형식인지 여부
 */
export function isUUIDv7(uuid: string): boolean {
	if (!isValidUUID(uuid)) {
		return false;
	}

	// UUID v7은 버전 필드가 7이어야 함 (13번째 문자)
	const version = uuid.charAt(14);
	return version === "7";
}

/**
 * UUID에서 타임스탬프 추출 (UUID v7 전용)
 * @param uuid - UUID v7 문자열
 * @returns 타임스탬프 (밀리초) 또는 null
 */
export function extractTimestampFromUUIDv7(uuid: string): number | null {
	if (!isUUIDv7(uuid)) {
		return null;
	}

	try {
		// UUID v7의 첫 48비트는 Unix 타임스탬프 (밀리초)
		const hex = uuid.replace(/-/g, "");
		const timestampHex = hex.substring(0, 12);
		const timestamp = parseInt(timestampHex, 16);

		return timestamp;
	} catch (error) {
		return null;
	}
}

/**
 * UUID 배열을 시간순으로 정렬 (UUID v7 전용)
 * @param uuids - 정렬할 UUID 배열
 * @returns 시간순으로 정렬된 UUID 배열
 */
export function sortUUIDv7ByTime(uuids: string[]): string[] {
	return uuids.filter(isUUIDv7).sort((a, b) => {
		const timestampA = extractTimestampFromUUIDv7(a) || 0;
		const timestampB = extractTimestampFromUUIDv7(b) || 0;
		return timestampA - timestampB;
	});
}

/**
 * 데이터베이스 ID 검증 (MoneyFlow 전용)
 * @param id - 검증할 ID
 * @param fieldName - 필드명 (에러 메시지용)
 * @throws Error - ID가 유효하지 않은 경우
 */
export function validateDatabaseId(id: string, fieldName: string = "ID"): void {
	if (!id) {
		throw new Error(`${fieldName} is required`);
	}

	if (typeof id !== "string") {
		throw new Error(`${fieldName} must be a string`);
	}

	if (!isValidUUID(id)) {
		throw new Error(`${fieldName} must be a valid UUID format`);
	}
}

/**
 * 조직 ID 검증 (특별한 검증 로직 포함)
 * @param organizationId - 검증할 조직 ID
 * @throws Error - 조직 ID가 유효하지 않은 경우
 */
export function validateOrganizationId(organizationId: string): void {
	validateDatabaseId(organizationId, "Organization ID");

	// 추가적인 조직 ID 검증 로직이 필요한 경우 여기에 추가
	// 예: 특정 패턴 확인, 길이 제한 등
}

/**
 * 사용자 ID 검증
 * @param userId - 검증할 사용자 ID
 * @throws Error - 사용자 ID가 유효하지 않은 경우
 */
export function validateUserId(userId: string): void {
	validateDatabaseId(userId, "User ID");
}

/**
 * 거래 ID 검증
 * @param transactionId - 검증할 거래 ID
 * @throws Error - 거래 ID가 유효하지 않은 경우
 */
export function validateTransactionId(transactionId: string): void {
	validateDatabaseId(transactionId, "Transaction ID");
}

/**
 * 카테고리 ID 검증
 * @param categoryId - 검증할 카테고리 ID
 * @throws Error - 카테고리 ID가 유효하지 않은 경우
 */
export function validateCategoryId(categoryId: string): void {
	validateDatabaseId(categoryId, "Category ID");
}

/**
 * 결제수단 ID 검증
 * @param paymentMethodId - 검증할 결제수단 ID
 * @throws Error - 결제수단 ID가 유효하지 않은 경우
 */
export function validatePaymentMethodId(paymentMethodId: string): void {
	validateDatabaseId(paymentMethodId, "Payment Method ID");
}
