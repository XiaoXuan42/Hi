import * as fs from 'fs'
import * as path from 'path'
import { render_markdown } from './markdown'
import { Template } from './template'
import * as nunjucks from 'nunjucks'

class File {
    constructor(public name: string, public content: string) {}

    output(template?: Template): string {
        return this.content;
    }

    get_name(): string {
        return this.name;
    }
}

const katex_css = String.raw
`<link rel="stylesheet" 
href="https://cdn.jsdelivr.net/npm/katex@0.15.6/dist/katex.min.css"
 integrity="sha384-ZPe7yZ91iWxYumsBEOn7ieg8q/o+qh/hQpSaPow8T6BwALcXSCS6C6fSRPIAnTQs" crossorigin="anonymous">`;
const highlight_css = String.raw
`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/styles/default.min.css">`;
const mk_stylesheet = [katex_css, highlight_css].join('\n');

class MarkDownFile extends File {
    mk_html: string;
    stylesheet: string;
    constructor(name: string, content: string) {
        super(name, content);
        this.mk_html = render_markdown(content);
        this.stylesheet = mk_stylesheet;
    }

    output(template?: Template): string {
        if (template) {
            return nunjucks.renderString(template.markdown_template, {markdown: this});
        } else {
            return this.mk_html;
        }
    }

    get_name(): string {
        let basename = path.basename(this.name, '.md');
        return basename + '.html';
    }
}

type Dir = {[name: string]: File | Dir};

export class FileTree {
    root: Dir;

    constructor(dirname: string, targets: string[]) {
        this.root = this.create_file_tree(dirname, targets);
    }

    private create_file_tree(dirname: string, targets: string[]): Dir {
        let result: Dir = {};
        for (let target of targets) {
            let filepath = path.join(dirname, target);
            let fd = fs.openSync(filepath, 'r');
            if (fs.fstatSync(fd).isFile()) {
                fs.closeSync(fd);
                // read file content
                let content = fs.readFileSync(filepath).toString();

                let extname = path.extname(target);
                if (extname === ".md") {
                    // markdown
                    result[target] = new MarkDownFile(target, content);
                } else {
                    result[target] = new File(target, content);
                }
            } else {
                if (fs.fstatSync(fd).isDirectory()) {
                    fs.closeSync(fd);
                    // read all files inside directories
                    let next_targets: string[] = fs.readdirSync(filepath);
                    let dir = this.create_file_tree(filepath, next_targets);
                    result[target] = dir;
                } else {
                    fs.closeSync(fd);
                }
            }
        }
        return result;
    }

    public write(outdir: string, template?: Template) {
        // simply remove out directory to update
        if (fs.existsSync(outdir)) {
            fs.rmdirSync(outdir, {recursive: true});
        }
        this.write_tree(this.root, outdir, template);
    }

    private write_tree(node: Dir, outdir: string, template?: Template) {
        if (!fs.existsSync(outdir)) {
            fs.mkdirSync(outdir, { recursive: true });
        }
        for (let name in node) {
            let value = node[name];
            if (value instanceof File) {
                let target_path = path.join(outdir, value.get_name());
                fs.writeFileSync(target_path, value.output(template));
            } else {
                let target_path = path.join(outdir, name);
                this.write_tree(value, target_path, template);
            }
        }
    }
}