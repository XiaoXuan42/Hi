import { File } from "../../file"

export interface BackEnd {
    prepareData(file: File): any
    transform(file: File): string
}