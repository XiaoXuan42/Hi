import * as fs from "node:fs"
import { ExtensionConfig } from "./extension"
import * as path from "node:path"

type ExtItem = {
    patterns: string[]
    config: ExtensionConfig
}

export class Config {
    readonly projectRootDir: string
    readonly outputDir: string
    readonly includes: string[]
    readonly excludes: string[]
    readonly extensions: ExtItem[]
    readonly passwd: string

    private getOrSet(json: any, key: string, d: any) {
        if (json[key]) {
            return json[key]
        } else {
            return d
        }
    }

    constructor(projectRootDir: string, jsonFile: string) {
        this.projectRootDir = path.resolve(projectRootDir)
        const file = fs.readFileSync(jsonFile, "utf-8")
        const json = JSON.parse(file)
        this.outputDir = this.getOrSet(json, "outputDir", "out")
        this.includes = this.getOrSet(json, "includes", [])
        this.excludes = this.getOrSet(json, "excludes", [])
        this.extensions = this.getOrSet(json, "extensions", [])
        this.passwd = this.getOrSet(json, "passwd", "123qwe!")
    }
}
