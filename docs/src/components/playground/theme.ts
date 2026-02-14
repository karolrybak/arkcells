import type * as Monaco from "monaco-editor"
import arkdarkTheme from "../../../../themes/arkdark.json"

interface VSCodeTheme {
    colors: {
        [name: string]: string
    }
    tokenColors: TokenColor[]
}

interface TokenColor {
    scope: string | string[]
    settings: {
        foreground?: string
        background?: string
        fontStyle?: string
    }
}

const vsCodeThemeToMonaco = (
    theme: VSCodeTheme
): Monaco.editor.IStandaloneThemeData => ({
    base: "vs-dark",
    inherit: false,
    colors: theme.colors,
    rules: theme.tokenColors.flatMap(c =>
        Array.isArray(c.scope) ?
            c.scope.map(token => ({ token, ...c.settings }))
            : [{ token: c.scope, ...c.settings }]
    )
})

export const theme = vsCodeThemeToMonaco(arkdarkTheme as VSCodeTheme)

export const errorLensStyles = {
    errorBackground: arkdarkTheme.colors["errorLens.errorBackground"],
    errorForeground: arkdarkTheme.colors["errorLens.errorForeground"]
}
