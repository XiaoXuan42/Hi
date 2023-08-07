import * as fs from "node:fs"
import { ExtensionConfig } from "./extension"
import * as path from "node:path"

type ExtItem = {
    pattern: string,
    config: ExtensionConfig
}

export class Config {
    readonly projectRootDir: string
    readonly outputDir: string
    readonly includes: string[]
    readonly extensions: ExtItem[]

    constructor(projectRootDir: string, jsonFile: string) {
        this.projectRootDir = path.resolve(projectRootDir)
        const file = fs.readFileSync(jsonFile, 'utf-8')
        const json = JSON.parse(file)
        this.outputDir = json["outputDir"]
        if (!this.outputDir) {
            this.outputDir = "out"
        }
        this.includes = json["includes"]
        if (!this.includes) {
            this.includes = []
        }
        this.extensions = json["extensions"]
        if (!this.extensions) {
            this.extensions = []
        }
    }
}
