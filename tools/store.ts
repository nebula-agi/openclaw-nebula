import { Type } from "@sinclair/typebox"
import type { OpenClawPluginApi } from "openclaw/plugin-sdk"
import { stringEnum } from "openclaw/plugin-sdk"
import type { NebulaClient } from "../client.ts"
import type { NebulaConfig } from "../config.ts"
import { log } from "../logger.ts"
import {
	buildDocumentId,
	detectCategory,
	MEMORY_CATEGORIES,
} from "../memory.ts"

export function registerStoreTool(
	api: OpenClawPluginApi,
	client: NebulaClient,
	_cfg: NebulaConfig,
	getSessionKey: () => string | undefined,
): void {
	api.registerTool(
		{
			name: "nebula_store",
			label: "Memory Store",
			description: "Save important information to long-term memory using Nebula.",
			parameters: Type.Object({
				text: Type.String({ description: "Information to remember" }),
				category: Type.Optional(stringEnum(MEMORY_CATEGORIES)),
			}),
			async execute(
				_toolCallId: string,
				params: { text: string; category?: string },
			) {
				const category = params.category ?? detectCategory(params.text)
				const sk = getSessionKey()
				const sessionId = sk ? buildDocumentId(sk) : undefined

				log.debug(`store tool: category="${category}" session="${sessionId}"`)

				// Store directly to Nebula without pre-chunking
				await client.addMemory(
					params.text,
					{ type: category, source: "openclaw_tool", session: sessionId ?? "tool" },
				)

				const preview =
					params.text.length > 80 ? `${params.text.slice(0, 80)}…` : params.text

				return {
					content: [{ type: "text" as const, text: `Stored: "${preview}"` }],
				}
			},
		},
		{ name: "nebula_store" },
	)
}
