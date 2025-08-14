/**
 * 클라이언트 사이드 에러 처리 유틸리티
 * 서버에서 받은 에러를 사용자 친화적으로 변환
 */

import {
	getErrorMessage,
	extractErrorCode,
	OPERATION_ERROR_MESSAGES,
} from "@/lib/utils/error-messages";

export interface ClientErrorContext {
	operation: string;
	formData?: any;
	organizationId?: string;
}

export class ClientErrorHandler {
	/**
	 * 서버 액션 에러를 사용자 친화적 메시지로 변환
	 */
	handleServerActionError(error: any, context: ClientErrorContext): string {
		if (!error) {
			return getErrorMessage("UNKNOWN_ERROR", context.operation).userMessage;
		}

		const errorMessage = error.message || error.toString();

		// 서버에서 이미 사용자 친화적 메시지로 변환된 경우
		if (this.isUserFriendlyMessage(errorMessage)) {
			return errorMessage;
		}

		// 중앙 집중식 메시지 시스템 사용
		const errorCode = extractErrorCode(error);
		const errorConfig = getErrorMessage(errorCode, context.operation);

		return errorConfig.userMessage;
	}

	/**
	 * 폼 검증 에러를 사용자 친화적으로 변환
	 */
	handleFormValidationErrors(errors: Record<string, string>): string {
		const errorMessages = Object.entries(errors)
			.map(([field, message]) => {
				// 필드명을 한국어로 변환
				const fieldName = this.translateFieldName(field);
				return `${fieldName}: ${message}`;
			})
			.join("\n");

		return errorMessages || "입력 정보를 확인해주세요.";
	}

	/**
	 * Zod 검증 에러를 사용자 친화적으로 변환
	 */
	handleZodValidationErrors(zodError: any): string {
		if (!zodError.errors || !Array.isArray(zodError.errors)) {
			return "입력 정보를 확인해주세요.";
		}

		const errorMessages = zodError.errors
			.map((err: any) => {
				const fieldName = this.translateFieldName(err.path?.[0] || "field");
				return `${fieldName}: ${err.message}`;
			})
			.join("\n");

		return errorMessages || "필수 정보를 모두 입력해주세요.";
	}

	/**
	 * 네트워크 에러 처리
	 */
	handleNetworkError(error: any): string {
		if (error.name === "NetworkError" || error.message?.includes("fetch")) {
			return "인터넷 연결을 확인하고 다시 시도해주세요.";
		}

		if (error.message?.includes("timeout")) {
			return "요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";
		}

		return "네트워크 오류가 발생했습니다. 다시 시도해주세요.";
	}

	/**
	 * 에러 메시지가 이미 사용자 친화적인지 확인
	 */
	private isUserFriendlyMessage(message: string): boolean {
		// 한국어 메시지이거나 사용자 친화적 패턴인 경우
		const userFriendlyPatterns = [
			/[가-힣]/, // 한글 포함
			/선택.*카테고리/,
			/결제수단/,
			/권한.*없습니다/,
			/찾을.*없습니다/,
			/확인.*다시.*시도/,
		];

		return userFriendlyPatterns.some((pattern) => pattern.test(message));
	}

	/**
	 * 에러 메시지를 분류하고 변환
	 */
	private categorizeAndTransformError(
		message: string,
		context: ClientErrorContext,
	): string {
		// 권한 관련 에러
		if (message.includes("FORBIDDEN") || message.includes("권한")) {
			if (context.operation === "createTransaction") {
				return "이 조직에서 거래를 추가할 권한이 없습니다.";
			}
			return "이 작업을 수행할 권한이 없습니다.";
		}

		// 인증 관련 에러
		if (message.includes("UNAUTHORIZED") || message.includes("인증")) {
			return "로그인이 필요합니다. 다시 로그인해주세요.";
		}

		// 찾을 수 없음 에러
		if (message.includes("NOT_FOUND") || message.includes("not found")) {
			if (context.operation === "createTransaction") {
				return "선택한 카테고리나 결제수단을 찾을 수 없습니다. 다시 선택해주세요.";
			}
			return "요청한 데이터를 찾을 수 없습니다.";
		}

		// 검증 에러
		if (
			message.includes("VALIDATION_ERROR") ||
			message.includes("validation")
		) {
			if (message.includes("Category")) {
				return "선택한 카테고리에 문제가 있습니다. 다른 카테고리를 선택해주세요.";
			}
			if (message.includes("Payment method")) {
				return "선택한 결제수단에 문제가 있습니다. 다른 결제수단을 선택해주세요.";
			}
			if (message.includes("amount")) {
				return "금액을 올바르게 입력해주세요.";
			}
			return "입력 정보를 확인하고 다시 시도해주세요.";
		}

		// 데이터베이스 에러
		if (message.includes("DATABASE_ERROR") || message.includes("database")) {
			return "데이터 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
		}

		// 알 수 없는 에러
		if (message.includes("UNKNOWN_ERROR")) {
			if (context.operation === "createTransaction") {
				return "거래를 저장하는 중 예상치 못한 문제가 발생했습니다. 입력 정보를 확인하고 다시 시도해주세요.";
			}
			return "예상치 못한 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
		}

		// 기본 메시지
		if (context.operation === "createTransaction") {
			return "거래를 저장하는 중 문제가 발생했습니다. 다시 시도해주세요.";
		}

		return "작업을 수행하는 중 문제가 발생했습니다. 다시 시도해주세요.";
	}

	/**
	 * 필드명을 한국어로 변환
	 */
	private translateFieldName(fieldName: string): string {
		const fieldTranslations: Record<string, string> = {
			amount: "금액",
			description: "설명",
			transactionDate: "거래 날짜",
			transactionType: "거래 유형",
			categoryId: "카테고리",
			paymentMethodId: "결제수단",
			organizationId: "조직",
		};

		return fieldTranslations[fieldName] || fieldName;
	}

	/**
	 * 에러 복구 제안 생성
	 */
	generateRecoveryActions(error: any, context: ClientErrorContext): string[] {
		// 중앙 집중식 메시지 시스템에서 복구 액션 가져오기
		const errorCode = extractErrorCode(error);
		const errorConfig = getErrorMessage(errorCode, context.operation);

		if (errorConfig.recoveryActions && errorConfig.recoveryActions.length > 0) {
			return errorConfig.recoveryActions;
		}

		// 기본 복구 액션
		return [
			"입력 정보를 다시 확인해주세요",
			"페이지를 새로고침하고 다시 시도해주세요",
		];
	}

	/**
	 * 개발 환경에서 상세 에러 정보 로깅
	 */
	logDetailedError(error: any, context: ClientErrorContext): void {
		if (process.env.NODE_ENV === "development") {
			console.group(`🚨 Client Error - ${context.operation}`);
			console.error("Original Error:", error);
			console.log("Context:", context);
			console.log(
				"User Message:",
				this.handleServerActionError(error, context),
			);
			console.log(
				"Recovery Actions:",
				this.generateRecoveryActions(error, context),
			);
			console.groupEnd();
		}
	}
}

// 싱글톤 클라이언트 에러 핸들러 인스턴스
export const clientErrorHandler = new ClientErrorHandler();
