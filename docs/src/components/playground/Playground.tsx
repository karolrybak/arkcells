"use client"

import Editor, { useMonaco } from "@monaco-editor/react"
import type * as Monaco from "monaco-editor"
import React, {
	useCallback,
	useEffect,
	useRef,
	useState,
	type RefObject
} from "react"
import { setupErrorLens } from "./errorLens.ts"
import { RestoreDefault } from "./RestoreDefault.tsx"
import { theme } from "./theme.ts"
import { getInitializedTypeScriptService } from "./tsserver.ts"
import {
	editorFileUri,
	updatePlaygroundUrl
} from "./utils.ts"
import sampleCode from "../sample_code.ts?raw"

let monacoInitialized = false
let tsLanguageServiceInstance: Monaco.languages.typescript.TypeScriptWorker | null =
	null

const setupMonaco = async (
	monaco: typeof Monaco,
	initialValue: string
): Promise<Monaco.languages.typescript.TypeScriptWorker> => {
	if (!monacoInitialized) {
		monaco.editor.defineTheme("arkdark", theme)
		if (!tsLanguageServiceInstance) {
			const ts = await getInitializedTypeScriptService(
				monaco,
				editorFileUri,
				initialValue
			)
			tsLanguageServiceInstance = ts
			monacoInitialized = true
		}
	}
	return tsLanguageServiceInstance!
}

type LoadingState = "unloaded" | "loading" | "loaded"

export interface PlaygroundProps {
	initialValue?: string
	style?: React.CSSProperties
	className?: string
}

export const Playground = ({
	initialValue,
	style,
	className
}: PlaygroundProps) => {
	let value: string

	if (initialValue) value = initialValue
	
	value = sampleCode

	const [loadingState, setLoaded] = useState<LoadingState>(
		monacoInitialized ? "loaded" : "unloaded"
	)

	const monaco = useMonaco()
	const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
	const [currentCode, setCurrentCode] = useState<string>(value)

	useEffect(() => {
		if (monaco && monacoInitialized && tsLanguageServiceInstance) {
			setLoaded("loaded")
			return
		}
		if (monaco && loadingState !== "loaded") {
			if (loadingState === "unloaded") setLoaded("loading")
			else {
				setupMonaco(monaco, value)
					.then(() => setLoaded("loaded"))
					.catch(err => {
						console.error("Failed to setup Monaco:", err)
						setLoaded("unloaded")
					})
			}
		}
	}, [monaco, loadingState, initialValue])

	// handle external changes to initialValue (e.g., URL change)
	useEffect(() => {
		if (editorRef.current) {
			const currentEditorValue = editorRef.current.getValue()
			if (value !== currentEditorValue) editorRef.current.setValue(value)
		}
		setCurrentCode(value)
	}, [initialValue])

	const restoreDefault = () => {
		editorRef.current?.setValue(sampleCode)
		updatePlaygroundUrl(sampleCode)
	}

	return (
		<div
			className={className}
			style={{
				width: "100%",
				height: "100%",
				...style
			}}
		>
			{loadingState === "loaded" && monaco ?
				<PlaygroundEditor
					defaultValue={currentCode}
					editorRef={editorRef}
					restoreDefault={restoreDefault}
				/>
				: <PlaygroundLoader />}
		</div>
	)
}

type PlaygroundEditorProps = {
	defaultValue: string
	editorRef: RefObject<Monaco.editor.IStandaloneCodeEditor | null>
	restoreDefault: () => void
}

const PlaygroundEditor = React.memo(
	({
		defaultValue,
		editorRef,
		restoreDefault,
	}: PlaygroundEditorProps) => {
		const handleChange = useCallback(
			(code: string | undefined) => {
				// Optional: handle code changes if needed
			},
			[]
		)

		const handleMount = useCallback(
			(
				editor: any,
				monacoInstance: any
			) => {
				editorRef.current = editor
				if (tsLanguageServiceInstance)
					setupErrorLens(monacoInstance, editor, tsLanguageServiceInstance)
			},
			[editorRef]
		)

		return (
			// add z-index to ensure hovers are displayed above navbar
			<div className="relative z-50 h-full">
				<Editor
					width="100%"
					height="100%"
					defaultLanguage="typescript"
					defaultValue={defaultValue}
					path={editorFileUri}
					theme="arkdark"
					options={{
						minimap: { enabled: false },
						scrollBeyondLastLine: false,
						quickSuggestions: { strings: "on" },
						quickSuggestionsDelay: 0,
						smoothScrolling: true,
						automaticLayout: true,
						cursorBlinking: "smooth",
						cursorSmoothCaretAnimation: "on",
						fontFamily: "'Cascadia Code',Consolas,'Courier New',monospace",
						padding: {
							top: 16
						}
					}}
					onMount={handleMount}
					onChange={handleChange}
				/>
			</div>
		)
	}
)

const PlaygroundLoader = () => (
	<div className="flex items-center justify-center h-full gap-4">
		<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
		<p className="ml-4 text-lg text-gray-600">Loading playground...</p>
	</div>
)
