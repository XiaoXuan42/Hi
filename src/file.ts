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

interface NodeInfo {
    filenode: DirNode | File;
    urlnode: UrlNode;
    abspath: string;
    is_private: boolean;
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
        let include_files: string[] = [];
        for (let file of this.config.include_files) {
            include_files.push(file);
        }
        this.create_file_tree({
            filenode: this.file_root,
            urlnode: this.url_root,
            abspath: this.config.project_root_dir,
            is_private: false,
        }, include_files);
    }

    private add_file(info: NodeInfo) {
        if (info.filenode instanceof File) {
            throw Error("Meet some internal error when adding a new file.");
        }
        const content = fs.readFileSync(info.abspath).toString();
        const filename = path.basename(info.abspath);
        const extname = path.extname(filename);

        let new_file: File;
        if (extname === ".md") {
            // markdown
            new_file = new MarkDownFile(info.abspath, content, info.is_private);
        } else if (extname === ".jinja") {
            // jinja template converts to html
            new_file = new JinjaFile(info.abspath, content, info.is_private);
        } else {
            new_file = new File(info.abspath, content, info.is_private);
        }
        info.filenode.files[filename] = new_file;

        const new_url_name = new_file.get_name();
        const new_url = info.urlnode.url + `/${new_url_name}`;
        info.urlnode.suburls[new_url_name] = new UrlNode(new_url);
        info.urlnode.suburls[new_url_name].file = new_file;
    }

    private unlink_file(info: NodeInfo) {
        if (info.filenode instanceof File) {
            throw Error("Meet some internal error when unlinking files.");
        }
        const filename = path.basename(info.abspath);
        const file: File = info.filenode.files[filename];
        const urlname = file.convert_to_urlname(filename);
        delete info.filenode.files[filename];
        delete info.urlnode.suburls[urlname];
    }

    private create_file_tree(info: NodeInfo, targets: string[]) {
        if (info.filenode instanceof File) {
            throw Error("Meet some internal error when creating file tree.");
        }

        for (let target of targets) {
            let next_abspath = path.join(info.abspath, target);
            let next_url: urlstr = info.urlnode.url + `/${target}`;
            let next_is_private = info.is_private;
            let next_relpath = this.get_relpath(next_abspath);
            if (this.config.privates.has(next_relpath)) {
                next_is_private = true;
            }

            if (fs.lstatSync(next_abspath).isFile()) {
                if (target in info.urlnode.suburls) {
                    throw Error(`Url ${info.urlnode.url} conflicts.`);
                }
                this.add_file({
                    filenode: info.filenode,
                    urlnode: info.urlnode,
                    abspath: next_abspath,
                    is_private: next_is_private
                });
            } else if (fs.lstatSync(next_abspath).isDirectory()) {
                // read all files inside directories
                let next_targets: string[] = fs.readdirSync(next_abspath);
                let next_filenode: DirNode = new DirNode();
                info.filenode.subdirs[target] = next_filenode;

                let next_urlnode: UrlNode = new UrlNode(next_url);
                if (next_url in this.config.routes) {
                    next_url = this.config.routes[next_url];
                    let tmp_router = this.access_by_url(next_url.split('/'));
                    if (tmp_router instanceof File) {
                        throw Error(`Url ${next_url} can't be a directory and a file at the same time`);
                    }
                    next_urlnode = tmp_router;
                    info.urlnode.suburls[target] = next_urlnode;
                } else {
                    if (target in info.urlnode.suburls) {
                        let cur_suburl = info.urlnode.suburls[target];
                        if (cur_suburl instanceof File) {
                            throw Error(`Url ${next_url} can't be a directory and a file at the same time`);
                        }
                        next_urlnode = cur_suburl;
                    } else {
                        info.urlnode.suburls[target] = next_urlnode;
                    }
                }
                this.create_file_tree({
                    filenode: next_filenode,
                    urlnode: next_urlnode,
                    abspath: next_abspath,
                    is_private: next_is_private
                }, next_targets);
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
        // remove all contents inside output directory except files begin with dot
        if (fs.existsSync(this.config.output_dir)) {
            const files = fs.readdirSync(this.config.output_dir);
            for (const file of files) {
                if (file.length > 0 && file[0] !== '.') {
                    const filepath = path.join(this.config.output_dir, file);
                    fs.rmSync(filepath, { recursive: true });
                }
            }
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

    private get_relpath(abspath: string): string {
        const relpath = path.relative(this.config.project_root_dir, abspath).replace(path.sep, '/');
        if (relpath[0] !== '/') {
            return '/' + relpath;
        }
        return relpath;
    }

    private get_relpath_array(abspath: string): string[] {
        const relpath = path.relative(this.config.project_root_dir, abspath);
        return relpath.split(path.sep).filter(s => s);
    }

    private find_by_path(abspath: string): NodeInfo | undefined {
        const relpath_array = this.get_relpath_array(abspath);
        let relpath = '';
        let filenode: DirNode | File = this.file_root;
        let urlnode: UrlNode = this.url_root;
        let is_private = false;

        for (const filename of relpath_array) {
            if (filenode instanceof File || urlnode.file) {
                return undefined;
            }
            relpath = relpath + `/${filename}`;
            if (this.config.privates.has(relpath)) {
                is_private = true;
            }
            if (filename in filenode.subdirs) {
                filenode = filenode.subdirs[filename];
                urlnode = urlnode.suburls[filename];
            } else if(filename in filenode.files) {
                filenode = filenode.files[filename];
                urlnode = urlnode.suburls[filenode.get_name()];
            } else {
                return undefined;
            }
        }
        return {
            filenode: filenode,
            urlnode: urlnode,
            abspath: abspath,
            is_private: is_private
        };
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
            if (find_res.filenode instanceof File) {
                const content = fs.readFileSync(abspath).toString();
                find_res.filenode.on_change(content);
                this.output_file(find_res.urlnode.url, find_res.filenode);
            }
        }
    }

    on_add(abspath: string) {
        const parent_path = path.dirname(abspath);
        if (parent_path === this.config.project_root_dir) {
            let filename = path.basename(abspath);
            if (!this.config.include_files.has(filename)) {
                return;
            }
        }
        const find_res = this.find_by_path(parent_path);
        if (find_res) {
            if (find_res.filenode instanceof File) {
                throw Error(`Failed to add ${abspath}`);
            }
            find_res.abspath = abspath;
            this.add_file(find_res);
        }
    }

    on_unlink(abspath: string) {
        const parent_path = path.dirname(abspath);
        const find_res = this.find_by_path(parent_path);
        if (find_res) {
            if (find_res.filenode instanceof File) {
                throw Error(`Failed to unlink ${abspath}`);
            }
            find_res.abspath = abspath;  // switch the path to unlink the file rather than directory
            this.unlink_file(find_res);
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