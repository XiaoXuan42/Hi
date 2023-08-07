import CryptoJS from "crypto-js"
import { FsWorker } from "../../fsWorker"
import * as nunjucks from "nunjucks"

/**
 * Ciphertext is assumed to be stored at the innerText of the tag that has id "ciphertext".
 * Old passwd that was correct is stored as _hi_private_${project_name}_passwd in localStorage.
 *
 * submit_passwd:
 *    If the passwd is correct, the original content will be recovered
 */
let privateScripts: string = String.raw`<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/crypto-js@4.1.1/crypto-js.js"></script>
<script type="text/javascript">
  function set_passwd_storage(value) {
    var date = new Date();
    var data = {
      value: value,
      expiry: date.getTime() + 3*30*24*60*60*1000
    };
    window.localStorage.setItem('_hi_private_passwd', JSON.stringify(data));
  }
  function get_passwd_storage() {
    var data = window.localStorage.getItem('_hi_private_passwd');
    if (data) {
      data = JSON.parse(data);
      var now = new Date();
      if (now.getTime() > data.expiry) {
        return null;
      } else {
        return data.value;
      }
    }
  }
  function submit_passwd(passwd) {
    try {
      var html_str = _decipher(passwd);
      _replace(html_str);
      set_passwd_storage(passwd);
      return true;
    } catch(error) {
      return false;
    }
  }
  function _decipher(passwd) {
    var ciphertext = document.getElementById('ciphertext').innerText;
    var plaintext = CryptoJS.AES.decrypt(ciphertext, passwd).toString(CryptoJS.enc.Utf8);
    return plaintext;
  }
  function _replace(html_str) {
    var html_tag = html_str.match(/<html>.*<\/html>/);
    if (!html_str.match(/<html>(.|\n)*<\/html>/)) {
      throw Error("Not a valid html file");
    }
    document.open();
    document.write(html_str);
    document.close();
  }
  window.onload = function() {
    var passwd = get_passwd_storage();
    if (passwd) {
      submit_passwd(passwd);
    }
  }
</script>`

function encrypt(content: string, passwd: string): string {
    let encrypted = CryptoJS.AES.encrypt(content, passwd).toString()
    return encrypted
}

function decrypt(content: string, passwd: string): string {
    let decrpyted = CryptoJS.AES.decrypt(content, passwd).toString(
        CryptoJS.enc.Utf8
    )
    return decrpyted
}

function getPrivateScripts(project_name: string): string {
    return privateScripts.replaceAll(
        "_hi_private_passwd",
        `_hi_private_${project_name}_passwd`
    )
}

const defaultPrivateTemplate = String.raw`<!DOCTYPE html>

<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Password</title>
</head>

<body>
<div class="container">
{{ ciphertext | safe }}
<input id="passwd_box" type="text" onkeydown="keydown()"/>
</div>
</body>
{{ privateScripts | safe }}
<script type="text/javascript">
function keydown() {
    if (event.keyCode === 13) {
        var i = document.getElementById('passwd_box');
        submit_passwd(i.value);
    }
}
</script>
</html>`

export class PrivateBackendConfig {
    public templatePath?: string
    public keyName: string
    public passwd: string
    public files: string[]

    constructor(keyName: string, passwd: string, files: string[]) {
        this.keyName = keyName
        this.passwd = passwd
        this.files = files
    }
}

export class PrivateBackend {
    private templateStr: string

    constructor(config: PrivateBackendConfig, fsWorker: FsWorker) {
        if (config.templatePath) {
            this.templateStr = fsWorker
                .readSrcSync(config.templatePath)
                .toString("utf-8")
        } else {
            this.templateStr = defaultPrivateTemplate
        }
    }

    public transform(keyName: string, content: string, passwd: string) {
        let newContent = encrypt(content, passwd)
        const outputTag = `<p id="ciphertext" hidden>${newContent}</p>`
        const context = {
            ciphertext: outputTag,
            privateScripts: getPrivateScripts(keyName),
        }
        return nunjucks.renderString(this.templateStr, context)
    }
}
