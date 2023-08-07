import { Config } from "./config"
import { ExtWorker } from "./extWorker"
import { File } from "./file"
import { execSync } from "child_process"
import { FsWorker } from "./fsWorker"
import { Listener } from "./listen"
import { Extension } from "./extension"

export class Hi {
    readonly config: Config
    private fsWorker: FsWorker
    private listener: Listener
    private listenIntervalId: number | undefined
    public extWorker: ExtWorker

    constructor(config: Config) {
        this.config = config
        this.fsWorker = new FsWorker(config)
        this.extWorker = new ExtWorker(config, this.fsWorker)
        this.listener = new Listener(config)
    }

    private async _writeFile(file: File, ext: Extension) {
        const result = await ext.transform(file, this.fsWorker)
        if (result.succ) {
            if (result.filename) {
                const relpath = this.fsWorker.join(
                    file.getDirname(),
                    result.filename
                )
                await this.fsWorker
                    .writeTarget(relpath, result.content)
                    .catch((reason) => {
                        console.log(
                            `Failed to write ${file.getRelPath()}: ${reason}`
                        )
                    })
            }
        } else {
            console.log(
                `Failed to generate file for ${file.getRelPath()}: ${
                    result.errMsg
                }`
            )
        }
    }

    private async generateFromPathRecurInit(p: string) {
        // p is relative path
        return this.fsWorker.lstatSrc(p).then(
            async (stat) => {
                if (stat.isDirectory()) {
                    await this.fsWorker.mkdirTarget(p)
                    const files = await this.fsWorker.readdirSrc(p)
                    const promises = []
                    for (let file of files) {
                        const relpath = this.fsWorker.join(p, file)
                        promises.push(this.generateFromPathRecurInit(relpath))
                    }
                    await Promise.all(promises)
                } else {
                    const file = new File(p)
                    const ext = this.extWorker.getExtension(file, this.fsWorker)
                    await this._writeFile(file, ext)
                }
            },
            (reason) => {
                console.log(`Failed to lstat ${p}: ${reason}`)
            }
        )
    }

    public async generateInit() {
        const promises = []
        for (const p of this.config.includes) {
            promises.push(this.generateFromPathRecurInit(p))
        }
        return Promise.all(promises)
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
