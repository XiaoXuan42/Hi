import * as path from 'path';
import * as fs from 'fs';
import { FileTemplate } from '../template';
import { mk_stylesheet, File, urlstr } from './basic';
import { render_markdown } from '../markdown';
import * as fm from 'front-matter';

export class MarkDownFile extends File {
    public html: string;
    public stylesheet: string;
    public front_matter: any;
    public date: Date;
    public title: string;
    public description: string;
    private _html: string | undefined;

    constructor(abspath: string, parent_url: urlstr, content: string, is_private: boolean) {
        super(abspath, parent_url, content, is_private);
        this.html = '';
        this.stylesheet = '';
        this.date = new Date();
        this.title = '';
        this.description = '';
        this.configure_from_content();
    }

    private configure_from_content() {
        const fm_res = fm.default(this.content);
        this.front_matter = fm_res.attributes;
        this.html = `<div class="markdown">${render_markdown(fm_res.body)}</div>`;
        this.stylesheet = mk_stylesheet;
        this._html = undefined;
                
        if ('date' in this.front_matter) {
            this.date = new Date(this.front_matter.date);
        } else {
            const stat = fs.statSync(this.abspath);
            this.date = stat.mtime;
        }
        if ('title' in this.front_matter) {
            this.title = this.front_matter.title;
        } else {
            this.title = 'MarkDown Document';
        }
        if ('description' in this.front_matter) {
            this.description = this.front_matter.description;
        } else {
            this.description = 'No description';
        }
    }

    output(template: FileTemplate, context: any): string {
        if (!context) {
            context = {};
        }
        context.markdown = this;
        if (!this._html) {
            this._html = FileTemplate.get_instantiation(template.markdown_template, context, "jinja");
        }
        return this._html;
    }

    convert_to_urlname(): string {
        let basename = path.basename(this.name, '.md');
        return basename + '.html';
    }

    on_change(content: string): void {
        super.on_change(content);
        this.configure_from_content();
    }
}
