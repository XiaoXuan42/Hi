import * as path from 'path';
import * as process from 'process';
import { Config } from './config';
import { FileTree } from './file';
import { Listener } from './listen';

export class Hi {
    private config: Config;
    private filetree: FileTree;
    private listener: Listener;

    constructor(project_root_dir: string) {
        if (!path.isAbsolute(project_root_dir)) {
            project_root_dir = path.join(process.cwd(), project_root_dir);
        }
        this.config = new Config(project_root_dir);
        this.filetree = new FileTree(this.config);
        this.listener = new Listener(this.config, this.filetree);
    }

    private generate_with_outdir(outdir: string) {
        this.filetree.write(outdir);
    }

    generate() {
        this.generate_with_outdir(this.config.output_dir);
    }

    listen() {
        this.listener.listen();
    }
}