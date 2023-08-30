# captcha_verify
some_captcha_verify.极验滑块和无感/geetest fullpage and slide
<div align="center"> 
<h1 align="center">
some_captcha_verify
</h1>

![](https://img.shields.io/github/stars/sijiyo/captcha_verify?style=social "Star数量")
![](https://img.shields.io/github/forks/sijiyo/captcha_verify?style=social "Fork数量")
<br>
</div>

## ✨项目介绍

&emsp;&emsp;伴随着疫情的到来，学校为了解在校师生的健康状况，全校师生都规定在特定的时间进行健康打卡 or 校内打卡，本项目旨在帮助使用完美校园打卡的在校师生提供帮助，每天指定时间进行自动打卡，从每天指定时间打卡的压力中解放出来，全身心地投入到社会主义建设之中去。

&emsp;&emsp;本项目使用了 `requests`、`json5`、`pycryptodome` 第三方库，2.0 版本迎来项目重构，打卡数据错误修改方法，不再是以前的修改代码（不懂代码容易改错或无法下手），而是通过直接修改配置文件即可，**本脚本使用虚拟 id 来登录，如果使用了本脚本就不要再用手机登录 app 了，如果一定要用 app 请不要使用当前脚本**。

&emsp;&emsp;由于完美校园就设备做了验证，只允许一个设备登录，获取本机的 device_id 可参考 [此处](https://github.com/sijiyo/captcha_verify/wiki/%E8%8E%B7%E5%8F%96%E6%9C%AC%E6%9C%BA-device_id)



## 🔰项目功能

* [x] 完美校园模拟登录获取 token
* [x] 自动获取上次提交的打卡数据，也可通过配置文件修改
* [x] 支持健康打卡（学生打卡、教师打卡）和校内打卡
* [x] 支持多人打卡配置，可单人自定义推送，也可统一推送
* [x] 支持粮票签到收集，自动完成查看课表和校园头条任务
* [x] 支持 qq 邮箱、Qmsg、Server 酱、PipeHub 推送打卡消息


## 🎨配置文件

### 💃用户配置

- 打卡用户配置文件位于：`conf/user.json`
- 整个 json 文件使用一个 `[]` 列表用来存储打卡用户数据，每一个用户占据了一个 `{}`键值对，初次修改务必填写的数据为：**phone**、**password**、**device_id**（获取方法：[蓝奏云](https://lingsiki.lanzoui.com/iQamDmt165i)，下载解压使用）、**健康打卡的开关**（根据截图判断自己属于哪一类（不一定和我截图一模一样，好看就选 1）[【1】](https://cdn.jsdelivr.net/gh/sijiyo/captcha_verify/Pictures/one.png)、[【2】](https://cdn.jsdelivr.net/gh/sijiyo/captcha_verify/Pictures/two.png)），校内打卡开关（有则开），推送设置 **push**（推荐使用 qq 邮箱推送）。
- 关于 `post_json`，如若打卡推送数据中无错误，则不用管，若有 null，或其他获取不到的情况，则酌情修改即可，和推送是一一对应的。
- 如果多人打卡，则复制单个用户完整的 `{}`，紧接在上个用户其后即可。

```js
//  萌新不建议精简配置，出现报错还需要加上必要的配置，以下为个人最简配置示例，请确定自己的打卡方式，删掉不需要的即可
{
    "welcome": "用户一，这是一条欢迎语，每次打卡前会打印这句话，用来标记当前打卡用户，如：正在为 *** 打卡......",
    "phone": "123",  // 完美校园登录账号，必填
    "password": "456",  // 完美校园登录密码，必填
    "device_id": "789",  // 已验证完美校园登录设备ID，获取方式为下载蓝奏云链接中的 RegisterDeviceID.zip，必填
    "healthy_checkin": { // 必选一个打卡方式
        "one_check": {  // 第一类健康打卡
            "enable": true  // true 为打开，false 为关闭
        }
    },
    "campus_checkin": {  // 校内打卡，没有就不用管
        "enable": true  // true 为打开，false 为关闭
    },
    "push": {  // 必选一个，单人推送设置，若全部关闭，则使用 push.json 文件的配置，进行统一推送
        "email": {  //  自定义邮箱推送，使用 qq 邮箱推送，就用 qq 邮箱的 smtp 服务地址和端口
            "enable": true,  // true 为打开，false 为关闭
            "smtp_address": "smtp.qq.com",  // stmp服务地址
            "smtp_port": 465,  // stmp服务端口
            "send_email": "***@qq.com",  // 发送邮箱的邮箱地址
            "send_pwd": "****",  // 发送邮箱的邮箱授权码
            "receive_email": "**@qq.com"  // 接收信息的邮箱地址，可自己给自己发
        }
    }
}
```

### 🤝统一推送配置

- 统一推送配置文件位于：`conf/push.json`
- 若多用户打卡使用统一推送而不是个别单独推送则在此文件下进行推送的配置



## 💦使用方法（云函数）

> 详细图文教程请前往：[博客](https://reajason.github.io/2021/03/19/17wanxiaoCheckInSCF/)，请所有步骤及常见问题通读一遍再动手

- 云函数 — 函数服务 — 新建云函数

- 自定义创建 — 本地上传 zip 包（17wanxiaoCheckin-SCF v*.*.zip：[蓝奏云](https://lingsiki.lanzoui.com/b0ekhmcxe)，密码：2333）

- 上传之后往下滑 — 触发器配置 — 自定义创建 — 触发周期：自定义触发 — Cron 表达式：0 0 6,14 * * * * — 完成 — 立即跳转

- 函数管理 — 函数配置 — 编辑 — 执行超时时间：900 — 保存

- 函数代码 — `src/conf/user.json` — 根据上方的用户配置文件介绍以及里面的注释进行设置【第一次使用推荐 QQ 邮箱推送，数据推送全面】

- 测试 — 若弹框【检测到您的函数未部署......】选是 — 查看执行日志以及推送信息（执行失败请带上执行日志完整截图反馈）

- 第一类健康打卡成功结果：`{'msg': '成功', 'code': '10000', 'data': 1}`，显示打卡频繁也算

- 第二类健康打卡成功结果：`{'code': 0, 'msg': '成功'}`

- 校内打卡成功结果：`{'msg': '成功', 'code': '10000', 'data': 1}`

- 出现成功，如果邮箱推送表格没有 None 值或支付宝小程序的健康助手有信息则是真正的打卡成功

- 如果你们学校会记录打卡成功与否可直接在 **支付宝小程序** 查看是否记录上去（手机 app 登录的话之前获取的 device_id 就失效了）

- 最后检查推送数据，如果表格中有 None，请根据第二行的信息，搭配第一行推送信息的格式，修改配置文件

  - 打开第一行，找到 updatainfo 这个东西，下面的有 null 的对应就是表格中的 None，记住它的 propertyname

  - 打开第二行，找到对应 perpertyname 的部分，根据 checkValue 的 text 选择你需要的选项，温度自己填个值就可

  - 打开配置文件，找到 post_json 下的 updatainfo，在里面加入你需要修改的值，格式和第一行里面的打卡数据一样

  - ```
    "updatainfo":[
    	{
        	"propertyname": "temperature",  // 这个为第一行中找到值为 null 的那一项
            "value": "35.7"  // 这个值为你想改的值，第二行中获取，如果是温度，自己填自己想的即可
        },
        {
        	"propertyname": "wengdu",
        	"value": "36.4"
        }
    ]
    ```

     

- 由于前面使用软件获取了 device_id，所以请使用 **支付宝小程序** 查看打卡结果是否记录上去，以免手机登录 device_id 失效

- 由于前面使用软件获取了 device_id，所以请使用 **支付宝小程序** 查看打卡结果是否记录上去，以免手机登录 device_id 失效

- 由于前面使用软件获取了 device_id，所以请使用 **支付宝小程序** 查看打卡结果是否记录上去，以免手机登录 device_id 失效




## 🙋‍脚本有问题
* 有问题可提 [issue](https://github.com/sijiyo/captcha_verify/issues)



## 🎯ToDo
> 2022-12-29 项目停止维护，期待在其他地方和大家见面

> ~~本人希望自己代码能越写越好，因此在功能完善的情况下不断重构代码到满意的结果，希望能和想要技术交流的小伙伴一起学习（ https://reajason.github.io ）~~

- [ ] ~~面向对象方式重构代码~~
- [ ] ~~更优雅地处理错误和抛出异常~~
- [ ] ~~精简配置文件~~



## 📜FQA

- 若第一类健康打卡或校内打卡推送显示，需要修改对应位置下的 areaStr，修改格式为：`"areaStr": "{\"address\":\"天心区青园路251号中南林业科技大学\",\"text\":\"湖南省-长沙市-天心区\",\"code\":\"\"}"` ，`address`：对应手机打卡界面的下面一行，`text`：对应手机打卡界面的上面一行，根据自己的来，上面填什么就是什么，若是校内打卡的地址获取不到，可查看健康打卡的打卡数据推送里面的 areaStr 复制即可。
- 若打卡结果为 `{'msg': '参数不合法', 'code': '10002', 'data': ;'deptid can not be null'}`，初步认为你们学校打卡数据无法自动获取，每次需要自己填写数据，解决办法为手机登录打卡抓签到包，然后在配置文件的 `post_json` 中填下你的打卡数据。
- ~~若腾讯云函数测试失败，执行日志中出现 `......\nKeyError: 'whereabouts'","statusCode":430}`，这种情况就是选错健康打卡方式了，请选第一种健康打卡。~~（已在代码中给出相应提示）
- 腾讯云函数测试失败返回结果中有 `Invoking task timed out after 3 seconds` ，请在函数设置中设置超时时间 900s。
- 选择了第二类打卡也提示成功了，但是却没有打上，请尝试添加经纬度参数或者 **选择第一类健康打卡**。
- 打卡失败显示 `无法找到该机构的投票模板数据`，则是选错了打卡方式或是第一类打卡 templateid 不对，可通过配置文件对应位置修改
- 打卡失败显示 `您正在新设备上使用完美校园 | 获取 token 失败`，请重新获取 device_id 并确保不要再使用手机 app 登录完美校园
- 打卡失败显示 `您当前打卡内容与现有模板不符，请重新打卡~`，请使用最新的打卡 scf 压缩包重新部署
- 等待反馈......

## 🌟Star History

[![Star History Chart](https://api.star-history.com/svg?repos=sijiyo/captcha_verify&type=Date)](https://star-history.com/#sijiyo/captcha_verify&Date)
