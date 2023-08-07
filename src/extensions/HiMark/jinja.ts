import { MarkDownBackend } from "./markdown"

import * as nunjucks from "nunjucks"

export class JinjaBackend {
    constructor() {}

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
                const curMk = MarkDownBackend.renderMarkdown(tagContent)
                result += `<div class="markdown">${curMk}</div>`
                lastIndex = match.index + matchContent.length
            }
        })
        result += oldContent.slice(lastIndex)
        return result
    }

    public transform(content: string) {
        let newContent = JinjaBackend.convertMkTag(content)
        let context: any = {}
        return nunjucks.renderString(newContent, context)
    }
}
