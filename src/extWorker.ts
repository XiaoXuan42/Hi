import { Config } from "./config"
import {
    Extension,
    ExtensionConfig,
    ExtensionFactor,
    ExtensionResult,
} from "./extension"
import { minimatch } from "minimatch"
import { File } from "./file"
import { FsWorker } from "./fsWorker"

class DefaultExtension implements Extension {
    public async transform(
        file: File,
        fsWorker: FsWorker
    ): Promise<ExtensionResult> {
        return fsWorker
            .readSrc(file.getRelPath())
            .then((buffer) => {
                return {
                    filename: file.getBasename(),
                    content: buffer,
                    succ: true,
                    errMsg: "",
                }
            })
            .catch((_) => {
                return {
                    filename: undefined,
                    content: "",
                    succ: false,
                    errMsg: `Can't open ${file.getRelPath()}`,
                }
            })
    }
}

export class ExtWorker {
    readonly config: Config
    private patternExts: { pattern: string; config: ExtensionConfig }[]
    private name2ext: { [name: string]: ExtensionFactor }
    private cfg2ext: Map<ExtensionConfig, Extension>
    private defaultExt: Extension

    constructor(config: Config) {
        this.config = config
        this.name2ext = {}
        this.cfg2ext = new Map()
        this.defaultExt = new DefaultExtension()
        this.patternExts = [...this.config.extensions]
    }

    private match(p: string, pattern: string): boolean {
        return minimatch(p, pattern)
    }

    public getExtension(file: File, fsWorker: FsWorker): Extension {
        for (let extItem of this.patternExts) {
            if (this.match(file.getRelPath(), extItem.pattern)) {
                if (this.cfg2ext.has(extItem.config)) {
                    return this.cfg2ext.get(extItem.config)!
                } else {
                    const extname = extItem.config.extname
                    if (extname in this.name2ext) {
                        const factor = this.name2ext[extname]
                        const extension = factor(extItem.config, fsWorker)
                        this.cfg2ext.set(extItem.config, extension)
                        return extension
                    }
                }
            }
        }
        return this.defaultExt
    }

    public registerWithFactor(name: string, extFactor: ExtensionFactor) {
        this.name2ext[name] = extFactor
    }

    public registerWithConfig(pattern: string, config: ExtensionConfig) {
        this.patternExts.unshift({
            pattern: pattern,
            config: config,
        })
    }

    public register(
        name: string,
        pattern: string,
        config: ExtensionConfig,
        extFactor: ExtensionFactor,
        fsWorker: FsWorker
    ) {
        this.registerWithFactor(name, extFactor)
        this.registerWithConfig(pattern, config)
        this.cfg2ext.set(config, extFactor(config, fsWorker))
    }
}
