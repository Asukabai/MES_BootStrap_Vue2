<template>
  <div class="inventory-detail-page">
    <van-nav-bar
      title="库存详情"
      left-text="返回"
      left-arrow
      @click-left="onClickLeft"
    />

    <div class="container">
      <van-loading v-if="loading" size="24px" vertical>加载中...</van-loading>

      <div v-else>
        <van-cell-group v-if="inventoryItems.length > 0">
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
        this.$toast.fail('未找到扫码信息');
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
        },
        (error) => {
          console.error('获取库存信息失败:', error);
          this.$toast.fail('获取库存信息失败');
          this.loading = false;
        }
      );
    },

    showItemDetail(item) {
      this.currentItem = item;
      this.showDetail = true;
    }
  }
};
</script>

<style scoped>
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
