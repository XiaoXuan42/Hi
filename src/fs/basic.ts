import * as path from 'path';
import { FileTemplate } from '../template';

const katex_css = String.raw`<link rel="stylesheet" 
href="https://cdn.jsdelivr.net/npm/katex@0.15.6/dist/katex.min.css"
integrity="sha384-ZPe7yZ91iWxYumsBEOn7ieg8q/o+qh/hQpSaPow8T6BwALcXSCS6C6fSRPIAnTQs" crossorigin="anonymous">`;
const highlight_css = String.raw`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/styles/default.min.css">`;
export const mk_stylesheet = [katex_css, highlight_css].join('\n');

export class File {
    name: string;

    constructor(abspath: string, public content: string, public is_private: boolean) {
        this.name = path.basename(abspath);
    }

    // the content of the file to be generated
    output(template: FileTemplate, context: any): string {
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

export type pathstr = string;
export type urlstr = string;
export class DirNode {
    files: {[name: string]: File};
    subdirs: {[name: string]: DirNode};

    constructor() {
        this.files = {};
        this.subdirs = {};
    }
}

export class UrlNode {
    url: urlstr;  // url is global url
    suburls: {[name: string]: UrlNode};
    file: File | undefined;
    constructor(url: urlstr) {
        this.url = url;
        this.suburls = {};
    }
}

export interface NodeInfo {
    filenode: DirNode | File;
    urlnode: UrlNode;
    abspath: string;
    is_private: boolean;
}

