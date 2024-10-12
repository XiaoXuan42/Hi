import * as fs from "node:fs"
import * as path from "node:path"

export type ExtItem = {
    name: string,
    patterns?: string[],
    path?: string,
    config: Object
}

export class Config {
    readonly projectRootDir: string
    readonly outputDir: string
    readonly includes: string[]
    readonly excludes: string[]
    readonly routes: [string, string][]
    readonly extensions: ExtItem[]

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
        this.outputDir = path.resolve(this.outputDir)
        this.includes = this.getOrSet(json, "includes", [])
        this.excludes = this.getOrSet(json, "excludes", [])
        this.extensions = this.getOrSet(json, "extensions", [])
        this.routes = this.getOrSet(json, "routes", [])
    }

    absPathFromRelSrc(p: string) {
        if (path.isAbsolute(p)) { return p }
        return path.join(this.projectRootDir, p)
    }

    absPathFromRelDst(p: string) {
        if (path.isAbsolute(p)) { return p }
        return path.join(this.projectRootDir, p)
    }
}
