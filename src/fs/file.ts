import * as path from 'path';
import * as fs from 'fs';
import { File } from './basic';
import { MarkDownFile } from '../ext/markdown';
import { JinjaFile } from '../ext/jinja';
import { PugFile } from '../ext/pug';
import { EncryptFile } from '../ext/encryption';
import { DecryptFile } from '../ext/decryption'
import { Config } from '../config'

export class FileGenerator {
    private seq: Array<typeof File>
    constructor(config: Config) {
        this.seq = []
        if (config.encrypt) {
            this.seq.push(EncryptFile)
        }
        if (config.decrypt) {
            this.seq.push(DecryptFile)
        }
        if (config.has_template('markdown.jinja')) {
            this.seq.push(MarkDownFile)
        }
        this.seq.push(JinjaFile)
        this.seq.push(PugFile)
    }

    public generate_file(url: string, parent_url: string, is_private: boolean): File {
        const content = fs.readFileSync(url).toString()
        const filename = path.basename(url)

        let new_file: File | undefined;
        for (let F of this.seq) {
            if (F.capture(filename)) {
                new_file = new F(url, parent_url, content, is_private)
                break
            }
        }
        if (!new_file) {
            new_file = new File(url, parent_url, content, is_private)
        }
        return new_file
    }
}

export { File, MarkDownFile, JinjaFile, PugFile };