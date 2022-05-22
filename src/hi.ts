import * as fs from 'fs'
import * as path from 'path'
import YAML from 'yaml'
import { Config } from './config';
import { Template } from './template';
import { FileTree } from './file'

export class Hi {
    dirname: string;
    config: Config;
    template: Template;
    filetree: FileTree;

    constructor(dirname: string) {
        this.dirname = dirname;
        if (!path.isAbsolute(this.dirname)) {
            this.dirname = path.join(process.cwd(), this.dirname);
        }
        let meta = YAML.parse(fs.readFileSync(path.join(dirname, 'config.yml'), 'utf-8'));
        this.config = new Config(this.dirname, meta);
        this.template = new Template(this.config.template_path);
        this.filetree = new FileTree(this.dirname, this.config.include_files);
    }

    generate_with_outdir(outdir: string) {
        this.filetree.write(outdir, this.template);
    }

    generate() {
        this.generate_with_outdir(this.config.output_dir);
    }
}