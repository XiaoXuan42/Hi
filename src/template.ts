import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'

export class Template {
    readonly meta: { [name: string]: any; };
    readonly html_templates: { [name: string]: string; };
    readonly template_path: string;

    constructor(template_path: string) {
        this.meta = {};
        this.html_templates = {};
        this.template_path = template_path;

        // read meta
        this.meta = YAML.parse(fs.readFileSync(path.join(template_path, 'meta-default.yml'), 'utf-8'));

        this.read_html_templates(template_path, '');
    }

    private read_html_templates(cur_path: string, prefix: string) {
        const filename = path.basename(cur_path);
        const stat = fs.lstatSync(cur_path);
        if (stat.isFile()) {
            if (path.extname(filename) === '.html') {
                const rt = filename.substring(0, filename.length - 5);  // remove .html
                this.html_templates[`${prefix}/${rt}`] = cur_path;
            }
        } else {
            const new_prefix = `${prefix}/${filename}`;
            fs.readdirSync(cur_path).forEach(file => {
                this.read_html_templates(path.join(cur_path, file), new_prefix);
            });
        }
    }
}