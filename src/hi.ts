import * as fs from "node:fs"
import { Config } from "./config.js"
import { ExtWorker } from "./extWorker.js"
import { File } from "./file.js"
import { Extension } from "./extension.js"
import path from "path"
import fsUtil from "./fsUtil.js"
import Environment from "./environment.js"
import { Router } from "./router.js"
import http from "node:http"

export class Hi {
    readonly config: Config
    private environment: Environment
    private extWorker: ExtWorker
    private router: Router

    private assignment: Map<Extension, File[]>

    constructor(config: Config) {
        this.config = config
        this.assignment = new Map()
        this.extWorker = new ExtWorker(config)
        this.router = new Router(config)
        this.environment = new Environment(config, this.router)
    }

    public async initExtension() {
        await this.extWorker.loadExtensions()
    }

    /**
     * 将文件按照规则分配给插件处理
     * @param relpath 输入的相对路径（相对于projectRoot）
     * @param children 可能的子目录列表
     * @param specified 指定的路径，如果非空，那么只能遍历指定的路径
     * @returns 
     */
    private async initAssignRecur(
        relpath: string,
        children: string[],
        specified?: string[]
    ) {
        const promises: Promise<void>[] = []
        children.forEach((child) => {
            const nextRelPath = path.join(relpath, child)
            const nextSrcAbsPath = path.join(this.config.projectRootDir, nextRelPath)
            if (specified && specified.length >= 1) {
                if (child !== specified[0]) {
                    return
                }
            }

            if (fsUtil.globMatch(nextRelPath, this.config.excludes)) {
                return
            }

            promises.push(
                fs.promises.stat(path.join(nextSrcAbsPath)).then(
                    async (stat) => {
                        if (stat.isDirectory()) {
                            const files = await fs.promises.readdir(nextSrcAbsPath)
                            const nextSpecified =
                                specified && specified.length > 1
                                    ? specified.slice(1)
                                    : undefined
                            await this.initAssignRecur(
                                nextRelPath,
                                files,
                                nextSpecified
                            )
                        } else {
                            const newFile = new File(this.config.projectRootDir, nextRelPath)
                            const ext = this.extWorker.getExtension(newFile)
                            if (this.assignment.has(ext)) {
                                this.assignment.get(ext)?.push(newFile)
                            } else {
                                this.assignment.set(ext, [newFile])
                            }
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
        const promises: Promise<void[]>[] = []
        this.config.includes.forEach((include) => {
            const specified = fsUtil.separatePath(include)
            promises.push(
                this.initAssignRecur(
                    "",
                    [specified[0]],
                    specified
                )
            )
        })
        await Promise.all(promises)
    }

    private async mapPhase() {
        const promises: Promise<void>[] = []
        for (const [ext, files] of this.assignment) {
            for (const file of files) {
                promises.push(ext.map(file, this.environment).catch((reason) => {
                    console.log(`Map error: ${file.getSrcAbsPath()}: ${reason}`)
                }))
            }
        }
        return Promise.all(promises)
    }

    private async reducePhase() {
        const promises: Promise<void>[] = []
        for (const [ext, files] of this.assignment) {
            promises.push(
                ext.reduce(files, this.environment)
                    .catch((reason) => { console.log(`Reduce error: ${ext.getName()}: ${reason}`)})
            )
        }
        return Promise.all(promises)
    }

    public async generate() {
        this.assignment.clear()
        await this.initAssign()
        this.extWorker.extensions.forEach(([_, ext]) => { ext.beforeMap(this.environment) })
        await this.mapPhase()
        this.extWorker.extensions.forEach(([_, ext]) => { ext.beforeReduce(this.environment) })
        await this.reducePhase()
        this.extWorker.extensions.forEach(([_, ext]) => { ext.beforeFinish(this.environment) })
        this.assignment.clear()
    }

    public serve(port: number) {
        const server = http.createServer((req, res) => {
            let head = { "Content-Type": "text/plain" }
            if (req.url) {
                const url = new URL(req.url, `http://localhost:${port}`)
                const decodedPath = decodeURIComponent(url.pathname)
                fs.readFile(path.join(this.config.outputDir, decodedPath), (err, data) => {
                    if (err) {
                        head["Content-Type"] = 'application/json; charset=UTF-8'
                        res.writeHead(404, head)
                        res.end(err.toString())
                    } else {
                        if (decodedPath.endsWith("html")) {
                            head["Content-Type"] = 'text/html; charset=UTF-8'
                        } else if (decodedPath.endsWith("js")) {
                            head["Content-Type"] = 'application/javascript; charset=UTF-8'
                        } else if (decodedPath.endsWith("css")) {
                            head["Content-Type"] = "text/css; charset=UTF-8"
                        } else {
                            head["Content-Type"] = 'text/plain; charset=UTF-8'
                        }
                        res.writeHead(200, head)
                        res.end(data)
                    }
                })
            } else {
                res.writeHead(404, { "Content-Type": 'text/plain' })
                res.end("Page not found")
            }
        })
        server.listen(port)
    }
}
