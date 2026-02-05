import type { OpenClawPluginApi } from "openclaw/plugin-sdk"
import type { NebulaClient } from "../client.ts"
import type { NebulaConfig } from "../config.ts"
import { formatSearchResults } from "../lib/format.ts"
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

					const formatted = formatSearchResults(results)
					console.log(formatted)
				})

			cmd
				.command("wipe")
				.description("Delete ALL memories for this collection")
				.action(async () => {
					const collectionName = client.getCollectionName()
					const readline = await import("node:readline")
					const rl = readline.createInterface({
						input: process.stdin,
						output: process.stdout,
					})

					const answer = await new Promise<string>((resolve) => {
						rl.question(
							`This will permanently delete all memories in "${collectionName}". Type "yes" to confirm: `,
							resolve,
						)
					})
					rl.close()

					if (answer.trim().toLowerCase() !== "yes") {
						console.log("Aborted.")
						return
					}

					log.debug(`cli wipe: collection="${collectionName}"`)
					const result = await client.wipeAllMemories()
					console.log(
						`Wiped ${result.deletedCount} memories from "${collectionName}".`,
					)
				})
		},
		{ commands: ["nebula"] },
	)
}
