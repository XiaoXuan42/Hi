import { Config } from "./config"
import { DirEntry, INode, File } from "./file"
import { Buffer } from "node:buffer"
import { globSync } from "glob"
import * as fs from "node:fs"
import * as path from "node:path"

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
            if (!curdir.hasSubDir(name)) {
                const newdir = curdir.getOrAddSubDir(name)
                const newdirTargetPath = this.getAbsTargetPath(
                    newdir.getRelPath()
                )
                if (!fs.existsSync(newdirTargetPath)) {
                    fs.mkdirSync(newdirTargetPath)
                }
            }
            curdir = curdir.getOrAddSubDir(name)
        }
    }

    public async mkdirTarget(relpath: string) {
        return this.ensureDirTarget(relpath)
    }

    public mkdirTargetSync(relpath: string) {
        return this.ensureDirTarget(relpath)
    }

    public visitByPath(p: string): INode | undefined {
        if (path.isAbsolute(p)) {
            p = path.relative(this.config.projectRootDir, p)
        }
        if (p.startsWith(".")) {
            // only visit nodes inside the project
            return undefined
        }
        // assume p is a relpath
        let names = p.split(path.sep)
        names = names.filter(name => { return name !== "" })
        let curNode: INode | undefined = this.root
        for (let name of names) {
            if (!curNode || curNode.isFile()) {
                return undefined
            }
            curNode = (curNode as DirEntry).getChild(name)
        }
        return curNode
    }

    public glob(patterns: string[]): File[] {
        const addedFile= new Set<File>()
        const addedPath = new Set<string>()
        patterns.forEach(pattern => {
            pattern = path.join(this.config.projectRootDir, pattern)
            const results = globSync(pattern)
            results.forEach(result => { addedPath.add(result) })
        })
        addedPath.forEach(p => {
            const inode = this.visitByPath(p)
            if (inode && inode.isFile()) {
                addedFile.add((inode as File))
            }
        })
        return Array.from(addedFile)
    }
}
