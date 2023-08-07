import * as pub from "pug"

export class PugBackend {
    public transform(content: string) {
        return pub.render(content)
    }
}
