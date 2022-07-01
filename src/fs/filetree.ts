import { Config } from '../config';
import { generate_file } from './file';
import { FileTemplate } from '../template';
import { encrypt, get_private_scripts } from '../private';
import { File, DirNode, UrlNode, urlstr, NodeInfo } from './basic';
import * as fs from 'fs';
import * as path from 'path';
import { assert } from 'console';

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

    // info represents information about the parent directory
    private add_file(info: NodeInfo): UrlNode {
        if (info.filenode instanceof File) {
            throw Error("Meet some internal error when adding a new file.");
        }
        let new_file: File = generate_file(info.abspath, info.is_private);
        const new_url_name = new_file.get_name();
        const new_url = info.urlnode.url + `/${new_url_name}`;
        let new_urlnode = new UrlNode(new_url);
        new_urlnode.file = new_file;
        info.urlnode.suburls[new_url_name] = new_urlnode;
        return new_urlnode;
    }

    private unlink_file(info: NodeInfo) {
        if (info.filenode instanceof File) {
            throw Error("Meet some internal error when unlinking files.");
        }
        const filename = path.basename(info.abspath);
        const file: File = info.filenode.files[filename];
        const urlname = file.convert_to_urlname();
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

    private output_file(url: urlstr, file: File, content: string) {
        const parent_url = url.slice(0, url.lastIndexOf('/'));
        const parent_path = parent_url.replace('/', path.sep);
        const dirpath = path.join(this.config.output_dir, parent_path);
        if (!fs.existsSync(dirpath)) {
            fs.mkdirSync(dirpath, { recursive: true });
        }
        const output_path = path.join(this.config.output_dir, parent_path, file.get_name());
        if (file.is_private) {
            // encrypt the content of file
            content = encrypt(content, this.config.passwd);
            const output_tag = `<p id="ciphertext" hidden>${content}</p>`;
            content = FileTemplate.get_instantiation(this.config.file_template.private_template, { ciphertext: output_tag, private_scripts: get_private_scripts() }, "jinja");
        }
        fs.writeFileSync(output_path, content);
    }

    private _visit_url(node: UrlNode, callback: (urlnode: UrlNode, f: File) => any, response: (urlnode: UrlNode, res: any) => any) {
        if (node.file) {
            let res = callback(node, node.file);
            return response(node, res);
        } else {
            Object.entries(node.suburls).forEach(([key, value]) => {
                this._visit_url(value, callback, response);
            });
        }
    }

    private visit_url(callback: (urlnode: UrlNode, f: File) => any, response: (urlnode: UrlNode, res: any) => any) {
        this._visit_url(this.url_root, callback, response);
    }

    public on_change(abspath: string, converter: (urlnode: UrlNode, f: File) => string) {
        const find_res = this.find_by_path(abspath);
        if (find_res) {
            if (find_res.filenode instanceof File) {
                const content = fs.readFileSync(abspath).toString();
                find_res.filenode.on_change(content);
                const output_content = converter(find_res.urlnode, find_res.filenode);
                this.output_file(find_res.urlnode.url, find_res.filenode, output_content);
            }
        }
    }

    public on_add(abspath: string, converter: (urlnode: UrlNode, f: File) => string) {
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
            const new_urlnode = this.add_file(find_res);
            assert(new_urlnode.file);
            if (new_urlnode.file) {
                const new_content = converter(new_urlnode, new_urlnode.file);
                this.output_file(new_urlnode.url, new_urlnode.file, new_content);
            }
        }
    }

    public on_unlink(abspath: string) {
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

    public write(converter: (urlnode: UrlNode, f: File) => string) {
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
        this.visit_url(converter, (node, res: string) => {
            assert(node.file && res);
            if (node.file) {
                this.output_file(node.url, node.file, res);
            }
        });
    }

    public get_result_content(url: urlstr): string | undefined {
        const find_res = this.find_by_url(url);
        if (find_res) {
            const [target_path, file] = find_res;
            return fs.readFileSync(target_path).toString();
        } else {
            return undefined;
        }
    }

    // * matches any single directory name or an empty.
    // ** matches any directory names or empties.
    public search_by_url_pattern(url_pattern: urlstr): File[] {
        const url_array = url_pattern.split('/').filter(s => s);
        let queue = [{node: this.url_root, index: 0}];
        let file_set: Set<File> = new Set();
        let result: File[] = [];
        while (true) {
            const state = queue.shift();
            if (!state) {
                break;
            }
            const node = state.node;
            const index = state.index;
            if (index >= url_array.length) {
                continue;
            }
            const cur_pattern = url_array[index];

            // case1: reach end
            if (index + 1 === url_array.length) {
                if (node.file) {
                    if (!file_set.has(node.file)) {
                        file_set.add(node.file);
                        result.push(node.file);
                    }
                    continue;
                } else if (cur_pattern === '**') {
                    Object.entries(node.suburls).forEach(([_, value]) => {
                        queue.push({node: value, index: index});
                    })
                }
                continue;
            }
            // case2
            if (cur_pattern === '*') {
                Object.entries(node.suburls).forEach(([_, value]) => {
                    queue.push({node: value, index: index + 1});
                });
                queue.push({node: node, index: index + 1});  // match empty
            } else if (cur_pattern === '**') {
                Object.entries(node.suburls).forEach(([_, value]) => {
                    queue.push({node: value, index: index});
                    queue.push({node: value, index: index + 1});
                });
                queue.push({node: node, index: index + 1});
            } else {
                let re = new RegExp(`^${cur_pattern}$`);
                Object.entries(node.suburls).forEach(([key, value]) => {
                    if (re.test(key)) {
                        queue.push({node: value, index: index + 1});
                    }
                });
            }
        }
        return result;
    }
}