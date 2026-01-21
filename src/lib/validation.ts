/**
 * Input validation utilities for API routes
 */

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate that a string is a valid UUID format
 */
export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Maximum base64 image size (approximately 10MB after encoding)
 * Base64 encoding increases size by ~33%, so 10MB file = ~14MB base64
 */
export const MAX_BASE64_LENGTH = 14_000_000;

/**
 * Validate base64 image data
 */
export function isValidBase64Image(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0) return false;
  if (value.length > MAX_BASE64_LENGTH) return false;
  return true;
}

/**
 * Sanitize error message for external response
 * Removes potentially sensitive information like file paths
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Remove file paths from error messages
    return error.message.replace(/\/[^\s:]+/g, '[path]');
  }
  return 'An unexpected error occurred';
}
