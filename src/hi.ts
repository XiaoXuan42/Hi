import { Config } from "./config"
import { ExtWorker } from "./extWorker"
import { File } from "./file"
import { execSync } from "child_process"
import { FsWorker } from "./fsWorker"
import { Listener } from "./listen"
import { Extension, ExtensionResult } from "./extension"

export class Hi {
    readonly config: Config
    private fsWorker: FsWorker
    private listener: Listener
    private listenIntervalId: number | undefined
    private assignment: Map<Extension, File[]>
    public extWorker: ExtWorker

    constructor(config: Config) {
        this.config = config
        this.fsWorker = new FsWorker(config)
        this.extWorker = new ExtWorker(config, this.fsWorker)
        this.listener = new Listener(config)
        this.assignment = new Map()
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

    private assign(ext: Extension, file: File) {
        if (this.assignment.has(ext)) {
            this.assignment.get(ext)!.push(file)
        } else {
            this.assignment.set(ext, [file])
        }
    }

    private async initAssignRecur(p: string) {
        // p is relative path
        return this.fsWorker.lstatSrc(p).then(
            async (stat) => {
                if (stat.isDirectory()) {
                    await this.fsWorker.mkdirTarget(p)
                    const files = await this.fsWorker.readdirSrc(p)
                    const promises = []
                    for (let file of files) {
                        const relpath = this.fsWorker.join(p, file)
                        promises.push(this.initAssignRecur(relpath))
                    }
                    await Promise.all(promises)
                } else {
                    const file = new File(p)
                    const ext = this.extWorker.getExtension(file, this.fsWorker)
                    this.assign(ext, file)
                }
            },
            (reason) => {
                console.log(`Failed to lstat ${p}: ${reason}`)
            }
        )
    }

    private async initAssign() {
        const promises: Promise<void>[] = []
        this.config.includes.forEach((dir) => {
            promises.push(this.initAssignRecur(dir))
        })
        return Promise.all(promises)
    }

    private async initMap() {
        const promises: Promise<void>[] = []
        this.assignment.forEach((files, ext) => {
            files.forEach((file) => {
                promises.push(ext.map(file))
            })
        })
        return Promise.all(promises)
    }

    private async initReduce() {
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
        await this.initMap()
        await this.initReduce()
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

    public async listen() {
        // TODO
        return this.listener
            .listenInit()
            .then((_) => {
                return undefined
            })
            .catch((_) => {
                console.log("Failed to listen")
            })
    }

    public unlisten() {
        if (this.listenIntervalId) {
            clearInterval(this.listenIntervalId)
        }
    }

    public async live() {}
}
