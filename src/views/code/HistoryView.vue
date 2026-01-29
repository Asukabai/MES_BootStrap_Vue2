<template>
  <div class="history-view-container">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-container">
      <van-loading size="24px" vertical class="loading-message">
        数据加载中...
      </van-loading>
    </div>
    <!-- 内容区域 -->
    <div v-else class="content-container">
      <div class="header-info">
        <h3 class="board-id-title">{{ boardID }}记录列表</h3>
        <div class="record-count" v-if="count !== 0">
          该资产的操作记录数量为：{{ count }} 条
        </div>
        <!-- 资产记录卡片列表 -->
        <div class="asset-records-list" v-if="cardRecords && cardRecords.length > 0">
          <div
            v-for="(record, index) in cardRecords"
            :key="index"
            class="custom-card"
          >
            <div class="card-header">
              <div class="card-title">操作类型 </div>
              <div class="card-tag">{{ record.description || '无描述' }}</div>
            </div>
            <div class="card-content">
<!--              <div class="data-row">-->
<!--                <span class="data-label">资产编号:</span>-->
<!--                <span class="data-value">{{ record.assetCode || boardID }}</span>-->
<!--              </div>-->
              <div class="data-row">
                <span class="data-label">操作描述:</span>
                <span class="data-value">{{ record.description || '无描述' }}</span>
              </div>
              <div class="data-row">
                <span class="data-label">操作人员:</span>
                <span class="data-value">{{ record.personName || '未知' }}</span>
              </div>
              <div class="data-row">
                <span class="data-label">联系电话:</span>
                <span class="data-value">{{ record.personPhone || '无' }}</span>
              </div>
              <div class="data-row">
                <span class="data-label">创建时间:</span>
                <span class="data-value">{{ formatDate(record.createTime) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="button-group">
        <van-button
          type="default"
          size="normal"
          block
          @click="goBackQR"
          class="action-button"
        >
          返回扫码界面
        </van-button>
        <van-button
          type="default"
          size="normal"
          block
          @click="resetForm"
          class="action-button"
        >
          重置表单记录
        </van-button>
      </div>
      <!-- 分隔线 -->
      <div class="separator"></div>
      <!-- 空状态提示 -->
      <van-empty
        v-if="cardRecords.length === 0"
        description="暂无记录数据，请上传数据后再查看。"
        class="empty-state"
      />

      <!-- 记录提示 -->
      <div v-if="cardRecords.length > 0" class="info-message">
        以上为该资产的所有操作记录
      </div>
    </div>
  </div>
</template>

<script>
import systemConfigure, {
  cachedProductId,
  key_DingScannedResult
} from "../../utils/Dingding.js";
import SensorRequest from "@/utils/SensorRequest";

export default {
  data() {
    return {
      isLoading: true,
      cardRecords: [], // 记录列表数据
      boardID: this.getProductId(), // 调用方法获取产品 ID
      selectedCategory: '',
      categories: [
        { value: '入库', label: '入库' },
        { value: '领用', label: '领用' },
        { value: '焊接', label: '焊接' },
        { value: '测试', label: '测试' },
        { value: '装配', label: '装配' },
        { value: '其他', label: '其他' },
        { value: '问题描述', label: '问题描述' },
        { value: '全部', label: '全部' }
      ],
      count: 0,
      loading: false,
      finished: false
    };
  },
  created() {
    this.getAllCardRecordsWithImages();
  },
  methods: {
    getProductId() {
      // alert(cachedProductId);
      return sessionStorage.getItem(key_DingScannedResult) || cachedProductId; // 返回存储的产品 ID 或者 cachedProductId
    },
    // 格式化日期
    formatDate(dateString) {
      if (!dateString) return '未知时间';

      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    goBackQR() {
      const department = this.$route.params.department;
      this.$router.push(`/${department}/all-applications`);
    },
    resetForm(){
      this.count = 0; // 正确重置 count
      this.getAllCardRecordsWithImages();
      this.$toast({
        message: '重置记录成功',
        type: 'success',
        duration: 2000
      });
    },
    getAllCardRecordsWithImages() {
      const requestData = {
        Asset_Code: this.boardID
      };
      SensorRequest.GetAssetOperationInfoByAssetCodeFun(JSON.stringify(requestData), response => {
        console.log('Received response data :', response); // 打印日志
        // alert('Received response data :'+ response); // 打印日志
        let JSON_response = JSON.parse(response);
        if (Array.isArray(JSON_response) && JSON_response.length > 0) {
          // 确保处理所有返回的数据
          this.cardRecords = JSON_response.map(item => this.parseFullData(item)).reverse();
          this.count = this.cardRecords.length; // 更新计数
        } else {
          // alert('Error fetching card records: Data is empty')
          console.error('Error fetching card records: Data is empty');
          this.cardRecords = []; // 确保在没有数据时清空数组
          this.count = 0;
        }
        // 数据加载完成后将 isLoading 设置为 false
        this.isLoading = false;
      }, error => {
        console.error('Error fetching card records:', error);
        this.isLoading = false;
        this.cardRecords = []; // 出错时清空数组
        this.count = 0;
      });
    },
    // 解析完整数据 - 根据后端返回的数据结构
    parseFullData(data) {
      // 从Operation_User中提取人员信息
      const operationUser = data.Operation_User || {};

      return {
        assetCode: data.Asset_Code || this.boardID,
        personName: operationUser.Person_Name || '未知',
        personPhone: operationUser.Person_Phone || '无',
        personDingID: operationUser.Person_DingID || '',
        personDepartment: operationUser.Person_Department || '',
        createTime: data.Ts_create || '', // 创建时间
        editTime: data.Ts_edit || '', // 最后编辑时间
        operation: data.Operation_Type || '', // 操作类型
        description: data.Operation_Description || '', // 操作描述
        id: data.Id || null, // 记录ID
        uuid: data.Uuid || null, // UUID
        operationEvidence: data.Operation_Evidence || [], // 证据信息
        logicDel: data.Logic_del || 0, // 逻辑删除标记
        assetStatus: data.Asset_Status || 'N/A', // 资产状态
        assetRemarks: data.Asset_Remarks || 'N/A' // 资产备注
      };
    },
    onLoad() {
      // 上拉加载更多，由于数据一次性获取，所以直接标记完成
      this.finished = true;
    }
  }
};
</script>

<style scoped>
.history-view-container {
  background-color: #f7f8fa;
  min-height: 100vh;
  padding-top: 46px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.loading-message {
  text-align: center;
  color: #969799;
}

.content-container {
  padding: 1px;
}

.header-info {
  text-align: center;
  margin-bottom: 6px;
}

.board-id-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: bold;
  color: #323233;
}

.record-count {
  font-size: 14px;
  color: #64b5fd;
  margin-bottom: 16px;
}

.asset-records-list {
  width: 100%;
  padding: 0 16px;
  box-sizing: border-box;
}

/* 自定义卡片样式 */
.custom-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
  background-color: #fafafa;
}

.card-title {
  font-weight: 500;
  color: #323233;
  font-size: 15px;
}

.card-tag {
  background-color: #f44336;
  color: #fff;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
}

.card-content {
  padding: 12px 16px;
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid #f5f5f5;
}

.data-row:last-child {
  border-bottom: none;
}

.data-label {
  color: #969799;
  font-weight: 400;
  min-width: 80px;
  margin-right: 8px;
  text-align: left;
}

.data-value {
  color: #323233;
  flex: 1;
  text-align: right;
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.4;
}

.button-group {
  margin-bottom: 16px;
  padding: 0 16px;
  box-sizing: border-box;
}

.action-button {
  margin-bottom: 10px;
}

.separator {
  height: 1px;
  background-color: #ebedf0;
  margin: 16px 0;
}

.card-list-container {
  margin-bottom: 16px;
}

.empty-state {
  margin-top: 40px;
}

.info-message {
  text-align: center;
  font-size: 12px;
  color: #969799;
  margin-top: 10px;
}
</style>
