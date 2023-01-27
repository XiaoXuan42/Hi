import { FileTree } from "./fs/filetree"
import { Converter } from "./converter"
import * as http from "http"

export class Server {
    server: http.Server | undefined
    constructor(public filetree: FileTree, public converter: Converter) {}

    start() {
        const port = 8080
        this.server = http.createServer((req, res) => {
            if (req.url) {
                req.url = decodeURI(req.url)
                const content = this.filetree.get_result_content(
                    req.url,
                    this.converter.get_convert_fn()
                )
                if (content) {
                    res.writeHead(200)
                    res.end(content)
                } else {
                    res.writeHead(404)
                    res.end(`${req.url} not found.`)
                }
            } else {
                res.writeHead(404)
                res.end("No url provided.")
            }
        })
        console.log(`Server created on http://localhost:${port}`)
        this.server.listen(port)
    }
}
