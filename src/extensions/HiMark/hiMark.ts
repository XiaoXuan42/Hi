import {
    Extension,
} from "../../extension.js"
import { File } from "../../file.js"
import { MarkDownBackend, MarkDownBackendConfig } from "./markdown.js"
import { PugBackend } from "./pug.js"
import { JinjaBackend } from "./jinja.js"
import { HtmlBackend } from "./html.js"
import { PrivateProcessor, PrivateConfig } from "./private.js"
import { BackEnd } from "./backend.js"
import { Consts } from "./consts.js"
import Environment from "../../environment.js"
import path from "node:path"
import * as fs from "node:fs"
import { Config } from "../../config.js"
import fsUtil from "../../fsUtil.js"

export class HiMarkConfig {
    public markdown?: MarkDownBackendConfig
    public private?: PrivateConfig
}

export class HiMark extends Extension {
    private config: HiMarkConfig
    private glbConfig: Config
    private htmlBackend: HtmlBackend
    private mkBackend: MarkDownBackend
    private jinjaBackend: JinjaBackend
    private pugBackend: PugBackend
    private privateProcessor: PrivateProcessor

    constructor(glbConfig: Config, hiConfig: HiMarkConfig) {
        super()
        this.config = hiConfig
        this.glbConfig = glbConfig

        this.htmlBackend = new HtmlBackend()
        if (hiConfig.markdown?.templatePath) {
            this.mkBackend = new MarkDownBackend(glbConfig, hiConfig.markdown)
        } else {
            this.mkBackend = new MarkDownBackend(
                glbConfig,
                new MarkDownBackendConfig()
            )
        }
        this.jinjaBackend = new JinjaBackend()
        this.pugBackend = new PugBackend()

        if (hiConfig.private?.templatePath) {
            this.privateProcessor = new PrivateProcessor(
                hiConfig.private, this.glbConfig
            )
        } else {
            this.privateProcessor = new PrivateProcessor(
                new PrivateConfig("Hi:HiMark", "Hi:HiMark:Passwd", []),
                this.glbConfig
            )
        }
    }

    public getName(): string { return Consts.extname }

    private getBackEnd(file: File): BackEnd {
        let [_, extensionName] = file.getFileAndExtName()
        if (extensionName === "html") {
            return this.htmlBackend
        } else if (extensionName === "md") {
            return this.mkBackend
        } else if (extensionName === "jinja") {
            return this.jinjaBackend
        } else if (extensionName === "pug") {
            return this.pugBackend
        } else {
            throw `Wrong assignment for HiMark: ${file.getSrcRelPath()}`
        }
    }

    public accept(file: File): boolean {
        return true
    }

    public async map(file: File, env: Environment) {
        await fs.promises.readFile(file.getSrcAbsPath()).then(
            async (buffer) => {
                file.content = buffer.toString("utf-8")
                const backend = this.getBackEnd(file)
                const data = await backend.prepareData(file, env)
                file.data.set(Consts.extname, data)
            }
        )
    }

    public async reduce(files: File[], env: Environment) {
        const jobs: Promise<void>[] = []
        for (const file of files) {
            let [fname, _] = file.getFileAndExtName()
            const filename = fname + ".html"
            const targetPath = path.join(
                env.router.route(path.dirname(file.getSrcAbsPath())), 
                filename)
            const backend = this.getBackEnd(file)
            let content = backend.transform(file, env)

            let isPrivate = false
            if (this.config.private) {
                isPrivate = fsUtil.globMatch(
                    file.getSrcRelPath(),
                    this.config.private.files
                )
            }
            if (isPrivate && this.config.private) {
                content = this.privateProcessor.transform(
                    this.config.private.keyName,
                    content as string,
                    this.config.private.passwd
                )
            }

            jobs.push(fsUtil.ensureDirWriteAsyn(targetPath, content))
        }
        await Promise.all(jobs)
    }
}
