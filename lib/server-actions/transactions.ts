"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
	validateUserAndOrganization,
	withErrorHandling,
} from "@/lib/auth-server";
import {
	TransactionWithDetails,
	TransactionCreateInput,
	TransactionUpdateInput,
	TransactionFilters,
	ServerActionResult,
	ServerActionError,
	transformTransactionForFrontend,
} from "@/lib/types";
import {
	BaseServerAction,
	normalizePagination,
	createPaginatedResult,
	buildTransactionWhereClause,
	validateAmount,
	validateTransactionType,
	parseDate,
	aggregateTransactions,
	createServerAction,
	PaginationOptions,
	PaginatedResult,
	TransactionAggregation,
} from "./base";
import { logger, Timer } from "@/lib/utils/logger";
import { errorHandler, ErrorContext } from "@/lib/utils/error-handler";
import { databaseValidator } from "@/lib/utils/database-validator";
import { validateDatabaseId } from "@/lib/utils/uuid";

class TransactionActions extends BaseServerAction {
	/**
	 * 결제수단 검증 (조직 소속 및 활성 상태 확인)
	 */
	private async validatePaymentMethod(
		paymentMethodId: string,
		organizationId: string,
	): Promise<{ id: string; name: string; type: string }> {
		logger.logTransactionCreationStep({
			step: "payment_method_validation_start",
			data: { paymentMethodId },
			timestamp: new Date().toISOString(),
		});

		// UUID 형식 검증
		validateDatabaseId(paymentMethodId, "Payment Method ID");

		// 데이터베이스에서 결제수단 조회
		const paymentMethod = await prisma.paymentMethod.findFirst({
			where: {
				id: paymentMethodId,
				organizationId: organizationId,
				isActive: true, // 활성 상태 확인 추가
			},
			select: {
				id: true,
				name: true,
				type: true,
				isActive: true,
			},
		});

		if (!paymentMethod) {
			logger.logTransactionCreationStep({
				step: "payment_method_validation_failed",
				data: { paymentMethodId },
				error:
					"Payment method not found, inactive, or does not belong to organization",
				timestamp: new Date().toISOString(),
			});
			throw new Error(
				`${ServerActionError.VALIDATION_ERROR}: Payment method not found or does not belong to this organization`,
			);
		}

		logger.logTransactionCreationStep({
			step: "payment_method_validation_success",
			data: {
				paymentMethodId: paymentMethod.id,
				paymentMethodName: paymentMethod.name,
				paymentMethodType: paymentMethod.type,
			},
			timestamp: new Date().toISOString(),
		});

		return {
			id: paymentMethod.id,
			name: paymentMethod.name,
			type: paymentMethod.type,
		};
	}

