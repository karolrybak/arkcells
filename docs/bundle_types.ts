import fs from "node:fs"
import path from "node:path"

const docsDir = import.meta.dirname
const arktypeDir = path.join(docsDir, "node_modules", "arktype")
const outputDir = path.join(docsDir, "src", "components", "playground")

const libs: Record<string, string> = {}

function addFile(filePath: string, virtualPath: string) {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8")
        libs[virtualPath] = content
        console.log(`Added ${virtualPath}`)
    } else {
        console.warn(`File not found: ${filePath}`)
    }
}

// Add main arktype files
const arktypeOut = path.join(arktypeDir, "out")
const files = [
    "index.d.ts",
    "type.d.ts",
    "scope.d.ts",
    "module.d.ts",
    "generic.d.ts",
    "config.d.ts",
    "keywords/keywords.d.ts",
    "variants/base.d.ts",
    "parser/definition.d.ts",
    "attributes.d.ts"
]

files.forEach(f => {
    // Flatten paths: arktype/out/type.d.ts -> arktype/type.ts
    const virtualPath = `arktype/${f.replace(".d.ts", ".ts")}`
    addFile(path.join(arktypeOut, f), virtualPath)
})

// Add index.d.ts also at the root of the package for extensionless resolution
addFile(path.join(arktypeOut, "index.d.ts"), "arktype/index.d.ts")
addFile(path.join(arktypeOut, "index.d.ts"), "arktype/index.ts")


// Add dependencies
const parentNodeModules = path.join(docsDir, "..", "node_modules")
const bunDir = path.join(parentNodeModules, ".bun")

function findInBun(pkgName: string, sub: string) {
    if (!fs.existsSync(bunDir)) {
        console.warn(".bun directory not found at", bunDir)
        return
    }
    const pkgFolder = fs.readdirSync(bunDir).find(d => d.includes(pkgName.replace("/", "+")))
    if (pkgFolder) {
        const fullPath = path.join(bunDir, pkgFolder, "node_modules", pkgName, sub)
        addFile(fullPath, `${pkgName}/index.d.ts`)
    } else {
        console.warn(`Could not find ${pkgName} in .bun`)
    }
}

findInBun("@ark/util", "out/index.d.ts")
findInBun("@ark/schema", "out/index.d.ts")
findInBun("arkregex", "out/index.d.ts")

// Generated libs.json
fs.writeFileSync(
    path.join(outputDir, "libs.json"),
    JSON.stringify(libs, null, 2)
)


console.log("Generated libs.json")
