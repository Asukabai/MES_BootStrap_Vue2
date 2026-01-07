
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
      // 扫码获取库存信息(分页)
    InventoryItemByCodeFun(param, callSuccess, callFail) {
        ssDing.PostDataUrlPage("InventoryItemByCodeFun", param, true, respData => {
          callSuccess(respData);
        }, callFail);
      },
  };

  export default SensorRequestPage;

