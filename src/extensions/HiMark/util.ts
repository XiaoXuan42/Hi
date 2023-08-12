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
        this.env.addFilter("collectAttrs", (arr, props: string[]) => {
            function sel(obj: any) {
                let result: any = {}
                for (let prop of props) {
                    result[prop] = obj[prop]
                }
                return result
            }
            if (arr instanceof Array) {
                return arr.map((e) => sel(e))
            }
            return sel(arr)
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
        mkdown = replace_with_math_ids(mkdown)

        let headList: MKHeadItem[] = []
        this.headListSupport(newRenderer, headList)

        let render_result = marked(mkdown, { renderer: newRenderer })
        render_result = render_result.replace(
            /(__special_katex_id__\d+)/g,
            (_match, capture) => {
                const { type, expression } = math_expressions[capture]
                const katexCode = katex.renderToString(expression, {
                    displayMode: type === "block",
                })
                if (type === "block") {
                    return `<div class="_hi_katex_block_math">${katexCode}</div>`
                } else {
                    return `<span class="_hi_katex_inline_math">${katexCode}</span>`
                }
            }
        )
        return {
            result: render_result,
            headList: headList,
        }
    }
}
