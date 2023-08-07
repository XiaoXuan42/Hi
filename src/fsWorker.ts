import { Config } from "./config"
import { Buffer } from "node:buffer"
import * as fs from "node:fs"
import * as path from "node:path"

class DirEntry {
    private name: string
    private parent: DirEntry | undefined
    private childrens: { [name: string]: DirEntry }
    private relpath: string

    constructor(parent: DirEntry | undefined, name: string) {
        this.name = name
        this.parent = parent
        this.childrens = {}
        this.relpath = name
        if (this.parent !== undefined && this.parent.relpath !== "") {
            this.relpath = path.join(this.parent.relpath, this.name)
        }
    }

    public getOrAddChildren(dirname: string) {
        if (dirname in this.childrens) {
            return this.childrens[dirname]
        }
        let children = new DirEntry(this, dirname)
        this.childrens[dirname] = children
        return children
    }

    public getRelPath(): string {
        return this.relpath
    }

    public hasChildren(dirname: string) {
        return dirname in this.childrens
    }
}

export class FsWorker {
    private config: Config
    public readonly root: DirEntry

    constructor(config: Config) {
        this.config = config
        this.root = new DirEntry(undefined, "")
        if (!fs.existsSync(config.outputDir)) {
            fs.mkdirSync(config.outputDir)
        }
    }

    public join(...paths: string[]) {
        return path.join(...paths)
    }

    public getAbsSrcPath(relpath: string) {
        return path.join(this.config.projectRootDir, relpath)
    }

    public getAbsTargetPath(relpath: string) {
        return path.join(this.config.outputDir, relpath)
    }

    public async lstatSrc(relpath: string) {
        return fs.promises.lstat(this.getAbsSrcPath(relpath))
    }

    public async readdirSrc(relpath: string) {
        return fs.promises.readdir(this.getAbsSrcPath(relpath))
    }

    public async readSrc(relpath: string) {
        return fs.promises.readFile(this.getAbsSrcPath(relpath))
    }

    public readSrcSync(relpath: string) {
        return fs.readFileSync(this.getAbsSrcPath(relpath))
    }

    public async writeTarget(relpath: string, content: Buffer | string) {
        return fs.promises.writeFile(this.getAbsTargetPath(relpath), content)
    }

    private ensureDirTarget(relpath: string) {
        let dirnames = relpath.split(path.sep)
        dirnames = dirnames.filter((value) => {
            return value !== ""
        })
        let curdir = this.root
        for (let name of dirnames) {
            if (!curdir.hasChildren(name)) {
                const newdir = curdir.getOrAddChildren(name)
                const newdirTargetPath = this.getAbsTargetPath(
                    newdir.getRelPath()
                )
                if (!fs.existsSync(newdirTargetPath)) {
                    fs.mkdirSync(newdirTargetPath)
                }
            }
            curdir = curdir.getOrAddChildren(name)
        }
    }

    public async mkdirTarget(relpath: string) {
        return this.ensureDirTarget(relpath)
    }
}
