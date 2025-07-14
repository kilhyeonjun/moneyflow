/**
 * UUID validation utilities
 * Updated to support UUID v7 (time-ordered UUIDs)
 */

import { v7 as uuidv7, validate as uuidValidate, version as uuidVersion } from 'uuid'

// UUID v4 validation regex (legacy support)
export const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// UUID v7 validation regex
export const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// General UUID validation regex (any version)
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validates if a string is a valid UUID (any version)
 * @param uuid - The string to validate
 * @returns boolean indicating if the string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  return uuidValidate(uuid)
}

/**
 * Validates if a string is specifically a UUID v7
 * @param uuid - The string to validate
 * @returns boolean indicating if the string is a valid UUID v7
 */
export function isValidUUIDv7(uuid: string): boolean {
  return uuidValidate(uuid) && uuidVersion(uuid) === 7
}

/**
 * Validates if a string is specifically a UUID v4 (legacy support)
 * @param uuid - The string to validate
 * @returns boolean indicating if the string is a valid UUID v4
 */
export function isValidUUIDv4(uuid: string): boolean {
  return uuidValidate(uuid) && uuidVersion(uuid) === 4
}

/**
 * Validates UUID and throws an error if invalid
 * @param uuid - The UUID to validate
 * @param fieldName - Name of the field for error message
 * @throws Error if UUID is invalid
 */
export function validateUUID(uuid: string, fieldName: string = 'ID'): void {
  if (!isValidUUID(uuid)) {
    throw new Error(`Invalid ${fieldName} format. Must be a valid UUID.`)
  }
}

/**
 * Validates multiple UUIDs
 * @param uuids - Array of UUIDs to validate
 * @param fieldName - Name of the field for error message
 * @returns boolean indicating if all UUIDs are valid
 */
export function validateUUIDs(uuids: string[], fieldName: string = 'IDs'): boolean {
  return uuids.every(uuid => isValidUUID(uuid))
}

/**
 * Generates a new UUID v7 (time-ordered)
 * @returns string - A new UUID v7
 */
export function generateUUIDv7(): string {
  return uuidv7()
}

/**
 * Extracts timestamp from UUID v7
 * @param uuidv7 - UUID v7 string
 * @returns Date object representing when the UUID was created
 */
export function extractTimestampFromUUIDv7(uuidv7: string): Date {
  if (!isValidUUIDv7(uuidv7)) {
    throw new Error('Invalid UUID v7 format')
  }
  
  // UUID v7의 첫 48비트가 타임스탬프 (밀리초)
  const hex = uuidv7.replace(/-/g, '').substring(0, 12)
  const timestamp = parseInt(hex, 16)
  
  return new Date(timestamp)
}

/**
 * Gets UUID version
 * @param uuid - UUID string
 * @returns number - UUID version (4, 7, etc.)
 */
export function getUUIDVersion(uuid: string): number {
  if (!isValidUUID(uuid)) {
    throw new Error('Invalid UUID format')
  }
  return uuidVersion(uuid)
}
