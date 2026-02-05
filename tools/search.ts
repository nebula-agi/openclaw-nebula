import { Type } from "@sinclair/typebox"
import type { OpenClawPluginApi } from "openclaw/plugin-sdk"
import type { NebulaClient } from "../client.ts"
import type { NebulaConfig } from "../config.ts"
import { formatSearchResults } from "../lib/format.ts"
import { log } from "../logger.ts"

export function registerSearchTool(
	api: OpenClawPluginApi,
	client: NebulaClient,
	_cfg: NebulaConfig,
): void {
	api.registerTool(
		{
			name: "nebula_search",
			label: "Memory Search",
			description:
				"Search through long-term memories for relevant information using Nebula.",
			parameters: Type.Object({
				query: Type.String({ description: "Search query" }),
				limit: Type.Optional(
					Type.Number({ description: "Max results (default: 5)" }),
				),
			}),
			async execute(
				_toolCallId: string,
				params: { query: string; limit?: number },
			) {
				const limit = params.limit ?? 5
				log.debug(`search tool: query="${params.query}" limit=${limit}`)

				const results = await client.search(params.query, limit)

				if (results.length === 0) {
					return {
						content: [
							{ type: "text" as const, text: "No relevant memories found." },
						],
					}
				}

				const text = formatSearchResults(results)

				return {
					content: [
						{
							type: "text" as const,
							text: `Found ${results.length} memories:\n\n${text}`,
						},
					],
					details: {
						count: results.length,
						memories: results.map((r) => ({
							id: r.id,
							content: r.content,
							similarity: r.similarity,
						})),
					},
				}
			},
		},
		{ name: "nebula_search" },
	)
}
