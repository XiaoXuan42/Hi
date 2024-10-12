import { HiMark } from "./hiMark.js"

export function createExtension(glbConfig, config) {
    return new HiMark(glbConfig, config)
}
