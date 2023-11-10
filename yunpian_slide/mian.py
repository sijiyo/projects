# -*- coding: utf-8 -*-
import string, requests, execjs, json, random, uuid, threading
from urllib import request
from gap import *


def get_random(number):
    choices = string.ascii_lowercase + string.digits
    random_chars = random.choices(choices, k=number)
    return ''.join(random_chars)


def main(captchaId):
    cb = get_random(10)
    key = get_random(16)
    iv = get_random(16)
    fp = "034ea72d1b3e115d5c2556b29002" + get_random(4)
    yp_riddler_id = str(uuid.uuid4())
    with open('yunpian.js', 'r', encoding='utf-8') as f:
        js = execjs.compile(f.read())
    data = '{"browserInfo":[{"key":"userAgent","value":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36"},{"key":"language","value":"zh-CN"},{"key":"hardware_concurrency","value":12},{"key":"resolution","value":[1280,720]},{"key":"navigator_platform","value":"Win32"}],"nativeInfo":null,"additions":{},"options":{"sdk":"https://www.yunpian.com/static/official/js/libs/riddler-sdk-0.2.2.js","sdkBuildVersion":"1.5.0(2021111001)","hosts":"https://captcha.yunpian.com"},"fp":"' + fp + '","address":"https://www.yunpian.com","yp_riddler_id":"' + yp_riddler_id + '"}'
    params = {
        "cb": cb,
        "i": js.call('AES_Encrypt', data, key, iv),
        "k": js.call('RSA_Encrypt', key + iv),
        "captchaId": captchaId
    }
    url = 'https://captcha.yunpian.com/v1/jsonp/captcha/get'
    res = requests.get(url, params=params).text
    res = json.loads(res[res.index("(") + 1:res.rindex(")")])
    token = res['data']['token']
    request.urlretrieve(res['data']['bg'], './img/bg.png')
    request.urlretrieve(res['data']['front'], './img/slide.png')
    distance = get_gap() - 5
    with open('yunpian.js', 'r', encoding='utf-8') as f:
        js = execjs.compile(f.read())
    trace = '{"points":[' + js.call('getPoints', distance * 0.75) + '],"distanceX":' + str(
        distance / 480) + ',"fp":"' + fp + '","address":"https://www.yunpian.com", "yp_riddler_id": "' + yp_riddler_id + '"}'
    params = {
        "cb": cb,
        "i": js.call('AES_Encrypt', trace, key, iv),
        "k": js.call('RSA_Encrypt', key + iv),
        'token': token,
        "captchaId": captchaId
    }
    url = "https://captcha.yunpian.com/v1/jsonp/captcha/verify"
    res = requests.get(url, params=params).text
    res = json.loads(res[res.index("(") + 1:res.rindex(")")])
    if res['code'] == 0:
        return res
    else:
        return False


if __name__ == '__main__':
    while True:
        captchaId = '974cd565f11545b6a5006d10dc324281'
        result = main(captchaId)
        if result:
            print(result)
            break