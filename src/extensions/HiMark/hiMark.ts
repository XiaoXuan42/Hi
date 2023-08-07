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

    public async transform(
        file: File,
        fsWorker: FsWorker
    ): Promise<ExtensionResult> {
        let [fname, extname] = file.getFileAndExtName()
        const content = await fsWorker
            .readSrc(file.getRelPath())
            .then((buffer) => buffer.toString("utf-8"))
        let result: ExtensionResult = {
            filename: fname + ".html",
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
        return result
    }
}

export const HiMarkFactor: ExtensionFactor = (
    config: ExtensionConfig,
    fsWorker: FsWorker
) => {
    return new HiMark(config, fsWorker)
}
