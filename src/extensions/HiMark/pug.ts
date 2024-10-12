import * as pub from "pug"
import { BackEnd } from "./backend.js"
import { File } from "../../file.js"
import Environment from "../../environment.js"


export class PugBackend implements BackEnd {
    public async prepareData(file: File, env: Environment) {
        return undefined
    }

    public transform(file: File, env: Environment) {
        return pub.render(file.content as string)
    }
}
