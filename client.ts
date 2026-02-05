import { Nebula } from "@nebula-ai/sdk"
import {
	sanitizeContent,
	validateApiKeyFormat,
	validateCollectionName,
} from "./lib/validate.js"
import { log } from "./logger.ts"

export type SearchResult = {
	id: string
	content: string
	similarity?: number
	metadata?: Record<string, unknown>
}

type Collection = {
	id: string
	name: string
}

function limitText(text: string, max: number): string {
	return text.length > max ? `${text.slice(0, max)}…` : text
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

		const utterances = response.utterances || []
		const results: SearchResult[] = utterances.slice(0, limit).map((r) => ({
			id: r.chunk_id,
			content: r.text ?? "",
			similarity: r.activation_score,
			metadata: r.metadata ?? undefined,
		}))

		log.debugResponse("search", { count: results.length })
		return results
	}

	async deleteMemory(id: string): Promise<{ id: string; forgotten: boolean }> {
		log.debugRequest("delete", { id })

		await this.client.delete(id)

		log.debugResponse("delete", { id, forgotten: true })
		return { id, forgotten: true }
	}

	async forgetByQuery(
		query: string,
	): Promise<{ success: boolean; message: string }> {
		log.debugRequest("forgetByQuery", { query })

		const results = await this.search(query, 5)
		if (results.length === 0) {
			return { success: false, message: "No matching memory found to forget." }
		}

		const target = results[0]
		await this.deleteMemory(target.id)

		const preview = limitText(target.content, 100)
		return { success: true, message: `Forgot: "${preview}"` }
	}

	async wipeAllMemories(): Promise<{ deletedCount: number }> {
		const collectionId = await this.ensureCollection()

		log.debugRequest("wipeAll", { collectionId })

		const memories = await this.client.listMemories({
			collection_ids: [collectionId],
			limit: 1000,
		})

		if (!memories || memories.length === 0) {
			log.debug("wipeAll: no memories found")
			return { deletedCount: 0 }
		}

		const ids = memories.map((m) => m.memory_id).filter((id): id is string => Boolean(id))

		log.debug(`wipeAll: found ${ids.length} memories, deleting in batches`)

		let deletedCount = 0
		for (let i = 0; i < ids.length; i += 100) {
			const batch = ids.slice(i, i + 100)
			await this.client.delete(batch)
			deletedCount += batch.length
		}

		log.debugResponse("wipeAll", { deletedCount })
		return { deletedCount }
	}

	getCollectionName(): string {
		return this.collectionName
	}

	getCollectionId(): string | null {
		return this.collectionId
	}
}
