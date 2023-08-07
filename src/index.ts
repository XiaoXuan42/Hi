import * as process from "process"
import { Hi } from "./hi"
import { Command } from "commander"
import { Config } from "./config"
import * as path from "path"

let program = new Command()
program.requiredOption("-p, --path <path>", "root directory of the project")
program.option("--live", "monitor changes")
program.option("--git_commit", "git commit")
program.option("-m, --git_message <message>", "message for git commit")
program.option("-c, --config <config_path>", "configuration file")
program.option("-o, --output <output_directory>", "output directory")
program.parse(process.argv)

let opts: any = program.opts()
let config_path = path.join(opts.path, "config.json")
if (opts.config) {
    config_path = opts.config
}
let config = new Config(opts.path, config_path)
let hi = new Hi(config)
hi.initGenerate()
if (opts.git_commit) {
    let date = new Date()
    let message = `"${date.toUTCString()}"`
    if (opts.git_message) {
        message = opts.git_message
    }
    let output = hi.gitCommit(message)
    if (output) {
        console.log(output)
    }
}
if (opts.live) {
    hi.live()
}
