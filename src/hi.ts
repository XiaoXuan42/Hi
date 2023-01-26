import * as path from 'path';
import * as process from 'process';
import { Config } from './config';
import { FileTree } from './fs/filetree';
import { Listener } from './listen';
import { Server } from './server';
import { Converter } from './converter';
import { execSync } from 'child_process';

export class Hi {
    private config: Config;
    private filetree: FileTree;
    private listener: Listener;
    private server: Server;
    private converter: Converter;

    constructor(config: Config) {
        this.config = config;
        this.filetree = new FileTree(this.config);
        this.converter = new Converter(this.filetree, this.config);
        this.listener = new Listener(this.config, this.filetree, this.converter);
        this.server = new Server(this.filetree, this.converter);
    }

    public generate() {
        this.filetree.clear_and_write(this.converter.convert.bind(this.converter));
    }

    public git_commit(message: string): string {
        const git_out = execSync(`git add . && git commit -m ${message}`, {
            cwd: this.config.output_dir
        });
        const push_out = execSync(`git push`, {
            cwd: this.config.output_dir
        });
        return `${git_out.toString()}\n${push_out.toString()}`
    }

    public live() {
        this.listener.listen();
        this.server.start();
    }
}