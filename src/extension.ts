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
    transform(
        file: File,
        config: ExtensionConfig,
        fsWorker: FsWorker
    ): Promise<ExtensionResult>
}
