import type { SearchResult } from "../client.ts"

/**
 * Format search results as a numbered list with similarity scores
 */
export function formatSearchResults(results: SearchResult[]): string {
	return results
		.map((r, i) => {
			const score = r.similarity
				? ` (${(r.similarity * 100).toFixed(0)}%)`
				: ""
			return `${i + 1}. ${r.content}${score}`
		})
		.join("\n")
}
