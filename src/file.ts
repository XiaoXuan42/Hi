import * as fs from 'fs'
import * as path from 'path'
import { render_markdown } from './markdown'
import { Template } from './template'
import * as nunjucks from 'nunjucks'

class File {
    constructor(public name: string, public content: string) {}

    // the content of the file to be generated
    output(template?: Template): string {
        return this.content;
    }

    // get the filename of the file to be generated
    get_name(): string {
        return this.name;
    }
}

class JinjaFile extends File {
    html: string;
    constructor(name: string, content: string) {
        super(name, content);
        this.html = nunjucks.renderString(content, {});
    }

    output(template?: Template): string {
        return this.html;
    }

    get_name(): string {
        let basename = path.basename(this.name, '.jinja');
        return basename + '.html';
    }
}

const katex_css = String.raw
`<link rel="stylesheet" 
href="https://cdn.jsdelivr.net/npm/katex@0.15.6/dist/katex.min.css"
 integrity="sha384-ZPe7yZ91iWxYumsBEOn7ieg8q/o+qh/hQpSaPow8T6BwALcXSCS6C6file_rootRPIAnTQs" crossorigin="anonymous">`;
const highlight_css = String.raw
`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/styles/default.min.css">`;
const mk_stylesheet = [katex_css, highlight_css].join('\n');

class MarkDownFile extends File {
    html: string;
    stylesheet: string;
    constructor(name: string, content: string) {
        super(name, content);
        this.html = render_markdown(content);
        this.stylesheet = mk_stylesheet;
    }

    output(template?: Template): string {
        if (template) {
            return nunjucks.renderString(template.markdown_template, {markdown: this});
        } else {
            return this.html;
        }
    }

    get_name(): string {
        let basename = path.basename(this.name, '.md');
        return basename + '.html';
    }
}

type DirNode = {[name: string]: File | DirNode};

export class FileTree {
    root_path: string;
    routes: {[path: string]: string};
    file_root: DirNode;
    route_root: DirNode;

    /**
     * @param dirname root directory of the project(absolute path)
     * @param targets files that we are interested in
     * @param routes path of file system to url
     */
    constructor(dirname: string, targets: string[], routes: {[path: string]: string}) {
        this.root_path = dirname;
        this.routes = routes;
        nunjucks.configure(dirname, {});
        this.file_root = {};
        this.route_root = {};
        this.create_file_tree(this.file_root, this.route_root, '', '', targets);
    }

    private create_file_tree(file_node: DirNode, route_node: DirNode, url: string, dirname: string, targets: string[]) {
        for (let target of targets) {
            let filepath = path.join(this.root_path, dirname, target);
            if (fs.lstatSync(filepath).isFile()) {
                // read file content
                let content = fs.readFileSync(filepath).toString();

                let extname = path.extname(target);
                let basename = path.basename(target, extname);

                let new_file: File;
                if (extname === ".md") {
                    // markdown
                    new_file = new MarkDownFile(target, content);
                } else if (extname === ".jinja") {
                    // jinja template converts to html
                    new_file = new JinjaFile(target, content);
                } else {
                    new_file = new File(target, content);
                }
                file_node[target] = new_file;
                if (basename in route_node) {
                    throw Error(`Url ${url} conflicts.`);
                }
                route_node[basename] = new_file;
            } else {
                if (fs.lstatSync(filepath).isDirectory()) {
                    // read all files inside directories
                    let next_dirname = path.join(dirname, target);
                    let next_targets: string[] = fs.readdirSync(filepath);
                    let next_dir: DirNode = {};
                    file_node[target] = next_dir;

                    let next_url: string = url + `/${target}`;
                    let next_router = {};
                    if (next_url in this.routes) {
                        next_url = this.routes[next_url];
                        let tmp_router = this.access_by_url(next_url.split('/'));
                        if (tmp_router instanceof File) {
                            throw Error(`Url ${next_url} can't be a directory and a file at the same time`);
                        }
                        next_router = tmp_router;
                    } else {
                        if (target in route_node) {
                            next_router = route_node[target];
                        } else {
                            route_node[target] = next_router;
                        }
                    }

                    this.create_file_tree(next_dir, next_router, next_url, next_dirname, next_targets);
                }
            }
        }
    }

    private access_by_url(url: string[]): DirNode | File {
        url = url.filter(s => s);
        let cur: DirNode | File = this.route_root;
        for (let name of url) {
            if (cur instanceof File) {
                throw Error(`${url} is invalid`);
            }
            if (name in cur) {
                cur = cur[name];
            } else {
                cur[name] = {};
                cur = cur[name];
            }
        }
        return cur;
    }

    public write(outdir: string, template?: Template) {
        // simply remove out directory to update
        if (fs.existsSync(outdir)) {
            fs.rmdirSync(outdir, {recursive: true});
        }
        this.write_tree(this.route_root, outdir, template);
    }

    private write_tree(node: DirNode, outdir: string, template?: Template) {
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