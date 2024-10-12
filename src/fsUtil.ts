import * as path from "node:path"
import { minimatch } from "minimatch"
import * as fs from "node:fs"

export default class fsUtil {
    public static separatePath(p: string) {
        let sep = p.split(path.sep)
        sep = sep.filter((s) => { return s !== "" })
        return sep
    }

    /**
     * 递归地创建目录
     * @param p 路径
     */
    public static async mkdirRecurAsyn(p: string) {
        let dirnames = p.split(path.sep)
        dirnames = dirnames.filter((value) => {
            return value !== ""
        })
        await fs.promises.mkdir(p, { recursive: true })
    }

    /**
     * 写入文件，如果文件所在文档不存在则创建文档
     * @param p 路径
     * @param content 文件内容
     */
    public static async ensureDirWriteAsyn(p: string, content: string) {
        const dirpath = path.dirname(p)
        if (!fs.existsSync(dirpath)) {
            fs.mkdirSync(dirpath, { recursive: true })
        }
        await fs.promises.writeFile(p, content)
    }

    public static globMatch(p: string, patterns: string[]): boolean {
        for (const pattern of patterns) {
            if (minimatch(p, pattern)) {
                return true
            }
        }
        return false
    }
}