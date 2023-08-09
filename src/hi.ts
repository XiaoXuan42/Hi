import { Config } from "./config"
import { ExtWorker } from "./extWorker"
import { File, DirEntry } from "./file"
import { execSync } from "child_process"
import { FsWorker } from "./fsWorker"
import { Listener } from "./listen"
import { Extension, ExtensionResult } from "./extension"
import { Server } from "./server"

export class Hi {
    readonly config: Config
    private fsWorker: FsWorker
    private listener: Listener
    private isListening: boolean
    private assignment: Map<Extension, File[]>
    private server: Server
    public extWorker: ExtWorker

    constructor(config: Config) {
        this.config = config
        this.fsWorker = new FsWorker(config)
        this.extWorker = new ExtWorker(config, this.fsWorker)
        this.listener = new Listener(config)
        this.assignment = new Map()
        this.server = new Server(this.config, this.fsWorker)
        this.isListening = false
    }

    private async executeResult(result: ExtensionResult) {
        if (result.succ) {
            await this.fsWorker
                .writeTarget(result.targetRelPath, result.content)
                .catch((reason) => {
                    console.log(
                        `Failed to write ${result.targetRelPath}: ${reason}`
                    )
                })
        } else {
            console.log(
                `Failed to generate file for ${result.file.getRelPath()}: ${
                    result.errMsg
                }`
            )
        }
    }

    private assign(file: File) {
        const ext = this.extWorker.getExtension(file, this.fsWorker)
        if (this.assignment.has(ext)) {
            this.assignment.get(ext)!.push(file)
        } else {
            this.assignment.set(ext, [file])
        }
    }

    private async initAssignRecur(direntry: DirEntry, childrens: string[]) {
        const promises: Promise<void>[] = []
        childrens.forEach((child) => {
            const nextRelPath = this.fsWorker.join(direntry.getRelPath(), child)
            promises.push(
                this.fsWorker.statSrc(nextRelPath).then(
                    async (stat) => {
                        if (stat.isDirectory()) {
                            await this.fsWorker.mkdirTarget(nextRelPath)
                            const files = await this.fsWorker.readdirSrc(
                                nextRelPath
                            )
                            const newDirEntry = direntry.getOrAddSubDir(child)
                            await this.initAssignRecur(newDirEntry, files)
                        } else {
                            const newFile = direntry.getOrAddFile(child)
                            this.assign(newFile)
                        }
                    },
                    (reason) => {
                        console.log(`Failed to stat ${nextRelPath}: ${reason}`)
                    }
                )
            )
        })
        return Promise.all(promises)
    }

    private async initAssign() {
        return this.initAssignRecur(this.fsWorker.root, this.config.includes)
    }

    private async mapPhase() {
        const promises: Promise<void>[] = []
        this.assignment.forEach((files, ext) => {
            files.forEach((file) => {
                promises.push(ext.map(file))
            })
        })
        return Promise.all(promises)
    }

    private async reducePhase() {
        const promises: Promise<void>[] = []
        this.assignment.forEach((files, ext) => {
            files.forEach((file) => {
                promises.push(
                    ext.reduce(file).then(async (results) => {
                        const promises2: Promise<void>[] = []
                        results.forEach((result) => {
                            promises2.push(this.executeResult(result))
                        })
                        await Promise.all(promises2)
                    })
                )
            })
        })
        return Promise.all(promises)
    }

    public async initGenerate() {
        this.assignment.clear()
        await this.initAssign()
        await this.mapPhase()
        await this.reducePhase()
        this.assignment.clear()
    }

    public gitCommit(message: string): string {
        const git_out = execSync(`git add . && git commit -m ${message}`, {
            cwd: this.config.outputDir,
        })
        const push_out = execSync(`git push`, {
            cwd: this.config.outputDir,
        })
        return `${git_out.toString()}\n${push_out.toString()}`
    }

    private async _listen() {
        this.assignment.clear()
        let [changeSet, removeSet] = this.listener.getModification()
        this.listener.clearAll()
        removeSet.forEach((val) => {
            this.fsWorker.remove(val)
        })
        changeSet.forEach((val) => {
            const inode = this.fsWorker.visitByPath(val)
            if (inode && inode.isFile()) {
                this.assign(inode as File)
            }
        })
        await this.mapPhase()
        await this.reducePhase()
        this.assignment.clear()
    }

    private _listen_entry() {
        if (this.isListening) {
            this._listen().then((_) => {
                if (this.isListening) {
                    setTimeout(this._listen_entry.bind(this), 100)
                }
            })
        }
    }

    private unlisten() {
        this.isListening = false
    }

    private async listen() {
        if (this.isListening) {
            return
        }
        this.isListening = true
        return this.listener
            .listenInit()
            .then((_) => {
                setTimeout(this._listen_entry.bind(this), 100)
                return true
            })
            .catch((_) => {
                console.log("Failed to listen")
                return false
            })
    }

    public async live(port = 8080) {
        this.listen().then((succ) => {
            if (succ) {
                this.server.start(port)
                return true
            } else {
                return false
            }
        })
    }
}
