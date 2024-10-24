import katex from "katex"
import { marked } from "marked"
import hljs from "highlight.js"
import * as fm from 'front-matter'
import { File } from "./file.js"
import * as fs from "node:fs"


const katexCss = String.raw`<link rel="stylesheet" 
href="https://cdn.jsdelivr.net/npm/katex@0.15.6/dist/katex.min.css"
integrity="sha384-ZPe7yZ91iWxYumsBEOn7ieg8q/o+qh/hQpSaPow8T6BwALcXSCS6C6fSRPIAnTQs" crossorigin="anonymous">`
const highlightCss = String.raw`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/styles/default.min.css">`
const mkStyleSheet = [katexCss, highlightCss].join("\n")

type MKHeadItem = {
    anchor: string
    level: number
    text: string
    children: MKHeadItem[]
}

type MKRenderResult = {
    result: string
    headList: MKHeadItem[]
}

export class MarkDownData {
    constructor(
        public title: string,
        public abstract: string,
        public createDate: Date,
        public editDate: Date,
        public html: string,
        public stylesheet: string,
        public relPath: string,
        public frontMatter: any,
        public headList: MKHeadItem[]
    ) {}
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
                children: [],
            })
            return `<h${level} id="${anchor}">${text}</h${level}>\n`
        }
    }

    private static _toHeadItemTree(headList: MKHeadItem[], start: number): number {
        const rootHead = headList[start]
        let cur = start + 1
        while (cur < headList.length) {
            const curHead = headList[cur]
            if (curHead.level <= rootHead.level) {
                break
            }
            rootHead.children.push(curHead)
            cur = this._toHeadItemTree(headList, cur)
        }
        return cur
    }

    private static toHeadItemTree(headList: MKHeadItem[]): MKHeadItem[] {
        const result: MKHeadItem[] = []
        let cur = 0
        while (cur < headList.length) {
            result.push(headList[cur])
            cur = this._toHeadItemTree(headList, cur)
        }
        return result
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
            headList: this.toHeadItemTree(headList),
        }
    }

    public static async configure(file: File): Promise<MarkDownData> {
        if (file.content === undefined) {
            file.content = (await fs.promises.readFile(file.getSrcAbsPath())).toString("utf-8")
        }

        const relPath = file.getSrcRelPath()
        const fmRes = fm.default(file.content as string)
        const frontMatter: any = fmRes.attributes
        const renderRes = MarkDownUtil.renderMarkdown(fmRes.body)

        let title = ""
        {
            let minHeader = 9999
            for (var header of renderRes.headList) {
                if (header.level < minHeader) {
                    minHeader = header.level
                    title = header.text
                }
            }
        }

        let abstract = ""
        if ("describe" in frontMatter) {
            abstract = frontMatter.describe
        } else if ("abstract" in frontMatter) {
            abstract = frontMatter.abstract
        }

        let createDate: Date
        let editDate: Date
        {
            const stat = await fs.promises.stat(file.getSrcAbsPath())
            createDate = stat.birthtime
            editDate = stat.mtime
            if ("date" in frontMatter) {
                createDate = new Date(frontMatter.date)
            }
        }

        const html = `<div class="markdown">${renderRes.result}</div>`

        return new MarkDownData(
            title, abstract, createDate, editDate, html, mkStyleSheet,
            relPath, frontMatter, renderRes.headList
        )
    }
}
