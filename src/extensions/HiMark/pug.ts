import * as pub from "pug"
import { BackEnd } from "./backend"
import { File } from "../../file"

class PugData {}

export class PugBackend implements BackEnd {
    public prepareData(file: File) {
        return new PugData()
    }

    public transform(file: File) {
        return pub.render(file.content as string)
    }
}
