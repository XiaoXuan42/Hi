import * as http from "http"
import { File } from "./file"
import { Config } from "./config"
import { FsWorker } from "./fsWorker"

export class Server {
    private config: Config
    private fsWorker: FsWorker
    private server: http.Server | undefined

    constructor(config: Config, fsWorker: FsWorker) {
        this.config = config
        this.fsWorker = fsWorker
    }

    public start(port: number) {
        this.server = http.createServer((req, res) => {
            if (req.url) {
                req.url = decodeURI(req.url)
                this.fsWorker.readTarget(req.url).then((content) => {
                    res.writeHead(200)
                    res.end(content)
                }).catch((reason) => {
                    res.writeHead(404)
                    res.end(`${req.url} failed: ${reason}`)
                })
            } else {
                res.writeHead(404)
                res.end("No url provided.")
            }
        })
        console.log(`Server created on http://localhost:${port}`)
        this.server.listen(port)
    }
}
