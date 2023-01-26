import { assert } from 'console';
import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';

interface ConfigOption {
    path: string | undefined;
    passwd: string | undefined;
    output: string | undefined;
    config: string | undefined;
    encrypt: boolean | undefined;
    decrypt: boolean | undefined;
}

export class Config {
    // configurations in this block are given in config.yml and remain the same during the livetime of the process
    readonly project_root_dir: string;  // root directory of current project, absolute path
    readonly config_path: string | undefined;  // absolute path
    readonly file_template_path: string;  // absolute path
    readonly include_files: Set<string>;  // relative path to project_root_dir
    readonly output_dir: string;  // absolute path
    readonly privates: Set<string>;  // relative path
    readonly passwd: string;
    readonly encrypt: boolean;
    readonly decrypt: boolean;
    readonly meta: {[name: string]: any};

    private file_templates: {[name: string]: string};

    /**
     * Configuration of the project
     * @param opts
     */
    constructor(opts: ConfigOption) {
        if (opts.path) {
            if (!path.isAbsolute(opts.path)) {
                this.project_root_dir = path.join(process.cwd(), opts.path)
            } else {
                this.project_root_dir = opts.path
            }
        } else {
            this.project_root_dir = process.cwd()
        }
        assert(path.isAbsolute(this.project_root_dir));

        this.config_path = undefined
        if (opts.config) {
            if (!path.isAbsolute(opts.config)) {
                this.config_path = path.join(process.cwd(), opts.config)
            } else {
                this.config_path = opts.config
            }
        } else {
            const candidate_path = path.join(this.project_root_dir, 'config.yml')
            if (fs.existsSync(candidate_path) && fs.lstatSync(candidate_path).isFile()) {
                this.config_path = candidate_path
            }
        }
        let yaml: any = {}
        if (this.config_path) {
            yaml = YAML.parse(fs.readFileSync(this.config_path, 'utf-8'))
        }

        // fileTemplatePath
        if ('fileTemplatePath' in yaml) {
            this.file_template_path = yaml.fileTemplatePath
            if (!path.isAbsolute(this.file_template_path)) {
                this.file_template_path = path.join(this.project_root_dir, this.file_template_path);
            }
        } else {
            this.file_template_path = path.join(this.project_root_dir, 'templates')
        }

        // include
        this.include_files = new Set();
        if ('include' in yaml) {
            for (const file of yaml.include) {
                this.include_files.add(file)
            }
        } else {
            for (let fname of fs.readdirSync(this.project_root_dir)) {
                this.include_files.add(fname)
            }
        }

        // outputDirectory
        if ('outputDirectory' in yaml) {
            this.output_dir = yaml.outputDirectory
        } else {
            if (opts.output) {
                this.output_dir = opts.output
            } else {
                this.output_dir = 'output'
            }
        }
        if (!path.isAbsolute(this.output_dir)) {
            this.output_dir = path.join(this.project_root_dir, this.output_dir);
        }

        // privates
        this.privates = new Set<string>();
        if ('privates' in yaml) {
            for (let file of yaml['privates']) {
                this.privates.add(file);
            }
        }

        // load templates
        this.file_templates = {}
        this.reload_file_template()

        // passwd
        if ('passwd' in yaml) {
            this.passwd = yaml['passwd']
        } else {
            if (opts.passwd) {
                this.passwd = opts.passwd
            } else {
                throw Error("Missing passwd")
            }
        }

        // encrpyt and decrypt
        if (opts.encrypt) {
            this.encrypt = true
        } else {
            this.encrypt = false
        }
        if (opts.decrypt) {
            this.decrypt = true
        } else {
            this.decrypt = false
        }

        // meta
        if ('meta' in yaml) {
            this.meta = yaml.meta;
        } else {
            this.meta = {};
        }
        /// meta.project_name
        if (!('project_name' in this.meta)) {
            this.meta.project_name = path.basename(this.output_dir);
        }
    }

    public get_project_name() {
        return this.meta['project_name'];
    }

    public reload_file_template() {
        if (!fs.existsSync(this.file_template_path) || !fs.lstatSync(this.file_template_path).isDirectory()) {
            return
        }
        let templates: string[] = fs.readdirSync(this.file_template_path)
        for (let template of templates) {
            let curpath = `${this.file_template_path}/${template}`
            if (fs.lstatSync(curpath).isFile()) {
                let key = path.basename(curpath)
                this.file_templates[key] = fs.readFileSync(curpath).toString()
            }
        }
    }

    public has_template(key: string): boolean {
        return key in this.file_templates
    }

    public get_template(key: string): string {
        return this.file_templates[key];
    }

    public is_inside_project(abspath: string): boolean {
        assert(path.isAbsolute(abspath));
        return abspath.startsWith(this.project_root_dir);
    }

    public is_included(abspath: string): boolean {
        assert(path.isAbsolute(abspath));
        for (const file of this.include_files) {
            if (abspath.startsWith(path.join(this.project_root_dir, file))) {
                return true;
            }
        }
        return false;
    }

    public is_config(abspath: string): boolean {
        assert(path.isAbsolute(abspath));
        return abspath === this.config_path;
    }

    public is_file_template(abspath: string): boolean {
        assert(path.isAbsolute(abspath));
        return abspath.startsWith(this.file_template_path);
    }
}