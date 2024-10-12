import * as process from "process"
import { Hi } from "./hi.js"
import { Command } from "commander"
import { Config } from "./config.js"
import * as path from "node:path"
import * as fs from "node:fs"

let program = new Command()
program.requiredOption("-p, --path <path>", "root directory of the project")
program.option("--port", "port")
program.option("--git_commit", "git commit")
program.option("-m, --git_message <message>", "message for git commit")
program.option("-c, --config <config_path>", "configuration file")
program.option("-o, --output <output_directory>", "output directory")
program.parse(process.argv)

let opts: any = program.opts()
let configPath = path.join(opts.path, "config.json")
if (opts.config) {
    configPath = opts.config
}
let config = new Config(opts.path, configPath)

if (fs.existsSync(config.outputDir)) {
    fs.rmSync(config.outputDir, { recursive: true })
    // fs.mkdirSync(config.outputDir, { recursive: true})
}

let hi = new Hi(config)
await hi.initExtension()
await hi.generate()
if (opts.port) {
    hi.serve(parseInt(opts.port))
} else {
    hi.serve(1314)
}
