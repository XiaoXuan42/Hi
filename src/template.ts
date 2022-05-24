import * as fs from 'fs';
import * as path from 'path';
import * as nunjucks from 'nunjucks';

export class FileTemplate {
    readonly markdown_template: string;
    readonly private_template: string;

    constructor(file_template_path: string) {
        let mk_file = path.join(file_template_path, 'markdown.jinja');
        this.markdown_template = fs.readFileSync(mk_file).toString();
        let private_file = path.join(file_template_path, 'private.jinja');
        this.private_template = fs.readFileSync(private_file).toString();
    }

    static get_instantiation(template: string, context: object): string {
        return nunjucks.renderString(template, context);
    }

    static config_working_dir(working_dir: string) {
        nunjucks.configure(working_dir, {});
    }
}