import { Config } from "./config"
import { Extension, ExtensionConfig, ExtensionResult } from "./extension"
import { minimatch } from "minimatch"
import { File } from "./file"
import { FsWorker } from "./fsWorker"

class DefaultExtension implements Extension {
    public async transform(
        file: File,
        config: ExtensionConfig,
        fsWorker: FsWorker
    ): Promise<ExtensionResult> {
        return fsWorker
            .readSrc(file.getRelPath())
            .then((buffer) => {
                return {
                    filename: file.getRelPath(),
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
    private name2ext: { [name: string]: Extension }

    constructor(config: Config) {
        this.config = config
        this.name2ext = {}
    }

    private match(p: string, pattern: string): boolean {
        return minimatch(p, pattern)
    }

    public getExtension(file: File): [Extension, ExtensionConfig] {
        for (let ext of this.config.extensions) {
            if (this.match(file.getRelPath(), ext.pattern)) {
                const extname = ext.config.extname
                if (extname in this.name2ext) {
                    return [this.name2ext[extname], ext.config]
                }
            }
        }
        return [new DefaultExtension(), { extname: "Hi:default" }]
    }

    public registerExt(name: string, ext: Extension) {
        this.name2ext[name] = ext
    }
}
