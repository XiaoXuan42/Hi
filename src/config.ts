import * as path from 'path';
import { Template } from './template';

export class Config {
    readonly working_dir: string;
    readonly template_path: string;
    readonly include_files: string[];
    readonly output_dir: string;
    readonly routes: {[path:string]: string};
    readonly privates: Set<string>;
    readonly template: Template;
    readonly passwd: string;

    constructor(dirname: string, yaml: {[key: string]: any}) {
        this.working_dir = dirname;
        this.template_path = yaml['template_path'];
        if (!path.isAbsolute(this.template_path)) {
            this.template_path = path.join(dirname, this.template_path);
        }
        this.include_files = yaml['include'];
        if ('output_dir' in yaml) {
            this.output_dir = yaml['output_dir'];
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

        this.template = new Template(this.template_path);
        this.passwd = yaml['passwd'];
    }
}