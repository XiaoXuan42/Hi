import {
    Extension,
    ExtensionConfig,
    ExtensionFactor,
    ExtensionResult,
} from "../../extension"
import { FsWorker } from "../../fsWorker"
import { File } from "../../file"
import { MarkDownBackend, MarkDownBackendConfig } from "./markdown"
import { PugBackend } from "./pug"
import { JinjaBackend } from "./jinja"
import { HtmlBackend } from "./html"
import { PrivateProcessor, PrivateConfig } from "./private"
import { BackEnd } from "./backend"

export class HiMarkConfig implements ExtensionConfig {
    public extname: string
    public markdown?: MarkDownBackendConfig
    public private?: PrivateConfig

    constructor() {
        this.extname = HiMark.extname
    }
}

export class HiMark implements Extension {
    private config: HiMarkConfig
    private htmlBackend: HtmlBackend
    private mkBackend: MarkDownBackend
    private jinjaBackend: JinjaBackend
    private pugBackend: PugBackend
    private privateBackend: PrivateProcessor
    private fsWorker: FsWorker

    public static readonly extname = "Hi:HiMark"

    constructor(config: ExtensionConfig, fsWorker: FsWorker) {
        this.fsWorker = fsWorker
        let hiConfig = config as HiMarkConfig
        this.config = hiConfig

        this.htmlBackend = new HtmlBackend()
        if (hiConfig.markdown?.templatePath) {
            this.mkBackend = new MarkDownBackend(hiConfig.markdown, fsWorker)
        } else {
            this.mkBackend = new MarkDownBackend(
                new MarkDownBackendConfig(),
                fsWorker
            )
        }
        this.jinjaBackend = new JinjaBackend(this.fsWorker)
        this.pugBackend = new PugBackend()

        if (hiConfig.private?.templatePath) {
            this.privateBackend = new PrivateProcessor(
                hiConfig.private,
                fsWorker
            )
        } else {
            this.privateBackend = new PrivateProcessor(
                new PrivateConfig("Hi:HiMark", "Hi:HiMark:Passwd", []),
                fsWorker
            )
        }
    }

    private getBackEnd(file: File): BackEnd {
        let [_, extname] = file.getFileAndExtName()
        if (extname === "html") {
            return this.htmlBackend
        } else if (extname === "md") {
            return this.mkBackend
        } else if (extname === "jinja") {
            return this.jinjaBackend
        } else if (extname === "pug") {
            return this.pugBackend
        } else {
            throw `Wrong assignment for HiMark: ${file.getRelPath()}`
        }
    }

    public async map(file: File) {
        await this.fsWorker
            .readSrc(file.getRelPath())
            .then((buffer) => {
                file.content = buffer.toString("utf-8")
                const backend = this.getBackEnd(file)
                file.data = backend.prepareData(file)
            })
            .catch((_) => {
                file.data = undefined
            })
    }

    public async reduce(file: File): Promise<ExtensionResult[]> {
        let [fname, _] = file.getFileAndExtName()
        const filename = fname + ".html"
        const targetRelPath = this.fsWorker.join(file.getDirname(), filename)
        const content: string = file.content as string

        let result: ExtensionResult = {
            file: file,
            targetRelPath: targetRelPath,
            filename: filename,
            content: content,
            succ: true,
            errMsg: "",
        }

        const backend = this.getBackEnd(file)
        result.content = backend.transform(file)

        let isPrivate = false
        if (this.config.private) {
            isPrivate = this.fsWorker.globMatch(
                file.getRelPath(),
                this.config.private.files
            )
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
