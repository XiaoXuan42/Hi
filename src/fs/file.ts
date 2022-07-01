import * as path from 'path';
import * as fs from 'fs';
import { File, urlstr } from './basic';
import { MarkDownFile } from './markdown';
import { JinjaFile } from './jinja';
import { PugFile } from './pug';

export function generate_file(abspath: string, parent_url: urlstr, is_private: boolean): File {
    const content = fs.readFileSync(abspath).toString();
    const filename = path.basename(abspath);
    const extname = path.extname(filename);

    let new_file: File;
    if (extname === ".md") {
        new_file = new MarkDownFile(abspath, parent_url, content, is_private);
    } else if (extname === ".jinja") {
        new_file = new JinjaFile(abspath, parent_url, content, is_private);
    } else if (extname === ".pug") {
        new_file = new PugFile(abspath, parent_url, content, is_private);
    } else {
        new_file = new File(abspath, parent_url, content, is_private);
    }
    return new_file;
}

export { File, MarkDownFile, JinjaFile, PugFile };