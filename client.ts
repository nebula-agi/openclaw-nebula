import { Nebula } from "@nebula-ai/sdk"
import {
	sanitizeContent,
	validateApiKeyFormat,
	validateCollectionName,
} from "./lib/validate.js"
import { log } from "./logger.ts"

// Just re-export Nebula's native types
export type SearchResult = unknown

type Collection = {
	id: string
	name: string
}

export class NebulaClient {
	private client: Nebula
	private collectionName: string
	private collectionId: string | null = null

	constructor(apiKey: string, collectionName: string) {
		const keyCheck = validateApiKeyFormat(apiKey)
		if (!keyCheck.valid) {
			throw new Error(`invalid API key: ${keyCheck.reason}`)
		}

		const nameCheck = validateCollectionName(collectionName)
		if (!nameCheck.valid) {
			log.warn(`collection name warning: ${nameCheck.reason}`)
		}

		this.client = new Nebula({ apiKey })
		this.collectionName = collectionName
		log.info(`initialized (collection: ${collectionName})`)
	}

	private async ensureCollection(): Promise<string> {
		if (this.collectionId) {
			return this.collectionId
		}

		try {
			log.debug(`ensuring collection exists: ${this.collectionName}`)

			const collections = await this.client.listCollections()
			const existing = collections.find(
				(c: Collection) => c.name === this.collectionName,
			)

			if (existing) {
				this.collectionId = existing.id
				log.debug(`found existing collection: ${this.collectionId}`)
			} else {
				const created = await this.client.createCollection({
					name: this.collectionName,
					description: `OpenClaw Nebula memory storage for ${this.collectionName}`,
				})
				this.collectionId = created.id
				log.debug(`created new collection: ${this.collectionId}`)
			}

			return this.collectionId
		} catch (error) {
			log.error("failed to ensure collection", error)
			throw new Error(
				`Failed to initialize collection "${this.collectionName}": ${error}`,
			)
		}
	}

	async addMemory(
		content: string,
		metadata?: Record<string, string | number | boolean>,
		options?: {
			role?: "user" | "assistant"
			memory_id?: string
		},
	): Promise<{ id: string }> {
		const collectionId = await this.ensureCollection()
		const cleaned = sanitizeContent(content)

		log.debugRequest("storeMemory", {
			contentLength: cleaned.length,
			role: options?.role,
			memory_id: options?.memory_id,
			metadata,
		})

		const storePayload: Record<string, unknown> = {
			collection_id: collectionId,
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
		const collectionId = await this.ensureCollection()

		log.debugRequest("search", {
			query,
			limit,
			collectionId,
		})

		const response = await this.client.search({
			query,
			collection_ids: [collectionId],
		})

		const utterances = (response.utterances || []).slice(0, limit)

		log.debugResponse("search", { count: utterances.length })
		return utterances as SearchResult[]
	}

	getCollectionName(): string {
		return this.collectionName
	}

	getCollectionId(): string | null {
		return this.collectionId
	}
}
