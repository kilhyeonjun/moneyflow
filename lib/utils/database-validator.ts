/**
 * 데이터베이스 관계 및 제약 조건 검증 유틸리티
 * Prisma relationMode = "prisma" 환경에서 수동으로 관계 무결성을 보장
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/utils/logger";
import { validateDatabaseId } from "@/lib/utils/uuid";
import { ServerActionError } from "@/lib/types";

export interface DatabaseValidationResult {
	isValid: boolean;
	error?: string;
	details?: any;
}

export class DatabaseValidator {
	/**
	 * 조직 존재 여부 및 활성 상태 확인
	 */
	async validateOrganizationExists(
		organizationId: string,
	): Promise<DatabaseValidationResult> {
		try {
			validateDatabaseId(organizationId, "Organization ID");

			const organization = await prisma.organization.findUnique({
				where: { id: organizationId },
				select: { id: true, name: true, createdAt: true },
			});

			if (!organization) {
				return {
					isValid: false,
					error: "Organization not found",
					details: { organizationId },
				};
			}

			return {
				isValid: true,
				details: { organization },
			};
		} catch (error) {
			logger.logError(error as Error, {
				operation: "validateOrganizationExists",
				organizationId,
				timestamp: new Date().toISOString(),
			});

			return {
				isValid: false,
				error:
					error instanceof Error ? error.message : "Unknown validation error",
			};
		}
	}

	/**
	 * 사용자가 조직의 멤버인지 확인
	 */
	async validateUserMembership(
		userId: string,
		organizationId: string,
	): Promise<DatabaseValidationResult> {
		try {
			validateDatabaseId(userId, "User ID");
			validateDatabaseId(organizationId, "Organization ID");

			const membership = await prisma.organizationMember.findFirst({
				where: {
					userId,
					organizationId,
				},
				select: {
					id: true,
					role: true,
					joinedAt: true,
				},
			});

			if (!membership) {
				return {
					isValid: false,
					error: "User is not a member of this organization",
					details: { userId, organizationId },
				};
			}

			return {
				isValid: true,
				details: { membership },
			};
		} catch (error) {
			logger.logError(error as Error, {
				operation: "validateUserMembership",
				userId,
				organizationId,
				timestamp: new Date().toISOString(),
			});

			return {
				isValid: false,
				error:
					error instanceof Error ? error.message : "Unknown validation error",
			};
		}
	}

	/**
	 * 카테고리가 조직에 속하고 활성 상태인지 확인
	 */
	async validateCategoryBelongsToOrganization(
		categoryId: string,
		organizationId: string,
	): Promise<DatabaseValidationResult> {
		try {
			validateDatabaseId(categoryId, "Category ID");
			validateDatabaseId(organizationId, "Organization ID");

			const category = await prisma.category.findFirst({
				where: {
					id: categoryId,
					organizationId,
					isActive: true,
				},
				select: {
					id: true,
					name: true,
					type: true,
					parentId: true,
					isActive: true,
				},
			});

			if (!category) {
				return {
					isValid: false,
					error:
						"Category not found, inactive, or does not belong to organization",
					details: { categoryId, organizationId },
				};
			}

			return {
				isValid: true,
				details: { category },
			};
		} catch (error) {
			logger.logError(error as Error, {
				operation: "validateCategoryBelongsToOrganization",
				categoryId,
				organizationId,
				timestamp: new Date().toISOString(),
			});

			return {
				isValid: false,
				error:
					error instanceof Error ? error.message : "Unknown validation error",
			};
		}
	}

	/**
	 * 결제수단이 조직에 속하고 활성 상태인지 확인
	 */
	async validatePaymentMethodBelongsToOrganization(
		paymentMethodId: string,
		organizationId: string,
	): Promise<DatabaseValidationResult> {
		try {
			validateDatabaseId(paymentMethodId, "Payment Method ID");
			validateDatabaseId(organizationId, "Organization ID");

			const paymentMethod = await prisma.paymentMethod.findFirst({
				where: {
					id: paymentMethodId,
					organizationId,
					isActive: true,
				},
				select: {
					id: true,
					name: true,
					type: true,
					isActive: true,
				},
			});

			if (!paymentMethod) {
				return {
					isValid: false,
					error:
						"Payment method not found, inactive, or does not belong to organization",
					details: { paymentMethodId, organizationId },
				};
			}

			return {
				isValid: true,
				details: { paymentMethod },
			};
		} catch (error) {
			logger.logError(error as Error, {
				operation: "validatePaymentMethodBelongsToOrganization",
				paymentMethodId,
				organizationId,
				timestamp: new Date().toISOString(),
			});

			return {
				isValid: false,
				error:
					error instanceof Error ? error.message : "Unknown validation error",
			};
		}
	}

	/**
	 * 거래가 조직에 속하는지 확인
	 */
	async validateTransactionBelongsToOrganization(
		transactionId: string,
		organizationId: string,
	): Promise<DatabaseValidationResult> {
		try {
			validateDatabaseId(transactionId, "Transaction ID");
			validateDatabaseId(organizationId, "Organization ID");

			const transaction = await prisma.transaction.findFirst({
				where: {
					id: transactionId,
					organizationId,
				},
				select: {
					id: true,
					amount: true,
					transactionType: true,
					createdAt: true,
				},
			});

			if (!transaction) {
				return {
					isValid: false,
					error: "Transaction not found or does not belong to organization",
					details: { transactionId, organizationId },
				};
			}

			return {
				isValid: true,
				details: { transaction },
			};
		} catch (error) {
			logger.logError(error as Error, {
				operation: "validateTransactionBelongsToOrganization",
				transactionId,
				organizationId,
				timestamp: new Date().toISOString(),
			});

			return {
				isValid: false,
				error:
					error instanceof Error ? error.message : "Unknown validation error",
			};
		}
	}

	/**
	 * 카테고리 계층 구조 검증 (부모-자식 관계)
	 */
	async validateCategoryHierarchy(
		categoryId: string,
		organizationId: string,
	): Promise<DatabaseValidationResult> {
		try {
			validateDatabaseId(categoryId, "Category ID");
			validateDatabaseId(organizationId, "Organization ID");

			const category = await prisma.category.findFirst({
				where: {
					id: categoryId,
					organizationId,
					isActive: true,
				},
				select: {
					id: true,
					name: true,
					type: true,
					parentId: true,
				},
			});

			if (!category) {
				return {
					isValid: false,
					error: "Category not found",
					details: { categoryId, organizationId },
				};
			}

			// 부모 카테고리가 있는 경우 검증
			if (category.parentId) {
				const parent = await prisma.category.findFirst({
					where: {
						id: category.parentId,
						organizationId,
						isActive: true,
					},
					select: {
						id: true,
						name: true,
						type: true,
					},
				});

				if (!parent) {
					return {
						isValid: false,
						error: "Parent category not found or inactive",
						details: {
							categoryId,
							parentId: category.parentId,
							organizationId,
						},
					};
				}

				return {
					isValid: true,
					details: { category, parent },
				};
			}

			return {
				isValid: true,
				details: { category },
			};
		} catch (error) {
			logger.logError(error as Error, {
				operation: "validateCategoryHierarchy",
				categoryId,
				organizationId,
				timestamp: new Date().toISOString(),
			});

			return {
				isValid: false,
				error:
					error instanceof Error ? error.message : "Unknown validation error",
			};
		}
	}

	/**
	 * 데이터베이스 연결 상태 확인
	 */
	async validateDatabaseConnection(): Promise<DatabaseValidationResult> {
		try {
			// 간단한 쿼리로 연결 상태 확인
			await prisma.$queryRaw`SELECT 1 as connection_test`;

			return {
				isValid: true,
				details: { connectionStatus: "healthy" },
			};
		} catch (error) {
			logger.logError(error as Error, {
				operation: "validateDatabaseConnection",
				timestamp: new Date().toISOString(),
			});

			return {
				isValid: false,
				error: "Database connection failed",
				details: {
					error: error instanceof Error ? error.message : "Unknown error",
				},
			};
		}
	}

	/**
	 * 종합적인 거래 생성 전 검증
	 */
	async validateTransactionCreationRequirements(
		organizationId: string,
		userId: string,
		categoryId?: string,
		paymentMethodId?: string,
	): Promise<DatabaseValidationResult> {
		try {
			// 1. 조직 존재 확인
			const orgValidation =
				await this.validateOrganizationExists(organizationId);
			if (!orgValidation.isValid) {
				return orgValidation;
			}

			// 2. 사용자 멤버십 확인
			const membershipValidation = await this.validateUserMembership(
				userId,
				organizationId,
			);
			if (!membershipValidation.isValid) {
				return membershipValidation;
			}

			// 3. 카테고리 검증 (선택사항)
			if (categoryId) {
				const categoryValidation =
					await this.validateCategoryBelongsToOrganization(
						categoryId,
						organizationId,
					);
				if (!categoryValidation.isValid) {
					return categoryValidation;
				}

				// 카테고리 계층 구조 검증
				const hierarchyValidation = await this.validateCategoryHierarchy(
					categoryId,
					organizationId,
				);
				if (!hierarchyValidation.isValid) {
					return hierarchyValidation;
				}
			}

			// 4. 결제수단 검증 (선택사항)
			if (paymentMethodId) {
				const paymentMethodValidation =
					await this.validatePaymentMethodBelongsToOrganization(
						paymentMethodId,
						organizationId,
					);
				if (!paymentMethodValidation.isValid) {
					return paymentMethodValidation;
				}
			}

			return {
				isValid: true,
				details: {
					organization: orgValidation.details?.organization,
					membership: membershipValidation.details?.membership,
					category: categoryId
						? await this.getCategoryDetails(categoryId)
						: null,
					paymentMethod: paymentMethodId
						? await this.getPaymentMethodDetails(paymentMethodId)
						: null,
				},
			};
		} catch (error) {
			logger.logError(error as Error, {
				operation: "validateTransactionCreationRequirements",
				organizationId,
				userId,
				categoryId,
				paymentMethodId,
				timestamp: new Date().toISOString(),
			});

			return {
				isValid: false,
				error:
					error instanceof Error ? error.message : "Unknown validation error",
			};
		}
	}

	/**
	 * 카테고리 상세 정보 조회
	 */
	private async getCategoryDetails(categoryId: string) {
		return await prisma.category.findUnique({
			where: { id: categoryId },
			select: {
				id: true,
				name: true,
				type: true,
				parentId: true,
			},
		});
	}

	/**
	 * 결제수단 상세 정보 조회
	 */
	private async getPaymentMethodDetails(paymentMethodId: string) {
		return await prisma.paymentMethod.findUnique({
			where: { id: paymentMethodId },
			select: {
				id: true,
				name: true,
				type: true,
			},
		});
	}
}

// 싱글톤 데이터베이스 검증자 인스턴스
export const databaseValidator = new DatabaseValidator();
