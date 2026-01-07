import * as dd from 'dingtalk-jsapi'
import axios from 'axios'
import * as jwt from 'jsonwebtoken';


// 定义了一个常量 postUrlV1，用于存储后端服务器的请求路径    https://api-v2.sensor-smart.cn:29028/ddinguic/index.html  https://api-v2.sensor-smart.cn:22027/ss-proxy/p35001
const systemConfigure = {
  // isDebugMode: true,
  isDebugMode: false,
  // serverrUrl: "https://api-v1.sensor-smart.cn:28023",
  serverr802: "https://api-v2.sensor-smart.cn:22027/ding/pack",
  // serverrUrl: "https://api-v2.sensor-smart.cn:29028/ss-proxy/p29001"
  serverrUrl: "/ss-proxy/p35001"
}


// 设置 Axios 库的默认请求基础路径为 "/ding"，这意味着所有的请求会发送到以 "/ding" 开头的路径下
// axios.defaults.baseURL = "/ding"
// axios.defaults.baseURL = "/"
const baseURL =  '/ding/pack';

// 定义了两个常量，分别用于存储钉钉用户令牌和时间戳在本地存储中的键名。
export const key_DingTokenJWT = "sensor_DingTokenJWT"
export const key_DingTokenTS = "sensor_DingTokenTS"
export const key_DingName = "sensor_DingName"
export const key_DingUserIndex = "key_DingUserIndex"
export const key_DingUserPhone = "key_DingUserPhone"
export const key_DingScannedResult = "key_DingScannedResult"
export const key_DingScannedInventoryQRCodeResult = "key_DingScannedInventoryQRCodeResult"
export const key_DingResponseStored = "key_DingResponseStored"
export const key_DingResponseUsed = "key_DingResponseUsed"

// 定义全局变量
export let cachedProductId = '晟思'; // 默认值
export let cachedInventoryProductId = '库存物品二维码ID'; // 默认值
export let cachedProductPerson = '晟思'; // 默认值
export let cachedPersonIndex = 333; // 默认值
export let cachedResponseUsed = "未领用1"; // 默认值
export let cachedResponseStored = "未入库1"; // 默认值

export function updateCachedProductId(newId) {
  cachedProductId = newId;
}export function updateCachedInventoryProductId(newId) {
  cachedInventoryProductId = newId;
}
export function updateCachedProductPerson(newPerson) {
  cachedProductPerson = newPerson;
}

export function updateCachedPersonIndex(personIndex) {
  cachedPersonIndex = personIndex;
}
export function updateCachedResponseStored(responseStored) {
  cachedResponseStored = responseStored;
  console.log("cachedResponseStored 是： ",cachedResponseStored)
}
export function updateCachedResponseUsed(responseUsed) {
  cachedResponseUsed = responseUsed;
  console.log("cachedResponseUsed 是： ",cachedResponseUsed)
}

// 根据部门获取对应的 corpId
export function getCorpIdByDepartment(department) {
  console.log('调用根据部门获取对应的 corpId,部门号是：', department); // 调试日志
  const corpIds = {
    'xian': 'ding103faa9c7d30c144', // 晟思 - 钉钉企业id
    'taiyuan': 'ding1fa39ac9b223238435c2f4657eb6378f' // 山西 - 钉钉企业id
  };
  return corpIds[department];
}

// 获取登录方法名
export function getLoginMethodByDepartment(department) {
  console.log('调用获取登录方法名,部门号是：', department); // 调试日志
  return department === 'taiyuan' ? 'Dajun_LoginByCode' : 'Ding_LoginByCode';
}
// 获取验证码方法名
export function getLoginCodeByDepartment(department) {
  console.log('调用获取验证码方法名,部门号是：', department); // 调试日志
  return department === 'taiyuan' ? 'Dajun_GetMFACode' : 'Ding_GetMFACode';
}

// 定义了两个变量，分别用于存储请求ID和目标URL，默认值分别为1和null。
let reqID = 1
let urlTarget = null

// 生成请求ID ,每次调用会使请求ID递增
function getReqID() {
  reqID = reqID + 1
  return reqID
}

// 设置和获取目标URL
export function setUrlTarget(uuri) {
  urlTarget = uuri
}

export function getUrlTarget() {
  return urlTarget
}
// 钉钉免登-发送POST请求
export function PostData(method, data, callSuccess, callFail) {
  let userToken = localStorage.getItem(key_DingTokenJWT)
  if (!userToken) {
    userToken = ""
  }
  let postPack = {
    reqID: getReqID(),
    method: method,
    sender: "",
    sendee: "",
    token: userToken,
    reqData: data
  }
  // axios.post(systemConfigure.serverrUrl, JSON.stringify(postPack), {
  axios.post(baseURL, JSON.stringify(postPack), {
    headers: {
      "content-type": "application/json"
    }
  })
    .then(function (response) {
      if (systemConfigure.isDebugMode) {
        alert('PostData_response: ' + JSON.stringify(response.data)); // 弹出日志;
      }
      if (response.data.result == 1) {
        callSuccess(response.data.respData)
      } else if (callFail) {
        console.log(response.data);
        callFail(response.data.msg)
      }
    })
    .catch(function (error) {
      if (systemConfigure.isDebugMode) {
        alert('PostData_response: ' + JSON.stringify(error)); // 弹出日志;
      }
      if (callFail) {
        callFail(error)
      }
    });
}

