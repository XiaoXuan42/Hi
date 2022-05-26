# Hi
**Hi** is a simple static website generator. You can write your project/template in jinja like([Nunjucks](https://mozilla.github.io/nunjucks/) actually) style. You can also write markdown inside the template inside `<markdown></markdown>` tag pair(take care of indentation!). In addition, you can make some of your files private by encrypting them.

This project is built mainly for personal use. Since I'm not familiar with frontend tech stack, nor with web security, this project's reliability is not verified. I would appreciate it if you can give any advice, thank you.

To use, you need to provide a `config.yml` in the root directory of your project. In `config.yml`, these attributes are required:
- `fileTemplatePath`: The path to your directory that stores templates(jinja files), can be a relative path to the root directory of your project.
- `include`: An array contains files/directories in the root directory of your project that you want to move to the output.
- `privates`: An array stores directory just in the root directory of your project you want to encrpyt.
- `passwd`: Passwd used to encrpytion.
- `outputDir`: Output directory, default `output`. Note that it will remove everything inside the output directory rather than sub-directories that starts with '.'.

Inside `fileTemplatePath` your should provide `markdown.jinja` and `private.jinja` as templates for markdown and private files. You can use `markdown.stylesheet` and `markdown.html` variable in `markdown.jinja`. `ciphertext` and `private_scripts` which stand for ciphertext tag and javascripts code needed are available in `private.jinja`.

The encryption process is as follows: **Hi** encrpyts private files using password provided by `config.yml` and creates a `<p id="ciphertext" hidden>${ciphertext}</p>` tag stored in variable `ciphertext` and then generate the output using `private.jinja`. So you should evaluate `ciphertext` variable in your `private.jinja` template. Then a `submit_passwd(passwd)` javascript function is provided in variable `private_scripts` to check whether the passwd is correct. Note that with a negligible probability that a false password will pass the check but the content is wrong. If the password is right, `submit_passwd(passwd)` will decrypt the ciphertext inside `<p id="ciphertext">` to get the html content and replace the current page.