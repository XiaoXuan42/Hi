import * as fm from "front-matter"
import { NunjuckUtil, MarkDownUtil, MKHeadItem } from "./util"
import { FsWorker } from "../../fsWorker"
import { File } from "../../file"
import { BackEnd } from "./backend"

const katexCss = String.raw`<link rel="stylesheet" 
href="https://cdn.jsdelivr.net/npm/katex@0.15.6/dist/katex.min.css"
integrity="sha384-ZPe7yZ91iWxYumsBEOn7ieg8q/o+qh/hQpSaPow8T6BwALcXSCS6C6fSRPIAnTQs" crossorigin="anonymous">`
const highlightCss = String.raw`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/styles/default.min.css">`
const mkStyleSheet = [katexCss, highlightCss].join("\n")

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
}

class MarkDownData {
    constructor(
        public html: string,
        public stylesheet: string,
        public relUrl: string,
        public frontMatter: any,
        public headList: MKHeadItem[],
        public file: File,
        public fs: FsWorker
    ) {}
}

export class MarkDownBackend implements BackEnd {
    private config: MarkDownBackendConfig
    private fsWorker: FsWorker
    private templateStr: string
    private templateCompiled

    constructor(config: MarkDownBackendConfig, fsWorker: FsWorker) {
        this.config = config
        this.fsWorker = fsWorker
        if (config.templatePath) {
            this.templateStr = fsWorker
                .readSrcSync(config.templatePath)
                .toString("utf-8")
        } else {
            this.templateStr = defaultMarkdownTemplate
        }
        this.templateCompiled = NunjuckUtil.compile(this.templateStr)
    }

    private configureFromContent(file: File) {
        let [fname, _] = file.getFileAndExtName()
        const relUrl = this.fsWorker.join(file.getDirname(), fname + ".html")
        const mkdown: MarkDownData = new MarkDownData(
            "",
            "",
            relUrl,
            {},
            [],
            file,
            this.fsWorker
        )
        const fmRes = fm.default(file.content as string)
        const frontMatter = fmRes.attributes
        const renderRes = MarkDownUtil.renderMarkdown(fmRes.body)
        mkdown.html = `<div class="markdown">${renderRes.result}</div>`
        mkdown.stylesheet = mkStyleSheet
        mkdown.frontMatter = frontMatter
        mkdown.headList = renderRes.headList

        if ("date" in mkdown.frontMatter) {
            mkdown.frontMatter.date = new Date(mkdown.frontMatter.date)
        }
        return mkdown
    }

    public prepareData(file: File) {
        return this.configureFromContent(file)
    }

    public transform(file: File) {
        const data = file.data as MarkDownData
        const context = { markdown: data }
        NunjuckUtil.enrichContext(context)
        return this.templateCompiled.render(context)
    }
}
