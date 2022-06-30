import { File } from '../file';

export type pathstr = string;
export type urlstr = string;
export class DirNode {
    files: {[name: string]: File};
    subdirs: {[name: string]: DirNode};

    constructor() {
        this.files = {};
        this.subdirs = {};
    }
}

export class UrlNode {
    url: urlstr;  // url is global url
    suburls: {[name: string]: UrlNode};
    file: File | undefined;
    constructor(url: urlstr) {
        this.url = url;
        this.suburls = {};
    }
}

export interface NodeInfo {
    filenode: DirNode | File;
    urlnode: UrlNode;
    abspath: string;
    is_private: boolean;
}