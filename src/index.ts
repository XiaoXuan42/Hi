import * as process from 'process';
import { Hi } from './hi';
import { Command } from 'commander';

let program = new Command();
program.requiredOption('-p, --path <path>', 'root directory of the project');
program.option('--live', 'monitor changes');
program.option('--git_commit', 'git commit');
program.option('-m, --git_message <message>', 'message for git commit');
program.parse(process.argv);
let opts = program.opts();
let hi = new Hi(opts.path);
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
