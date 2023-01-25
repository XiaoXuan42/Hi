import { assert } from 'console';
import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';

export class Config {
    // configurations in this block are given in config.yml and remain the same during the livetime of the process
    readonly project_root_dir: string;  // root directory of current project, absolute path
    readonly config_path: string;  // absolute path
    readonly file_template_path: string;  // absolute path
    readonly include_files: Set<string>;  // relative path to project_root_dir
    readonly output_dir: string;  // absolute path
    readonly privates: Set<string>;  // relative path
    readonly passwd: string;
    readonly meta: {[name: string]: any};

    private file_templates: {[name: string]: string};
    /**
     * Configuration of the project
     * @param project_root_dir root directory of the project, absolute path
     */
    constructor(project_root_dir: string) {
        this.project_root_dir = project_root_dir;
        assert(path.isAbsolute(this.project_root_dir));

        this.config_path = path.join(project_root_dir, 'config.yml');
        const yaml = YAML.parse(fs.readFileSync(this.config_path, 'utf-8'));

        // fileTemplatePath
        this.file_template_path = yaml['fileTemplatePath'];
        if (!path.isAbsolute(this.file_template_path)) {
            this.file_template_path = path.join(project_root_dir, this.file_template_path);
        }

        // include
        this.include_files = new Set();
        for (const file of yaml['include']) {
            this.include_files.add(file);
        }

        // outputDirectory
        if ('outputDirectory' in yaml) {
            this.output_dir = yaml['outputDirectory'];
        } else {
            this.output_dir = 'output';
        }
        if (!path.isAbsolute(this.output_dir)) {
            this.output_dir = path.join(project_root_dir, this.output_dir);
        }

        // privates
        this.privates = new Set<string>();
        if ('privates' in yaml) {
            for (let file of yaml['privates']) {
                this.privates.add(file);
            }
        }

        this.file_templates = {}
        this.reload_file_template()

        this.passwd = yaml['passwd'];

        if ('meta' in yaml) {
            this.meta = yaml['meta'];
        } else {
            this.meta = {};
        }

        if (!('project_name' in this.meta)) {
            this.meta['project_name'] = path.basename(this.output_dir);
        }
    }

    public get_project_name() {
        return this.meta['project_name'];
    }

    public reload_file_template() {
        let templates: string[] = fs.readdirSync(this.file_template_path)
        for (let template of templates) {
            let curpath = `${this.file_template_path}/${template}`
            if (fs.lstatSync(curpath).isFile()) {
                let key = path.basename(curpath)
                this.file_templates[key] = fs.readFileSync(curpath).toString()
            }
        }
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