import * as path from "path"
import * as fs from "fs"
import { mk_stylesheet, File } from "../fs/basic"
import { render_markdown } from "../markdown"
import * as fm from "front-matter"
import * as nunjucks from "nunjucks"
import { Config } from "../config"

export class MarkDownFile extends File {
    public html: string
    public stylesheet: string
    public front_matter: any
    public date: Date
    public title: string
    public description: string
    private _html: string | undefined

    constructor(
        abspath: string,
        parent_url: string,
        content: string,
        is_private: boolean
    ) {
        super(abspath, parent_url, content, is_private)
        this.html = ""
        this.stylesheet = ""
        this.date = new Date()
        this.title = ""
        this.description = ""
        this.configure_from_content()
    }

    public static capture(filename: string): boolean {
        return path.extname(filename) === ".md"
    }

    private configure_from_content() {
        const fm_res = fm.default(this.content)
        this.front_matter = fm_res.attributes
        this.html = `<div class="markdown">${render_markdown(
            fm_res.body
        )}</div>`
        this.stylesheet = mk_stylesheet
        this._html = undefined

        if ("date" in this.front_matter) {
            this.date = new Date(this.front_matter.date)
        } else {
            const stat = fs.statSync(this.abspath)
            this.date = stat.mtime
        }
        if ("title" in this.front_matter) {
            this.title = this.front_matter.title
        } else {
            this.title = "MarkDown Document"
        }
        if ("description" in this.front_matter) {
            this.description = this.front_matter.description
        } else {
            this.description = "No description"
        }
    }

    protected base_url_from_proj_name(proj_name: string): string {
        let basename = path.basename(proj_name, ".md")
        return basename + ".html"
    }

    output(config: Config, context: any): string {
        if (!context) {
            context = {}
        }
        context.markdown = this
        if (!this._html) {
            this._html = nunjucks.renderString(
                config.get_template("markdown.jinja"),
                context
            )
        }
        return this._html
    }

    on_change(content: string): void {
        super.on_change(content)
        this.configure_from_content()
    }
}
