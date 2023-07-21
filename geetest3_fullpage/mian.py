# -*- coding: utf-8 -*-
import random,threading, execjs, requests, time, json


def main():
    frist_time = str(round(time.time() * 1000))
    url = "https://www.geetest.com/demo/gt/register-fullpage?t=" + str(round(time.time() * 1000))
    res = requests.get(url).json()
    gt = res['gt']
    challenge = res['challenge']
    with open('jiyan.js', 'r', encoding='utf-8') as f:
        js = execjs.compile(f.read())
    key = js.call('get_key')
    w = js.call('get_w1', gt, challenge, key)
    url = "https://apiv6.geetest.com/get.php?gt=" + gt + "&challenge=" + challenge + "&lang=zh-cn&pt=0&client_type=web&w=" + w + "&callback=geetest_" + str(
        round(time.time() * 1000))
    res = requests.get(url).text
    res = json.loads(res[res.index("(") + 1:res.rindex(")")])
    s = res['data']['s']
    w = js.call('get_w2',s,str(random.randint(500, 3000)),gt,challenge,frist_time,key)
    url = "https://api.geetest.com/ajax.php?gt=" + gt + "&challenge=" + challenge + "&lang=zh-cn&pt=0&client_type=web&w=" + w + "&callback=geetest_" + str(
        round(time.time() * 1000))
    res = requests.get(url).text
    res = json.loads(res[res.index("(") + 1:res.rindex(")")])
    print(res)


if __name__ == '__main__':
    for i in range(1):
        thr = threading.Thread(target=main)
        thr.start()
        time.sleep(2)