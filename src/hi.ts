import * as path from 'path';
import * as process from 'process';
import { Config } from './config';
import { FileTree } from './file';

export class Hi {
    config: Config;
    filetree: FileTree;

    constructor(project_root_dir: string) {
        if (!path.isAbsolute(project_root_dir)) {
            project_root_dir = path.join(process.cwd(), project_root_dir);
        }
        this.config = new Config(project_root_dir);
        this.filetree = new FileTree(this.config);
    }

    generate_with_outdir(outdir: string) {
        this.filetree.write(outdir);
    }

    generate() {
        this.generate_with_outdir(this.config.output_dir);
    }
}