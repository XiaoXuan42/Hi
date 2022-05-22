import * as path from 'path'

export class Config {
    readonly template_path: string;
    readonly include_files: string[];
    readonly output_dir: string;

    constructor(dirname: string, yaml: {[key: string]: any}) {
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
    }
}