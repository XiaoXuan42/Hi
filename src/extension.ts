import { File } from "./file"
import { Buffer } from "node:buffer"
import { FsWorker } from "./fsWorker"

export type ExtensionResult = {
    file: File,
    targetRelPath: string
    filename: string | undefined
    content: string | Buffer
    succ: boolean
    errMsg: string
}

export interface ExtensionConfig {
    extname: string
}

export interface Extension {
    map(file: File): Promise<void>
    reduce(file: File): Promise<ExtensionResult[]>
}

export type ExtensionFactor = (config: ExtensionConfig, fsWorker: FsWorker) => Extension
