import { assert } from 'console';
import * as fs from 'fs';
import * as path from 'path';
import { FileTemplate } from './template';
import YAML from 'yaml';

export class Config {
    readonly project_root_dir: string;  // root directory of current project, absolute path
    readonly config_path: string;
    readonly file_template_path: string;  // absolute path
    readonly include_files: Set<string>;
    readonly output_dir: string;
    readonly privates: Set<string>;
    readonly file_template: FileTemplate;
    readonly passwd: string;
    readonly meta: object;

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

        this.file_template = new FileTemplate(this.file_template_path);
        this.passwd = yaml['passwd'];

        if ('meta' in yaml) {
            this.meta = yaml['meta'];
        } else {
            this.meta = {};
        }
    }
}