// 向后端发送POST请求
export function PostDataUrl(postUrlName, data, isJson, callSuccess, callFail) {
  let userToken = localStorage.getItem(key_DingTokenJWT)
  if (!userToken) {
    userToken = ""
  }
  let postPack = {
    reqID: getReqID(),
    method: postUrlName,
    sender: "",
    sendee: "",
    token: userToken,
    reqData: data
  }
  let dataType = ""
  if (isJson) {
    dataType = "application/json"
  } else {
    dataType = "multipart/form-data"
  }
  let postJson = JSON.stringify(postPack)

  // axios.post(systemConfigure.serverrUrl, postJson, {
  axios.post(baseURL, postJson, {
    headers: {
      "content-type": dataType
    }
  })
    .then(function (response) {
      if (systemConfigure.isDebugMode) {
        alert('responseJson: ' + JSON.stringify(response.data));
      }
      // 定义错误码映射表
      const errorCodeMap = {
        0: "空响应",
        1: "正常",
        "-1": "其他错误",
        "-100001": "未找到设备",
        "-100002": "参数错误",
        "-100003": "不支持该指令",
        "-100004": "超时",
        "-100005": "类型不符",
        "-100007": "取消操作",
        "-100008": "设备忙",
        "-100009": "设备出错",
        "-100102": "断线",
        "-100100": "未找到文本",
        "-100101": "未找到文件",
        "-100201": "手动退出",
        "-100202": "手动重启",
        "-100701": "测试失败",
        "-100302": "设置失败",
        "2": "D90已拆除",
        "-403": "没有接口权限，请联系管理员开通",
        "-404": "未找到",
        "-601": "未知错误"
      };

      if (response.data.result == 1) {
        console.log('responseJson  1 : ' + JSON.stringify(response.data.respData));
        callSuccess(response.data.respData)
      } else if (callFail) {
        // 根据错误码获取对应的错误信息
        const errorMsg = errorCodeMap[response.data.result] || response.data.msg || "未知错误";
        console.log(response.data);
        callFail(errorMsg)
      }
    })
    .catch(function (error) {
      console.log(error);
      if (callFail) {
        callFail(error)
      }
    });
}


// 向后端发送POST请求
export function PostDataUrlPage(postUrlName, data, isJson, callSuccess, callFail) {
  let userToken = localStorage.getItem(key_DingTokenJWT)
  if (!userToken) {
    userToken = ""
  }
  let postPack = {
    reqID: getReqID(),
    method: postUrlName,
    sender: "",
    sendee: "",
    token: userToken,
    reqData: data
  }
  let dataType = ""
  if (isJson) {
    dataType = "application/json"
  } else {
    dataType = "multipart/form-data"
  }
  let postJson = JSON.stringify(postPack)

  // axios.post(systemConfigure.serverrUrl, postJson, {
  axios.post(baseURL, postJson, {
    headers: {
      "content-type": dataType
    }
  })
    .then(function (response) {
      if (systemConfigure.isDebugMode) {
        alert('responseJson: ' + JSON.stringify(response.data));
      }
      // 定义错误码映射表
      const errorCodeMap = {
        0: "空响应",
        1: "正常",
        "-1": "其他错误",
        "-100001": "未找到设备",
        "-100002": "参数错误",
        "-100003": "不支持该指令",
        "-100004": "超时",
        "-100005": "类型不符",
        "-100007": "取消操作",
        "-100008": "设备忙",
        "-100009": "设备出错",
        "-100102": "断线",
        "-100100": "未找到文本",
        "-100101": "未找到文件",
        "-100201": "手动退出",
        "-100202": "手动重启",
        "-100701": "测试失败",
        "-100302": "设置失败",
        "2": "D90已拆除",
        "-403": "没有接口权限，请联系管理员开通",
        "-404": "未找到",
        "-601": "未知错误"
      };

      if (response.data.result == 1) {
        console.log('responseJson  1 : ' + JSON.stringify(response.data.respData));
        callSuccess(response.data.respData)
      } else if (callFail) {
        // 根据错误码获取对应的错误信息
        const errorMsg = errorCodeMap[response.data.result] || response.data.msg || "未知错误";
        console.log(response.data);
        callFail(errorMsg)
      }
    })
    .catch(function (error) {
      console.log(error);
      if (callFail) {
        callFail(error)
      }
    });
}

