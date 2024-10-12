import { HiVue } from "./hiVue.js"

export function createExtension(glbConfig, config) {
    return new HiVue(glbConfig, config)
}