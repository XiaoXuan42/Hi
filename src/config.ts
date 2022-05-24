import * as path from 'path';
import { FileTemplate } from './template';

export class Config {
    readonly working_dir: string;  // root directory of current project
    readonly file_template_path: string;
    readonly include_files: string[];
    readonly output_dir: string;
    readonly routes: {[path:string]: string};
    readonly privates: Set<string>;
    readonly file_template: FileTemplate;
    readonly passwd: string;

    constructor(dirname: string, yaml: {[key: string]: any}) {
        this.working_dir = dirname;
        this.file_template_path = yaml['fileTemplatePath'];
        if (!path.isAbsolute(this.file_template_path)) {
            this.file_template_path = path.join(dirname, this.file_template_path);
        }
        this.include_files = yaml['include'];
        if ('outputDirectory' in yaml) {
            this.output_dir = yaml['outputDirectory'];
        } else {
            this.output_dir = 'output';
        }
        if (!path.isAbsolute(this.output_dir)) {
            this.output_dir = path.join(dirname, this.output_dir);
        }
        
        this.routes = {};
        if ('routes' in yaml) {
            this.routes = yaml['routes'];
        }

        this.privates = new Set<string>();
        if ('privates' in yaml) {
            for (let file of yaml['privates']) {
                this.privates.add(file);
            }
        }

        this.file_template = new FileTemplate(this.file_template_path);
        this.passwd = yaml['passwd'];
    }
}