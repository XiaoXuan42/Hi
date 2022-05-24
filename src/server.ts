import express, { Express } from 'express';
import { FileTree } from './file';

export class Server {
    server: Express;

    constructor(public filetree: FileTree) {
        this.server = express();
    }

    start() {
        const port = 8080;
        this.server.get('*', (req, res) => {
            const content = this.filetree.get_by_url(req.path);
            if (content) {
                res.send(content);
            } else {
                res.sendStatus(404);
            }
        });
        this.server.listen(port, () => {
            console.log(`Server is running at https://localhost:${port}`);
        });
    }
}