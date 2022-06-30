import * as fs from 'fs';
import * as path from 'path';
import { render_markdown } from './markdown';
import { FileTemplate } from './template';

const katex_css = String.raw`<link rel="stylesheet" 
href="https://cdn.jsdelivr.net/npm/katex@0.15.6/dist/katex.min.css"
integrity="sha384-ZPe7yZ91iWxYumsBEOn7ieg8q/o+qh/hQpSaPow8T6BwALcXSCS6C6fSRPIAnTQs" crossorigin="anonymous">`;
const highlight_css = String.raw`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/styles/default.min.css">`;
const mk_stylesheet = [katex_css, highlight_css].join('\n');

export class File {
    name: string;

    constructor(abspath: string, public content: string, public is_private: boolean) {
        this.name = path.basename(abspath);
    }

    // the content of the file to be generated
    output(template: FileTemplate): string {
        return this.content;
    }

    convert_to_urlname(): string {
        return this.name;
    }

    // get the filename of the file to be generated
    get_name(): string {
        return this.convert_to_urlname();
    }

    on_change(content: string) {
        this.content = content;
    }
}

class JinjaFile extends File {
    private _html: undefined | string;
    private _converted_content: string;
    stylesheet: string;
    constructor(abspath: string, public content: string, public is_private: boolean) {
        super(abspath, content, is_private);
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

    output(template: FileTemplate): string {
        if (!this._html) {
            this._html = FileTemplate.get_instantiation(this._converted_content, { jinja: this }, "jinja");
        }
        return this._html;
    }

    convert_to_urlname(): string {
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

class MarkDownFile extends File {
    html: string;
    stylesheet: string;
    private _html: string | undefined;

    constructor(abspath: string, public content: string, public is_private: boolean) {
        super(abspath, content, is_private);
        this.html = `<div class="markdown">${render_markdown(content)}</div>`;
        this.stylesheet = mk_stylesheet;
    }

    output(template: FileTemplate): string {
        if (!this._html) {
            this._html = FileTemplate.get_instantiation(template.markdown_template, { markdown: this }, "jinja");
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

class PugFile extends File {
    private _html: undefined | string;
    
    constructor(abspath: string, public content: string, public is_private: boolean) {
        super(abspath, content, is_private);
    }

    output(template: FileTemplate): string {
        if (!this._html) {
            this._html = FileTemplate.get_instantiation(this.content, {}, "pug");
        }
        return this._html;
    }

    convert_to_urlname(): string {
        let basename = path.basename(this.name, ".pug");
        return basename + '.html';
    }

    on_change(content: string): void {
        super.on_change(content);
        this._html = undefined;
    }
}

export function generate_file(abspath: string, is_private: boolean): File {
    const content = fs.readFileSync(abspath).toString();
    const filename = path.basename(abspath);
    const extname = path.extname(filename);

    let new_file: File;
    if (extname === ".md") {
        new_file = new MarkDownFile(abspath, content, is_private);
    } else if (extname === ".jinja") {
        new_file = new JinjaFile(abspath, content, is_private);
    } else if (extname === ".pug") {
        new_file = new PugFile(abspath, content, is_private);
    } else {
        new_file = new File(abspath, content, is_private);
    }
    return new_file;
}