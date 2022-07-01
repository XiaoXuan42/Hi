import * as path from 'path';
import { FileTemplate } from '../template';
import { mk_stylesheet, File, urlstr } from './basic';
import { render_markdown } from '../markdown';
import * as fm from 'front-matter';

export class MarkDownFile extends File {
    html: string;
    stylesheet: string;
    front_matter: any;
    private _html: string | undefined;

    constructor(abspath: string, parent_url: urlstr, content: string, is_private: boolean) {
        super(abspath, parent_url, content, is_private);
        this.html = '';
        this.stylesheet = '';
        this.configure_from_content();
    }

    private configure_from_content() {
        const fm_res = fm.default(this.content);
        this.front_matter = fm_res.attributes;
        this.html = `<div class="markdown">${render_markdown(fm_res.body)}</div>`;
        this.stylesheet = mk_stylesheet;
        this._html = undefined;
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
