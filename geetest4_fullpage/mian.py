# -*- coding: utf-8 -*-
import re, requests, time, uuid, execjs, json
from lxml import etree
from urllib import request


def get_captchaId():
    url = "https://www.geetest.com/adaptive-captcha-demo"
    res = requests.get(url).text
    js_url = re.search(r'preload" href="(/_next/static/[^"]+\.js)" as="script"/>', res).group(1)
    res = requests.get("https://www.geetest.com" + js_url).text
    captchaId = re.search('captchaId:"([0-9a-z]+)"', res).group(1)
    return captchaId


def main(captchaId, challenge):
    url = "https://gcaptcha4.geetest.com/load?captcha_id=" + captchaId + "&challenge=" + challenge + "&client_type=web&risk_type=ai&lang=zh&callback=geetest_" + str(
        round(time.time() * 1000))
    res = requests.get(url).text
    res = json.loads(res[res.index("(") + 1:res.rindex(")")])
    lot_number = res['data']['lot_number']
    detail_time = res['data']["pow_detail"]["datetime"]
    with open('jiyan.js', 'r', encoding='utf-8') as f:
        js = execjs.compile(f.read())
    key = js.call('get_key')
    w = js.call('get_w', captchaId, lot_number, detail_time)
    url = "https://gcaptcha4.geetest.com/verify"
    params = {
        "callback": "geetest_" + str(round(time.time() * 1000)),
        "captcha_id": captchaId,
        "client_type": "web",
        "lot_number": lot_number,
        "risk_type": "ai",
        "payload": res['data']['payload'],
        "process_token": res['data']['process_token'],
        "payload_protocol": "1",
        "pt": "1",
        "w": w
    }
    res = requests.get(url, params=params).text
    res = json.loads(res[res.index("(") + 1:res.rindex(")")])
    print('fullpage4:',res)


if __name__ == '__main__':
    captchaId = get_captchaId()
    challenge = str(uuid.uuid4())
    main(captchaId, challenge)