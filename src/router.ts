import { Config } from "./config.js"
import * as path from "node:path"
import { assert } from "node:console"

export class Router {
    private rule: [string, string][]

    constructor(
        config: Config,
    ) {
        // 细化规则
        this.rule = []
        for (const route of config.routes) {
            let [pattern, target] = route
            if (!path.isAbsolute(pattern)) {
                assert(path.isAbsolute(config.projectRootDir))
                pattern = path.resolve(config.projectRootDir, pattern)
            }
            if (!path.isAbsolute(target)) {
                assert(path.isAbsolute(config.outputDir))
                target = path.resolve(config.outputDir, target)
            }
            this.rule.push([pattern, target])
        }
        this.rule.push([config.projectRootDir, config.outputDir])
    }

    public route(abspath: string): string {
        for (const [pattern, target] of this.rule) {
            if (abspath.startsWith(pattern)) {
                return target + abspath.substring(pattern.length)
            }
        }
        return abspath
    }
}