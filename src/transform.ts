import { File, FNode } from "./fs/basic"
import { FileTree } from "./fs/filetree"
import { Config } from "./config"

/**
 * Convert a file node to its content
 */
export class Transformer {
    public meta: object
    // fs, config, meta is used for transform(variable passed to the jinja)
    constructor(public fs: FileTree, public config: Config) {
        this.meta = config.meta
    }

    public convert(fnode: FNode): string {
        let context = {
            context: this,
        }
        if (fnode instanceof File) {
            return fnode.output(this.config, context)
        } else {
            throw Error(`${fnode.abspath} is not a file.`)
        }
    }

    public get_convert_fn(): (file: FNode) => string {
        return this.convert.bind(this)
    }
}
