export class File {
    private relPath: string

    constructor(relPath: string) {
        this.relPath = relPath
    }

    public getRelPath(): string {
        return this.relPath
    }
}
