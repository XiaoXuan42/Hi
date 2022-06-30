import * as path from 'path';
import * as process from 'process';
import { Config } from './config';
import { FileTree } from './fs/filetree';
import { Listener } from './listen';
import { Server } from './server';
import { Converter } from './converter';

export class Hi {
    private config: Config;
    private filetree: FileTree;
    private listener: Listener;
    private server: Server;
    private converter: Converter;

    constructor(project_root_dir: string) {
        if (!path.isAbsolute(project_root_dir)) {
            project_root_dir = path.join(process.cwd(), project_root_dir);
        }
        this.config = new Config(project_root_dir);
        this.filetree = new FileTree(this.config);
        this.converter = new Converter(this.filetree, this.config);
        this.listener = new Listener(this.config, this.filetree, this.converter);
        this.server = new Server(this.filetree);
    }

    generate() {
        this.filetree.write(this.converter.convert.bind(this.converter));
    }

    live() {
        this.listener.listen();
        this.server.start();
    }
}