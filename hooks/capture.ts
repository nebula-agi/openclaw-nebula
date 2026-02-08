import type { NebulaClient } from "../client.ts"
import type { NebulaConfig } from "../config.ts"
import { log } from "../logger.ts"
import { buildDocumentId } from "../memory.ts"

/**
 * Messages that are entirely system/gateway noise and should be skipped.
 * These match the FULL message content, not just a prefix.
 */
const SKIP_PATTERNS = [
	// Gateway status: [timestamp] Platform gateway connected/disconnected/etc.
	/^\[[\d\-\s:]+[A-Z]{2,4}\]\s+\w+\s+gateway\s+\w+\.?\s*$/i,
	// Session lifecycle: [timestamp] Session started/ended/expired
	/^\[[\d\-\s:]+[A-Z]{2,4}\]\s+.*session\s+\w+\.?\s*$/i,
]

/**
 * Returns true if the message is entirely system noise and should be skipped.
 */
function isSystemNoise(text: string): boolean {
	return SKIP_PATTERNS.some((p) => p.test(text.trim()))
}

/**
 * Strip messaging platform metadata from start/end of content.
 * Preserves any bracketed text in the middle of the message (likely user content).
 */
function cleanMessageContent(text: string): string {
	return (
		text
			// Leading: message headers e.g. [WhatsApp +14697030568 +5m 2026-02-05 14:12 PST]
			.replace(/^\[(?:[A-Za-z]+\s)?[+\d\s\-:]+\d{4}[\s\w]*\]\s*/m, "")
			// Leading: reply/action markers e.g. [[reply_to_current]]
			.replace(/^\[\[[^\]]*\]\]\s*/, "")
			// Trailing: message IDs e.g. [message_id: 3A77687B7B36ACF62A66]
			.replace(/\s*\[(?:message_id|msg_id):\s*[^\]]+\]\s*$/i, "")
			.trim()
	)
}

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

			// Skip system/gateway noise (matched against full message)
			if (isSystemNoise(content)) continue

			// Strip messaging platform metadata (headers, IDs, reply markers)
			content = cleanMessageContent(content)

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
