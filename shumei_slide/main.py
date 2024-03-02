import requests,re,json,base64,execjs
from urllib import request
from gap import *
from track import *
with open('shumei.js', 'r', encoding='utf-8') as f:
    js = execjs.compile(f.read())
def get_image(organization):
    url = 'https://captcha1.fengkongcloud.cn/ca/v1/register'
    params = {
        "organization": organization,
        "data": "{}",
        "appId": "default",
        "model": "slide",
        "rversion": '1.0.4',
        "lang": "zh-cn",
        "channel": "DEFAULT",
        "callback": get_callback(),
        "sdkver": '1.1.3',
        "captchaUuid": get_captchaUuid()
    }
    res = requests.get(url, params=params).text
    match = re.search(r'({.+})', res).group(1)
    data = json.loads(match)
    request.urlretrieve('https://castatic.fengkongcloud.cn'+data['detail']['bg'], './img/bg.png')
    request.urlretrieve('https://castatic.fengkongcloud.cn'+data['detail']['fg'], './img/slide.png')
    distance = round(get_gap()/2)
    rid = data['detail']['rid']
    return distance,rid
def get_main(organization):
    distance,rid = get_image(organization)
    track = get_track(distance)
    je = js.call('DES_Encrypt', str(distance / 300), "5ea96022")
    ww = js.call('DES_Encrypt', str(track[-1][-1] + random.randint(10, 100)), "17a94a08")
    mu = js.call('DES_Encrypt', json.dumps(track, separators=(',', ':')), "e7e1eb0d")
    params = {
        "je": je,
        "ww": ww,
        "mu": mu,
        "rid": rid,
        "captchaUuid": get_captchaUuid(),
        "organization": organization,
        "callback": get_callback(),
        "rversion": '1.0.4',
        "sdkver": '1.1.3',
        "nu": "C0kH/bWLjw8=",  # mouseEndX=300, "390aac0d"
        "dy": "Rfpr5oqb5y4=",  # trueHeight=150, "a9001672"
        "en": "y+ugz9NIWys=",
        "tb": "3jSn4gNaAVM=",  # 1,'6f5e9847'
        "kq": "mtlOTdT5LOE=",
        "mp": "WYfkIZp7GoA=",
        "oc": "h9oFKi8cHpg=",
        "xy": "YabT6nmJOC0=",  # "zh-cn"
        "jo": "l3aEINYnwpY=",
        "protocol": "180",
        "ostype": "web",
        "act.os": "web_pc",
    }
    url = 'https://captcha1.fengkongcloud.cn/ca/v2/fverify'
    res = requests.get(url, params=params).text
    match = re.search(r'({.+})', res).group(1)
    print(match)
if __name__ == '__main__':
    organization = "RlokQwRlVjUrTUlkIqOg"
    get_main(organization)