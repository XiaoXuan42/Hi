import { Config, ExtItem } from "./config.js"
import {
    Extension,
    DefaultExtension
} from "./extension.js"
import { File } from "./file.js"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import fsUtil from "./fsUtil.js"


export class ExtWorker {
    readonly config: Config
    private defaultExt: Extension
    public extensions: [ExtItem, Extension][]

    constructor(config: Config) {
        this.config = config
        this.defaultExt = new DefaultExtension()
        this.extensions = []
    }

    async loadExtensions() {
        const jobs: Promise<void>[] = []
        this.config.extensions.forEach(item => {
            const __dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
            let realPath = item.path ? item.path : `${__dirname}/extensions/${item.name}/index.js`
            jobs.push(import(realPath).then((module) => {
                this.extensions.push([item, module.createExtension(this.config, item.config)])
            }))
        })
        await Promise.all(jobs)
    }

    public getExtension(file: File): Extension {
        for (let [item, ext] of this.extensions) {
            if (item.patterns) {
                if (!fsUtil.globMatch(file.getSrcRelPath(), item.patterns)) {
                    continue
                }
            }
            if (ext.accept(file)) {
                return ext
            }
        }
        return this.defaultExt
    }
}