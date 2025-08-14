/**
 * 중앙 집중식 에러 메시지 관리 시스템
 * 모든 에러 메시지를 한 곳에서 관리하여 일관성 보장
 */

export interface ErrorMessageConfig {
	userMessage: string;
	developerMessage?: string;
	recoveryActions?: string[];
	severity: "low" | "medium" | "high" | "critical";
}

/**
 * 에러 코드별 메시지 매핑
 */
export const ERROR_MESSAGES: Record<string, ErrorMessageConfig> = {
	// 인증 관련 에러
	UNAUTHORIZED: {
		userMessage: "로그인이 필요합니다. 다시 로그인해주세요.",
		developerMessage: "User authentication required",
		recoveryActions: ["로그인 페이지로 이동", "세션 갱신"],
		severity: "high",
	},

	FORBIDDEN: {
		userMessage: "이 작업을 수행할 권한이 없습니다.",
		developerMessage: "User lacks required permissions",
		recoveryActions: ["권한 확인", "조직 관리자에게 문의"],
		severity: "medium",
	},

	// 데이터 관련 에러
	NOT_FOUND: {
		userMessage: "요청한 데이터를 찾을 수 없습니다.",
		developerMessage: "Requested resource not found",
		recoveryActions: ["페이지 새로고침", "다른 항목 선택"],
		severity: "medium",
	},

	VALIDATION_ERROR: {
		userMessage: "입력 정보를 확인하고 다시 시도해주세요.",
		developerMessage: "Input validation failed",
		recoveryActions: ["입력값 확인", "필수 필드 입력"],
		severity: "low",
	},

	// 데이터베이스 관련 에러
	DATABASE_ERROR: {
		userMessage:
			"데이터 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
		developerMessage: "Database operation failed",
		recoveryActions: ["잠시 후 재시도", "관리자에게 문의"],
		severity: "high",
	},

	DATABASE_CONNECTION_ERROR: {
		userMessage: "서버 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.",
		developerMessage: "Database connection failed",
		recoveryActions: ["네트워크 확인", "잠시 후 재시도"],
		severity: "critical",
	},

	// 거래 관련 에러
	TRANSACTION_CREATE_FAILED: {
		userMessage:
			"거래를 저장하는 중 문제가 발생했습니다. 입력 정보를 확인하고 다시 시도해주세요.",
		developerMessage: "Transaction creation failed",
		recoveryActions: ["입력 정보 확인", "카테고리 재선택", "결제수단 재선택"],
		severity: "medium",
	},

	TRANSACTION_UPDATE_FAILED: {
		userMessage: "거래를 수정하는 중 문제가 발생했습니다. 다시 시도해주세요.",
		developerMessage: "Transaction update failed",
		recoveryActions: ["수정 내용 확인", "다시 시도"],
		severity: "medium",
	},

	TRANSACTION_DELETE_FAILED: {
		userMessage: "거래를 삭제하는 중 문제가 발생했습니다. 다시 시도해주세요.",
		developerMessage: "Transaction deletion failed",
		recoveryActions: ["다시 시도", "페이지 새로고침"],
		severity: "medium",
	},

	// 카테고리 관련 에러
	CATEGORY_NOT_FOUND: {
		userMessage:
			"선택한 카테고리를 찾을 수 없습니다. 다른 카테고리를 선택해주세요.",
		developerMessage: "Category not found or inactive",
		recoveryActions: ["다른 카테고리 선택", "카테고리 목록 새로고침"],
		severity: "low",
	},

	CATEGORY_TYPE_INCOMPATIBLE: {
		userMessage:
			"선택한 카테고리는 이 거래 유형과 호환되지 않습니다. 적절한 카테고리를 선택해주세요.",
		developerMessage: "Category type incompatible with transaction type",
		recoveryActions: ["호환되는 카테고리 선택", "거래 유형 변경"],
		severity: "low",
	},

	// 결제수단 관련 에러
	PAYMENT_METHOD_NOT_FOUND: {
		userMessage:
			"선택한 결제수단을 찾을 수 없습니다. 다른 결제수단을 선택해주세요.",
		developerMessage: "Payment method not found or inactive",
		recoveryActions: ["다른 결제수단 선택", "결제수단 목록 새로고침"],
		severity: "low",
	},

	// 조직 관련 에러
	ORGANIZATION_NOT_FOUND: {
		userMessage: "조직을 찾을 수 없습니다. 조직 목록을 확인해주세요.",
		developerMessage: "Organization not found",
		recoveryActions: ["조직 목록 새로고침", "다른 조직 선택"],
		severity: "medium",
	},

	ORGANIZATION_ACCESS_DENIED: {
		userMessage: "이 조직에 접근할 권한이 없습니다.",
		developerMessage: "User not a member of organization",
		recoveryActions: ["조직 초대 요청", "다른 조직 선택"],
		severity: "medium",
	},

	// 네비게이션 관련 에러
	NAVIGATION_FAILED: {
		userMessage:
			"페이지 이동에 실패했습니다. 페이지를 새로고침하고 다시 시도해주세요.",
		developerMessage: "Navigation failed",
		recoveryActions: ["페이지 새로고침", "브라우저 뒤로가기"],
		severity: "low",
	},

	// 네트워크 관련 에러
	NETWORK_ERROR: {
		userMessage: "인터넷 연결을 확인하고 다시 시도해주세요.",
		developerMessage: "Network request failed",
		recoveryActions: ["네트워크 연결 확인", "잠시 후 재시도"],
		severity: "medium",
	},

	TIMEOUT_ERROR: {
		userMessage: "요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.",
		developerMessage: "Request timeout",
		recoveryActions: ["잠시 후 재시도", "네트워크 상태 확인"],
		severity: "medium",
	},

	// 일반 에러
	UNKNOWN_ERROR: {
		userMessage: "예상치 못한 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
		developerMessage: "Unknown error occurred",
		recoveryActions: ["페이지 새로고침", "잠시 후 재시도", "관리자에게 문의"],
		severity: "medium",
	},

	INTERNAL_SERVER_ERROR: {
		userMessage: "서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
		developerMessage: "Internal server error",
		recoveryActions: ["잠시 후 재시도", "관리자에게 문의"],
		severity: "high",
	},

	// 폼 검증 관련 에러
	FORM_VALIDATION_ERROR: {
		userMessage: "입력 정보를 확인해주세요.",
		developerMessage: "Form validation failed",
		recoveryActions: ["필수 필드 입력", "입력 형식 확인"],
		severity: "low",
	},

	AMOUNT_INVALID: {
		userMessage: "올바른 금액을 입력해주세요. 금액은 0보다 커야 합니다.",
		developerMessage: "Invalid amount value",
		recoveryActions: ["양수 금액 입력", "숫자 형식 확인"],
		severity: "low",
	},

	DATE_INVALID: {
		userMessage: "올바른 날짜를 선택해주세요.",
		developerMessage: "Invalid date format",
		recoveryActions: ["유효한 날짜 선택", "날짜 형식 확인"],
		severity: "low",
	},
};

