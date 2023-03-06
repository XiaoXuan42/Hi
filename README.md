# Hi
**Hi** is a simple static website generator which supports template engine like jinja([Nunjucks](https://mozilla.github.io/nunjucks/) actually) and [pug](https://github.com/pugjs/pug). In addition, you can make some of your files private by encrypting them!

## Configuration
To use, you need to provide a `config.yml` under the root directory of your project. In `config.yml`, these attributes are required:
- `fileTemplatePath`: The path to your directory that stores templates(jinja files). It's allowed to be a relative path to the root directory of your project.
- `include`: An array contains files/directories under the root directory of your project that you want to move to the output.
- `privates`: An array stores files/directories that you want to make them private. If a directory is private, all files under it are private.
- `passwd`: Passwd used for encrpytion.
- `outputDirectory`: Output directory. Note that it will remove everything inside the output directory rather than sub-directories that starts with '.'(to keep .git like files untouched). It's recommended to use a discriminative name because **Hi** will use the basename to store passwd values in client's browser.

Inside `fileTemplatePath` your should provide `markdown.jinja` and `private.jinja` as templates for markdown and private files. You can use `markdown.stylesheet` and `markdown.html` variable in `markdown.jinja`. `ciphertext` and `private_scripts` which stand for ciphertext and javascripts code needed are available in `private.jinja`.
