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

export class HiMarkConfig implements ExtensionConfig {
    public extname: string
    public markdown?: MarkDownBackendConfig

    constructor() {
        this.extname = HiMark.extname
    }
}

export class HiMark implements Extension {
    private mkBackend: MarkDownBackend
    private jinjaBackend: JinjaBackend
    private pugBackend: PugBackend
    private fsWorker: FsWorker

    public static readonly extname = "Hi:HiMark"

    constructor(config: ExtensionConfig, fsWorker: FsWorker) {
        this.fsWorker = fsWorker
        let hiConfig = config as HiMarkConfig
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

        if (extname === "md") {
            result.content = this.mkBackend.transform(content)
        } else if (extname === "jinja") {
            result.content = this.jinjaBackend.transform(content)
        } else if (extname === "pug") {
            result.content = this.pugBackend.transform(content)
        } else if (extname !== "html") {
            //throw `Wrong assignment for HiMark: ${file.getRelPath()}`
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
