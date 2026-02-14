import { setupTypeAcquisition } from "@typescript/ata"
import type * as Monaco from "monaco-editor"
import ts from "typescript"

export const setupATA = (monaco: typeof Monaco) => {
    return setupTypeAcquisition({
        projectName: "ArkCells Playground",
        typescript: ts,
        logger: console,
        delegate: {
            receivedFile: (code, path) => {
                // We prefix with file:///node_modules/ to make it look like a standard package
                monaco.languages.typescript.typescriptDefaults.addExtraLib(
                    code,
                    `file:///node_modules/${path}`
                )
            }
        }
    })
}