	/**
	 * 카테고리 검증 (조직 소속, 활성 상태, 거래 유형 호환성 확인)
	 */
	private async validateCategory(
		categoryId: string,
		organizationId: string,
		transactionType: string,
	): Promise<{
		id: string;
		name: string;
		type: string;
		parentId: string | null;
	}> {
		logger.logTransactionCreationStep({
			step: "category_validation_start",
			data: { categoryId, transactionType },
			timestamp: new Date().toISOString(),
		});

		// UUID 형식 검증
		validateDatabaseId(categoryId, "Category ID");

		// 데이터베이스에서 카테고리 조회 (부모 카테고리 정보 포함)
		const category = await prisma.category.findFirst({
			where: {
				id: categoryId,
				organizationId: organizationId,
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
			logger.logTransactionCreationStep({
				step: "category_validation_failed",
				data: { categoryId },
				error:
					"Category not found, inactive, or does not belong to organization",
				timestamp: new Date().toISOString(),
			});
			throw new Error(
				`${ServerActionError.VALIDATION_ERROR}: Category not found or does not belong to this organization`,
			);
		}

		// 카테고리 타입과 거래 유형 호환성 검증
		if (!this.isCategoryTypeCompatible(category.type, transactionType)) {
			logger.logTransactionCreationStep({
				step: "category_type_compatibility_failed",
				data: {
					categoryId: categoryId,
					categoryType: category.type,
					transactionType: transactionType,
					compatibilityMap: this.getCategoryCompatibilityMap(),
				},
				error: `Category type '${category.type}' is not compatible with transaction type '${transactionType}'`,
				timestamp: new Date().toISOString(),
			});
			throw new Error(
				`${ServerActionError.VALIDATION_ERROR}: Category type '${category.type}' is not compatible with transaction type '${transactionType}'. Please select a category that supports '${transactionType}' transactions.`,
			);
		}

		logger.logTransactionCreationStep({
			step: "category_validation_success",
			data: {
				categoryId: category.id,
				categoryName: category.name,
				categoryType: category.type,
				transactionType: transactionType,
			},
			timestamp: new Date().toISOString(),
		});

		return {
			id: category.id,
			name: category.name,
			type: category.type,
			parentId: category.parentId,
		};
	}

	/**
	 * 카테고리 호환성 맵 반환 (디버깅용)
	 */
	private getCategoryCompatibilityMap(): Record<string, string[]> {
		return {
			income: ["income"],
			savings: ["income", "transfer"],
			fixed_expense: ["expense"],
			variable_expense: ["expense"],
		};
	}
	/**
	 * Helper function to enrich transactions with category information
	 */
	private async enrichTransactionsWithCategories<
		T extends { categoryId: string | null; [key: string]: any },
	>(
		transactions: T[],
		organizationId: string,
	): Promise<
		(T & {
			category?: {
				id: string;
				name: string;
				type: string;
				parent?: { id: string; name: string; type: string } | null;
			} | null;
		})[]
	> {
		if (transactions.length === 0) return [];

		// Get unique category IDs
		const categoryIds = [
			...new Set(transactions.map((t) => t.categoryId).filter(Boolean)),
		] as string[];

		if (categoryIds.length === 0) {
			return transactions.map((t) => ({ ...t, category: null }));
		}

		// Fetch all categories at once
		const categories = await prisma.category.findMany({
			where: {
				id: { in: categoryIds },
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

		// Get parent categories for hierarchical data
		const parentIds = [
			...new Set(categories.map((c) => c.parentId).filter(Boolean)),
		] as string[];

		const parentCategories =
			parentIds.length > 0
				? await prisma.category.findMany({
						where: {
							id: { in: parentIds },
							organizationId,
							isActive: true,
						},
						select: {
							id: true,
							name: true,
							type: true,
						},
					})
				: [];

		// Create lookup maps
		const categoryMap = new Map(categories.map((c) => [c.id, c]));
		const parentMap = new Map(parentCategories.map((c) => [c.id, c]));

		// Enrich transactions with category information
		return transactions.map((transaction) => {
			const category = transaction.categoryId
				? categoryMap.get(transaction.categoryId)
				: null;
			const enrichedCategory = category
				? {
						id: category.id,
						name: category.name,
						type: category.type,
						parent: category.parentId
							? parentMap.get(category.parentId) || null
							: null,
					}
				: null;

			return {
				...transaction,
				category: enrichedCategory,
			};
		});
	}

	/**
	 * Get transactions with filtering, pagination, and search
	 */
	async getTransactions(
		organizationId: string,
		filters?: Partial<TransactionFilters>,
		pagination?: PaginationOptions,
	): Promise<
		PaginatedResult<ReturnType<typeof transformTransactionForFrontend>>
	> {
		const { user } = await this.validateAuth(organizationId);

		const finalFilters: TransactionFilters = {
			organizationId,
			...filters,
		};

		const where = buildTransactionWhereClause(finalFilters);
		const paginationConfig = normalizePagination(pagination || {});

		// Get total count and transactions in parallel
		const [totalCount, transactions] = await Promise.all([
			prisma.transaction.count({ where }),
			prisma.transaction.findMany({
				where,
				include: {
					paymentMethod: {
						select: {
							id: true,
							name: true,
							type: true,
						},
					},
					organization: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: {
					transactionDate: "desc",
				},
				take: paginationConfig.take,
				skip: paginationConfig.skip,
			}),
		]);

		// Enrich with category information
		const enrichedTransactions = await this.enrichTransactionsWithCategories(
			transactions,
			organizationId,
		);

		// Transform for frontend compatibility
		const transformedTransactions = enrichedTransactions.map(
			transformTransactionForFrontend,
		);

		return await createPaginatedResult(
			transformedTransactions,
			totalCount,
			paginationConfig,
		);
	}

	/**
	 * Get a single transaction by ID
	 */
	async getTransaction(
		transactionId: string,
		organizationId: string,
	): Promise<ReturnType<typeof transformTransactionForFrontend>> {
		this.validateUUID(transactionId, "Transaction ID");
		await this.validateAuth(organizationId);

		const transaction = await prisma.transaction.findFirst({
			where: {
				id: transactionId,
				organizationId,
			},
			include: {
				paymentMethod: {
					select: {
						id: true,
						name: true,
						type: true,
					},
				},
				organization: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!transaction) {
			throw new Error(ServerActionError.NOT_FOUND);
		}

		// Enrich with category information
		const enrichedTransactions = await this.enrichTransactionsWithCategories(
			[transaction],
			organizationId,
		);

		return transformTransactionForFrontend(enrichedTransactions[0]);
	}

	/**
	 * Create a new transaction
	 */
	async createTransaction(
		input: TransactionCreateInput,
	): Promise<ReturnType<typeof transformTransactionForFrontend>> {
		const timer = logger.startTimer("createTransaction");
		const operationId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		logger.logTransactionCreationStep({
			step: "transaction_creation_start",
			data: { operationId, organizationId: input.organizationId },
			timestamp: new Date().toISOString(),
		});

		try {
			// Step 1: Authentication validation
			logger.logTransactionCreationStep({
				step: "auth_validation_start",
				data: { organizationId: input.organizationId },
				timestamp: new Date().toISOString(),
			});

			const { user } = await this.validateAuth(input.organizationId);

			logger.logTransactionCreationStep({
				step: "auth_validation_success",
				data: { userId: user.id, organizationId: input.organizationId },
				timestamp: new Date().toISOString(),
			});

			// Step 2: Required fields validation
			logger.logTransactionCreationStep({
				step: "required_fields_validation_start",
				data: {
					fields: [
						"organizationId",
						"amount",
						"description",
						"transactionType",
					],
				},
				timestamp: new Date().toISOString(),
			});

			this.validateRequiredFields(input, [
				"organizationId",
				"amount",
				"description",
				"transactionType",
			]);

			logger.logTransactionCreationStep({
				step: "required_fields_validation_success",
				timestamp: new Date().toISOString(),
			});

			// Step 3: Input validation and sanitization
			logger.logTransactionCreationStep({
				step: "input_validation_start",
				data: {
					amount: input.amount,
					transactionType: input.transactionType,
					hasTransactionDate: !!input.transactionDate,
				},
				timestamp: new Date().toISOString(),
			});

			const validatedInput = {
				...this.sanitizeInput(input),
				amount: validateAmount(input.amount as number),
				transactionType: validateTransactionType(input.transactionType),
				transactionDate: input.transactionDate
					? parseDate(input.transactionDate)
					: new Date(),
				userId: user.id,
			};

			logger.logTransactionCreationStep({
				step: "input_validation_success",
				data: {
					validatedAmount: validatedInput.amount,
					validatedTransactionType: validatedInput.transactionType,
					transactionDate: validatedInput.transactionDate.toISOString(),
				},
				timestamp: new Date().toISOString(),
			});

			// Step 4: Comprehensive database validation
			logger.logTransactionCreationStep({
				step: "comprehensive_database_validation_start",
				data: {
					organizationId: input.organizationId,
					userId: validatedInput.userId,
					categoryId: validatedInput.categoryId,
					paymentMethodId: validatedInput.paymentMethodId,
				},
				timestamp: new Date().toISOString(),
			});

			const dbValidationResult =
				await databaseValidator.validateTransactionCreationRequirements(
					input.organizationId,
					validatedInput.userId,
					validatedInput.categoryId,
					validatedInput.paymentMethodId,
				);

			if (!dbValidationResult.isValid) {
				logger.logTransactionCreationStep({
					step: "comprehensive_database_validation_failed",
					data: {
						organizationId: input.organizationId,
						userId: validatedInput.userId,
						categoryId: validatedInput.categoryId,
						paymentMethodId: validatedInput.paymentMethodId,
					},
					error: dbValidationResult.error,
					timestamp: new Date().toISOString(),
				});
				throw new Error(
					`${ServerActionError.VALIDATION_ERROR}: ${dbValidationResult.error}`,
				);
			}

			logger.logTransactionCreationStep({
				step: "comprehensive_database_validation_success",
				data: {
					organizationId: input.organizationId,
					validationDetails: dbValidationResult.details,
				},
				timestamp: new Date().toISOString(),
			});

			// Step 5: Individual validations (for detailed logging)
			if (validatedInput.paymentMethodId) {
				await this.validatePaymentMethod(
					validatedInput.paymentMethodId,
					input.organizationId,
				);
			}

			if (validatedInput.categoryId) {
				await this.validateCategory(
					validatedInput.categoryId,
					input.organizationId,
					validatedInput.transactionType,
				);
			}

			// Step 6: Database transaction creation
			logger.logTransactionCreationStep({
				step: "database_save_start",
				data: {
					organizationId: input.organizationId,
					userId: validatedInput.userId,
					amount: validatedInput.amount,
					transactionType: validatedInput.transactionType,
				},
				timestamp: new Date().toISOString(),
			});

			const transactionData: Prisma.TransactionCreateInput = {
				amount: validatedInput.amount,
				description: validatedInput.description || null,
				transactionDate: validatedInput.transactionDate,
				transactionType: validatedInput.transactionType,
				userId: validatedInput.userId,
				organization: {
					connect: { id: input.organizationId },
				},
				...(validatedInput.paymentMethodId && {
					paymentMethod: {
						connect: { id: validatedInput.paymentMethodId },
					},
				}),
				...(validatedInput.categoryId && {
					categoryId: validatedInput.categoryId,
				}),
				...(validatedInput.tags && { tags: validatedInput.tags }),
				...(validatedInput.memo && { memo: validatedInput.memo }),
				...(validatedInput.receiptUrl && {
					receiptUrl: validatedInput.receiptUrl,
				}),
			};

			const transaction = await prisma.transaction.create({
				data: transactionData,
				include: {
					paymentMethod: {
						select: {
							id: true,
							name: true,
							type: true,
						},
					},
					organization: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			});

			logger.logTransactionCreationStep({
				step: "database_save_success",
				data: {
					transactionId: transaction.id,
					amount: transaction.amount.toNumber(),
					transactionType: transaction.transactionType,
				},
				timestamp: new Date().toISOString(),
			});

			// Step 7: Enrich with category information
			logger.logTransactionCreationStep({
				step: "category_enrichment_start",
				timestamp: new Date().toISOString(),
			});

			const enrichedTransactions = await this.enrichTransactionsWithCategories(
				[transaction],
				input.organizationId,
			);

			logger.logTransactionCreationStep({
				step: "category_enrichment_success",
				data: { hasCategory: !!enrichedTransactions[0].category },
				timestamp: new Date().toISOString(),
			});

			// Step 8: Cache invalidation
			logger.logTransactionCreationStep({
				step: "cache_invalidation_start",
				timestamp: new Date().toISOString(),
			});

			revalidatePath(`/org/${input.organizationId}/transactions`);
			revalidatePath(`/org/${input.organizationId}/dashboard`);

			logger.logTransactionCreationStep({
				step: "cache_invalidation_success",
				timestamp: new Date().toISOString(),
			});

			// Step 9: Transaction creation completed
			const duration = timer.end();
			logger.logTransactionCreationStep({
				step: "transaction_creation_success",
				data: {
					operationId,
					transactionId: transaction.id,
					duration: `${duration}ms`,
				},
				timestamp: new Date().toISOString(),
			});

			return transformTransactionForFrontend(enrichedTransactions[0]);
		} catch (error) {
			const duration = timer.end();

			// 에러 컨텍스트 생성
			const errorContext: ErrorContext = {
				operation: "createTransaction",
				organizationId: input.organizationId,
				formData: {
					amount: input.amount,
					transactionType: input.transactionType,
					categoryId: input.categoryId,
					paymentMethodId: input.paymentMethodId,
				},
				timestamp: new Date().toISOString(),
			};

			// 상세 로깅
			logger.logTransactionCreationStep({
				step: "transaction_creation_failed",
				data: {
					operationId,
					duration: `${duration}ms`,
					errorCategory: errorHandler.categorizeError(error),
				},
				error: error,
				timestamp: new Date().toISOString(),
			});

			// 개발 환경에서 상세 에러 정보 로깅
			if (process.env.NODE_ENV === "development") {
				const devInfo = errorHandler.generateDeveloperInfo(error, errorContext);
				console.error("[TRANSACTION_DEV_ERROR]", devInfo);
			}

			// 에러 로깅
			logger.logError(error as Error, {
				...errorContext,
				timestamp: new Date().toISOString(),
			});

			// 사용자 친화적 에러 메시지로 변환하여 재던지기
			const userMessage = errorHandler.generateUserMessage(error, errorContext);
			const enhancedError = new Error(userMessage);

			// 원본 에러 정보 보존 (개발 환경용)
			if (process.env.NODE_ENV === "development") {
				(enhancedError as any).originalError = error;
				(enhancedError as any).context = errorContext;
			}

			throw enhancedError;
		}
	}

	/**
	 * Update an existing transaction
	 */
	async updateTransaction(
		input: TransactionUpdateInput,
	): Promise<ReturnType<typeof transformTransactionForFrontend>> {
		this.validateUUID(input.id, "Transaction ID");

		if (!input.organizationId) {
			throw new Error(
				`${ServerActionError.VALIDATION_ERROR}: Organization ID is required`,
			);
		}

		const { user } = await this.validateAuth(input.organizationId);

		// Check if transaction exists and belongs to the organization
		const existingTransaction = await prisma.transaction.findFirst({
			where: {
				id: input.id,
				organizationId: input.organizationId,
			},
		});

		if (!existingTransaction) {
			throw new Error(ServerActionError.NOT_FOUND);
		}

		// Prepare update data
		const updateData: any = this.sanitizeInput(input);
		delete updateData.id;
		delete updateData.organizationId; // Can't update organization

		// Validate fields if they're being updated
		if (updateData.amount !== undefined) {
			updateData.amount = validateAmount(updateData.amount as number);
		}

		if (updateData.transactionType !== undefined) {
			updateData.transactionType = validateTransactionType(
				updateData.transactionType,
			);
		}

		if (updateData.transactionDate !== undefined) {
			updateData.transactionDate = parseDate(updateData.transactionDate);
		}

		// Validate payment method if being updated
		if (updateData.paymentMethodId !== undefined) {
			if (updateData.paymentMethodId) {
				this.validateUUID(updateData.paymentMethodId, "Payment Method ID");

				const paymentMethod = await prisma.paymentMethod.findFirst({
					where: {
						id: updateData.paymentMethodId,
						organizationId: input.organizationId,
					},
				});

				if (!paymentMethod) {
					throw new Error(
						`${ServerActionError.VALIDATION_ERROR}: Payment method not found or does not belong to this organization`,
					);
				}
			}
		}

		// Validate category if being updated
		if (updateData.categoryId !== undefined) {
			if (updateData.categoryId) {
				this.validateUUID(updateData.categoryId, "Category ID");

				const category = await prisma.category.findFirst({
					where: {
						id: updateData.categoryId,
						organizationId: input.organizationId,
						isActive: true,
					},
				});

				if (!category) {
					throw new Error(
						`${ServerActionError.VALIDATION_ERROR}: Category not found or does not belong to this organization`,
					);
				}

				// Validate category type matches transaction type
				const transactionType =
					updateData.transactionType || existingTransaction.transactionType;
				if (!this.isCategoryTypeCompatible(category.type, transactionType)) {
					throw new Error(
						`${ServerActionError.VALIDATION_ERROR}: Category type '${category.type}' is not compatible with transaction type '${transactionType}'`,
					);
				}
			}
		}

		// Update transaction
		const updatedTransaction = await prisma.transaction.update({
			where: { id: input.id },
			data: updateData,
			include: {
				paymentMethod: {
					select: {
						id: true,
						name: true,
						type: true,
					},
				},
				organization: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		// Enrich with category information
		const enrichedTransactions = await this.enrichTransactionsWithCategories(
			[updatedTransaction],
			input.organizationId,
		);

		// Revalidate relevant pages
		revalidatePath(`/org/${input.organizationId}/transactions`);
		revalidatePath(`/org/${input.organizationId}/dashboard`);

		return transformTransactionForFrontend(enrichedTransactions[0]);
	}

	/**
	 * Delete a transaction
	 */
	async deleteTransaction(
		transactionId: string,
		organizationId: string,
	): Promise<{ success: boolean }> {
		this.validateUUID(transactionId, "Transaction ID");
		await this.validateAuth(organizationId);

		// Check if transaction exists and belongs to the organization
		const transaction = await prisma.transaction.findFirst({
			where: {
				id: transactionId,
				organizationId,
			},
		});

		if (!transaction) {
			throw new Error(ServerActionError.NOT_FOUND);
		}

		// Delete the transaction
		await prisma.transaction.delete({
			where: { id: transactionId },
		});

		// Revalidate relevant pages
		revalidatePath(`/org/${organizationId}/transactions`);
		revalidatePath(`/org/${organizationId}/dashboard`);

		return { success: true };
	}

	/**
	 * Get transaction statistics and aggregations
	 */
	async getTransactionStats(
		organizationId: string,
		filters?: Partial<TransactionFilters>,
	): Promise<TransactionAggregation> {
		await this.validateAuth(organizationId);

		const finalFilters: TransactionFilters = {
			organizationId,
			...filters,
		};

		return await aggregateTransactions(finalFilters);
	}

	/**
	 * Get recent transactions (used for dashboard)
	 */
	async getRecentTransactions(
		organizationId: string,
		limit: number = 10,
	): Promise<ReturnType<typeof transformTransactionForFrontend>[]> {
		await this.validateAuth(organizationId);

		const transactions = await prisma.transaction.findMany({
			where: { organizationId },
			include: {
				paymentMethod: {
					select: {
						id: true,
						name: true,
						type: true,
					},
				},
				organization: {
					select: {
						id: true,
						name: true,
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
			take: Math.min(limit, 50), // Cap at 50
		});

		// Enrich with category information
		const enrichedTransactions = await this.enrichTransactionsWithCategories(
			transactions,
			organizationId,
		);

		return enrichedTransactions.map(transformTransactionForFrontend);
	}

	/**
	 * Get transactions grouped by category with statistics
	 */
	async getTransactionsByCategory(
		organizationId: string,
		filters?: Partial<TransactionFilters>,
	): Promise<
		{
			categoryId: string | null;
			categoryName: string;
			categoryType: string | null;
			transactionCount: number;
			totalAmount: number;
			averageAmount: number;
			transactions: ReturnType<typeof transformTransactionForFrontend>[];
		}[]
	> {
		await this.validateAuth(organizationId);

		const finalFilters: TransactionFilters = {
			organizationId,
			...filters,
		};

		const where = buildTransactionWhereClause(finalFilters);

		// Get transactions grouped by category
		const transactions = await prisma.transaction.findMany({
			where,
			include: {
				paymentMethod: {
					select: {
						id: true,
						name: true,
						type: true,
					},
				},
				organization: {
					select: {
						id: true,
						name: true,
					},
				},
			},
			orderBy: {
				transactionDate: "desc",
			},
		});

		// Enrich with category information
		const enrichedTransactions = await this.enrichTransactionsWithCategories(
			transactions,
			organizationId,
		);

		// Group by category
		const categoryGroups = new Map<
			string | null,
			typeof enrichedTransactions
		>();

		enrichedTransactions.forEach((transaction) => {
			const categoryId = transaction.categoryId;
			if (!categoryGroups.has(categoryId)) {
				categoryGroups.set(categoryId, []);
			}
			categoryGroups.get(categoryId)!.push(transaction);
		});

		// Calculate statistics for each category
		const result = Array.from(categoryGroups.entries()).map(
			([categoryId, categoryTransactions]) => {
				const totalAmount = categoryTransactions.reduce(
					(sum, t) => sum + t.amount.toNumber(),
					0,
				);
				const averageAmount = totalAmount / categoryTransactions.length;

				const firstTransaction = categoryTransactions[0];
				const categoryName =
					firstTransaction?.category?.name || "Uncategorized";
				const categoryType = firstTransaction?.category?.type || null;

				return {
					categoryId,
					categoryName,
					categoryType,
					transactionCount: categoryTransactions.length,
					totalAmount: Math.round(totalAmount * 100) / 100,
					averageAmount: Math.round(averageAmount * 100) / 100,
					transactions: categoryTransactions.map(
						transformTransactionForFrontend,
					),
				};
			},
		);

		// Sort by total amount (descending)
		return result.sort((a, b) => b.totalAmount - a.totalAmount);
	}

	// Private helper methods

	/**
	 * Check if category type is compatible with transaction type
	 * 개선된 호환성 검사 - 더 명확한 로직과 에러 처리
	 */
	private isCategoryTypeCompatible(
		categoryType: string,
		transactionType: string,
	): boolean {
		// 입력값 검증
		if (!categoryType || !transactionType) {
			logger.logTransactionCreationStep({
				step: "category_compatibility_check_invalid_input",
				data: { categoryType, transactionType },
				error: "Invalid category type or transaction type",
				timestamp: new Date().toISOString(),
			});
			return false;
		}

		const compatibilityMap = this.getCategoryCompatibilityMap();

		// 카테고리 타입이 존재하는지 확인
		if (!compatibilityMap[categoryType]) {
			logger.logTransactionCreationStep({
				step: "category_compatibility_check_unknown_category_type",
				data: {
					categoryType,
					transactionType,
					availableTypes: Object.keys(compatibilityMap),
				},
				error: `Unknown category type: ${categoryType}`,
				timestamp: new Date().toISOString(),
			});
			return false;
		}

		const isCompatible =
			compatibilityMap[categoryType].includes(transactionType);

		logger.logTransactionCreationStep({
			step: "category_compatibility_check_result",
			data: {
				categoryType,
				transactionType,
				isCompatible,
				allowedTransactionTypes: compatibilityMap[categoryType],
			},
			timestamp: new Date().toISOString(),
		});

		return isCompatible;
	}
}

// Create instance and export wrapped methods
const transactionActions = new TransactionActions();

// Export server actions with error handling
export const getTransactions = createServerAction(
	async (
		organizationId: string,
		filters?: Partial<TransactionFilters>,
		pagination?: PaginationOptions,
	) => transactionActions.getTransactions(organizationId, filters, pagination),
);

export const getTransaction = createServerAction(
	async (transactionId: string, organizationId: string) =>
		transactionActions.getTransaction(transactionId, organizationId),
);

export const createTransaction = createServerAction(
	async (input: TransactionCreateInput) =>
		transactionActions.createTransaction(input),
);

export const updateTransaction = createServerAction(
	async (input: TransactionUpdateInput) =>
		transactionActions.updateTransaction(input),
);

export const deleteTransaction = createServerAction(
	async (transactionId: string, organizationId: string) =>
		transactionActions.deleteTransaction(transactionId, organizationId),
);

export const getTransactionStats = createServerAction(
	async (organizationId: string, filters?: Partial<TransactionFilters>) =>
		transactionActions.getTransactionStats(organizationId, filters),
);

export const getRecentTransactions = createServerAction(
	async (organizationId: string, limit?: number) =>
		transactionActions.getRecentTransactions(organizationId, limit),
);

export const getTransactionsByCategory = createServerAction(
	async (organizationId: string, filters?: Partial<TransactionFilters>) =>
		transactionActions.getTransactionsByCategory(organizationId, filters),
);
