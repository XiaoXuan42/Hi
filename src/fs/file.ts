import * as path from 'path';
import * as fs from 'fs';
import { File } from './basic';
import { MarkDownFile } from '../ext/markdown';
import { JinjaFile } from '../ext/jinja';
import { PugFile } from '../ext/pug';

export function generate_file(url: string, parent_url: string, is_private: boolean): File {
    const content = fs.readFileSync(url).toString();
    const filename = path.basename(url);
    const extname = path.extname(filename);

    let new_file: File;
    if (extname === ".md") {
        new_file = new MarkDownFile(url, parent_url, content, is_private);
    } else if (extname === ".jinja") {
        new_file = new JinjaFile(url, parent_url, content, is_private);
    } else if (extname === ".pug") {
        new_file = new PugFile(url, parent_url, content, is_private);
    } else {
        new_file = new File(url, parent_url, content, is_private);
    }
    return new_file;
}

export { File, MarkDownFile, JinjaFile, PugFile };