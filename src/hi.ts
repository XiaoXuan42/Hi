import * as path from 'path';
import * as process from 'process';
import { Config } from './config';
import { FileTree } from './filetree/filetree';
import { Listener } from './listen';
import { Server } from './server';

export class Hi {
    private config: Config;
    private filetree: FileTree;
    private listener: Listener;
    private server: Server;

    constructor(project_root_dir: string) {
        if (!path.isAbsolute(project_root_dir)) {
            project_root_dir = path.join(process.cwd(), project_root_dir);
        }
        this.config = new Config(project_root_dir);
        this.filetree = new FileTree(this.config);
        this.listener = new Listener(this.config, this.filetree);
        this.server = new Server(this.filetree);
    }

    generate() {
        this.filetree.write();
    }

    live() {
        this.listener.listen();
        this.server.start();
    }
}