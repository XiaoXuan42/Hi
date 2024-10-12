import { BackEnd } from "./backend.js"

import { File } from "../../file.js"
import { NunjuckUtil } from "./util.js"
import { MarkDownUtil } from "../../markdown.js"
import Environment from "../../environment.js"


export class JinjaBackend implements BackEnd {
    constructor() {}

    /**
     * <markdown>标签里的{%等字符串不会按照作为模版的一部分处理
     * @param oldContent 
     * @returns 
     */
    // convert <markdown>...</markdown> to html
    static convertMkTag(oldContent: string): string {
        let mkdownRegex = /<markdown>[^]*?<\/markdown>/g
        let result: string = ""
        let lastIndex = 0
        let matches = [...oldContent.matchAll(mkdownRegex)]
        matches.forEach((match) => {
            if (match.index && match.input) {
                result += oldContent.slice(lastIndex, match.index)
                const matchContent = match[0]
                let tagContent = match.input.slice(
                    match.index + 10,
                    match.index + matchContent.length - 11
                )
                tagContent = tagContent.replace(
                    /{%/g,
                    "{% raw %_marked_123 {% {% endraw %_marked_231"
                )
                tagContent = tagContent.replace(
                    /%}/g,
                    "{% raw %} %} {% endraw %}"
                )
                tagContent = tagContent.replace(
                    /\{% raw %_marked_123 \{% \{% endraw %_marked_231/g,
                    "{% raw %} {% {% endraw %}"
                )
                tagContent = tagContent.replace(
                    /{{/g,
                    "{% raw %} {{ {% endraw %}"
                )
                tagContent = tagContent.replace(
                    /}}/g,
                    "{% raw %} }} {% endraw %}"
                )
                const curMk = MarkDownUtil.renderMarkdown(tagContent)
                result += `<div class="markdown">${curMk}</div>`
                lastIndex = match.index + matchContent.length
            }
        })
        result += oldContent.slice(lastIndex)
        return result
    }

    public async prepareData(file: File, env: Environment) {
        return undefined
    }

    public transform(file: File, env: Environment) {
        let newContent = JinjaBackend.convertMkTag(file.content as string)
        let context: any = { local: file.data, global: env }
        return NunjuckUtil.renderString(newContent, context)
    }
}
