<template>
  <div class="inventory-detail-page">
    <div class="container">
      <van-loading v-if="loading" size="24px" vertical>加载中...</van-loading>
      <div v-else>
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <!-- 展示详细信息的卡片 -->
        <van-card
          v-if="currentItem "
          class="detail-card"
        >
          <div slot="desc" class="detail-content">
            <van-cell-group>
              <van-cell title="物品名称">
                <span class="item-name" slot="default">{{ currentItem.Item_Name }}</span>
              </van-cell>
              <van-cell title="货架位置" :value="currentItem.Shelf_Location" />
              <van-cell title="物品型号" :value="currentItem.Item_Model" />
              <van-cell title="当前库存">
                <span :class="stockStatusClass" slot="default">{{ currentItem.Current_Stock }}</span>
              </van-cell>
              <van-cell title="物品品牌" :value="currentItem.Item_Brand" />
              <van-cell title="类别类型" :value="currentItem.Category_Type" />
<!--              <van-cell title="项目编码" :value="currentItem.Project_Code || '无'" />-->
              <van-cell title="预警阈值" :value="currentItem.Warning_Threshold" />
              <van-cell title="库存状态">
                <span :class="stockStatusClass" slot="default">{{ stockStatusText }}</span>
              </van-cell>
              <van-cell title="备注" :value="currentItem.Remark" />
              <van-cell title="公司" :value="currentItem.Company" />
            </van-cell-group>
          </div>
        </van-card>
        <van-empty v-else-if="!currentItem" description="暂无库存信息" />
        </van-pull-refresh>
        <div class="button-group-container">
          <div class="button-row">
            <van-button size="small" class="action-button" @click="goToOutbound">快速出库</van-button>
            <van-button size="small" class="action-button" @click="goToInbound">快速入库</van-button>
            <van-button size="small" class="action-button" @click="goToLog">操作日志</van-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SensorRequest from '../../utils/SensorRequest';
import {key_DingScannedInventoryQRCodeResult} from '../../utils/Dingding';

export default {
  name: 'InventoryDetail',
  data() {
    return {
      loading: true,
      refreshing: false, // 添加刷新状态
      inventoryItems: [],
      currentItem: null,
      selectedIndex: 0 // 新增选中索引
    };
  },
  created() {
    this.loadInventoryData();
  },
  computed: {
    stockStatusClass() {
      if (!this.currentItem) return 'stock-normal';

      const isLowStock = this.currentItem.Is_Low_Stock;
      if (isLowStock === '是' || isLowStock === true || isLowStock === 1) {
        return 'stock-low';
      }
      return 'stock-normal';
    },
    stockStatusText() {
      if (!this.currentItem) return '正常';

      const isLowStock = this.currentItem.Is_Low_Stock;
      if (isLowStock === '是' || isLowStock === true || isLowStock === 1) {
        return '低库存';
      }
      return '正常';
    }
  },
  methods: {
    // 添加下拉刷新处理方法
    onRefresh() {
      this.loadInventoryData();
      setTimeout(() => {
        this.refreshing = false;
      }, 1000);
    },
    loadInventoryData() {
      // 从 sessionStorage 获取扫码结果
      const scannedResult = sessionStorage.getItem(key_DingScannedInventoryQRCodeResult);

      if (!scannedResult) {
        this.$toast.fail('未找到二维码信息');
        this.loading = false;
        return;
      }
      // 调用后端接口获取库存信息
      const params = {
        Shelf_Location: scannedResult
      };

      SensorRequest.InventoryItemsGetFun(
        JSON.stringify(params),
        (respData) => {
          // alert('获取库存信息成功  :'+ respData)
          this.inventoryItems = JSON.parse(respData);
          this.loading = false;
          // 自动选择第一个物品
          if (this.inventoryItems.length > 0) {
            this.currentItem = this.inventoryItems[0];
          }
          // 添加刷新成功的提示
          this.$toast.success('数据加载成功');
        },
        (error) => {
          console.error('获取库存信息失败:', error);
          this.$toast.fail('获取库存信息失败');
          this.loading = false;
        }
      );
    },
    goToOutbound() {
      // 跳转到出库页面，传递当前选中的物品信息
      if (this.currentItem) {
        this.$router.push({
          name: 'InventoryOutbound',
          params: {
            department: this.$route.params.department
          },
          query: {
            item: JSON.stringify(this.currentItem)
          }
        });
      } else {
        this.$toast.fail('未查询到出库物品');
      }
    },

    goToInbound() {
      // 跳转到入库页面，传递当前选中的物品信息
      if (this.currentItem) {
        this.$router.push({
          name: 'InventoryInbound',
          params: {
            department: this.$route.params.department
          },
          query: {
            item: JSON.stringify(this.currentItem)
          }
        });
      } else {
        this.$toast.fail('未查询到入库物品');
      }
    },
    goToLog() {
      // 跳转到日志页面，传递当前选中的物品信息
      if (this.currentItem) {
        this.$router.push({
          name: 'InventoryLog',
          params: {
            department: this.$route.params.department
          },
          query: {
            item: JSON.stringify(this.currentItem)
          }
        });
      } else {
        this.$toast.fail('未查询到库存物品');
      }
    },
  }
};
</script>

<style scoped>
.item-name {
  color: #ffc107;
  font-weight: bold;
}
.stock-low {
  color: #ee0a24;
  font-weight: bold;
}

.stock-normal {
  color: #07c160;
  font-weight: bold;
}
.detail-card {
  margin-top: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.detail-content {
  width: 100%;
}
.button-group-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding: 0 10px;
}

.button-row {
  display: flex;
  justify-content: center;
  gap: 15px;
  width: 100%;
}

.action-button {
  flex: 1;
  max-width: 100px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  font-size: 14px;
  height: 40px;
}

.action-button::after {
  border: none;
}

/* 按钮悬停效果 */
.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}
.inventory-detail-page {
  background-color: #f5f5f5;
  min-height: 100vh;
}

.container {
  padding: 10px;
}
</style>
