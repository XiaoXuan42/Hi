# Hi
**Hi** is a simple static website generator which support template engine like jinja([Nunjucks](https://mozilla.github.io/nunjucks/) actually, which is the default engine for **Hi**) and [pug](https://github.com/pugjs/pug). In addition, you can make some of your files private by encrypting them!

I'm not familiar with frontend tech stack, nor with web security, this project's reliability is not verified. I would appreciate it if you can give any advice, thank you!

## Configuration
To use, you need to provide a `config.yml` in the root directory of your project. In `config.yml`, these attributes are required:
- `fileTemplatePath`: The path to your directory that stores templates(jinja files). It's allowed to be a relative path to the root directory of your project.
- `include`: An array contains files/directories under the root directory of your project that you want to move to the output.
- `privates`: An array stores files/directories that you want to make them private. If a directory is private, all files under it are private.
- `passwd`: Passwd used for encrpytion.
- `outputDirectory`: Output directory. Note that it will remove everything inside the output directory rather than sub-directories that starts with '.'(to keep .git like files untouched). It's recommended to use a discriminative name because **Hi** will use the basename to store passwd values in client's browser.

Inside `fileTemplatePath` your should provide `markdown.jinja` and `private.jinja` as templates for markdown and private files. You can use `markdown.stylesheet` and `markdown.html` variable in `markdown.jinja`. `ciphertext` and `private_scripts` which stand for ciphertext and javascripts code needed are available in `private.jinja`.

## Encryption
The encryption process is as follows: **Hi** encrpyts private files using password provided by `config.yml` and creates a `<p id="ciphertext" hidden>${ciphertext}</p>` tag while the ciphertext is stored in variable `ciphertext`. Then **Hi** generates the output using `private.jinja`. So you should evaluate `ciphertext` variable in your `private.jinja`. `submit_passwd(passwd)` javascript function is provided in variable `private_scripts` to check whether the passwd is correct. Note that with a negligible probability that a wrong password will pass the check but the content is wrong. If the password is right, `submit_passwd(passwd)` will decrypt the ciphertext inside `<p id="ciphertext">` to get the html result and replace the current page with it.