import { Config } from '../config';
import { generate_file } from './file';
import { FileTemplate } from '../template';
import { encrypt, get_private_scripts } from '../private';
import { File, Dir, FNode } from './basic';
import * as fs from 'fs';
import * as path from 'path';
import { assert } from 'console';

export class FileTree {
    private fnode_root: Dir;
    private config: Config;

    constructor(config: Config) {
        this.config = config;
        FileTemplate.config_working_dir(this.config.project_root_dir);
        this.fnode_root = new Dir(this.config.project_root_dir, '', false);
        this.fnode_root.name = '.';
        let include_files: string[] = [];
        for (let file of this.config.include_files) {
            include_files.push(file);
        }
        this.create_file_tree(this.fnode_root, include_files);
    }

    /**
     * 
     * @param dirnode information with filenode of the directory and other attributes about the file
     * @returns file's url
     */
    private add_file(dirnode: Dir, abspath: string, is_private: boolean): File {
        let new_file: File = generate_file(abspath, dirnode.url, is_private);

        dirnode.insert_project_map(path.basename(abspath), new_file);
        dirnode.insert_url_map(new_file.get_base_url(), new_file);
        return new_file;
    }

    private unlink_file(dirnode: Dir, name: string) {
        const fnode = dirnode.project_map[name];
        const suburl = fnode.get_base_url();
        delete dirnode.project_map[name];
        delete dirnode.url_map[suburl];
    }

    private write_file(file: File, content: string) {
        const url = file.get_url();
        const parent_url = url.slice(0, url.lastIndexOf('/'));
        const parent_dir = this.url_to_output_path(parent_url);
        if (!fs.existsSync(parent_dir)) {
            fs.mkdirSync(parent_dir, { recursive: true });
        }
        const output_path = this.url_to_output_path(url);
        if (file.is_private) {
            // encrypt the content of file
            content = encrypt(content, this.config.passwd);
            const output_tag = `<p id="ciphertext" hidden>${content}</p>`;
            content = FileTemplate.get_instantiation(this.config.file_template.private_template, { ciphertext: output_tag, private_scripts: get_private_scripts() }, "jinja");
        }
        fs.writeFileSync(output_path, content);
    }

    private read_file(file: File) {
        const content = fs.readFileSync(file.abspath).toString();
        file.on_change(content);
        file.dirty = false;
    }

    private convert_and_write(file: File, converter: (file: File) => string) {
        const converted_content = converter(file);
        this.write_file(file, converted_content);
    }

    /**
     * 
     * @param dirnode information about a direcotry
     * @param targets 
     */
    private create_file_tree(dirnode: Dir, targets: string[]) {
        for (let target of targets) {
            let next_abspath = path.join(dirnode.abspath, target);
            let next_is_private = dirnode.is_private;
            let next_relpath = this.get_relpath(next_abspath);
            if (this.config.privates.has(next_relpath)) {
                next_is_private = true;
            }

            if (fs.lstatSync(next_abspath).isFile()) {
                this.add_file(dirnode, next_abspath, next_is_private);
            } else if (fs.lstatSync(next_abspath).isDirectory()) {
                // read all files inside directories
                let next_targets: string[] = fs.readdirSync(next_abspath);
                let next_url = dirnode.url + `/${target}`
                let next_dirnode: Dir = new Dir(next_abspath, next_url, next_is_private);

                dirnode.insert_project_map(target, next_dirnode);
                dirnode.insert_url_map(target, next_dirnode);
                this.create_file_tree(next_dirnode, next_targets);
            }
        }
    }

    /**
     * 
     * @param abspath absolute path
     * @returns relative path to the project root, always start with '/'
     */
    private get_relpath(abspath: string): string {
        const relpath = path.relative(this.config.project_root_dir, abspath).replace(path.sep, '/');
        if (relpath[0] !== '/') {
            return '/' + relpath;
        }
        return relpath;
    }

    /**
     * 
     * @param abspath absolute path
     * @returns relative path to the project root, stored in order in an array
     */
    private get_relpath_array(abspath: string): string[] {
        const relpath = path.relative(this.config.project_root_dir, abspath);
        return relpath.split(path.sep).filter(s => s);
    }

    private get_url_array(url: string): string[] {
        return url.split('/').filter(s => s);
    }

    private url_to_output_path(url: string): string {
        const relpath = url.replace('/', path.sep);
        return path.join(this.config.output_dir, relpath);
    }

    private find_by_path(abspath: string): FNode | undefined {
        const relpath_array = this.get_relpath_array(abspath);
        let fnode: FNode = this.fnode_root;

        for (const filename of relpath_array) {
            if (fnode instanceof Dir && filename in fnode.project_map) {
                fnode.putdown_dirty();
                fnode = fnode.project_map[filename];
            } else {
                return undefined;
            }
        }
        return fnode;
    }

