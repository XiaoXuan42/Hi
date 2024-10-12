import nunjucks from "nunjucks"

export class NunjuckUtil {
    private static env: nunjucks.Environment
    private static math: any

    static staticInit() {
        this.env = new nunjucks.Environment()
        this.env.addFilter("map", (arr, prop) => {
            if (arr instanceof Array) {
                return arr.map((e) => e[prop])
            }
            return arr[prop]
        })
        // 获得arr中props表示的属性，如果arr是数组，则对数组中每个元素进行这种操作
        this.env.addFilter("collectAttrs", (arr, props: string[]) => {
            function sel(obj: any) {
                let result: any = {}
                for (let prop of props) {
                    result[prop] = obj[prop]
                }
                return result
            }
            if (arr instanceof Array) {
                return arr.map((e) => sel(e))
            }
            return sel(arr)
        })

        this.math = {
            min: Math.min,
            max: Math.max,
            abs: Math.abs,
            floor: Math.floor,
            ceil: Math.ceil,
            pow: Math.pow,
            sign: Math.sign,
            sqrt: Math.sqrt,
            round: Math.round,
            random: Math.random
        }
    }

    /**
     * 丰富模版能够使用的功能函数
     * @param context 
     */
    public static enrichContext(context: any) {
        context.Math = context.Math ? context.Math : this.math
        context.Date = context.Date ? context.Date : Date
    }

    public static compile(template: string) {
        return nunjucks.compile(template, this.env)
    }

    public static renderString(template: string, context: any): string {
        this.enrichContext(context)
        return this.env.renderString(template, context)
    }
}
NunjuckUtil.staticInit()
