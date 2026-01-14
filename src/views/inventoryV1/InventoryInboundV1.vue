<template>
  <div class="inventory-outbound-mobile">
    <!-- 主要内容区域 -->
    <div class="page-content">
      <!-- 物品信息卡片 -->
      <div class="card item-card">
        <div class="card-header">
          <h2 class="item-name">{{ itemData.Item_Name }}</h2>
          <p class="item-model">{{ itemData.Item_Model }}</p>
        </div>
        <div class="card-body">
          <!-- 物品详情 -->
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">公司</span>
              <span class="info-value">{{ itemData.Company || '未指定' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">位置</span>
              <span class="info-value">{{ itemData.Shelf_Location || '未指定' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">当前库存</span>
              <span class="info-value">{{ itemData.Current_Stock }}</span>
            </div>
          </div>
          <!-- 入库数量 -->
          <div class="form-group">
            <label class="form-label">入库数量</label>
            <div class="input-group">
              <input
                v-model.number="outboundQuantity"
                type="number"
                class="form-input number-input"
                placeholder="0"
                min="0"
                @input="validateQuantity"
              >
            </div>
            <div class="input-hint">
              入库后库存: <span class="highlight">{{ itemData.Current_Stock + outboundQuantity }}</span>
            </div>
          </div>
          <!-- 入库类型 -->
          <div class="form-group">
            <label class="form-label">入库类型</label>
            <div class="type-selector">
              <button
                v-for="type in outboundTypeColumns"
                :key="type.value"
                class="type-option"
                :class="{ 'active': outboundType === type.value }"
                @click="outboundType = type.value"
              >
                {{ type.text }}
              </button>
            </div>
          </div>
          <!-- 备注 -->
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea
              v-model="remark"
              class="form-textarea"
              rows="3"
              placeholder="请输入备注信息"
              maxlength="200"
            ></textarea>
            <div class="textarea-counter">{{ remark.length }}/200</div>
          </div>
        </div>
      </div>
      <!-- 底部操作栏 -->
      <div class="action-bar">
        <div class="button-container">
          <button
            class="btn-confirm cancel-btn"
            @click="onClickLeft"
          >
            取消返回
          </button>
          <button
            class="btn-confirm submit-btn"
            @click="onConfirm"
          >
            确认入库
          </button>
        </div>
      </div>
    </div>
    <!-- 成功提示 -->
    <div v-if="showSuccess" class="success-overlay">
      <div class="success-content">
        <div class="success-icon">✓</div>
        <h3 class="success-title">入库成功</h3>
        <p class="success-message">物品已成功入库</p>
        <button class="btn-close-success" @click="closeSuccess">确定</button>
      </div>
    </div>
  </div>
</template>

<script>import SensorRequest from '../../utils/SensorRequest.js';
import {key_DingName, key_DingUserIndex, key_DingUserPhone} from "../../utils/Dingding";
import SensorRequestPage from "../../utils/SensorRequestPage";
function getLocalUserInfo() {
  const name = localStorage.getItem(key_DingName);
  const phone = localStorage.getItem(key_DingUserPhone);
  const dingID = localStorage.getItem(key_DingUserIndex); // 使用 key_DingUserIndex 作为 DingID

  return {
    name: name || '',
    phone: phone || '',
    dingID: dingID || ''
  };
}
export default {
  name: 'InventoryInbound',
  data() {
    return {
      itemData: {
        Item_Name: '',
        Item_Model: '',
        Company: '',
        Shelf_Location: '',
        Current_Stock: 0,
        Id: null
      },
      outboundQuantity: 0,
      outboundType: 4,
      remark: '',
      showSuccess: false,
      outboundTypeColumns: [
        { text: '采购入库', value: 4 },
        { text: '生产入库', value: 5 },
        { text: '其他入库', value: 6 }
      ],
    };
  },
  computed: {
    canSubmit() {
      return this.outboundQuantity > 0; // 只要求大于0，不限制上限
    }
  },
  created() {
    // 获取传递的物品信息
    if (this.$route.query.item) {
      this.itemData = JSON.parse(this.$route.query.item);
    }
  },
  methods: {
    onClickLeft() {
      this.$router.go(-1);
    },
    validateQuantity() {
      if (this.outboundQuantity < 0) {
        this.outboundQuantity = 0;
      }
    },
    async onConfirm() {
      if (!this.canSubmit) {
        this.$toast.fail('入库数量必须大于0');
        return;
      }
      try {
        // 根据入库类型设置Transaction_Type
        let transactionType = '';
        const type = this.outboundTypeColumns.find(t => t.value === this.outboundType);
        transactionType = type ? type.text : '';
        // 构造请求参数
        const requestData = {
          PageIndex: 0,
          PageSize: 10,
          Inventory_ID: this.itemData.Id.toString(), // 确保是字符串类型
          Transaction_Type: transactionType,
          Quantity_Change: this.outboundQuantity,
          Current_Quantity: this.itemData.Current_Stock + this.outboundQuantity,
          Report_Person: {
            Person_Name: getLocalUserInfo().name || '缓存过期',
            Person_ID: getLocalUserInfo().dingID || '缓存过期'
          },
          Remark: this.remark || this.itemData.Remark || ''
        };
        // 调用入库接口
        SensorRequestPage.InventoryTransactionAddFun(
          JSON.stringify(requestData),
          (respData) => {
            console.log('入库成功:', respData);
            // 显示成功提示
            this.showSuccess = true;
            // 2秒后自动返回
            setTimeout(() => {
              if (this.showSuccess) {
                this.$router.go(-1);
              }
            }, 2000);
          },
          (error) => {
            console.error('入库失败:', error);
            this.$toast.fail('入库操作失败: ' + (error.message || '未知错误'));
          }
        );
      } catch (error) {
        console.error('入库操作异常:', error);
        this.$toast.fail('入库操作异常');
      }
    },
    closeSuccess() {
      this.showSuccess = false;
      this.$router.go(-1);
    }
  }
};
</script>

<style scoped>
.inventory-outbound-mobile {
  background: white;
}

/* 主要内容区域 */
.page-content {
  padding: 20px 16px 100px;
}

/* 卡片样式 */
.item-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 10px;
  transform: translateY(0);
  transition: transform 0.3s;
}

.item-card:hover {
  transform: translateY(-2px);
}

.card-header {
  padding: 20px;
  background: #3f83f8;
  color: white;
}

.item-name {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: white;
}

.item-model {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
}

.card-body {
  padding: 20px;
}

/* 信息列表 */
.info-list {
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: #666;
}

.info-value {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

/* 表单样式 */
.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

/* 数字输入框 */
.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.number-input {
  flex: 1;
  height: 44px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 0 16px;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  color: #333;
  background: white;
  transition: border-color 0.2s;
}

.number-input:focus {
  outline: none;
  border-color: #3f83f8;
}

.input-hint {
  font-size: 14px;
  color: #666;
  text-align: center;
}

.highlight {
  color: #3f83f8;
  font-weight: 600;
}

/* 类型选择器 */
.type-selector {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.type-option {
  flex: 1;
  min-width: 100px;
  height: 44px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.type-option.active {
  background: #3f83f8;
  border-color: #3f83f8;
  color: white;
  transform: scale(0.98);
}

.type-option:active {
  transform: scale(0.95);
}

/* 通用输入框 */
.form-input {
  width: 100%;
  height: 44px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 0 16px;
  font-size: 16px;
  color: #333;
  background: white;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3f83f8;
}

/* 文本域 */
.form-textarea {
  width: 100%;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 16px;
  color: #333;
  background: white;
  resize: none;
  transition: border-color 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: #3f83f8;
}

.textarea-counter {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 底部操作栏 */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  background: white;
  box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.1);
  z-index: 100;
}
.button-container {
  display: flex;
  gap: 16px; /* 设置按钮之间的间距 */
}

.btn-confirm {
  flex: 1; /* 使两个按钮平分宽度 */
  height: 56px;
  border: none;
  border-radius: 16px;
  background: #3f83f8;
  color: white;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn {
  background: #f0f0f0;
  color: #333;
}

.btn-confirm:active {
  transform: scale(0.98);
  box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 成功提示 */
.success-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s;
}

.success-content {
  background: white;
  border-radius: 24px;
  padding: 40px 32px;
  text-align: center;
  max-width: 300px;
  width: 80%;
  animation: slideUp 0.4s;
}

.success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #4cd964;
  color: white;
  font-size: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.success-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.success-message {
  font-size: 16px;
  color: #666;
  margin: 0 0 24px 0;
}

.btn-close-success {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: #3f83f8;
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close-success:active {
  transform: scale(0.95);
  background: #3f83f8;
}

/* 动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 移动端优化 */
@media (max-width: 480px) {
  .form-select {
    height: 40px;
  }

  .page-content {
    padding: 10px 12px 100px;
  }

  .item-card {
    border-radius: 16px;
  }

  .card-header,
  .card-body {
    padding: 16px;
  }

  .btn-stepper,
  .number-input,
  .form-input {
    height: 40px;
  }

  .action-bar {
    padding: 20px;
  }

  .btn-confirm {
    height: 52px;
    border-radius: 14px;
  }
}

/* 防止移动端输入框缩放 */
input, textarea {
  font-size: 16px !important;
  max-height: 44px;
}

/* 滚动条优化 */
.type-selector::-webkit-scrollbar {
  height: 4px;
}

.type-selector::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.type-selector::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 2px;
}

.type-selector::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>
