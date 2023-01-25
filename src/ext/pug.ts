import * as path from 'path';
import { File } from '../fs/basic';
import { FileTemplate } from '../template';

export class PugFile extends File {
    private _html: undefined | string;
    
    constructor(abspath: string, parent_url: string, content: string, is_private: boolean) {
        super(abspath, parent_url, content, is_private);
    }

    protected base_url_from_proj_name(proj_name: string): string {
        let basename = path.basename(proj_name, ".pug");
        return basename + ".html";
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

    on_change(content: string): void {
        super.on_change(content);
        this._html = undefined;
    }
}
