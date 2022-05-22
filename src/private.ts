import {AES} from 'crypto-js'

export function encrypt(content: string, passwd: string): string {
    let encrypted = AES.encrypt(content, passwd).toString();
    return encrypted;
}