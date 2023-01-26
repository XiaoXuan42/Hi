import * as process from 'process';
import { Hi } from './hi';
import { Command } from 'commander';
import { Config } from './config';

let program = new Command();
program.requiredOption('-p, --path <path>', 'root directory of the project');
program.option('--live', 'monitor changes');
program.option('--git_commit', 'git commit');
program.option('-m, --git_message <message>', 'message for git commit');
program.option('-k, --passwd <passwd>', "passwd")
program.option('-c, --config <config_path>', 'configuration file')
program.option('--encrypt', 'encrypt all files')
program.option('--decrypt', 'decrypt all files')
program.parse(process.argv);
let opts: any = program.opts();
let config = new Config(opts)
let hi = new Hi(config);
hi.generate();
if (opts.git_commit) {
    let date = new Date();
    let message = `"${date.toUTCString()}"`;
    if (opts.git_message) {
        message = opts.git_message;
    }
    let output = hi.git_commit(message);
    if (output) {
        console.log(output);
    }
}
if (opts.live) {
    hi.live();
}
