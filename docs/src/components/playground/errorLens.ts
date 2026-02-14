import type * as Monaco from "monaco-editor"
import { errorLensStyles } from "./theme.ts"

export const setupErrorLens = (
	monaco: typeof Monaco,
	editor: Monaco.editor.IStandaloneCodeEditor,
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker
) => {
	const styleElement = document.createElement("style")
	styleElement.textContent = `
    .error-bg {
        background-color: ${errorLensStyles.errorBackground};
    }
    .error-text {
        color: ${errorLensStyles.errorForeground};
        font-style: italic;
    }
`
	document.head.appendChild(styleElement)

	let decorationCollection: Monaco.editor.IEditorDecorationsCollection | null =
		null

	const updateDiagnostics = async () => {
		const diagnostics = await getDiagnostics(
			tsLanguageService,
			editor.getModel()!
		)

		if (decorationCollection) decorationCollection.clear()

		const model = editor.getModel()
		if (!model) return

		// group diagnostics by line to only show one error per line
		const diagnosticsByLine = new Map<
			number,
			Monaco.languages.typescript.Diagnostic
		>()

		for (const diag of diagnostics) {
			if (!diag.start) continue
			const startPosition = model.getPositionAt(diag.start)
			const lineNumber = startPosition.lineNumber

			if (!diagnosticsByLine.has(lineNumber))
				diagnosticsByLine.set(lineNumber, diag)
		}

		const decorations: Monaco.editor.IModelDeltaDecoration[] = Array.from(
			diagnosticsByLine.entries()
		).map(([lineNumber, diag]) => {
			const messageText =
				typeof diag.messageText === "object" ?
					diag.messageText.messageText
					: diag.messageText

			const lineContent = model.getLineContent(lineNumber)
			const endOfLine = lineContent.length + 1

			return {
				range: new monaco.Range(lineNumber, 1, lineNumber, endOfLine),
				options: {
					isWholeLine: true,
					className: "error-bg",
					after: {
						content: `    ${messageText}`,
						inlineClassName: "error-text"
					}
				}
			}
		})

		decorationCollection = editor.createDecorationsCollection(decorations)
	}

	updateDiagnostics()

	editor.onDidChangeModelContent(() => {
		// small delay to allow TS service to process changes
		setTimeout(updateDiagnostics, 300)
	})
}

const getDiagnostics = async (
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker,
	model: Monaco.editor.ITextModel
): Promise<Monaco.languages.typescript.Diagnostic[]> => {
	const uri = model.uri.toString()
	const syntacticDiagnostics =
		await tsLanguageService.getSyntacticDiagnostics(uri)
	const semanticDiagnostics =
		await tsLanguageService.getSemanticDiagnostics(uri)

	return [...syntacticDiagnostics, ...semanticDiagnostics]
}
