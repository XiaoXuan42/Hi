import * as process from 'process';
import { Hi } from './hi';
import { Command } from 'commander';

let program = new Command();
program.requiredOption('-p, --path <path>', 'root directory of the project');
program.parse(process.argv);
let opts = program.opts();
let hi = new Hi(opts.path);
hi.generate();
