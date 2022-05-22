import katex from 'katex';
import { marked } from 'marked'
import hljs from 'highlight.js'

// see https://github.com/markedjs/marked/issues/1538
export function render_markdown(mkdown: string): string {
    marked.setOptions({
        highlight: function(code: string, lang: string) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, {language}).value;
        },
        langPrefix: 'hljs language-'
    });
    let old_renderer = new marked.Renderer();
    let new_renderer = new marked.Renderer();

    let cnt = 0;
    let math_expressions: {[key: string]: {type: 'block' | 'inline', expression: string}} = {};
    const next_id = () => `__special_katex_id__${cnt++}`;
    const replace_with_math_ids = (text: string) => {
        text = text.replace(/\$\$([\S\s]+?)\$\$/g, (_match, expression) => {
            let cur_id = next_id();
            math_expressions[cur_id] = {type: 'block', expression};
            return cur_id;
        });
        text = text.replace(/\$([\S\s]+?)\$/g, (_match, expression) => {
            let cur_id = next_id();
            math_expressions[cur_id] = {type: 'inline', expression};
            return cur_id;
        });
        return text;
    };

    new_renderer.listitem = (text: string, task: boolean, checked: boolean) => {
        return old_renderer.listitem(replace_with_math_ids(text), task, checked);
    };
    new_renderer.paragraph = (text: string) => {
        return old_renderer.paragraph(replace_with_math_ids(text));
    }
    new_renderer.tablecell = (content: string, flags) => {
        return old_renderer.tablecell(replace_with_math_ids(content), flags);
    }
    new_renderer.text = (text: string) => {
        return old_renderer.text(replace_with_math_ids(text));
    }
    let render_result = marked(mkdown, {renderer: new_renderer});
    render_result = render_result.replace(/(__special_katex_id__\d)/g, (_match, capture) => {
        const { type, expression } = math_expressions[capture];
        return katex.renderToString(expression, {'displayMode': type === 'block'});
    });
    return render_result;
}