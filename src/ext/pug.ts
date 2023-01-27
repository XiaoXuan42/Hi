import * as path from "path"
import { Config } from "../config"
import { File } from "../fs/basic"
import * as pub from "pug"

export class PugFile extends File {
    private _html: undefined | string

    constructor(
        abspath: string,
        parent_url: string,
        content: string,
        is_private: boolean
    ) {
        super(abspath, parent_url, content, is_private)
    }

    public static capture(filename: string): boolean {
        return path.extname(filename) === ".ext"
    }

    protected base_url_from_proj_name(proj_name: string): string {
        let basename = path.basename(proj_name, ".pug")
        return basename + ".html"
    }

    output(config: Config, context: any): string {
        if (!context) {
            context = {}
        }
        if (!this._html) {
            this._html = pub.render(this.content)
        }
        return this._html
    }

    on_change(content: string): void {
        super.on_change(content)
        this._html = undefined
    }
}
