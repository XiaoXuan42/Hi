import { File } from "./file"
import { Buffer } from "node:buffer"
import { FsWorker } from "./fsWorker"

export type ExtensionResult = {
    filename: string | undefined
    content: string | Buffer
    succ: boolean
    errMsg: string
}

export interface ExtensionConfig {
    extname: string
}

export interface Extension {
    transform(file: File, fsWorker: FsWorker): Promise<ExtensionResult>
}

export type ExtensionFactor = (config: ExtensionConfig, fsWorker: FsWorker) => Extension
