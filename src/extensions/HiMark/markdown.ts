import { NunjuckUtil } from "./util.js"
import { File } from "../../file.js"
import { BackEnd } from "./backend.js"
import { Consts } from "./consts.js"
import { MarkDownUtil } from "../../markdown.js"
import { Config } from "../../config.js"
import * as fs from "node:fs"
import * as path from "node:path"

const defaultMarkdownTemplate = String.raw`<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
{{ markdown.stylesheet | safe }}
</head>
<body>
{{ markdown.html | safe }}
</body>
</html>`

export class MarkDownBackendConfig {
    public templatePath?: string

    constructor(templatePath?: string) {
        this.templatePath = templatePath
    }
}

export class MarkDownBackend implements BackEnd {
    private config: MarkDownBackendConfig
    private templateStr: string
    private templateCompiled

    constructor(glbConfig: Config, config: MarkDownBackendConfig) {
        this.config = config
        if (this.config.templatePath) {
            this.templateStr = fs.readFileSync(
                path.join(glbConfig.projectRootDir, this.config.templatePath)
            ).toString("utf-8")
        } else {
            this.templateStr = defaultMarkdownTemplate
        }
        this.templateCompiled = NunjuckUtil.compile(this.templateStr)
    }

    public async prepareData(file: File) {
        return MarkDownUtil.configure(file)
    }

    public transform(file: File) {
        const data = file.data.get(Consts.extname)
        const context = { markdown: data }
        NunjuckUtil.enrichContext(context)
        return this.templateCompiled.render(context)
    }
}
