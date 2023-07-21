# -*- coding: utf-8 -*-
import re, requests, time, uuid, execjs,json
from lxml import etree
from urllib import request
from gap import *
from trace import *


def get_captchaId():
    url = "https://www.geetest.com/adaptive-captcha-demo"
    res = requests.get(url).text
    HTML = etree.HTML(res)
    js_url = HTML.xpath("//link[contains(@href, 'adaptive-captcha-demo')]")[0].attrib["href"]
    res = requests.get("https://www.geetest.com" + js_url).text
    captchaId = re.search('captchaId:"([0-9a-z]+)"', res).group(1)
    return captchaId


def get_image(captchaId, challenge):
    url = "https://gcaptcha4.geetest.com/load?captcha_id=" + captchaId + "&challenge=" + challenge + "&client_type=web&risk_type=slide&pt=1&lang=zho&callback=geetest_" + str(
        round(time.time() * 1000))
    res = requests.get(url).text
    res = json.loads(res[res.index("(") + 1:res.rindex(")")])
    request.urlretrieve('https://static.geetest.com/' + res['data']['bg'], 'img/bg.png')
    request.urlretrieve('https://static.geetest.com/' + res['data']['slice'], 'img/slide.png')
    distance = get_gap()
    track = get_track(distance)
    return res, distance, track


def main(captchaId, challenge):
    res, distance, track = get_image(captchaId, challenge)
    lot_number = res['data']['lot_number']
    passtime = track[-1][-1]
    detail_time = res['data']["pow_detail"]["datetime"]
    with open('jiyan.js', 'r', encoding='utf-8') as f:
        js = execjs.compile(f.read())
    w = js.call('get_w', captchaId, lot_number, detail_time, distance, passtime, track)
    url = "https://gcaptcha4.geetest.com/verify"
    params = {
        "callback": "geetest_" + str(round(time.time() * 1000)),
        "captcha_id": captchaId,
        "client_type": "web",
        "lot_number": lot_number,
        "risk_type": "slide",
        "payload": res['data']['payload'],
        "process_token": res['data']['process_token'],
        "payload_protocol": "1",
        "pt": "1",
        "w": w
    }
    res = requests.get(url, params=params).text
    res = json.loads(res[res.index("(") + 1:res.rindex(")")])
    print(res)

if __name__ == '__main__':
    captchaId = get_captchaId()
    challenge = str(uuid.uuid4())
    main(captchaId, challenge)
