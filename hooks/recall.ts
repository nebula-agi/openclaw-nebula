import type { NebulaClient } from "../client.ts"
import type { NebulaConfig } from "../config.ts"
import { log } from "../logger.ts"

export function buildRecallHandler(
	client: NebulaClient,
	cfg: NebulaConfig,
) {
	return async (event: Record<string, unknown>) => {
		const prompt = event.prompt as string | undefined
		if (!prompt || prompt.length < 5) return

		log.debug("recalling memories")

		try {
			const results = await client.search(prompt)

			if (results.length === 0) {
				log.debug("no memories found to inject")
				return
			}

			const context = `<nebula-context>\n${JSON.stringify(results, null, 2)}\n</nebula-context>`

			log.debug(`injecting context (${context.length} chars)`)
			return { prependContext: context }
		} catch (err) {
			log.error("recall failed", err)
			return
		}
	}
}