/**
 * 작업별 에러 메시지 매핑
 */
export const OPERATION_ERROR_MESSAGES: Record<
	string,
	Record<string, string>
> = {
	createTransaction: {
		VALIDATION_ERROR: "거래 정보를 확인하고 다시 시도해주세요.",
		CATEGORY_NOT_FOUND:
			"선택한 카테고리를 찾을 수 없습니다. 다른 카테고리를 선택해주세요.",
		PAYMENT_METHOD_NOT_FOUND:
			"선택한 결제수단을 찾을 수 없습니다. 다른 결제수단을 선택해주세요.",
		FORBIDDEN: "이 조직에서 거래를 추가할 권한이 없습니다.",
		DATABASE_ERROR:
			"거래를 저장하는 중 문제가 발생했습니다. 다시 시도해주세요.",
		UNKNOWN_ERROR:
			"거래를 저장하는 중 예상치 못한 문제가 발생했습니다. 입력 정보를 확인하고 다시 시도해주세요.",
	},

	updateTransaction: {
		NOT_FOUND: "수정하려는 거래를 찾을 수 없습니다.",
		FORBIDDEN: "이 거래를 수정할 권한이 없습니다.",
		VALIDATION_ERROR: "수정할 거래 정보를 확인하고 다시 시도해주세요.",
		DATABASE_ERROR:
			"거래를 수정하는 중 문제가 발생했습니다. 다시 시도해주세요.",
	},

	deleteTransaction: {
		NOT_FOUND: "삭제하려는 거래를 찾을 수 없습니다.",
		FORBIDDEN: "이 거래를 삭제할 권한이 없습니다.",
		DATABASE_ERROR:
			"거래를 삭제하는 중 문제가 발생했습니다. 다시 시도해주세요.",
	},

	navigateToOrganization: {
		NAVIGATION_FAILED: "조직 페이지로 이동하는 중 문제가 발생했습니다.",
		TIMEOUT_ERROR: "페이지 이동 시간이 초과되었습니다. 다시 시도해주세요.",
		UNKNOWN_ERROR: "페이지 이동 중 예상치 못한 문제가 발생했습니다.",
	},
};

