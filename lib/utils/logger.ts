/**
 * 구조화된 로깅 시스템
 * 개발 환경에서는 상세 로그, 프로덕션에서는 필수 로그만 기록
 */

export interface LogContext {
	userId?: string;
	organizationId?: string;
	operation: string;
	timestamp: string;
	userAgent?: string;
	[key: string]: any;
}

export interface TransactionCreationStep {
	step: string;
	data?: any;
	result?: any;
	error?: any;
	timestamp: string;
	duration?: number;
}

export class Logger {
	private isDevelopment = process.env.NODE_ENV === "development";
	private isProduction = process.env.NODE_ENV === "production";

	/**
	 * 거래 생성 작업 로깅
	 */
	logTransactionOperation(
		operation: string,
		data: any,
		result?: any,
		error?: any,
	): void {
		const logData = {
			operation,
			data: this.sanitizeLogData(data),
			result: result ? this.sanitizeLogData(result) : undefined,
			error: error ? this.formatError(error) : undefined,
			timestamp: new Date().toISOString(),
		};

		if (this.isDevelopment) {
			if (error) {
				console.error(`[TRANSACTION_ERROR] ${operation}:`, logData);
			} else {
				console.log(`[TRANSACTION_LOG] ${operation}:`, logData);
			}
		}

		// 프로덕션에서는 에러만 로깅
		if (this.isProduction && error) {
			console.error(`[TRANSACTION_ERROR] ${operation}:`, {
				operation,
				error: this.formatError(error),
				timestamp: logData.timestamp,
			});
		}
	}

	/**
	 * 거래 생성 단계별 로깅
	 */
	logTransactionCreationStep(step: TransactionCreationStep): void {
		const logData = {
			...step,
			data: step.data ? this.sanitizeLogData(step.data) : undefined,
			result: step.result ? this.sanitizeLogData(step.result) : undefined,
			error: step.error ? this.formatError(step.error) : undefined,
		};

		if (this.isDevelopment) {
			if (step.error) {
				console.error(`[TRANSACTION_STEP_ERROR] ${step.step}:`, logData);
			} else {
				console.log(`[TRANSACTION_STEP] ${step.step}:`, logData);
			}
		}

		// 프로덕션에서는 에러와 중요한 단계만 로깅
		if (this.isProduction) {
			const criticalSteps = [
				"validation_failed",
				"database_save_failed",
				"auth_failed",
			];
			if (step.error || criticalSteps.includes(step.step)) {
				console.log(`[TRANSACTION_STEP] ${step.step}:`, {
					step: step.step,
					error: step.error ? this.formatError(step.error) : undefined,
					timestamp: step.timestamp,
				});
			}
		}
	}

	/**
	 * 조직 네비게이션 이벤트 로깅
	 */
	logNavigationEvent(
		event: string,
		orgId: string,
		success: boolean,
		error?: any,
	): void {
		const logData = {
			event,
			organizationId: orgId,
			success,
			error: error ? this.formatError(error) : undefined,
			timestamp: new Date().toISOString(),
		};

		if (this.isDevelopment) {
			if (error) {
				console.error(`[NAVIGATION_ERROR] ${event}:`, logData);
			} else {
				console.log(`[NAVIGATION_LOG] ${event}:`, logData);
			}
		}

		// 프로덕션에서는 실패한 네비게이션만 로깅
		if (this.isProduction && !success) {
			console.error(`[NAVIGATION_ERROR] ${event}:`, logData);
		}
	}

	/**
	 * 일반 에러 로깅
	 */
	logError(error: Error, context: LogContext): void {
		const logData = {
			...context,
			error: this.formatError(error),
			timestamp: new Date().toISOString(),
		};

		if (this.isDevelopment) {
			console.error(`[ERROR] ${context.operation}:`, logData);
		}

		if (this.isProduction) {
			console.error(`[ERROR] ${context.operation}:`, {
				operation: context.operation,
				error: this.formatError(error),
				userId: context.userId,
				organizationId: context.organizationId,
				timestamp: logData.timestamp,
			});
		}
	}

	/**
	 * 성능 타이머 시작
	 */
	startTimer(operation: string): Timer {
		return new Timer(operation);
	}

	/**
	 * 로그 데이터 정제 (민감한 정보 제거)
	 */
	private sanitizeLogData(data: any): any {
		if (!data || typeof data !== "object") {
			return data;
		}

		const sanitized = { ...data };

		// 민감한 필드 제거
		const sensitiveFields = ["password", "token", "secret", "key", "auth"];
		sensitiveFields.forEach((field) => {
			if (field in sanitized) {
				sanitized[field] = "[REDACTED]";
			}
		});

		// 중첩 객체 처리
		Object.keys(sanitized).forEach((key) => {
			if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
				sanitized[key] = this.sanitizeLogData(sanitized[key]);
			}
		});

		return sanitized;
	}

	/**
	 * 에러 포맷팅
	 */
	private formatError(error: any): any {
		if (error instanceof Error) {
			return {
				name: error.name,
				message: error.message,
				stack: this.isDevelopment ? error.stack : undefined,
			};
		}
		return error;
	}
}

/**
 * 성능 측정 타이머
 */
export class Timer {
	private startTime: number;
	private operation: string;

	constructor(operation: string) {
		this.operation = operation;
		this.startTime = Date.now();
	}

	end(): number {
		const duration = Date.now() - this.startTime;

		if (process.env.NODE_ENV === "development") {
			console.log(`[PERFORMANCE] ${this.operation}: ${duration}ms`);
		}

		return duration;
	}
}

// 싱글톤 로거 인스턴스
export const logger = new Logger();
