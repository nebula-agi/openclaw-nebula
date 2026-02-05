import { Nebula } from "@nebula-ai/sdk"
import {
	sanitizeContent,
	validateApiKeyFormat,
} from "./lib/validate.js"
import { log } from "./logger.ts"

// Just re-export Nebula's native types
export type SearchResult = unknown

export class NebulaClient {
	private client: Nebula
	private collectionId: string

	constructor(apiKey: string, collectionId: string) {
		const keyCheck = validateApiKeyFormat(apiKey)
		if (!keyCheck.valid) {
			throw new Error(`invalid API key: ${keyCheck.reason}`)
		}

		this.client = new Nebula({ apiKey })
		this.collectionId = collectionId
		log.info(`initialized (collectionId: ${collectionId})`)
	}

	async addMemory(
		content: string,
		metadata?: Record<string, string | number | boolean>,
		options?: {
			role?: "user" | "assistant"
			memory_id?: string
		},
	): Promise<{ id: string }> {
		const cleaned = sanitizeContent(content)

		log.debugRequest("storeMemory", {
			contentLength: cleaned.length,
			role: options?.role,
			memory_id: options?.memory_id,
			metadata,
		})

		const storePayload: Record<string, unknown> = {
			collection_id: this.collectionId,
			metadata: metadata as Record<string, unknown> | undefined,
		}

		if (options?.memory_id && options?.role) {
			// Appending to existing conversation - SDK requires array format
			storePayload.content = [{ content: cleaned, role: options.role }]
			storePayload.memory_id = options.memory_id
		} else if (options?.role) {
			// New conversation - SDK handles string + role
			storePayload.content = cleaned
			storePayload.role = options.role
		} else {
			// Plain document storage
			storePayload.content = cleaned
		}

		const memoryId = await this.client.storeMemory(storePayload)

		log.debugResponse("storeMemory", { id: memoryId })
		return { id: memoryId }
	}

	async search(query: string, limit = 5): Promise<SearchResult[]> {
		log.debugRequest("search", {
			query,
			limit,
			collectionId: this.collectionId,
		})

		const response = await this.client.search({
			query,
			collection_ids: [this.collectionId],
		})

		const utterances = (response.utterances || []).slice(0, limit)

		log.debugResponse("search", { count: utterances.length })
		return utterances as SearchResult[]
	}

	getCollectionId(): string {
		return this.collectionId
	}
}