/**
 * 에러 메시지 조회 함수
 */
export function getErrorMessage(
	errorCode: string,
	operation?: string,
): ErrorMessageConfig {
	// 작업별 특화 메시지 우선 확인
	if (operation && OPERATION_ERROR_MESSAGES[operation]?.[errorCode]) {
		return {
			userMessage: OPERATION_ERROR_MESSAGES[operation][errorCode],
			severity: ERROR_MESSAGES[errorCode]?.severity || "medium",
		};
	}

	// 일반 에러 메시지 반환
	return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * 에러 코드 추출 함수
 */
export function extractErrorCode(error: any): string {
	if (!error) return "UNKNOWN_ERROR";

	const message = error.message || error.toString();

	// 명시적 에러 코드 확인
	for (const code of Object.keys(ERROR_MESSAGES)) {
		if (message.includes(code)) {
			return code;
		}
	}

	// 패턴 매칭으로 에러 코드 추출
	if (message.includes("Category") && message.includes("not found")) {
		return "CATEGORY_NOT_FOUND";
	}

	if (message.includes("Payment method") && message.includes("not found")) {
		return "PAYMENT_METHOD_NOT_FOUND";
	}

	if (message.includes("Category type") && message.includes("not compatible")) {
		return "CATEGORY_TYPE_INCOMPATIBLE";
	}

	if (
		message.includes("amount") &&
		(message.includes("invalid") || message.includes("positive"))
	) {
		return "AMOUNT_INVALID";
	}

	if (message.includes("date") && message.includes("invalid")) {
		return "DATE_INVALID";
	}

	if (message.includes("navigation") || message.includes("이동")) {
		return "NAVIGATION_FAILED";
	}

	if (message.includes("timeout") || message.includes("초과")) {
		return "TIMEOUT_ERROR";
	}

	if (message.includes("network") || message.includes("fetch")) {
		return "NETWORK_ERROR";
	}

	return "UNKNOWN_ERROR";
}

/**
 * 에러 심각도별 색상 반환
 */
export function getErrorSeverityColor(severity: string): string {
	switch (severity) {
		case "low":
			return "text-yellow-600";
		case "medium":
			return "text-orange-600";
		case "high":
			return "text-red-600";
		case "critical":
			return "text-red-800";
		default:
			return "text-gray-600";
	}
}

/**
 * 에러 심각도별 아이콘 반환
 */
export function getErrorSeverityIcon(severity: string): string {
	switch (severity) {
		case "low":
			return "⚠️";
		case "medium":
			return "🚨";
		case "high":
			return "❌";
		case "critical":
			return "🔥";
		default:
			return "ℹ️";
	}
}
