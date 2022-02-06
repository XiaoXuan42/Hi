import { Template } from './template'
import path from 'node:path'

const template = new Template(path.join(path.dirname(__dirname), 'templates/default'));