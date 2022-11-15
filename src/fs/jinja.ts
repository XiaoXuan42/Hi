import * as path from 'path';
import { FileTemplate } from '../template';
import { mk_stylesheet, File } from './basic';
import { render_markdown } from '../markdown';

export class JinjaFile extends File {
    private _html: undefined | string;
    private _converted_content: string;
    stylesheet: string;
    constructor(abspath: string, parent_url: string, content: string, is_private: boolean) {
        super(abspath, parent_url, content, is_private);
        this._converted_content = JinjaFile.convert_mk_tag(this.content);
        this.stylesheet = mk_stylesheet;
    }

    // convert <markdown>...</markdown> to html
    static convert_mk_tag(old_content: string): string {
        let mkdown_regex = /<markdown>[^]*?<\/markdown>/g;
        let result: string = '';
        let last_index = 0;
        let matches = [...(old_content.matchAll(mkdown_regex))];
        matches.forEach((match) => {
            if (match.index && match.input) {
                result += old_content.slice(last_index, match.index);
                const match_content = match[0];
                let tag_content = match.input.slice(match.index + 10, match.index + match_content.length - 11);
                tag_content = tag_content.replace(/{%/g, "{% raw %_marked_123 {% {% endraw %_marked_231");
                tag_content = tag_content.replace(/%}/g, "{% raw %} %} {% endraw %}");
                tag_content = tag_content.replace(/\{% raw %_marked_123 \{% \{% endraw %_marked_231/g, "{% raw %} {% {% endraw %}");
                tag_content = tag_content.replace(/{{/g, "{% raw %} {{ {% endraw %}");
                tag_content = tag_content.replace(/}}/g, "{% raw %} }} {% endraw %}");
                const cur_mk = render_markdown(tag_content);
                result += `<div class="markdown">${cur_mk}</div>`;
                last_index = match.index + match_content.length;
            }
        });
        result += old_content.slice(last_index);
        return result;
    }

    output(template: FileTemplate, context: any): string {
        if (!context) {
            context = {};
        }
        context.jinja = this;
        if (!this._html) {
            this._html = FileTemplate.get_instantiation(this._converted_content, context, "jinja");
        }
        return this._html;
    }

    public get_base_url(): string {
        let basename = path.basename(this.name, '.jinja');
        return basename + '.html';
    }

    on_change(content: string): void {
        super.on_change(content);
        this._converted_content = JinjaFile.convert_mk_tag(this.content);
        this._html = undefined;
        this.stylesheet = mk_stylesheet;
    }
}
