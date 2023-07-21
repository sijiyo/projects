# -*- coding: utf-8 -*-
import threading,execjs, requests, time, json
from urllib import request
from gap import *
from trace import *


def get_image():
    url = "https://www.geetest.com/demo/gt/register-slide?t=" + str(round(time.time() * 1000))
    res = requests.get(url).json()
    gt = res['gt']
    challenge = res['challenge']
    res = requests.get("https://api.geetest.com/ajax.php?gt=" + gt + "&challenge=" + challenge + "&lang=zh-cn&pt=0&w=&callback=geetest_" + str(
            round(time.time() * 1000))).text
    url = "https://api.geetest.com/get.php?is_next=true&type=slide3&gt=" + gt + "&challenge=" + challenge + "&lang=zh-cn&https=true&protocol=https%3A%2F%2F&offline=false&product=embed&api_server=api.geetest.com&isPC=true&autoReset=true&width=100%25&callback=geetest_" + str(
        round(time.time() * 1000))
    res = requests.get(url).text
    res = json.loads(res[res.index("(") + 1:res.rindex(")")])
    challenge = res['challenge']
    s = res['s']
    request.urlretrieve('https://static.geetest.com/' + res['fullbg'], 'img/oldallbg.png')
    request.urlretrieve('https://static.geetest.com/' + res['bg'], 'img/oldbg.png')
    request.urlretrieve('https://static.geetest.com/' + res['slice'], 'img/slide.png')
    restore_picture()
    distance = get_gap()
    track = get_track(distance - 5)
    return gt, challenge, s, distance, track

def main():
    gt, challenge, s, distance, track = get_image()
    with open('jiyan.js', 'r', encoding='utf-8') as f:
        js = execjs.compile(f.read())
    passtime = track[-1][-1]
    track = js.call('get_encode_trace', track, s)
    w = js.call('get_w', distance - 5, track, challenge, challenge[:32], passtime, str(random.randint(100, 200)),gt)
    url = "https://api.geetest.com/ajax.php?gt=" + gt + "&challenge=" + challenge + "&lang=zh-cn&pt=0&w=" + w + "&callback=geetest_" + str(
        round(time.time() * 1000))
    res = requests.get(url).text
    res = json.loads(res[res.index("(") + 1:res.rindex(")")])
    print(res)


if __name__ == '__main__':
    for i in range(1):
        thr = threading.Thread(target=main)
        thr.start()
        time.sleep(2)