    private find_by_url(url: string): FNode | undefined {
        const url_array = this.get_url_array(url);
        let fnode: FNode = this.fnode_root;
        
        for (const suburl of url_array) {
            if (fnode instanceof Dir && suburl in fnode.url_map) {
                fnode.putdown_dirty();
                fnode = fnode.url_map[suburl];
            } else {
                return undefined;
            }
        }
        return fnode;
    }

    private _visit_url(fnode: FNode, callback: (fnode: File) => any, response: (fnode: FNode, res: any) => any) {
        if (fnode instanceof File) {
            if (fnode.dirty) {
                this.read_file(fnode);
            }
            let res = callback(fnode);
            return response(fnode, res);
        } else if (fnode instanceof Dir) {
            Object.entries(fnode.url_map).forEach(([key, value]) => {
                this._visit_url(value, callback, response);
            });
        }
    }

    private visit_url(callback: (fnode: File) => any, response: (fnode: FNode, res: any) => any) {
        this._visit_url(this.fnode_root, callback, response);
    }

    public on_change(abspath: string, converter: (fnode: FNode) => string) {
        const find_res = this.find_by_path(abspath);
        if (find_res) {
            if (find_res instanceof File) {
                this.read_file(find_res);
                this.convert_and_write(find_res, converter);
            }
        }
    }

    public on_add(abspath: string, converter: (fnode: FNode) => string) {
        const parent_path = path.dirname(abspath);
        if (parent_path === this.config.project_root_dir) {
            let filename = path.basename(abspath);
            if (!this.config.include_files.has(filename)) {
                return;
            }
        }
        const find_res = this.find_by_path(parent_path);
        if (find_res) {
            if (!(find_res instanceof Dir)) {
                throw Error(`Failed to add ${abspath}`);
            }
            find_res.abspath = abspath;
            const new_file = this.add_file(find_res, abspath, find_res.is_private);
            this.convert_and_write(new_file, converter);
        }
    }

    public on_unlink(abspath: string) {
        const parent_path = path.dirname(abspath);
        const filename = path.basename(abspath);
        const find_res = this.find_by_path(parent_path);
        if (find_res) {
            if (!(find_res instanceof Dir)) {
                throw Error(`Failed to unlink ${abspath}`);
            }
            this.unlink_file(find_res, filename);
        }
    }

    public write(converter: (fnode: File) => string) {
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
            assert(node instanceof File && res);
            if (node instanceof File) {
                assert(!node.dirty);
                this.write_file(node, res);
            }
        });
    }

    public get_result_content(url: string, converter: (file: File) => string): string | undefined {
        const find_res = this.find_by_url(url);
        if (find_res) {
            if (!(find_res instanceof File)) {
                throw Error(`${url} is not a file`);
            }
            if (find_res.dirty) {
                this.read_file(find_res);
                this.convert_and_write(find_res, converter);
            }
            return fs.readFileSync(this.url_to_output_path(url)).toString();
        } else {
            return undefined;
        }
    }

    // * matches any single directory name or an empty.
    // ** matches any directory names or empties.
    public search_by_url_pattern(url_pattern: string): File[] {
        const url_array = url_pattern.split('/').filter(s => s);
        let queue: [{node: FNode, index: number}] = [{node: this.fnode_root, index: 0}];
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
                if (node instanceof File) {
                    if (!file_set.has(node)) {
                        file_set.add(node);
                        result.push(node);
                    }
                    continue;
                } else if (node instanceof Dir && cur_pattern === '**') {
                    Object.entries(node.url_map).forEach(([_, value]) => {
                        queue.push({node: value, index: index});
                    })
                }
                continue;
            }
            // case2
            if (node instanceof Dir) {
                if (cur_pattern === '*') {
                    Object.entries(node.url_map).forEach(([_, value]) => {
                        queue.push({node: value, index: index + 1});
                    });
                    queue.push({node: node, index: index + 1});  // match empty
                } else if (cur_pattern === '**') {
                    Object.entries(node.url_map).forEach(([_, value]) => {
                        queue.push({node: value, index: index});
                        queue.push({node: value, index: index + 1});
                    });
                    queue.push({node: node, index: index + 1});
                } else {
                    let re = new RegExp(`^${cur_pattern}$`);
                    Object.entries(node.url_map).forEach(([key, value]) => {
                        if (re.test(key)) {
                            queue.push({node: value, index: index + 1});
                        }
                    });
                }
            }
        }
        return result;
    }
}