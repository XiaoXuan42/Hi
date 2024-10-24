import { Extension } from "../../extension.js"
import { File } from "../../file.js"
import { MarkDownUtil, MarkDownData } from "../../markdown.js"
import { Config } from "../../config.js"
import Environment from "../../environment.js"
import * as fs from "node:fs"
import * as path from "node:path"
import * as execa from "execa"

const extname = "Hi.HiVue"
export class HiVueConfig {
    constructor(
        public rootPath: string,
        public srcPath: string,  // relative path
        public outputPath: string,  // 相对路径，表示npm run build的输出目录
        public copyToDst: boolean,  // 是否要复制到目标文件夹下
    ) {}
}

export class HiVue extends Extension {
    private glbConfig: Config
    private config: HiVueConfig
        
    constructor(glbConfig: Config, config: HiVueConfig) {
        super()
        this.glbConfig = glbConfig
        this.config = config
    }

    getName() { return extname }

    accept(file: File): boolean {
        let [_, extensionName] = file.getFileAndExtName()
        return extensionName === "md"
    }

    async map(file: File, env: Environment): Promise<void> {
        const data = await MarkDownUtil.configure(file)
        file.data.set(extname, data)
    }

    async reduce(files: File[], env: Environment): Promise<void> {
        const vueRoot = this.glbConfig.absPathFromRelSrc(this.config.rootPath)
        let hiVueEnv: { markdown: MarkDownData[] } = {
            markdown: []
        }
        for (const file of files) {
            const fileRoot = file.getSrcAbsPath()
            let relPath = path.relative(vueRoot, fileRoot)
            let mkData = file.data.get(extname) as MarkDownData
            mkData.relPath = relPath
            hiVueEnv.markdown.push(mkData)
        }
        hiVueEnv.markdown.sort((a, b) => {
            if (a.createDate < b.createDate) { return -1 }
            else if (a.createDate === b.createDate) { return 0 }
            else { return 1 }
        })
        const hiVuePath = path.join(vueRoot, this.config.srcPath, "hiVueEnv.js")
        const content = `export const hiVueEnv = ${JSON.stringify(hiVueEnv)}`
        await fs.promises.writeFile(hiVuePath, content)
    }

    async beforeFinish(env: Environment): Promise<void> {
        const vueRoot = this.glbConfig.absPathFromRelSrc(this.config.rootPath)
        await execa.execa('npm', ['run', 'build'], { cwd: vueRoot })

        if (this.config.copyToDst) {
            const vueOutputPath = path.join(vueRoot, this.config.outputPath)
            const dstPath = env.router.route(vueOutputPath)
    
            await fs.promises.cp(vueOutputPath, dstPath, { recursive: true })
        }
    }
}