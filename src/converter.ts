import { File, FNode } from './fs/basic';
import { FileTree } from './fs/filetree';
import { Config } from './config';

/**
 * Convert a file node to its content
 */
export class Converter {
    public meta: object;
    constructor(public fs: FileTree, public config: Config) {
        this.meta = config.meta;
    }

    public convert(fnode: FNode): string {
        let context = {
            context: this
        };
        if (fnode instanceof File) {
            return fnode.output(this.config, context);
        } else {
            throw Error(`${fnode.abspath} is not a file.`);
        }
    }

    public get_convert_fn(): (file: FNode) => string {
        return this.convert.bind(this);
    }
}