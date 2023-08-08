import { Config } from "./config"
import { DirEntry, INode, File } from "./file"
import { Buffer } from "node:buffer"
import { globSync } from "glob"
import * as fs from "node:fs"
import * as path from "node:path"
import { minimatch } from "minimatch"

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

    public globMatch(p: string, patterns: string[]): boolean {
        for (const pattern of patterns) {
            if (minimatch(p, pattern)) {
                return true
            }
        }
        return false
    }

    public getAbsSrcPath(relpath: string) {
        let p = path.join(this.config.projectRootDir, relpath)
        return fs.realpathSync(p)
    }

    public getAbsTargetPath(relpath: string) {
        let p = path.join(this.config.outputDir, relpath)
        return fs.realpathSync(p)
    }

    public async statSrc(relpath: string) {
        return fs.promises.stat(this.getAbsSrcPath(relpath))
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

    public async readTarget(relpath: string) {
        return fs.promises.readFile(this.getAbsTargetPath(relpath))
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

    public rmTargetSync(relpath: string, options?: fs.RmOptions) {
        return fs.rmSync(relpath, options)
    }

    public toRelative(p: string) {
        if (path.isAbsolute(p)) {
            p = path.relative(this.config.projectRootDir, p)
        }
        return p
    }

    // whether we care about this directory/file, p is a relative path
    public isInteresting(p: string) {
        if (p.startsWith(".")) {
            return false
        }
        // FIXME: check whether inside config.includes
        return true
    }

    private _visitByPath(p: string): [DirEntry?, INode?] {
        p = this.toRelative(p)
        if (!this.isInteresting(p)) {
            return [undefined, undefined]
        }
        // assume p is a relpath
        let names = p.split(path.sep)
        names = names.filter((name) => {
            return name !== ""
        })
        let parentNode: DirEntry = this.root
        let curNode: INode | undefined = this.root
        for (let name of names) {
            if (!curNode || curNode.isFile()) {
                return [undefined, undefined]
            }
            parentNode = curNode as DirEntry
            curNode = (curNode as DirEntry).getChild(name)
        }
        return [parentNode, curNode]
    }

    public visitByPath(p: string): INode | undefined {
        const [_, cur] = this._visitByPath(p)
        return cur
    }

    public glob(patterns: string[]): File[] {
        const addedFile = new Set<File>()
        const addedPath = new Set<string>()
        patterns.forEach((pattern) => {
            pattern = path.join(this.config.projectRootDir, pattern)
            const results = globSync(pattern)
            results.forEach((result) => {
                addedPath.add(result)
            })
        })
        addedPath.forEach((p) => {
            const inode = this.visitByPath(p)
            if (inode && inode.isFile()) {
                addedFile.add(inode as File)
            }
        })
        return Array.from(addedFile)
    }

    public remove(p: string) {
        const [parentDir, curNode] = this._visitByPath(p)
        if (curNode === undefined || parentDir === undefined) {
            return
        }
        parentDir.remove(curNode.getName())
        this.rmTargetSync((curNode as File).getRelPath(), {
            force: true,
            recursive: true,
        })
    }
}
