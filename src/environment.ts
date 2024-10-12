import { Config } from "./config.js"
import { Router } from "./router.js"

export default class Environment {
    public config: Config
    public router: Router

    public extAttr: { [extName: string]: Object }

    constructor(
        config: Config,
        router: Router
    ) {
        this.config = config
        this.router = router
        this.extAttr = {}
    }

    public clear() { this.extAttr = {} }
}
