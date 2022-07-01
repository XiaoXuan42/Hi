import * as path from 'path';
import { FileTemplate } from '../template';
import { mk_stylesheet, File } from './basic';
import { render_markdown } from '../markdown';

export class MarkDownFile extends File {
    html: string;
    stylesheet: string;
    private _html: string | undefined;

    constructor(abspath: string, content: string, is_private: boolean) {
        super(abspath, content, is_private);
        this.html = `<div class="markdown">${render_markdown(content)}</div>`;
        this.stylesheet = mk_stylesheet;
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
        this.html = render_markdown(content);
        this.stylesheet = mk_stylesheet;
        this._html = undefined;
    }
}
