import type { OpenClawPluginApi } from "openclaw/plugin-sdk"
import type { NebulaClient } from "../client.ts"
import type { NebulaConfig } from "../config.ts"
import { log } from "../logger.ts"
import { buildDocumentId, detectCategory } from "../memory.ts"

export function registerCommands(
	api: OpenClawPluginApi,
	client: NebulaClient,
	_cfg: NebulaConfig,
	getSessionKey: () => string | undefined,
): void {
	api.registerCommand({
		name: "nebula-remember",
		description: "Save something to Nebula memory",
		acceptsArgs: true,
		requireAuth: true,
		handler: async (ctx: { args?: string }) => {
			const text = ctx.args?.trim()
			if (!text) {
				return { text: "Usage: /nebula-remember <text to remember>" }
			}

			log.debug(`/nebula-remember command: "${text.slice(0, 50)}"`)

			try {
				const category = detectCategory(text)
				const sk = getSessionKey()
				const sessionId = sk ? buildDocumentId(sk) : undefined
				// Store directly to Nebula without pre-chunking
				await client.addMemory(
					text,
					{ type: category, source: "openclaw_command", session: sessionId ?? "command" },
				)

				const preview = text.length > 60 ? `${text.slice(0, 60)}…` : text
				return { text: `Remembered: "${preview}"` }
			} catch (err) {
				log.error("/nebula-remember failed", err)
				return { text: "Failed to save memory. Check logs for details." }
			}
		},
	})

	api.registerCommand({
		name: "nebula-recall",
		description: "Search your Nebula memories",
		acceptsArgs: true,
		requireAuth: true,
		handler: async (ctx: { args?: string }) => {
			const query = ctx.args?.trim()
			if (!query) {
				return { text: "Usage: /nebula-recall <search query>" }
			}

			log.debug(`/nebula-recall command: "${query}"`)

			try {
				const results = await client.search(query, 5)

				if (results.length === 0) {
					return { text: `No memories found for: "${query}"` }
				}

				const lines = results.map((r, i) => {
					const score = r.similarity
						? ` (${(r.similarity * 100).toFixed(0)}%)`
						: ""
					return `${i + 1}. ${r.content || r.memory || ""}${score}`
				})

				return {
					text: `Found ${results.length} memories:\n\n${lines.join("\n")}`,
				}
			} catch (err) {
				log.error("/nebula-recall failed", err)
				return { text: "Failed to search memories. Check logs for details." }
			}
		},
	})
}
