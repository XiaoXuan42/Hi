import * as fs from 'fs'
import * as path from 'path'

export class Template {
    readonly markdown_template: string;
    readonly private_template: string;

    constructor(template_path: string) {
        let mk_file = path.join(template_path, 'markdown.jinja');
        this.markdown_template = fs.readFileSync(mk_file).toString();
        let private_file = path.join(template_path, 'private.jinja');
        this.private_template = fs.readFileSync(private_file).toString();
    }
}