
import * as ssDing from '../api/index.js';

  const SensorRequest = {

    // 官网登录接口
    Ding_LoginByPhoneCode(param, callSuccess, callFail) {
      ssDing.PostDataUrl("Ding_LoginByPhoneCode", param, true, respData => {
        callSuccess(respData);
      }, callFail);
    },
    // 获取官网用户访问信息
    GetLogServer(param, callSuccess, callFail) {
      ssDing.PostDataUrl("AccessRecordInfoGetFun", param, true, respData => {
          callSuccess(respData);
      }, callFail);
    },
    // 保存官网用户访问信息
    saveLogServer(param, callSuccess, callFail) {
      ssDing.PostDataUrl("AccessRecordInfoAddFun", param, true, respData => {
        callSuccess(respData);
      }, callFail);
    }
  };

  export default SensorRequest;

