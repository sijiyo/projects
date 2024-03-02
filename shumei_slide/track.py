import random,time
from datetime import datetime


def get_track(distance):
    """生成轨迹"""
    base_track = [
        [0, 0, 0], [0, -2, 102], [9, -3, 205],
        [44, -5, 303], [82, -4, 409], [125, -3, 503],
        [138, -2, 601], [166, -1, 702], [194, -1, 805],
        [211, -1, 903], [222, -1, 1005], [224, -1, 1101],
        [228, -1, 1201], [228, -1, 1316], [232, -2, 1401],
        [232, -2, 1514], [232, -2, 1601], [233, -2, 1705],
        [233, -2, 1801], [233, -2, 1902], [236, -3, 2001],
        [236, -3, 2101], [236, -3, 2201], [236, -3, 2309],
        [236, -3, 2402], [236, -3, 2512], [236, -3, 2601],
        [236, -3, 2715], [236, -3, 2809], [236, -3, 2902]
    ]
    random_y = random.randint(0, 5)
    radio = distance / base_track[-1][0]
    new_track = []
    for x, y, t in base_track:
        y = y + random_y if y else 0
        point = [round(x * radio), y, round(t * radio)]
        new_track.append(point)
    return new_track

def get_callback():
    return 'sm_' + str(int(time.time() * 1000))
def get_captchaUuid():
    """生成请求参数captchaUuid smcp.min.js"""
    text = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678"
    random18_str = ''.join(random.choices(text, k=18))
    time_str = datetime.now().strftime('%Y%m%d%H%M%S')
    return time_str + random18_str