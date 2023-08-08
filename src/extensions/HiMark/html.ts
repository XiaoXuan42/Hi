import { BackEnd } from "./backend"
import { File } from "../../file"

class HtmlData {}

export class HtmlBackend implements BackEnd {
    public prepareData(file: File) {
        return new HtmlData()
    }

    public transform(file: File) {
        return (file.content as string)
    }
}
