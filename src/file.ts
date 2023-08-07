import * as path from "node:path"
import { Buffer } from "node:buffer"

export class File {
    private relPath: string
    public data: any
    public content: string | Buffer

    constructor(relPath: string) {
        this.relPath = relPath
        this.data = undefined
        this.content = ""
    }

    public getRelPath(): string {
        return this.relPath
    }

    public getDirname(): string {
        return path.dirname(this.relPath)
    }

    public getBasename(): string {
        return path.basename(this.relPath)
    }

    public getFileAndExtName(): [string, string] {
        const basename = path.basename(this.relPath)
        const index = basename.lastIndexOf(".")
        let filename: string, extname: string
        if (index <= 0) {
            filename = basename
            extname = ""
        } else {
            filename = basename.substring(0, index)
            extname = basename.substring(index + 1)
        }
        return [filename, extname]
    }
}
