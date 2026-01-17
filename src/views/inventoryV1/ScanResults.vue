<template>
  <div class="scan-results-page">
    <!-- 页面顶部搜索区域 -->
    <div class="search-section search-top">
      <div class="search-container">
        <div class="scan-result-info">
<!--          储物箱位置编号: {{ scanResult }}-->
          储物箱物品列表
        </div>
      </div>
    </div>

    <!-- 结果列表 -->
    <div class="results-section">
      <div class="inventory-list">
        <div
          v-for="item in inventoryItems"
          :key="item.Id"
          class="inventory-cell"
        >
          <div class="cell-content" @click="viewDetail(item)">
            <!-- 左侧图片区域（30%） -->
            <div class="image-section">
              <img
                :src="getImageUrl(item)"
                alt="物品图片"
                class="item-image"
                @error="onImageError"
              />
            </div>

            <!-- 右侧信息区域（70%） -->
            <div class="info-section">
              <div class="cell-header">
                <div class="item-title">物品名称：{{ item.Item_Name }}</div>
                <div class="item-subtitle">
                  型号：<span class="model-value">{{ item.Item_Model }}</span> |
                  库存：<span class="stock-value">{{ item.Current_Stock }}</span>
                </div>
              </div>
              <div class="cell-body">
                <div class="item-info">
                  <div class="info-row">
                    <span class="label">公司:</span>
                    <span class="value">{{ item.Company }}</span>
                    <span class="label">位置:</span>
                    <span class="value">{{ item.Shelf_Location }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="inventoryItems.length === 0 && !loading" class="empty-state">
      <van-empty description="暂无相关库存信息" />
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <van-loading size="24px">加载中...</van-loading>
    </div>

    <CustomizableFloatingButton
      :initial-position="{ bottom: 70, right: 20 }"
      :icon-src="require('@/assets/返回.png')"
      :background-size="53"
      :icon-size="53"
      :on-click="goBack"
    />
  </div>
</template>

<script>
import SensorRequest from '../../utils/SensorRequest.js';
import CustomizableFloatingButton from "../../components/CustomizableFloatingButton.vue";
import {key_DingScannedInventoryQRCodeResult} from "../../utils/Dingding";
import SensorRequestPage from "../../utils/SensorRequestPage";

export default {
  name: 'InventoryScanResults',
  components: {
    CustomizableFloatingButton
  },
  data() {
    return {
      scanResult: '',
      inventoryItems: [],
      loading: false
    };
  },
  created() {
    this.initData();
  },
  methods: {
    initData() {
      // 从 sessionStorage 获取扫码结果
      const scannedResult = sessionStorage.getItem(key_DingScannedInventoryQRCodeResult);

      if (!scannedResult) {
        this.$toast.fail('未找到二维码信息');
        return;
      }

      // 设置扫描结果
      this.scanResult = scannedResult;

      // 调用接口获取库存数据
      this.fetchInventoryData(scannedResult);
    },

    // 获取库存数据
    fetchInventoryData(scanResult) {
      this.loading = true;

      // 调用后端接口获取库存信息
      const params = {
        Shelf_Location: scanResult
      };

      SensorRequestPage.InventoryItemGetFun(
        JSON.stringify(params),
        (respData) => {
          try {
            // 解析响应数据
            const responseJson = JSON.parse(respData);

            // 从 Data 数组中获取库存项
            if (responseJson.Data && Array.isArray(responseJson.Data)) {
              this.inventoryItems = responseJson.Data;

              // 预加载所有物品的图片URL
              this.preloadAllImageUrls();
            } else {
              this.inventoryItems = [];
              this.$toast.fail('数据格式错误');
            }
          } catch (parseError) {
            console.error('解析库存信息响应失败:', parseError);
            this.inventoryItems = [];
            this.$toast.fail('数据解析失败');
          } finally {
            this.loading = false;
          }
        },
        (error) => {
          console.error('获取库存信息失败:', error);
          this.inventoryItems = [];
          this.$toast.fail('获取库存信息失败');
          this.loading = false;
        }
      );
    },

    // 预加载所有物品的图片URL
    preloadAllImageUrls() {
      this.inventoryItems.forEach((item, index) => {
        if (item.Item_Images && item.Item_Images.length > 0) {
          const firstImage = item.Item_Images[0];
          if (firstImage.File_Md5) {
            const param = {
              remoteLocation: firstImage.File_Md5
            };

            SensorRequest.Minio_PresignedDownloadUrl5B(
              JSON.stringify(param),
              (respData) => {
                if (respData) {
                  // 将URL中的http://127.0.0.1:9000替换为https://api-v2.sensor-smart.cn:22027
                  this.$set(item, 'imageUrl', respData.replace(
                    'http://127.0.0.1:9000',
                    'https://api-v2.sensor-smart.cn:22027'
                  ));
                } else {
                  this.$set(item, 'imageUrl', require('@/assets/暂无图片1.png'));
                }
              },
              (error) => {
                console.error('获取图片URL失败:', error);
                this.$set(item, 'imageUrl', require('@/assets/暂无图片1.png'));
              }
            );
          } else {
            this.$set(item, 'imageUrl', require('@/assets/暂无图片1.png'));
          }
        } else {
          this.$set(item, 'imageUrl', require('@/assets/暂无图片1.png'));
        }
      });
    },

    // 获取图片URL
    getImageUrl(item) {
      return item.imageUrl || require('@/assets/暂无图片1.png');
    },

    // 查看详情
    viewDetail(item) {
      // 将当前物品信息保存到sessionStorage中
      sessionStorage.setItem(key_DingScannedInventoryQRCodeResult, item.Shelf_Location);
      // 跳转到库存详情页面
      const department = this.$route.params.department;
      if (department) {
        this.$router.push(`/${department}/inventoryDetailV1`);
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
    },

    // 返回上一页
    goBack() {
      this.$router.go(-1);
    },

    // 图片加载失败时的处理
    onImageError(event) {
      event.target.src = require('@/assets/暂无图片1.png');
    }
  }
};
</script>

<style scoped>
.scan-results-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.search-section {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: #3f83f8;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
}

.search-container {
  display: flex;
  gap: 12px;
  align-items: center;
}

.scan-result-info {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #fff;
  border-radius: 25px;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  color: #333;
  font-weight: 500;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.results-section {
  padding: 10px;
}

.inventory-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inventory-cell {
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.cell-content {
  display: flex;
  padding: 8px;
  position: relative;
  cursor: pointer;
}

.cell-content:hover {
  background-color: #f8f8f8;
}

.image-section {
  width: 30%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 8px;
}

.item-image {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #eee;
}

.info-section {
  width: 70%;
  position: relative;
}

.cell-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 4px;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  flex: 1;
  margin-right: 4px;
  line-height: 1.3;
}

.item-subtitle {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  font-weight: 500;
}

.item-subtitle .model-value {
  font-weight: 500;
}

.item-subtitle .stock-value {
  font-weight: 600;
  color: orange;
}

.cell-body {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.item-info {
  flex: 1;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  font-size: 12px;
  align-items: baseline;
  gap: 8px;
}

.label {
  color: #999;
  margin-right: 2px;
  flex-shrink: 0;
  font-size: 11px;
}

.value {
  color: #666;
  flex: 1;
  word-break: break-all;
  font-size: 12px;
}

.empty-state {
  padding: 50px 16px;
}

.loading-state {
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
