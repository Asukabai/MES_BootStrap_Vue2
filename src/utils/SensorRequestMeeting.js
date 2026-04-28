
import * as ssDing from '../utils/Dingding.js';

const SensorRequestMeeting = {
    /**
     * 获取会议信息
     * @param param
     * @param callSuccess
     * @param callFail
     */
      // 获取人员信息（包含部门等信息）
      PersonGetFunMeeting(param, callSuccess, callFail) {
        ssDing.PostDataUrlMeeting("PersonGetFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      MeetingInfoGetFunPage(param, callSuccess, callFail) {
        ssDing.PostDataUrlMeeting("MeetingInfoGetFunPage", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
  };

  export default SensorRequestMeeting;

