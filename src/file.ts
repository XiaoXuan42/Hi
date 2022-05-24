import * as fs from 'fs';
import * as path from 'path';
import { render_markdown } from './markdown';
import { FileTemplate } from './template';
import { Config } from './config';
import { encrypt, get_private_scripts } from './private';

export class File {
    name: string;

    constructor(abspath: string, public content: string, public is_private: boolean) {
        this.name = path.basename(abspath);
    }

    // the content of the file to be generated
    output(template: FileTemplate): string {
        return this.content;
    }

    // get the filename of the file to be generated
    get_name(): string {
        return this.name;
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

    get_name(): string {
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

    get_name(): string {
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


type pathstr = string;
type urlstr = string;
class DirNode {
    files: {[name: string]: File};
    subdirs: {[name: string]: DirNode};

    constructor() {
        this.files = {};
        this.subdirs = {};
    }
}

class UrlNode {
    url: urlstr;
    suburls: {[name: string]: UrlNode};
    file: File | undefined;
    constructor(url: urlstr) {
        this.url = url;
        this.suburls = {};
    }
}

export class FileTree {
    private file_root: DirNode;
    private url_root: UrlNode;
    private config: Config;

    constructor(config: Config) {
        this.config = config;
        FileTemplate.config_working_dir(this.config.project_root_dir);
        this.file_root = new DirNode();
        this.url_root = new UrlNode('');
        this.create_file_tree(this.file_root, this.url_root, '', '', this.config.include_files, false);
    }

    private create_file_tree(file_node: DirNode, route_node: UrlNode, dirname: pathstr, url: urlstr, targets: string[], is_private: boolean) {
        for (let target of targets) {
            let filepath = path.join(this.config.project_root_dir, dirname, target);
            let next_dirname = dirname + `/${target}`;
            let next_url: urlstr = url + `/${target}`;
            let file_is_private = is_private;
            if (this.config.privates.has(next_dirname)) {
                file_is_private = true;
            }

            if (fs.lstatSync(filepath).isFile()) {
                if (target in route_node.suburls) {
                    throw Error(`Url ${url} conflicts.`);
                }

                // read file content
                let content = fs.readFileSync(filepath).toString();
                let extname = path.extname(target);
                let new_file: File;
                if (extname === ".md") {
                    // markdown
                    new_file = new MarkDownFile(filepath, content, file_is_private);
                } else if (extname === ".jinja") {
                    // jinja template converts to html
                    new_file = new JinjaFile(filepath, content, file_is_private);
                } else {
                    new_file = new File(filepath, content, file_is_private);
                }
                file_node.files[target] = new_file;

                const new_url_name = new_file.get_name();
                next_url = url + `/${new_url_name}`;
                route_node.suburls[new_url_name] = new UrlNode(next_url);
                route_node.suburls[new_url_name].file = new_file;
            } else {
                if (fs.lstatSync(filepath).isDirectory()) {
                    // read all files inside directories
                    let next_targets: string[] = fs.readdirSync(filepath);
                    let next_dir: DirNode = new DirNode();
                    file_node.subdirs[target] = next_dir;

                    let next_router: UrlNode = new UrlNode(next_url);
                    if (next_url in this.config.routes) {
                        next_url = this.config.routes[next_url];
                        let tmp_router = this.access_by_url(next_url.split('/'));
                        if (tmp_router instanceof File) {
                            throw Error(`Url ${next_url} can't be a directory and a file at the same time`);
                        }
                        next_router = tmp_router;
                        route_node.suburls[target] = next_router;
                    } else {
                        if (target in route_node.suburls) {
                            let cur_suburl = route_node.suburls[target];
                            if (cur_suburl instanceof File) {
                                throw Error(`Url ${next_url} can't be a directory and a file at the same time`);
                            }
                            next_router = cur_suburl;
                        } else {
                            route_node.suburls[target] = next_router;
                        }
                    }
                    this.create_file_tree(next_dir, next_router, next_dirname, next_url, next_targets, file_is_private);
                }
            }
        }
    }

    private access_by_url(url: string[]): UrlNode | File {
        url = url.filter(s => s);
        let cur: UrlNode = this.url_root;
        let cur_urlstr: urlstr = '';
        for (let name of url) {
            if (cur.file) {
                throw Error(`${url} is invalid`);
            }
            const next_urlstr = cur_urlstr + `/${name}`;
            if (name in cur.suburls) {
                cur = cur.suburls[name];
            } else {
                cur.suburls[name] = new UrlNode(next_urlstr);
                cur = cur.suburls[name];
            }
            cur_urlstr = next_urlstr;
        }
        return cur;
    }

    public write() {
        // simply remove out directory to update
        if (fs.existsSync(this.config.output_dir)) {
            fs.rmdirSync(this.config.output_dir, { recursive: true });
            fs.mkdirSync(this.config.output_dir, { recursive: true });
        }
        this.write_tree(this.url_root);
    }

    private write_tree(node: UrlNode) {
        if (node.file) {
            this.output_file(node.url, node.file);
        } else {
            for (const name in node.suburls) {
                this.write_tree(node.suburls[name]);
            }
        }
    }

    private get_relpath_array(abspath: string): string[] {
        const relpath = path.relative(this.config.project_root_dir, abspath);
        return relpath.split(path.sep).filter(s => s);
    }

    private find_by_path(abspath: string): [urlstr, File|DirNode] | undefined {
        const relpath_array = this.get_relpath_array(abspath);
        let file_node: DirNode | File = this.file_root;
        let url_node: UrlNode = this.url_root;
        for (const filename of relpath_array) {
            if (file_node instanceof File || url_node.file) {
                return undefined;
            }
            if (filename in file_node.subdirs) {
                file_node = file_node.subdirs[filename];
                url_node = url_node.suburls[filename];
            } else if(filename in file_node.files) {
                file_node = file_node.files[filename];
                url_node = url_node.suburls[file_node.get_name()];
            } else {
                return undefined;
            }
        }
        return [url_node.url, file_node];
    }

    // return the relative path to the target file.
    private find_by_url(url: urlstr): [string, File|DirNode] | undefined {
        const url_array = url.split('/').filter(s => s);
        let url_node: UrlNode = this.url_root;
        for (const cur_url of url_array) {
            if (url_node.file) {
                return undefined;
            } else if (!(cur_url in url_node.suburls)) {
                return undefined;
            }
            url_node = url_node.suburls[cur_url];
        }
        if (!url_node.file) {
            return undefined;
        }
        const target_path = path.join(this.config.output_dir, url);
        return [target_path, url_node.file];
    }

    private output_file(url: urlstr, file: File) {
        const parent_url = url.slice(0, url.lastIndexOf('/'));
        const parent_path = parent_url.replace('/', path.sep);
        const dirpath = path.join(this.config.output_dir, parent_path);
        if (!fs.existsSync(dirpath)) {
            fs.mkdirSync(dirpath, { recursive: true });
        }
        const output_path = path.join(this.config.output_dir, parent_path, file.get_name());
        let output_content = file.output(this.config.file_template);
        if (file.is_private) {
            // encrypt the content of file
            output_content = encrypt(output_content, this.config.passwd);
            output_content = FileTemplate.get_instantiation(this.config.file_template.private_template, { ciphertext: output_content, private_scripts: get_private_scripts() });
        }
        fs.writeFileSync(output_path, output_content);
    }

    on_change(abspath: string) {
        const find_res = this.find_by_path(abspath);
        if (find_res) {
            const [url, node] = find_res;
            if (node instanceof File) {
                const content = fs.readFileSync(abspath).toString();
                node.on_change(content);
                this.output_file(url, node);
            }
        }
    }

    get_by_url(url: urlstr): string | undefined {
        const find_res = this.find_by_url(url);
        if (find_res) {
            const [target_path, file] = find_res;
            return fs.readFileSync(target_path).toString();
        } else {
            return undefined;
        }
    }

    visit(callback: (f: File) => any) {
        this._visit(this.file_root, callback);
    }

    private _visit(node: DirNode, callback: (f: File) => any) {
        for (const filename in node.files) {
            const file = node.files[filename];
            callback(file);
        }
        for (const dirname in node.subdirs) {
            const dir = node.subdirs[dirname];
            this._visit(dir, callback);
        }
    }
}