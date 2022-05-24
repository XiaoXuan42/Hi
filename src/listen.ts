import { Config } from './config';
import { File, FileTree } from './file';
import * as chokidar from 'chokidar';

export class Listener {
    dirty: Set<string>;
    watcher: chokidar.FSWatcher | undefined;

    constructor(public config: Config, public filetree: FileTree) {
        this.dirty = new Set();
    }

    listen() {
        this.listen_init();
        setInterval(this.update.bind(this), 500);
    }

    private listen_init() {
        if (!this.watcher) {
            this.watcher = chokidar.watch(this.config.project_root_dir);
            this.watcher.on('change', path => {
                this.dirty.add(path);
            });
        }
    }

    private update() {
        for (let path of this.dirty) {
            this.filetree.on_change(path);
        }
        this.dirty.clear();
    }
}