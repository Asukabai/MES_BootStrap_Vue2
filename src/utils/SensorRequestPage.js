
import * as ssDing from '../utils/Dingding.js';

const SensorRequestPage = {
      // 获取库存信息表格数据(分页)
    InventoryItemGetFun(param, callSuccess, callFail) {
        ssDing.PostDataUrlPage("InventoryItemGetFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 库存信息添加(分页)
    InventoryItemAddFun(param, callSuccess, callFail) {
        ssDing.PostDataUrlPage("InventoryItemAddFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 库存信息更新/修改 (分页)
    InventoryItemUpdateFun(param, callSuccess, callFail) {
        ssDing.PostDataUrlPage("InventoryItemUpdateFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 获取库存操作信息更新/修改 (分页)
      InventoryTransactionGetFun(param, callSuccess, callFail) {
        ssDing.PostDataUrlPage("InventoryTransactionGetFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 添加库存操作信息更新/修改 (分页——出库，入库 操作)
      InventoryTransactionAddFun(param, callSuccess, callFail) {
        ssDing.PostDataUrlPage("InventoryTransactionAddFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
      // 库存位置互换
      InventoryItemExchangeLocationFun(param, callSuccess, callFail) {
        ssDing.PostDataUrlPage("InventoryItemExchangeLocationFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
    // 扫码获取库存信息(分页)
    InventoryItemByCodeFun(param, callSuccess, callFail) {
        ssDing.PostDataUrlPage("InventoryItemByCodeFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
  };

  export default SensorRequestPage;

