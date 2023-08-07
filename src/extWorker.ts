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
import { HiMarkConfig, HiMarkFactor, HiMark } from "./extensions/HiMark/hiMark"

class DefaultExtension implements Extension {
    private fsWorker: FsWorker

    constructor(fsWorker: FsWorker) {
        this.fsWorker = fsWorker
    }

    public async map(file: File) {
        return this.fsWorker
            .readSrc(file.getRelPath())
            .then((buffer) => {
                file.content = buffer
                file.data = true
            })
            .catch((_) => {
                file.data = undefined
            })
    }

    public async reduce(file: File): Promise<ExtensionResult[]> {
        const filename = file.getBasename()
        const targetRelPath = this.fsWorker.join(file.getDirname(), filename)
        let result: ExtensionResult = {
            file: file,
            targetRelPath: targetRelPath,
            filename: filename,
            content: "",
            succ: true,
            errMsg: "",
        }
        if (file.data === undefined) {
            result.succ = false
            result.errMsg = `Failed to read ${file.getRelPath()}`
        } else {
            result.content = file.content
        }
        return [result]
    }
}

export class ExtWorker {
    readonly config: Config
    private patternExts: { pattern: string; config: ExtensionConfig }[]
    private name2ext: { [name: string]: ExtensionFactor }
    private cfg2ext: Map<ExtensionConfig, Extension>
    private defaultExt: Extension

    constructor(config: Config, fsWorker: FsWorker) {
        this.config = config
        this.name2ext = {}
        this.cfg2ext = new Map()
        this.defaultExt = new DefaultExtension(fsWorker)
        this.patternExts = [...this.config.extensions]

        this.register(
            HiMark.extname,
            "**/*.{md,html,jinja,pug}",
            new HiMarkConfig(),
            HiMarkFactor,
            fsWorker,
            false
        )
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

    public registerWithFactor(
        name: string,
        extFactor: ExtensionFactor,
        top = true
    ) {
        if (!top && name in this.name2ext) {
            return
        }
        this.name2ext[name] = extFactor
    }

    public registerWithConfig(
        pattern: string,
        config: ExtensionConfig,
        top = true
    ) {
        if (top) {
            this.patternExts.unshift({
                pattern: pattern,
                config: config,
            })
        } else {
            this.patternExts.push({
                pattern: pattern,
                config: config,
            })
        }
    }

    public register(
        name: string,
        pattern: string,
        config: ExtensionConfig,
        extFactor: ExtensionFactor,
        fsWorker: FsWorker,
        top = true
    ) {
        this.registerWithFactor(name, extFactor, top)
        this.registerWithConfig(pattern, config, top)
        this.cfg2ext.set(config, extFactor(config, fsWorker))
    }
}
