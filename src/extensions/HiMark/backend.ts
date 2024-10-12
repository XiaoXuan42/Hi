import Environment from "../../environment.js"
import { File } from "../../file.js"

export interface BackEnd {
    prepareData(file: File, env: Environment): Promise<any>
    transform(file: File, env: Environment): string
}