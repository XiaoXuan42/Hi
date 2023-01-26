import { File } from '../fs/basic';
import { Config } from '../config';
import { encrypt } from '../private';

export class EncryptFile extends File {
    private _encrypted: undefined | string;
    constructor(abspath: string, parent_url: string, content: string, is_private: boolean) {
        super(abspath, parent_url, content, is_private)
    }

    public static capture(filename: string): boolean {
        return true
    }

    public output(config: Config, context: any): string {
        if (!this._encrypted) {
            this._encrypted = encrypt(this.content, config.passwd)
        }
        return this._encrypted
    }

    public on_change(content: string): void {
        super.on_change(content)
        this._encrypted = undefined
    }

}