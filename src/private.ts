import CryptoJS = require("crypto-js")

let private_scripts: string = String.raw`<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/crypto-js@4.1.1/crypto-js.js"></script>
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

export function encrypt(content: string, passwd: string): string {
    let encrypted = CryptoJS.AES.encrypt(content, passwd).toString()
    return encrypted
}

export function decrypt(content: string, passwd: string): string {
    let decrpyted = CryptoJS.AES.decrypt(content, passwd).toString(
        CryptoJS.enc.Utf8
    )
    return decrpyted
}

export function get_private_scripts(project_name: string): string {
    return private_scripts.replaceAll(
        "_hi_private_passwd",
        `_hi_private_${project_name}_passwd`
    )
}
