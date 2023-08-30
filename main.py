import requests,re,json,base64,ddddocr,execjs,time

def get_image():
    url = 'https://iv.jd.com/slide/g.html'
    params = {
        'appId':'1604ebb2287',
        'scene':'login',
        'product':'click-bind-suspend',
        'e':'QHIAPZR54JDJR3HFO24RNBFHOQ2GEJ5ANBMSD5NAD2X5RSIW5QRZUCQXXQTIKDH47BTS554AZOHML4LCG5ZDYXQVHY',
        'j':'',
        'lang':'zh_CN',
        'callback':'jsonp_029682545329833165',
    }
    header = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    }
    res = requests.get(url, headers=header,params=params).text
    object_code = re.compile(r"\((?P<data_code>.*)\)", re.S)
    data_code = json.loads(object_code.search(res).group('data_code'))
    challenge = data_code['challenge']
    backgroundImage = data_code['bg']
    sliderImage = data_code['patch']
    with open('img/bg.png', mode='wb') as f:
        f.write(base64.b64decode(backgroundImage))
    with open('img/slider.png', mode='wb') as f:
        f.write(base64.b64decode(sliderImage))
    return challenge
def get_distance():
    ocr = ddddocr.DdddOcr(det=False,ocr=False,show_ad=False)
    f1 = open('img/bg.png', 'rb')
    f2 = open('img/slider.png', 'rb')
    result = ocr.slide_match(f2.read(),f1.read(),simple_target=True)
    distance = result['target'][0]
    distance = int(distance * 278 / 360 + 23)
    return distance
def get_main():
    challenge = get_image()
    distance = get_distance()
    time.sleep(4)
    with open('jd.js', 'r', encoding='utf-8') as f:
        js = execjs.compile(f.read())
    d = js.call('generate_trace', distance)
    url = 'https://iv.jd.com/slide/s.html'
    params = {
        "d": d,
        "c": challenge,
        "w": "278",
        "appId": "1604ebb2287",
        "scene": "login",
        "product": "click-bind-suspend",
        "e": "QHIAPZR54JDJR3HFO24RNBFHOQ2GEJ5ANBMSD5NAD2X5RSIW5QRZUCQXXQTIKDH47BTS554AZOHML4LCG5ZDYXQVHY",
        "j": "",
        "s": "6170118232277969400",
        "o": "13334445555",
        "o1": "0",
        "u": "https://passport.jd.com/uc/login?ReturnUrl=https%3A%2F%2Forder.jd.com%2Fcenter%2Flist.action",
        "lang": "zh_CN",
        "callback": "jsonp_06060454087427964"
    }
    header = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    }
    res = requests.get(url, headers=header,params=params).text
    object_code = re.compile(r"\((?P<data_code>.*)\)", re.S)
    data_code = json.loads(object_code.search(res).group('data_code'))
    print(data_code)

if __name__ == '__main__':
    get_main()