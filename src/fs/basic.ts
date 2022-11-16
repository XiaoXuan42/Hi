import * as path from 'path';
import { FileTemplate } from '../template';

const katex_css = String.raw`<link rel="stylesheet" 
href="https://cdn.jsdelivr.net/npm/katex@0.15.6/dist/katex.min.css"
integrity="sha384-ZPe7yZ91iWxYumsBEOn7ieg8q/o+qh/hQpSaPow8T6BwALcXSCS6C6fSRPIAnTQs" crossorigin="anonymous">`;
const highlight_css = String.raw`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/styles/default.min.css">`;
export const mk_stylesheet = [katex_css, highlight_css].join('\n');

export class FNode {
    public name: string;
    // modules outside fs should not be aware of the existence of this field
    public dirty: boolean;  // should we read the source and generate the target again
    constructor(public abspath: string, public url: string, public is_private: boolean) {
        this.name = path.basename(abspath);
        this.dirty = false;
    }

    public get_base_url(): string {
        return this.name;
    }

    public get_url(): string {
        return this.url;
    }
}

export class Dir extends FNode {
    public project_map: { [name: string]: FNode };  // access through name in the project
    public url_map: { [name: string]: FNode };  // access through name in the target(url)

    constructor(abspath: string, url: string, is_private: boolean) {
        super(abspath, url, is_private);
        this.project_map = {};
        this.url_map = {};
    }

    public insert_project_map(name: string, fnode: FNode) {
        if (name in this.project_map) {
            throw Error(`${name} under ${this.abspath} already exists.`);
        }
        this.project_map[name] = fnode;
    }

    public insert_url_map(url: string, fnode: FNode) {
        if (url in this.url_map) {
            throw Error(`Url ${url} under ${this.url} already exists.`)
        }
        this.url_map[url] = fnode;
    }

    public putdown_dirty() {
        if (this.dirty) {
            this.dirty = false;
            for (let url in this.url_map) {
                this.url_map[url].dirty = true;
            }
        }
    }
}


export class File extends FNode {
    public content: string;
    constructor(abspath: string, parent_url: string, content: string, is_private: boolean) {
        super(abspath, parent_url, is_private);
        this.url = `${parent_url}/${this.get_base_url()}`;
        this.content = content;
    }

    // the content of the file to be generated
    public output(template: FileTemplate, context: any): string {
        return this.content;
    }

    // get the filename of the file in the project
    public get_project_name(): string {
        return this.name;
    }

    // get the 'base' url of current file
    public get_base_url(): string {
        return this.name;
    }

    public get_url(): string {
        return this.url;
    }

    public on_change(content: string) {
        this.content = content;
    }

    public get_class_name(): string {
        return this.constructor.name;
    }
}
