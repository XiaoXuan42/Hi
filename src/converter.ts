import { File, UrlNode } from './fs/basic';
import { FileTree } from './fs/filetree';
import { Config } from './config';

export class Converter {
    public meta: object;
    constructor(public fs: FileTree, public config: Config) {
        this.meta = config.meta;
    }

    public convert(urlnode: UrlNode, f: File): string {
        let context = {
            context: this
        };
        return f.output(this.config.file_template, context);
    }
}