import { hostname } from "node:os"

export type CaptureMode = "everything" | "all"

export type NebulaConfig = {
	apiKey: string
	collectionName: string
	autoRecall: boolean
	autoCapture: boolean
	captureMode: CaptureMode
	debug: boolean
}

const ALLOWED_KEYS = [
	"apiKey",
	"collectionName",
	"autoRecall",
	"autoCapture",
	"captureMode",
	"debug",
]

function assertAllowedKeys(
	value: Record<string, unknown>,
	allowed: string[],
	label: string,
): void {
	const unknown = Object.keys(value).filter((k) => !allowed.includes(k))
	if (unknown.length > 0) {
		throw new Error(`${label} has unknown keys: ${unknown.join(", ")}`)
	}
}

function resolveEnvVars(value: string): string {
	return value.replace(/\$\{([^}]+)\}/g, (_, envVar: string) => {
		const envValue = process.env[envVar]
		if (!envValue) {
			throw new Error(`Environment variable ${envVar} is not set`)
		}
		return envValue
	})
}

function sanitizeTag(raw: string): string {
	return raw
		.replace(/[^a-zA-Z0-9_]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "")
}

function defaultCollectionName(): string {
	return sanitizeTag(`openclaw_${hostname()}`)
}

export function parseConfig(raw: unknown): NebulaConfig {
	const cfg =
		raw && typeof raw === "object" && !Array.isArray(raw)
			? (raw as Record<string, unknown>)
			: {}

	if (Object.keys(cfg).length > 0) {
		assertAllowedKeys(cfg, ALLOWED_KEYS, "nebula config")
	}

	const apiKey =
		typeof cfg.apiKey === "string" && cfg.apiKey.length > 0
			? resolveEnvVars(cfg.apiKey)
			: process.env.NEBULA_API_KEY

	if (!apiKey) {
		throw new Error(
			"nebula: apiKey is required (set in plugin config or NEBULA_API_KEY env var)",
		)
	}

	return {
		apiKey,
		collectionName: cfg.collectionName
			? sanitizeTag(cfg.collectionName as string)
			: defaultCollectionName(),
		autoRecall: (cfg.autoRecall as boolean) ?? true,
		autoCapture: (cfg.autoCapture as boolean) ?? true,
		captureMode:
			cfg.captureMode === "everything"
				? ("everything" as const)
				: ("all" as const),
		debug: (cfg.debug as boolean) ?? false,
	}
}

export const nebulaConfigSchema = {
	parse: parseConfig,
}
