import * as path from "node:path"
import { Buffer } from "node:buffer"
import { assert } from "node:console"

export interface INode {
    getName(): string
    isFile(): boolean
    getSrcRelPath(): string
    getSrcAbsPath(): string
}

export class File implements INode {
    private srcRoot: string
    private srcRelPath: string
    public content: undefined | string | Buffer
    public data: Map<string, any>  // 用来存储生成过程中所需的额外信息，键值一般是extension的名字

    constructor(srcRoot: string, srcRelPath: string) {
        this.srcRoot = srcRoot
        this.srcRelPath = srcRelPath
        this.content = undefined
        this.data = new Map()
    }

    public getName() {
        return this.getBasename()
    }

    public isFile() {
        return true
    }

    public getSrcRelPath(): string {
        return this.srcRelPath
    }

    public getSrcAbsPath(): string {
        return path.join(this.srcRoot, this.srcRelPath)
    }

    public getDirname(): string {
        return path.dirname(this.srcRelPath)
    }

    public getBasename(): string {
        return path.basename(this.srcRelPath)
    }

    public getFileAndExtName(): [string, string] {
        const basename = path.basename(this.srcRelPath)
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

export class DirEntry implements INode {
    private name: string
    private parent: DirEntry | undefined
    private root: string
    private relpath: string
    private children: { [name: string]: INode }
    private subdirs: { [name: string]: DirEntry }
    private files: { [name: string]: File }

    constructor(root: string, parent: DirEntry | undefined, name: string) {
        this.name = name
        this.parent = parent
        this.root = root
        this.relpath = name

        this.children = {}
        this.subdirs = {}
        if (this.parent !== undefined && this.parent.relpath !== "") {
            this.relpath = path.join(this.parent.relpath, this.name)
        }
        this.files = {}
    }

    public getName() {
        return this.name
    }

    public isFile() {
        return false
    }

    public getSrcRelPath(): string {
        return this.relpath
    }

    public getSrcAbsPath(): string {
        return path.join(this.root, this.relpath)
    }

    public hasSubDir(dirname: string) {
        return dirname in this.subdirs
    }

    public getSubDir(dirname: string): DirEntry | undefined {
        if (dirname in this.subdirs) {
            assert(dirname in this.children)
            return this.subdirs[dirname]
        }
    }

    public getOrAddSubDir(dirname: string): DirEntry {
        if (dirname in this.subdirs) {
            return this.subdirs[dirname]
        }
        assert(!(dirname in this.children))
        let children = new DirEntry(this.root, this, dirname)
        this.subdirs[dirname] = children
        this.children[dirname] = children
        return children
    }

    public hasFile(filename: string): boolean {
        return filename in this.files
    }

    public getFile(filename: string): File | undefined {
        if (filename in this.files) {
            return this.files[filename]
        }
    }

    public getOrAddFile(filename: string): File {
        if (filename in this.files) {
            assert(filename in this.children)
            return this.files[filename]
        }
        assert(!(filename in this.children))
        let children = new File(this.root, path.join(this.relpath, filename))
        this.files[filename] = children
        this.children[filename] = children
        return children
    }

    public getChild(name: string): INode | undefined {
        if (name in this.children) {
            return this.children[name]
        }
    }

    public remove(name: string) {
        if (name in this.children) {
            delete this.children[name]
        }
        if (name in this.subdirs) {
            delete this.subdirs[name]
        }
        if (name in this.files) {
            delete this.files[name]
        }
    }
}