// 用于获取钉钉授权码
// 在 GetDingCode 的成功回调中，info.code 被作为参数传递给 GetDingCode 的第一个回调函数参数
// 然后这个 code 被作为参数传递给 PostData("Ding_LoginByCode", code, ...) 方法
export function GetDingCode(department,callSuccess, callFail) {
  console.log('用于获取钉钉授权码 - 获取到的部门信息:', department); // 调试日志
  const corpId = getCorpIdByDepartment(department);
  console.log('用于获取钉钉授权码 - 对应的 corpId:', corpId); // 调试日志
  if (dd.env.platform !== 'notInDingTalk') {
    dd.ready(() => {
      dd.runtime.permission.requestAuthCode({
        corpId: corpId,
        onSuccess: (info) => {
          callSuccess(info.code)  // 成功回调中获取code
        },
        onFail: (err) => {
          callFail(JSON.stringify(err))
        }
      })
    })
  } else {
    callFail("notInDingTalk")
    // 不在钉钉环境，跳转到登录页
    // router.push('/login'); // 直接跳转，不再拼接部门路径
  }
}

// 获取当前时间的时间戳（单位：秒）
export function GetTSSecond() {
  return parseInt(new Date().getTime() / 1000);
}

// 用于设置新的用户令牌
export function setNewToken(newToken) {
  let tsNow = GetTSSecond()
  localStorage.setItem(key_DingTokenTS, tsNow)
  localStorage.setItem(key_DingTokenJWT, newToken)
}
export function GetDingUserToken(department, callSuccess, callFail) {
  console.log('[GetDingUserToken] 开始执行函数，部门参数:', department);
  console.log('[GetDingUserToken] === GetDingUserToken 调用开始 ===');
  let userToken = localStorage.getItem(key_DingTokenJWT)
  console.log('[GetDingUserToken] 从localStorage获取的token:', userToken);

  // 检查是否有有效 token
  if (!userToken) {
    console.log("[GetDingUserToken] 未找到 token，启动登录流程");
    requestNewToken(department, callSuccess, callFail);
    return;
  }

  // 检查 token 是否过期
  let tokenTS = localStorage.getItem(key_DingTokenTS);
  console.log("[GetDingUserToken] 获取到token时间戳:", tokenTS);
  if (tokenTS) {
    let tsLast = parseInt(tokenTS);
    console.log("[GetDingUserToken] 解析后的时间戳:", tsLast);
    let tsNow = GetTSSecond();
    console.log("[GetDingUserToken] 当前时间戳:", tsNow);
    let tsValid = tsNow-tokenTS;
    console.log("[GetDingUserToken] 时间间隔差值:", tsValid);
    if (tsValid < 100) {
      // Token 在有效期内，直接使用
      console.log("[GetDingUserToken] Token 在有效期内");
      callSuccess(userToken);
      return;
    }
  }
  // Token 过期或时间戳不存在，重新获取
  console.log("[GetDingUserToken] Token 过期或无效，重新获取");
  requestNewToken(department, callSuccess, callFail);
}


function requestNewToken(department, callSuccess, callFail) {
  console.log('[requestNewToken] 开始请求新令牌，部门参数:', department);
  GetDingCode(department,
    (code) => {
      console.log('[requestNewToken] GetDingCode成功回调，获取到code:', code);
      const loginMethod = getLoginMethodByDepartment(department);
      console.log('[requestNewToken] 根据部门获取登录方法:', loginMethod);
      PostData(loginMethod, code, (newToken) => {
        console.log('[requestNewToken] PostData成功回调，获取到newToken');
        let decodedToken = jwt.decode(newToken);
        console.log('[requestNewToken] 解码JWT令牌结果:', decodedToken);
        let name = decodedToken.userName;
        console.log('[requestNewToken] 从令牌中提取用户名:', name);
        let userPhone = decodedToken.userPhone;
        console.log('[requestNewToken] 从令牌中提取用户手机号:', userPhone);
        let userIndex = decodedToken.userID;
        console.log('[requestNewToken] 从令牌中提取用户ID:', userIndex);

        // 将用户信息放入缓存
        localStorage.setItem(key_DingName, name);
        console.log('[requestNewToken] 已设置用户名到localStorage');
        localStorage.setItem(key_DingUserIndex, userIndex);
        console.log('[requestNewToken] 已设置用户ID到localStorage');
        localStorage.setItem(key_DingUserPhone, userPhone);
        console.log('[requestNewToken] 已设置用户手机号到localStorage');

        // 更新 Token 和 Token 时间戳
        setNewToken(newToken);
        console.log('[requestNewToken] 调用setNewToken完成');
        callSuccess(newToken);
        console.log('[requestNewToken] 调用外部成功回调');
      }, (error) => {
        console.log('[requestNewToken] PostData失败回调:', error);
        callFail(error);
      });
    },
    (err) => {
      console.log('[requestNewToken] GetDingCode失败回调:', err);
      if (callFail) {
        callFail(err);
        console.log('[requestNewToken] 调用外部失败回调');
      }
    }
  );
}
export default systemConfigure;
