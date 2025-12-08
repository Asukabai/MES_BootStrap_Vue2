<template>
  <div class="inventory-detail-page">

    <div class="container">
      <van-loading v-if="loading" size="24px" vertical>加载中...</van-loading>

      <div v-else>
        <van-cell-group v-if="inventoryItems.length > 0">
          <van-cell title="物品名称" value="物品数量"  />
          <van-cell
            v-for="(item, index) in inventoryItems"
            :key="item.Id"
            :title="item.Item_Name"
            :label="`位置: ${item.Shelf_Location}`"
            is-link
            @click="showItemDetail(item)"
          >
            <template #right-icon>
              <span :class="['stock-status', { 'low-stock': item.Is_Low_Stock === '是' }]">
                {{ item.Current_Stock }}
              </span>
            </template>
          </van-cell>
        </van-cell-group>
        <van-empty v-else description="暂无库存信息" />
        <div class="button-group-container">
          <div class="button-row">
            <van-button size="small" class="action-button" @click="onClickLeft">返回首页</van-button>
            <van-button size="small" class="action-button" @click="loadInventoryData">数据刷新</van-button>
            <van-button size="small" class="action-button">操作日志</van-button>
          </div>
          <div class="button-row">
            <van-button size="small" class="action-button" @click="goToOutbound">快速出库</van-button>
            <van-button size="small" class="action-button" @click="goToInbound">快速入库</van-button>
            <van-button size="small" class="action-button">更新信息</van-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 商品详情弹窗 -->
    <van-popup v-model="showDetail" position="bottom" :style="{ height: '80%' }">
      <van-cell-group v-if="currentItem">
        <van-cell title="物品名称" :value="currentItem.Item_Name" />
        <van-cell title="货架位置" :value="currentItem.Shelf_Location" />
        <van-cell title="物品型号" :value="currentItem.Item_Model" />
        <van-cell title="当前库存" :value="currentItem.Current_Stock" />
        <van-cell title="物品品牌" :value="currentItem.Item_Brand" />
        <van-cell title="类别类型" :value="currentItem.Category_Type" />
        <van-cell title="项目编码" :value="currentItem.Project_Code || '无'" />
        <van-cell title="预警阈值" :value="currentItem.Warning_Threshold" />
        <van-cell title="库存状态">
          <template #value>
            <van-tag :type="currentItem.Is_Low_Stock === '是' ? 'danger' : 'success'">
              {{ currentItem.Is_Low_Stock === '是' ? '低库存' : '正常' }}
            </van-tag>
          </template>
        </van-cell>
        <van-cell title="备注" :value="currentItem.Remark" />
        <van-cell title="公司" :value="currentItem.Company" />
      </van-cell-group>
    </van-popup>
  </div>
</template>

<script>
import {Cell, CellGroup, Empty, Loading, NavBar, Popup, Tag} from 'vant';
import SensorRequest from '@/utils/SensorRequest';
import {key_DingScannedInventoryQRCodeResult} from '@/utils/Dingding';

export default {
  name: 'InventoryDetail',
  components: {
    [NavBar.name]: NavBar,
    [Cell.name]: Cell,
    [CellGroup.name]: CellGroup,
    [Loading.name]: Loading,
    [Empty.name]: Empty,
    [Popup.name]: Popup,
    [Tag.name]: Tag
  },
  data() {
    return {
      loading: true,
      inventoryItems: [],
      showDetail: false,
      currentItem: null
    };
  },
  created() {
    this.loadInventoryData();
  },
  methods: {
    onClickLeft() {
      this.$router.go(-1);
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
          alert('获取库存信息成功  :'+ respData)
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

    showItemDetail(item) {
      this.currentItem = item;
      this.showDetail = true;
    }
  }
};
</script>

<style scoped>
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
  font-size: 12px;
  height: 32px;
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

.stock-status {
  font-weight: bold;
  color: #00c853;
}

.low-stock {
  color: #ff5252;
}

.van-popup {
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
}
</style>
