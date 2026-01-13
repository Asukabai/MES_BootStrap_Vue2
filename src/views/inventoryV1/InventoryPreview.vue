<template>
  <div class="inventory-preview-page">
    <div class="preview-header">
      <h2>导入库存物品信息预览</h2>
      <div class="stats">
        <div class="stat-item success">
          <span class="stat-label">成功:</span>
          <span class="stat-value">{{ successCount }}</span>
        </div>
        <div class="stat-item failed">
          <span class="stat-label">失败:</span>
          <span class="stat-value">{{ failCount }}</span>
        </div>
      </div>
    </div>

    <div class="table-container">
      <table class="preview-table">
        <thead>
        <tr>
          <th>序号</th>
          <th>物品名称</th>
          <th>货架位置</th>
          <th>型号</th>
          <th>当前库存</th>
          <th>品牌</th>
          <th>类别</th>
          <th>预警阈值</th>
          <th>低库存状态</th>
          <th>公司</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(item, index) in successList" :key="item.Uuid || index">
          <td>{{ index + 1 }}</td>
          <td>{{ item.Item_Name || '-' }}</td>
          <td>{{ item.Shelf_Location || '-' }}</td>
          <td>{{ item.Item_Model || '-' }}</td>
          <td>{{ item.Current_Stock || '-' }}</td>
          <td>{{ item.Item_Brand || '-' }}</td>
          <td>{{ item.Category_Type || '-' }}</td>
          <td>{{ item.Warning_Threshold || '-' }}</td>
          <td :class="item.Is_Low_Stock === '是' ? 'low-stock' : 'normal-stock'">
            {{ item.Is_Low_Stock || '-' }}
          </td>
          <td>{{ item.Company || '-' }}</td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="preview-actions">
      <van-button type="default" @click="goBack">返回</van-button>
      <van-button type="info" @click="confirmImport">确认导入</van-button>
    </div>
  </div>
</template>

<script>
import { Toast } from 'vant';
import SensorRequestPage from "@/utils/SensorRequestPage";
import { key_DingName, key_DingUserIndex} from '../../utils/Dingding.js';
export default {
  name: 'InventoryPreview',
  data() {
    return {
      successCount: 0,
      failCount: 0,
      successList: [],
      department: ''
    }
  },
  created() {
    this.parseDataFromRoute();
  },
  methods: {
    parseDataFromRoute() {
      // 从路由参数中获取部门信息
      this.department = this.$route.params.department;

      // 从query中获取后端返回的数据
      let itemData = this.$route.query.item;
      console.log('从query中获取后端返回的预览数据 itemData:', itemData);

      if (itemData) {
        try {
          // 对URL编码的数据进行解码
          itemData = decodeURIComponent(itemData);
          console.log('解码后的数据:', itemData);

          // 再次解析，因为可能需要多次解析
          let parsedData = JSON.parse(itemData);

          // 检查是否仍为字符串，如果是则继续解析
          if (typeof parsedData === 'string') {
            parsedData = JSON.parse(parsedData);
          }

          console.log('解析后的数据类型:', typeof parsedData);
          console.log('解析后的JSON数据:', parsedData);

          // 验证是否为对象
          if (typeof parsedData !== 'object' || parsedData === null) {
            throw new Error('解析的数据不是有效的对象');
          }

          // 使用正确的属性访问
          this.successCount = parsedData.SuccessCount || 0;
          this.failCount = parsedData.FailCount || 0;

          // 显示错误消息（如果有）
          if (parsedData.ErrorMessages && Array.isArray(parsedData.ErrorMessages) && parsedData.ErrorMessages.length > 0) {
            const errorMessageContent = parsedData.ErrorMessages.join('\n');

            this.$dialog({
              title: '导入失败详情',
              message: errorMessageContent,
              messageAlign: 'left', // 左对齐显示错误信息
              confirmButtonText: '确定'
            }).then(() => {
              // 点击确定后的回调（可选）
            }).catch(() => {
              // 点击取消或遮罩层后的回调（可选）
            });
          }

          // 确保 SuccessList 是数组
          if (Array.isArray(parsedData.SuccessList)) {
            this.successList = [...parsedData.SuccessList]; // 使用扩展运算符创建新数组
            console.log('成功设置 successList，长度:', this.successList.length);
          } else {
            this.successList = [];
            console.log('SuccessList 不是数组，设置为空数组');
          }
        } catch (error) {
          console.error('解析数据失败:', error);
          Toast.fail('数据解析失败: ' + error.message);
        }
      } else {
        Toast.fail('未找到预览数据');
      }
    },

    // 获取用户信息的方法（参考 WeeklyReportAdd.vue）
    loadUserInfo() {
      const name = localStorage.getItem(key_DingName); // 需要替换为实际的键名
      console.log('从localStorage中获取用户信息:', name);
      const dingID = localStorage.getItem(key_DingUserIndex);

      // 确保所有字段都有默认值，不能为空字符串
      return {
        Person_Name: name,
        Person_ID: dingID
      };
    },

    confirmImport() {
      // 确认导入操作
      if (this.successList.length === 0) {
        Toast.fail('没有可导入的数据');
        return;
      }

      // 构造请求体
      const requestPayload = {
        "Inventory_ItemList": this.successList,
        "Report_Person": this.loadUserInfo()
      };

      // 调用后端接口进行批量保存
      SensorRequestPage.InventoryItemBatchAddFun(
        JSON.stringify(requestPayload),
        (respData) => {
          try {
            const result = JSON.parse(respData);
            if (result) {
              Toast.success('导入成功！');
            } else {
              Toast.fail('导入失败');
            }
          } catch (error) {
            console.error('处理响应失败:', error);
            Toast.fail('导入失败: ' + (error.message || '数据解析失败'));
          }
        },
        (error) => {
          console.error('导入失败:', error);
          Toast.fail('导入失败: ' + (error.message || '网络请求失败'));
        }
      );
    },

    goBack() {
      this.$router.go(-1);
    }
  }
}

</script>

<style scoped>
.inventory-preview-page {
  padding: 20px;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.preview-header {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-header h2 {
  margin: 0 0 15px 0;
  text-align: center;
  color: #333;
}

.stats {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-item.success .stat-value {
  color: #07c160;
  font-weight: bold;
  font-size: 18px;
}

.stat-item.failed .stat-value {
  color: #ee0a24;
  font-weight: bold;
  font-size: 18px;
}

.stat-label {
  color: #666;
  font-size: 12px;
}

.table-container {
  background: white;
  border-radius: 8px;
  overflow: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

.preview-table th,
.preview-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.preview-table th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #333;
}

.preview-table tbody tr:hover {
  background-color: #f5f5f5;
}

.low-stock {
  color: #ee0a24;
  font-weight: bold;
}

.normal-stock {
  color: #07c160;
}

.preview-actions {
  display: flex;
  gap: 15px;
}

.preview-actions .van-button {
  flex: 1;
}
</style>
