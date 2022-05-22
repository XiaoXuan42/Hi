import * as fs from 'fs'
import * as path from 'path'
import YAML from 'yaml'
import { Config } from './config';
import { Template } from './template';
import { FileTree } from './file'

export class Hi {
    config: Config;
    filetree: FileTree;

    constructor(dirname: string) {
        if (!path.isAbsolute(dirname)) {
            dirname = path.join(process.cwd(), dirname);
        }
        let meta = YAML.parse(fs.readFileSync(path.join(dirname, 'config.yml'), 'utf-8'));
        this.config = new Config(dirname, meta);
        this.filetree = new FileTree(this.config);
    }

    generate_with_outdir(outdir: string) {
        this.filetree.write(outdir);
    }

    generate() {
        this.generate_with_outdir(this.config.output_dir);
    }
}