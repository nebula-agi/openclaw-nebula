import type { OpenClawPluginApi } from "openclaw/plugin-sdk"
import type { NebulaClient } from "../client.ts"
import type { NebulaConfig } from "../config.ts"
import { log } from "../logger.ts"

export function registerCli(
	api: OpenClawPluginApi,
	client: NebulaClient,
	_cfg: NebulaConfig,
): void {
	api.registerCli(
		// biome-ignore lint/suspicious/noExplicitAny: openclaw SDK does not ship types
		({ program }: { program: any }) => {
			const cmd = program
				.command("nebula")
				.description("Nebula long-term memory commands")

			cmd
				.command("search")
				.argument("<query>", "Search query")
				.option("--limit <n>", "Max results", "5")
				.action(async (query: string, opts: { limit: string }) => {
					const limit = Number.parseInt(opts.limit, 10) || 5
					log.debug(`cli search: query="${query}" limit=${limit}`)

					const results = await client.search(query, limit)

					if (results.length === 0) {
						console.log("No memories found.")
						return
					}

					console.log(JSON.stringify(results, null, 2))
				})
		},
		{ commands: ["nebula"] },
	)
}
