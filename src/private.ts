import {AES} from 'crypto-js'

let private_scripts: string = String.raw`<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/crypto-js@4.1.1/crypto-js.js"></script>
<script type="text/javascript">
  function submit_passwd() {
    try {
      var html_str = _decipher();
      console.log(html_str);
      _replace(html_str);
      return true;
    } catch(error) {
      return false;
    }
  }
  function _decipher() {
    var ciphertext = document.getElementById('ciphertext').innerText;
    var plaintext = CryptoJS.AES.decrypt(ciphertext, "jinjahelloworld").toString(CryptoJS.enc.Utf8);
    return plaintext;
  }
  function _replace(html_str) {
    var html_tag = html_str.match(/<html>.*<\/html>/);
    console.log(html_tag);
    if (!html_str.match(/<html>(.|\n)*<\/html>/)) {
      throw Error("Not a valid html file");
    }
    document.open();
    document.write(html_str);
    document.close();
  }
</script>`;

export function encrypt(content: string, passwd: string): string {
    let encrypted = AES.encrypt(content, passwd).toString();
    return encrypted;
}

export function get_private_scripts(): string {
    return private_scripts;
}