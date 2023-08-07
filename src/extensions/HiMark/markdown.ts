import * as fm from "front-matter"
import katex from "katex"
import { marked } from "marked"
import hljs from "highlight.js"
import * as nunjucks from "nunjucks"
import { FsWorker } from "../../fsWorker"

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

export class MarkDownBackend {
    private config: MarkDownBackendConfig
    private templateStr: string

    constructor(config: MarkDownBackendConfig, fsWorker: FsWorker) {
        this.config = config
        if (config.templatePath) {
            this.templateStr = fsWorker
                .readSrcSync(config.templatePath)
                .toString("utf-8")
        } else {
            this.templateStr = defaultMarkdownTemplate
        }
    }

    // see https://github.com/markedjs/marked/issues/1538
    public static renderMarkdown(mkdown: string): string {
        marked.setOptions({
            highlight: function (code: string, lang: string) {
                const language = hljs.getLanguage(lang) ? lang : "plaintext"
                return hljs.highlight(code, { language }).value
            },
            langPrefix: "hljs language-",
        })
        let oldRenderer = new marked.Renderer()
        let newRenderer = new marked.Renderer()

        let cnt = 0
        let math_expressions: {
            [key: string]: { type: "block" | "inline"; expression: string }
        } = {}
        const next_id = () => `__special_katex_id__${cnt++}`
        const replace_with_math_ids = (text: string) => {
            text = text.replace(/\$\$([\S\s]+?)\$\$/g, (_match, expression) => {
                let cur_id = next_id()
                math_expressions[cur_id] = { type: "block", expression }
                return cur_id
            })
            text = text.replace(/\$([\S\s]+?)\$/g, (_match, expression) => {
                let cur_id = next_id()
                math_expressions[cur_id] = { type: "inline", expression }
                return cur_id
            })
            return text
        }

        newRenderer.listitem = (
            text: string,
            task: boolean,
            checked: boolean
        ) => {
            return oldRenderer.listitem(
                replace_with_math_ids(text),
                task,
                checked
            )
        }
        newRenderer.paragraph = (text: string) => {
            return oldRenderer.paragraph(replace_with_math_ids(text))
        }
        newRenderer.tablecell = (content: string, flags) => {
            return oldRenderer.tablecell(replace_with_math_ids(content), flags)
        }
        newRenderer.text = (text: string) => {
            return oldRenderer.text(replace_with_math_ids(text))
        }
        let render_result = marked(mkdown, { renderer: newRenderer })
        render_result = render_result.replace(
            /(__special_katex_id__\d)/g,
            (_match, capture) => {
                const { type, expression } = math_expressions[capture]
                return katex.renderToString(expression, {
                    displayMode: type === "block",
                })
            }
        )
        return render_result
    }

    private configureFromContent(content: string) {
        const mkdown: any = {}
        const fmRes = fm.default(content)
        const frontMatter = fmRes.attributes
        mkdown.html = `<div class="markdown">${MarkDownBackend.renderMarkdown(
            fmRes.body
        )}</div>`
        mkdown.stylesheet = mkStyleSheet
        mkdown.frontMatter = frontMatter
        return { markdown: mkdown }
    }

    public transform(content: string) {
        const context = this.configureFromContent(content)
        return nunjucks.renderString(this.templateStr, context)
    }
}
