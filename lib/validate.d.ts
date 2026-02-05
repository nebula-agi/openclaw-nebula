/**
 * Validation utilities for Nebula plugin
 */
/**
 * Validate Nebula API key format
 * Nebula uses simple bearer tokens without special prefixes
 */
export declare function validateApiKeyFormat(apiKey: string): {
    valid: boolean;
    reason?: string;
};
/**
 * Validate collection name format
 */
export declare function validateCollectionName(name: string): {
    valid: boolean;
    reason?: string;
};
export declare function sanitizeContent(content: string, maxLength?: number): string;
/**
 * Validate content length
 */
export declare function validateContentLength(content: string, minLength?: number, maxLength?: number): {
    valid: boolean;
    reason?: string;
};
export declare function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, string | number | boolean>;
