import type { NebulaClient } from "../client.ts"
import type { NebulaConfig } from "../config.ts"
import { log } from "../logger.ts"
import { buildDocumentId } from "../memory.ts"

function getLastTurn(messages: unknown[]): unknown[] {
	let lastUserIdx = -1
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i]
		if (
			msg &&
			typeof msg === "object" &&
			(msg as Record<string, unknown>).role === "user"
		) {
			lastUserIdx = i
			break
		}
	}
	return lastUserIdx >= 0 ? messages.slice(lastUserIdx) : messages
}

// Track conversation memory_id per session for appending messages
const sessionConversationMap = new Map<string, string>()

export function buildCaptureHandler(
	client: NebulaClient,
	cfg: NebulaConfig,
	getSessionKey: () => string | undefined,
) {
	return async (event: Record<string, unknown>) => {
		if (
			!event.success ||
			!Array.isArray(event.messages) ||
			event.messages.length === 0
		)
			return

		const lastTurn = getLastTurn(event.messages)
		const sk = getSessionKey()
		const sessionId = sk ? buildDocumentId(sk) : "default"
		const timestamp = new Date().toISOString()

		// Get existing conversation memory_id for this session (if any)
		let conversationMemoryId = sessionConversationMap.get(sessionId)

		for (const msg of lastTurn) {
			if (!msg || typeof msg !== "object") continue
			const msgObj = msg as Record<string, unknown>
			const role = msgObj.role
			if (role !== "user" && role !== "assistant") continue

			const msgContent = msgObj.content
			let content = ""

			if (typeof msgContent === "string") {
				content = msgContent
			} else if (Array.isArray(msgContent)) {
				const parts: string[] = []
				for (const block of msgContent) {
					if (!block || typeof block !== "object") continue
					const b = block as Record<string, unknown>
					if (b.type === "text" && typeof b.text === "string") {
						parts.push(b.text)
					}
				}
				content = parts.join("\n")
			}

			// Clean up nebula context tags if in "all" mode
			if (cfg.captureMode === "all") {
				content = content
					.replace(/<nebula-context>[\s\S]*?<\/nebula-context>\s*/g, "")
					.trim()
			}

			// Skip empty or very short content
			if (content.length < 10) continue

			log.debug(
				`capturing ${role} message (${content.length} chars) → memory_id: ${conversationMemoryId ?? "new"}`,
			)

			try {
				// Store message directly to Nebula with role and memory_id
				const result = await client.addMemory(
					content,
					{ source: "openclaw", session: sessionId, timestamp },
					{
						role: role as "user" | "assistant",
						...(conversationMemoryId && { memory_id: conversationMemoryId }),
					},
				)

				// If this was the first message, save the memory_id for subsequent messages
				if (!conversationMemoryId && result.id) {
					conversationMemoryId = result.id
					sessionConversationMap.set(sessionId, result.id)
					log.debug(`started new conversation: ${result.id}`)
				}
			} catch (err) {
				log.error(`capture failed for ${role} message`, err)
			}
		}
	}
}
