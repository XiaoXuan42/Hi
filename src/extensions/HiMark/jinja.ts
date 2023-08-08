import { BackEnd } from "./backend"

import { File } from "../../file"
import { MarkDownUtil, NunjuckUtil } from "./util"
import { FsWorker } from "../../fsWorker"

class JinjaData {
    constructor() {}
}

export class JinjaBackend implements BackEnd {
    private fsWorker: FsWorker
    constructor(fsWorker: FsWorker) {
        this.fsWorker = fsWorker
    }

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

    public prepareData(file: File) {
        return new JinjaData()
    }

    public transform(file: File) {
        let newContent = JinjaBackend.convertMkTag(file.content as string)
        let context: any = { fs: this.fsWorker }
        return NunjuckUtil.renderString(newContent, context)
    }
}
