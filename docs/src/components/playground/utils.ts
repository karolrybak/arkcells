import type * as Monaco from "monaco-editor"

export const playgroundTypeVariableName = "Cell"

export const playgroundOutVariableName = "out"

export const defaultPlaygroundCode = `import { createCell } from "arkcells"

// Define a simple counter cell
const ${playgroundTypeVariableName} = createCell({
	contract: {
		state: "number",
		actions: {
			increment: "=>number",
			decrement: "=>number"
		}
	},
	init: () => 0,
	actions: {
		increment: (state) => state + 1,
		decrement: (state) => state - 1
	}
})

const ${playgroundOutVariableName} = ${playgroundTypeVariableName}()
`

export const editorFileUri = "file:///main.ts"

export type ResultKind = "failure" | "success" | "none"

export const backgroundsByResultKind: Record<ResultKind, string> = {
	failure: "#17080888",
	success: "#08161788",
	none: "#080d17"
}

type RequestMap = Map<string, number>

const duplicateThresholdMs = 50

const recentRequests: RequestMap = new Map()

export const createPositionHash = (
	model: Monaco.editor.ITextModel,
	position: Monaco.Position
): string => `${model.uri}:${position.lineNumber}:${position.column}`

export const isDuplicateRequest = (positionHash: string): boolean => {
	const now = Date.now()
	const lastRequest = recentRequests.get(positionHash)

	if (lastRequest && now - lastRequest < duplicateThresholdMs) return true

	recentRequests.set(positionHash, now)
	return false
}

export const encodePlaygroundCode = (code: string): string =>
	encodeURIComponent(code)

export const decodePlaygroundCode = (encoded: string): string => {
	try {
		return decodeURIComponent(encoded)
	} catch (e) {
		console.error("Failed to decode playground code:", e)
		return defaultPlaygroundCode
	}
}

export const updatePlaygroundUrl = (code: string): string => {
	if (typeof window === "undefined") return ""
	const url = new URL(window.location.href)
	url.searchParams.set("code", encodePlaygroundCode(code))
	window.history.replaceState({}, "", url.toString())
	return url.toString()
}

export const copyToClipboard = async (text: string): Promise<unknown> =>
	navigator.clipboard.writeText(text)
