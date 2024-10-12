import Environment from "./environment.js"
import { File } from "./file.js"
import * as fs from "node:fs"
import fsUtil from "./fsUtil.js"

export abstract class Extension {
    abstract getName(): string;
    abstract accept(file: File): boolean;
    async beforeMap(env: Environment): Promise<void> {}
    abstract map(file: File, env: Environment): Promise<void>;
    async beforeReduce(env: Environment): Promise<void> {}
    abstract reduce(files: File[], env: Environment): Promise<void>;
    async beforeFinish(env: Environment): Promise<void> {}
}

export class DefaultExtension extends Extension {
    public getName(): string { return "Hi.Default" }
    public accept(file: File) { return true }
    public async map(file: File, env: Environment) {
        return fs.promises.readFile(file.getSrcAbsPath()).then((buffer) => {
            file.content = buffer
        }).catch((_) => {
            file.content = undefined
        })
    }

    public async reduce(files: File[], env: Environment) {
        const promises: Promise<void>[] = []
        for (const file of files) {
            if (file.content === undefined) {
                continue
            }
            const targetPath = env.router.route(file.getSrcAbsPath())
            promises.push(fsUtil.ensureDirWriteAsyn(targetPath, file.content as string))
        }
        await Promise.all(promises)
    }
}
