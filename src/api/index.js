
import axios from 'axios'

// 定义了一个常量 postUrlV1，用于存储后端服务器的请求路径    https://api-v2.sensor-smart.cn:29028/ddinguic/index.html
const systemConfigure = {
  // isDebugMode: true,
  isDebugMode: false,
  // serverrUrl: "https://api-v1.sensor-smart.cn:28023",
  serverr802: "https://api-v2.sensor-smart.cn:22027/ding/pack",
  // serverrUrl: "https://api-v2.sensor-smart.cn:29028/ss-proxy/p29001"
  serverrUrl: "https://api-v2.sensor-smart.cn:22027/ss-proxy/p35001"
}

// 设置 Axios 库的默认请求基础路径为 "/ding"，这意味着所有的请求会发送到以 "/ding" 开头的路径下
// axios.defaults.baseURL = "/ding"
// axios.defaults.baseURL = "/"
const baseURL = process.env.VUE_APP_API_URL || '/ding/pack';
// const baseURL = systemConfigure.serverrUrl;
// 定义了两个常量，分别用于存储钉钉用户令牌和时间戳在本地存储中的键名。
export const key_DingTokenJWT = "sensor_DingTokenJWT"

// 添加请求ID生成函数
// function getReqID() {
//   return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
// }
// 生成请求ID ,每次调用会使请求ID递增
let reqID = 1
function getReqID() {
  reqID = reqID + 1
  return reqID
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
  // let urlSend = "/pack" //systemConfigure.serverrUrl + postURL
  // let urlSend = systemConfigure.serverrUrl
  // let urlSend = "/"+postUrlName;
  // let urlSend = postUrlName;
  let postJson = JSON.stringify(postPack)
  // if (systemConfigure.isDebugMode) {
  //   alert('urlSend: ' + urlSend);
  //   alert('postJson: ' + postJson);
  // }

  // 添加调试信息
  console.log('【API请求】发送数据:', {
    url: baseURL,
    method: postUrlName,
    data: postPack
  });

  //    axios.post(urlSend, postJson, {
  axios.post(baseURL, postJson, {
    headers: {
      "content-type": dataType
    }
  })
    .then(function (response) {
      console.log('【API响应】接收数据:', response.data);
      if (systemConfigure.isDebugMode) {
        alert('responseJson: ' + JSON.stringify(response.data));
      }
      if (response.data.result == 1) {
        // alert('responseJson  1 : ' + JSON.stringify(response.data.respData));
        // alert('responseJson  2: ' + JSON.stringify(response.data.msg));
        console.log('responseJson  1 : ' + JSON.stringify(response.data.respData));
        callSuccess(response.data.respData)

      } else if (callFail) {
        console.log(response.data);
        callFail(response.data.msg)
      }
    })
    .catch(function (error) {
      console.error('【API错误】请求失败:', error);
      console.log(error);
      if (callFail) {
        callFail(error)
      }
    });
}

export default systemConfigure;
