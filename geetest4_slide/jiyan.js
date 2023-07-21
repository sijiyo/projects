const NodeRSA = require('node-rsa');
const crypto = require('crypto');
const CryptoJS = require("crypto-js");
function get_key() {
    var s4 = "";
    for (i = 0; i < 4; i++) {
        s4 = s4 + ((1 + Math["random"]()) * 65536 | 0)["toString"](16)["substring"](1);
    }
    return s4;
}
function MD5_Encrypt(word) {
    return CryptoJS.MD5(word).toString();
}
function AES_Encrypt(key, word) {
    var srcs = CryptoJS.enc.Utf8.parse(word);
    var encrypted = CryptoJS.AES.encrypt(srcs, CryptoJS.enc.Utf8.parse(key), {
        iv: CryptoJS.enc.Utf8.parse("0000000000000000"),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return CryptoJS.enc.Hex.stringify(CryptoJS.enc.Base64.parse(encrypted.toString()));
}
function RSA_encrypt(data) {
    const public_key_1 = '00C1E3934D1614465B33053E7F48EE4EC87B14B95EF88947713D25EECBFF7E74C7977D02DC1D9451F79DD5D1C10C29ACB6A9B4D6FB7D0A0279B6719E1772565F09AF627715919221AEF91899CAE08C0D686D748B20A3603BE2318CA6BC2B59706592A9219D0BF05C9F65023A21D2330807252AE0066D59CEEFA5F2748EA80BAB81';
    const public_key_2 = '10001';
    const public_key = new NodeRSA();
    public_key.importKey({
        n: Buffer.from(public_key_1, 'hex'),
        e: parseInt(public_key_2, 16),
    }, 'components-public');
    const encrypted = crypto.publicEncrypt({
        key: public_key.exportKey('public'),
        padding: crypto.constants.RSA_PKCS1_PADDING
    }, Buffer.from(data));
    return encrypted.toString('hex');
}

function get_w(captchaId, lot_number, detail_time, distance, passtime, track) {
    romdon_key = get_key()
    pow_msg = "1|0|md5|" + detail_time + "|" + captchaId + "|" + lot_number + "||" + romdon_key
    xiyu = {
        "setLeft": distance,
        "track": track,
        "passtime": passtime,
        "userresponse": distance / (.8876 * 340 / 300),
        "device_id": "D00D",
        "lot_number": lot_number,
        "pow_msg": pow_msg,
        "pow_sign": MD5_Encrypt(pow_msg),
        "geetest": "captcha",
        "lang": "zh",
        "ep": "123",
        'cuel': '632729377',
        "em": {"ph": 0, "cp": 0, "ek": "11", "wd": 1, "nt": 0, "si": 0, "sc": 0}
    }
    xiyu = JSON.stringify(xiyu).replace(" ", "").replace("'", '"')
    w = AES_Encrypt(romdon_key, xiyu)+ RSA_encrypt(romdon_key)
    return w
}