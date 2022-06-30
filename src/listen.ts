import { Config } from './config';
import { FileTree } from './fs/filetree';
import { Converter } from './converter';
import * as chokidar from 'chokidar';
import * as fs from 'fs';

export class Listener {
    change_set: Set<string>;
    remove_set: Set<string>;
    add_set: Set<string>;
    watcher: chokidar.FSWatcher | undefined;

    constructor(public config: Config, public filetree: FileTree, public converter: Converter) {
        this.change_set = new Set();
        this.remove_set = new Set();
        this.add_set = new Set();
    }

    listen() {
        this.listen_init();
        setInterval(this.update.bind(this), 500);
    }

    private listen_init() {
        if (!this.watcher) {
            this.watcher = chokidar.watch(this.config.project_root_dir, {
                ignoreInitial: true,
            });
            this.watcher.on('change', (path, stat) => {
                this.change_set.add(path);
            });
            this.watcher.on('add', path => {
                this.add_set.add(path);
            });
            this.watcher.on('unlink', path => {
                this.remove_set.add(path);
            });
        }
    }

    private update() {
        const updated = new Set();
        for (const abspath of this.add_set) {
            if (fs.existsSync(abspath)) {
                updated.add(abspath);
                this.filetree.on_add(abspath, this.converter.convert.bind(this.converter));
            }
        }
        for (const abspath of this.remove_set) {
            if (!fs.existsSync(abspath)) {
                this.filetree.on_unlink(abspath);
            }
        }
        for (const abspath of this.change_set) {
            if (!updated.has(abspath) && fs.existsSync(abspath)) {
                this.filetree.on_change(abspath, this.converter.convert.bind(this.converter));
                updated.add(abspath);
            }
        }
        this.add_set.clear();
        this.remove_set.clear();
        this.change_set.clear();
    }
}