import * as fs from 'fs';
import * as path from 'path';
import { render_markdown } from './markdown';
import { FileTemplate } from './template';

export class File {
    name: string;

    constructor(abspath: string, public content: string, public is_private: boolean) {
        this.name = path.basename(abspath);
    }

    // the content of the file to be generated
    output(template: FileTemplate): string {
        return this.content;
    }

    convert_to_urlname(filename: string): string {
        return filename;
    }

    // get the filename of the file to be generated
    get_name(): string {
        return this.convert_to_urlname(this.name);
    }

    on_change(content: string) {
        this.content = content;
    }
}

class JinjaFile extends File {
    private _html: undefined | string;
    constructor(abspath: string, public content: string, public is_private: boolean) {
        super(abspath, content, is_private);
    }

    output(template: FileTemplate): string {
        if (!this._html) {
            this._html = FileTemplate.get_instantiation(this.content, {});
        }
        return this._html;
    }

    convert_to_urlname(filename: string): string {
        let basename = path.basename(this.name, '.jinja');
        return basename + '.html';
    }

    on_change(content: string): void {
        super.on_change(content);
        this._html = undefined;
    }
}

class MarkDownFile extends File {
    html: string;
    stylesheet: string;
    private _html: string | undefined;

    static readonly katex_css = String.raw`<link rel="stylesheet" 
    href="https://cdn.jsdelivr.net/npm/katex@0.15.6/dist/katex.min.css"
    integrity="sha384-ZPe7yZ91iWxYumsBEOn7ieg8q/o+qh/hQpSaPow8T6BwALcXSCS6C6file_rootRPIAnTQs" crossorigin="anonymous">`;
    static readonly highlight_css = String.raw`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/styles/default.min.css">`;
    static readonly mk_stylesheet = [MarkDownFile.katex_css, MarkDownFile.highlight_css].join('\n');

    constructor(abspath: string, public content: string, public is_private: boolean) {
        super(abspath, content, is_private);
        this.html = render_markdown(content);
        this.stylesheet = MarkDownFile.mk_stylesheet;
    }

    output(template: FileTemplate): string {
        if (!this._html) {
            this._html = FileTemplate.get_instantiation(template.markdown_template, { markdown: this });
        }
        return this._html;
    }

    convert_to_urlname(filename: string): string {
        let basename = path.basename(this.name, '.md');
        return basename + '.html';
    }

    on_change(content: string): void {
        super.on_change(content);
        this.html = render_markdown(content);
        this.stylesheet = MarkDownFile.mk_stylesheet;
        this._html = undefined;
    }
}

export function generate_file(abspath: string, is_private: boolean): File {
    const content = fs.readFileSync(abspath).toString();
    const filename = path.basename(abspath);
    const extname = path.extname(filename);

    let new_file: File;
    if (extname === ".md") {
        // markdown
        new_file = new MarkDownFile(abspath, content, is_private);
    } else if (extname === ".jinja") {
        // jinja template converts to html
        new_file = new JinjaFile(abspath, content, is_private);
    } else {
        new_file = new File(abspath, content, is_private);
    }
    return new_file;
}