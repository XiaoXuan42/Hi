import {
    Extension,
    ExtensionConfig,
    ExtensionFactor,
    ExtensionResult,
} from "../../extension"
import { Buffer } from "node:buffer"
import { FsWorker } from "../../fsWorker"
import { File } from "../../file"
import { MarkDownBackend, MarkDownBackendConfig } from "./markdown"
import { PugBackend } from "./pug"
import { JinjaBackend } from "./jinja"
import { PrivateBackend, PrivateBackendConfig } from "./private"
import { minimatch } from "minimatch"

export class HiMarkConfig implements ExtensionConfig {
    public extname: string
    public markdown?: MarkDownBackendConfig
    public private?: PrivateBackendConfig

    constructor() {
        this.extname = HiMark.extname
    }
}

export class HiMark implements Extension {
    private config: HiMarkConfig
    private mkBackend: MarkDownBackend
    private jinjaBackend: JinjaBackend
    private pugBackend: PugBackend
    private privateBackend: PrivateBackend
    private fsWorker: FsWorker

    public static readonly extname = "Hi:HiMark"

    constructor(config: ExtensionConfig, fsWorker: FsWorker) {
        this.fsWorker = fsWorker
        let hiConfig = config as HiMarkConfig
        this.config = hiConfig

        if (hiConfig.markdown?.templatePath) {
            this.mkBackend = new MarkDownBackend(hiConfig.markdown, fsWorker)
        } else {
            this.mkBackend = new MarkDownBackend(
                new MarkDownBackendConfig(),
                fsWorker
            )
        }
        this.jinjaBackend = new JinjaBackend()
        this.pugBackend = new PugBackend()

        if (hiConfig.private?.templatePath) {
            this.privateBackend = new PrivateBackend(hiConfig.private, fsWorker)
        } else {
            this.privateBackend = new PrivateBackend(
                new PrivateBackendConfig("Hi:HiMark", "Hi:HiMark:Passwd", []),
                fsWorker
            )
        }
    }

    public async map(file: File) {
        await this.fsWorker
            .readSrc(file.getRelPath())
            .then((buffer) => {
                file.content = buffer.toString("utf-8")
                file.data = true
            })
            .catch((_) => {
                file.data = undefined
            })
    }

    public async reduce(file: File): Promise<ExtensionResult[]> {
        let [fname, extname] = file.getFileAndExtName()
        const filename = fname + ".html"
        const targetRelPath = this.fsWorker.join(file.getDirname(), filename)
        let content: string
        if (file.content instanceof Buffer) {
            content = file.content.toString("utf-8")
        } else {
            content = file.content
        }

        let result: ExtensionResult = {
            file: file,
            targetRelPath: targetRelPath,
            filename: filename,
            content: content,
            succ: true,
            errMsg: "",
        }

        let isPrivate = false
        if (this.config.private) {
            for (let privatePattern of this.config.private.files) {
                if (minimatch(file.getRelPath(), privatePattern)) {
                    isPrivate = true
                    break
                }
            }
        }

        if (extname === "md") {
            result.content = this.mkBackend.transform(content)
        } else if (extname === "jinja") {
            result.content = this.jinjaBackend.transform(content)
        } else if (extname === "pug") {
            result.content = this.pugBackend.transform(content)
        } else if (extname !== "html") {
            throw `Wrong assignment for HiMark: ${file.getRelPath()}`
        }

        if (isPrivate && this.config.private) {
            result.content = this.privateBackend.transform(
                this.config.private.keyName,
                result.content as string,
                this.config.private.passwd
            )
        }
        return [result]
    }
}

export const HiMarkFactor: ExtensionFactor = (
    config: ExtensionConfig,
    fsWorker: FsWorker
) => {
    return new HiMark(config, fsWorker)
}
