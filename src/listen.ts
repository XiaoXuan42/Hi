import { assert } from "console"
import { Config } from "./config"
import * as chokidar from "chokidar"

export class Listener {
    private config: Config
    private changeSet: Set<string>
    private removeSet: Set<string>
    private watcher: chokidar.FSWatcher | undefined

    constructor(config: Config) {
        this.config = config
        this.changeSet = new Set()
        this.removeSet = new Set()
    }

    public clearAll() {
        this.changeSet = new Set()
        this.removeSet = new Set()
    }

    public async listenInit() {
        if (this.watcher) {
            this.clearAll()
            await this.watcher.close()
        }
        this.watcher = chokidar
            .watch(this.config.projectRootDir, {
                ignoreInitial: true,
            })
            .on("change", (path, stat) => {
                this.changeSet.add(path)
                assert(!this.removeSet.has(path))
            })
            .on("add", (path) => {
                this.changeSet.add(path)
                if (this.removeSet.has(path)) {
                    this.removeSet.delete(path)
                }
            })
            .on("unlink", (path) => {
                this.removeSet.add(path)
                if (this.changeSet.has(path)) {
                    this.changeSet.delete(path)
                }
            })
    }

    public getModification(): [Set<string>, Set<string>] {
        return [this.changeSet, this.removeSet]
    }
}
