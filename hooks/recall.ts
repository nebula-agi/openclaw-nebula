import type { NebulaClient, SearchResult } from "../client.ts"
import type { NebulaConfig } from "../config.ts"
import { log } from "../logger.ts"

function formatContext(results: SearchResult[]): string | null {
	if (results.length === 0) return null

	const intro =
		"The following is recalled context about the user. Reference it only when relevant to the conversation."
	const disclaimer =
		"Use these memories naturally when relevant — including indirect connections — but don't force them into every response or make assumptions beyond what's stated."

	const memories = results.map((r) => {
		const score = r.similarity != null ? ` [${Math.round(r.similarity * 100)}%]` : ""
		return `- ${r.content}${score}`
	}).join("\n")

	return `<nebula-context>\n${intro}\n\n## Relevant Memories\n${memories}\n\n${disclaimer}\n</nebula-context>`
}

function countUserTurns(messages: unknown[]): number {
	let count = 0
	for (const msg of messages) {
		if (
			msg &&
			typeof msg === "object" &&
			(msg as Record<string, unknown>).role === "user"
		) {
			count++
		}
	}
	return count
}

export function buildRecallHandler(
	client: NebulaClient,
	cfg: NebulaConfig,
) {
	return async (event: Record<string, unknown>) => {
		const prompt = event.prompt as string | undefined
		if (!prompt || prompt.length < 5) return

		const messages = Array.isArray(event.messages) ? event.messages : []
		const turn = countUserTurns(messages)

		log.debug(`recalling for turn ${turn}`)

		try {
			const results = await client.search(prompt)
			const context = formatContext(results)

			if (!context) {
				log.debug("no memories found to inject")
				return
			}

			log.debug(`injecting context (${context.length} chars, turn ${turn})`)
			return { prependContext: context }
		} catch (err) {
			log.error("recall failed", err)
			return
		}
	}
}
