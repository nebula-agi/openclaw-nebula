/**
 * Validation utilities for Nebula plugin
 */

/**
 * Validate Nebula API key format
 * Nebula uses simple bearer tokens without special prefixes
 */
export function validateApiKeyFormat(apiKey: string): { valid: boolean; reason?: string } {
	if (!apiKey || typeof apiKey !== "string") {
		return { valid: false, reason: "API key is empty or not a string" }
	}
	if (apiKey.length < 10) {
		return { valid: false, reason: "API key is too short" }
	}
	if (/\s/.test(apiKey)) {
		return { valid: false, reason: "API key contains whitespace" }
	}
	return { valid: true }
}

/**
 * Validate collection name format
 */
export function validateCollectionName(name: string): { valid: boolean; reason?: string } {
	if (!name || typeof name !== "string") {
		return { valid: false, reason: "name is empty" }
	}
	if (name.length > 100) {
		return { valid: false, reason: "name exceeds 100 characters" }
	}
	if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
		return {
			valid: false,
			reason: "name contains invalid characters (only alphanumeric, underscore, hyphen allowed)",
		}
	}
	if (/^[-_]|[-_]$/.test(name)) {
		return { valid: false, reason: "name must not start or end with - or _" }
	}
	return { valid: true }
}

/**
 * Remove problematic control characters and limit length
 */
const CONTROL_CHAR_PATTERNS = [
	/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, // C0 control codes except \n
	/\uFEFF/g, // Zero-width no-break space
	/[\uFFF0-\uFFFF]/g, // Special Unicode range
]

export function sanitizeContent(
	content: string,
	maxLength = 100_000,
): string {
	if (!content || typeof content !== "string") return ""

	let cleaned = content
	for (const pattern of CONTROL_CHAR_PATTERNS) {
		cleaned = cleaned.replace(pattern, "")
	}

	if (cleaned.length > maxLength) {
		cleaned = cleaned.slice(0, maxLength)
	}

	return cleaned
}

/**
 * Validate content length
 */
export function validateContentLength(
	content: string,
	minLength = 1,
	maxLength = 100_000,
): { valid: boolean; reason?: string } {
	if (content.length < minLength) {
		return { valid: false, reason: `content below minimum length (${minLength})` }
	}
	if (content.length > maxLength) {
		return { valid: false, reason: `content exceeds maximum length (${maxLength})` }
	}
	return { valid: true }
}

/**
 * Sanitize metadata by removing invalid keys and limiting values
 */
const MAX_METADATA_KEYS = 50
const MAX_KEY_LENGTH = 128
const MAX_VALUE_LENGTH = 1024

export function sanitizeMetadata(
	metadata: Record<string, unknown>,
): Record<string, string | number | boolean> {
	const result: Record<string, string | number | boolean> = {}
	let count = 0

	for (const [key, value] of Object.entries(metadata)) {
		if (count >= MAX_METADATA_KEYS) break

		// Skip invalid keys
		if (key.length > MAX_KEY_LENGTH) continue
		if (!/^[\w.-]+$/.test(key)) continue

		if (typeof value === "string") {
			result[key] = value.slice(0, MAX_VALUE_LENGTH)
			count++
		} else if (typeof value === "number" && Number.isFinite(value)) {
			result[key] = value
			count++
		} else if (typeof value === "boolean") {
			result[key] = value
			count++
		}
	}

	return result
}

