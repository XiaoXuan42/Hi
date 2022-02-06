import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { Template } from './template';

export class Hi {
    dirname: string;
    meta: { [name: string]: any; };
    template: Template;

    constructor(dirname: string) {
        this.dirname = dirname;
        this.meta = YAML.parse(fs.readFileSync(path.join(dirname, 'meta.yml'), 'utf-8'));

        let template_name: string;
        if ("template" in this.meta) {
            if (!(typeof(this.meta["template"]) === "string")) {
                throw Error("Template attribute should be a string.");
            } else {
                template_name = this.meta["template"];
            }
        } else {
            template_name = 'default';
        }
        this.template = new Template(path.join(path.dirname(__dirname), `templates/${template_name}`));
    }

    
}