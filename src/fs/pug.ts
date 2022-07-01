import * as path from 'path';
import { File } from './basic';
import { FileTemplate } from '../template';

export class PugFile extends File {
    private _html: undefined | string;
    
    constructor(abspath: string, parent_url: string, content: string, is_private: boolean) {
        super(abspath, parent_url, content, is_private);
    }

    output(template: FileTemplate, context: any): string {
        if (!context) {
            context = {};
        }
        if (!this._html) {
            this._html = FileTemplate.get_instantiation(this.content, context, "pug");
        }
        return this._html;
    }

    convert_to_urlname(): string {
        let basename = path.basename(this.name, ".pug");
        return basename + '.html';
    }

    on_change(content: string): void {
        super.on_change(content);
        this._html = undefined;
    }
}
