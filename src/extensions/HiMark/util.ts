import * as nunjucks from "nunjucks"
import katex from "katex"
import { marked } from "marked"
import hljs from "highlight.js"

export class NunjuckUtil {
    private static env: nunjucks.Environment
    private static math: any

    static staticInit() {
        this.env = new nunjucks.Environment()
        this.env.addFilter("map", (arr, prop) => {
            if (arr instanceof Array) {
                return arr.map((e) => e[prop])
            }
            return arr[prop]
        })
        this.math = {
            min: Math.min,
            max: Math.max,
            abs: Math.abs,
            floor: Math.floor,
            ceil: Math.ceil,
            pow: Math.pow,
            sign: Math.sign,
            sqrt: Math.sqrt,
            round: Math.round,
            random: Math.random
        }
    }

    public static enrichContext(context: any) {
        context.Math = context.Math ? context.Math : this.math
        context.Date = context.Date ? context.Date : Date
    }

    public static compile(template: string) {
        return nunjucks.compile(template, this.env)
    }

    public static renderString(template: string, context: any): string {
        this.enrichContext(context)
        return this.env.renderString(template, context)
    }
}
NunjuckUtil.staticInit()

export type MKHeadItem = {
    anchor: string
    level: number
    text: string
}

type MKRenderResult = {
    result: string
    headList: MKHeadItem[]
}

export class MarkDownUtil {
    static headListSupport(renderer: marked.Renderer, toc: MKHeadItem[]) {
        renderer.heading = function (this: any, text, level, raw, slugger) {
            // https://github.com/markedjs/marked/issues/545
            // https://github.com/markedjs/marked/blob/f65264d6b4a831dd8e25a41012e3c7dc4866ea7a/src/Renderer.ts#L51
            // NOTE: keep this.options.headerIds true
            const anchor = this.options.headerPrefix + slugger.slug(raw)
            toc.push({
                anchor: anchor,
                level: level,
                text: text,
            })
            return `<h${level} id="${anchor}">${text}</h${level}>\n`
        }
    }

    // see https://github.com/markedjs/marked/issues/1538
    public static renderMarkdown(mkdown: string): MKRenderResult {
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

        let headList: MKHeadItem[] = []
        this.headListSupport(newRenderer, headList)

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
        return {
            result: render_result,
            headList: headList,
        }
    }
}
