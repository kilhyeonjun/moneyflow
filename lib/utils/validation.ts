/**
 * UUID validation utilities
 */

// UUID v4 validation regex
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validates if a string is a valid UUID
 * @param uuid - The string to validate
 * @returns boolean indicating if the string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid)
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
