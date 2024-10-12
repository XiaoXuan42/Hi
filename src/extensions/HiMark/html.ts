import { BackEnd } from "./backend.js"
import { File } from "../../file.js"
import Environment from "../../environment.js"

export class HtmlBackend implements BackEnd {
    public async prepareData(file: File, env: Environment) {
        return undefined
    }

    public transform(file: File, env: Environment) {
        return (file.content as string)
    }
}
