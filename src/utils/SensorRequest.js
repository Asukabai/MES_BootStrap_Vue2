
import * as ssDing from '../utils/Dingding.js';

  const SensorRequest = {

      GetDDingCode(loginMethod,param, callSuccess, callFail) {
        ssDing.PostDataUrl(loginMethod, param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 获取人员信息（包含部门等信息）
      PersonGetFun(param, callSuccess, callFail) {
        ssDing.PostDataUrl("PersonGetFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 获取用户聊天室列表
      Talk_GetUserRoom(param, callSuccess, callFail) {
        ssDing.PostDataUrl("Talk_GetUserRoom", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 获取聊天用户列表
      Talk_GetUserList(param, callSuccess, callFail) {
        ssDing.PostDataUrl("Talk_GetUserList", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 获取房间聊天记录
      Talk_GetRoomHistoryMsg(param, callSuccess, callFail) {
        ssDing.PostDataUrl("Talk_GetRoomHistoryMsg", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 创建聊天房间
      Talk_CreateRoom(param, callSuccess, callFail) {
        ssDing.PostDataUrl("Talk_CreateRoom", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 获取周报信息表格数据
      WeeklyReportsInfoGetFun(param, callSuccess, callFail) {
        ssDing.PostDataUrl("WeeklyReportsInfoGetFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 获取周报信息表格数据
      WeeklyReportsInfoUpdateFun(param, callSuccess, callFail) {
        ssDing.PostDataUrl("WeeklyReportsInfoUpdateFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 获取库存信息表格数据
      InventoryItemsGetFun(param, callSuccess, callFail) {
        ssDing.PostDataUrl("InventoryItemsGetFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 更新库存信息表格数据
      InventoryItemsUpdateFun(param, callSuccess, callFail) {
        ssDing.PostDataUrl("InventoryItemsUpdateFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 库存操作信息添加
      InventoryTransactionsAddFun(param, callSuccess, callFail) {
        ssDing.PostDataUrl("InventoryTransactionsAddFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 库存信息添加
      InventoryItemsAddFun(param, callSuccess, callFail) {
        ssDing.PostDataUrl("InventoryItemsAddFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 获取库存操作信息
      InventoryTransactionsGetFun(param, callSuccess, callFail) {
        ssDing.PostDataUrl("InventoryTransactionsGetFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 获取项目信息 --展示到下拉框中
      ProjectInfoGetFun(param, callSuccess, callFail) {
        ssDing.PostDataUrl("ProjectInfoGetFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 获取所有会议的周次编号 --展示到下拉框中
      MeetingWeekDisplayGetFun(param, callSuccess, callFail) {
        ssDing.PostDataUrl("MeetingWeekDisplayGetFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 周报信息添加
      WeeklyReportsInfoAddFun(param, callSuccess, callFail) {
        ssDing.PostDataUrl("WeeklyReportsInfoAddFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 获取服务器本地时间
      GetServerTime(param, callSuccess, callFail) {
          ssDing.PostDataUrl("GetLocalTimeFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      GetServerInfo(param, callSuccess, callFail) {
          ssDing.PostDataUrl("GetServerInfoFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      GetUploadSummary(param, callSuccess, callFail) {
          ssDing.PostDataUrl("FileuploadInfoGetFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      GetDownloadSummary(param, callSuccess, callFail) {
          ssDing.PostDataUrl("FileDownloadInfoGetFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      GetUploadFileTypeStats(param, callSuccess, callFail) {
          ssDing.PostDataUrl("FileTypeUploadInfoGetFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      GetDownloadFileTypeStats(param, callSuccess, callFail) {
          ssDing.PostDataUrl("FileTypeDownloadInfoGetFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      GetRecentLogs(param, callSuccess, callFail) {
          ssDing.PostDataUrl("GetLoggerInfoFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      GetOnlineUsers(param, callSuccess, callFail) {
          ssDing.PostDataUrl("GetOnlinePersonCountFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 任务信息获取
      TaskInfoGetFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("TaskInfoGetFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 收到的文件信息获取
      GetSharedFileWithMeFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("GetSharedFileWithMeFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 发送的文件信息获取
      GetPersonSharedFileFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("GetPersonSharedFileFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 任务状态修改
      TaskFinishUpdateFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("TaskFinishUpdateFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 获取预览文件的URL
      Minio_PresignedDownloadUrl5B(param, callSuccess, callFail) {
          ssDing.PostDataUrl("Minio_PresignedDownloadUrl5B", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 获取个人创建或者负责的任务信息
      GetPersonTaskInfoFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("GetPersonTaskInfoFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 获取个人参与的任务信息
      GetTaskInfoWithMeFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("GetTaskInfoWithMeFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 阶段性任务信息提交
      TaskInfoStageFileAddFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("TaskInfoStageFileAddFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 阶段性任务信息提交
      GetTaskInfoByIDFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("GetTaskInfoByIDFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 根据操作人查询板卡记录信息
      GetAssetOperationInfoByPersonFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("GetAssetOperationInfoByPersonFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 资产模块信息添加
      AssetModuleInfoAddFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("AssetModuleInfoAddFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 资产模块信息查询（模糊）
      AssetModuleInfoGetFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("AssetModuleInfoGetFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 资产模块信息根据ID删除
      AssetModuleInfoDeleteFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("AssetModuleInfoDeleteFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 根据资产编号查询资产信息
      GetAssetInfoByAssetCodeFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("GetAssetInfoByAssetCodeFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 根据资产编号查询资产操作信息
      GetAssetOperationInfoByAssetCodeFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("GetAssetOperationInfoByAssetCodeFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 资产操作信息添加
      AssetOperationInfoAddFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("AssetOperationInfoAddFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 项目条形统计图数据
      GetAllProjectParticipantFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("GetAllProjectParticipantFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 项目进度数据
      GetAllProjectInfoStateFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("GetAllProjectInfoStateFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 知识库——获取信息表格数据
      ErrorRepositoryGetFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("ErrorRepositoryGetFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 知识库——模糊查询信息表格数据
      ErrorRepositorySelectFun(param, callSuccess, callFail) {
          ssDing.PostDataUrl("ErrorRepositorySelectFun", param, true, respData => {
              callSuccess(respData);
          }, callFail);
      },
      // 添加资产信息
      AssetInfoAddFun(param) {
          return new Promise((resolve, reject) => {
              ssDing.PostDataUrl("AssetInfoAddFun", param, true, respData => {
                  resolve(respData); // 成功时 resolve
              }, error => {
                  reject(error); // 失败时 reject
              });
          });
      }

  };

  export default SensorRequest;

