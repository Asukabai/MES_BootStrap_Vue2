<template>
  <div class="scan-results-page">
    <!-- 页面顶部搜索区域 -->
    <div class="search-section search-top">
      <div class="search-container">
        <div class="scan-result-info">
          储物箱物品列表
        </div>
      </div>
    </div>

    <!-- 结果列表 -->
    <div class="results-section">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
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
        </van-list>
      </van-pull-refresh>
    </div>

    <!-- 空状态 -->
    <div v-if="inventoryItems.length === 0 && !loading && !refreshing" class="empty-state">
      <van-empty description="暂无相关库存信息" />
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
import { PullRefresh, List } from 'vant';

export default {
  name: 'InventoryScanResults',
  components: {
    CustomizableFloatingButton,
    [PullRefresh.name]: PullRefresh,
    [List.name]: List
  },
  data() {
    return {
      scanResult: '',
      inventoryItems: [],
      loading: false,
      finished: false,
      refreshing: false,
      currentPage: 1,
      pageSize: 10
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
      this.onLoad();
    },

    // 加载数据
    onLoad() {
      return new Promise((resolve) => {
        this.loading = true;

        // 调用后端接口获取库存信息
        const params = {
          Shelf_Location: this.scanResult,
          PageIndex: this.refreshing ? 0 : this.currentPage - 1, // 如果是刷新则从第一页开始
          PageSize: this.pageSize
        };

        SensorRequestPage.InventoryItemGetFun(
          JSON.stringify(params),
          (respData) => {
            try {
              // 解析响应数据
              let parsedData = null;
              if (typeof respData === 'string') {
                parsedData = JSON.parse(respData);
              } else {
                parsedData = respData;
              }

              // 从 Data 数组中获取库存项
              let newData = [];
              if (parsedData && parsedData.Data) {
                newData = parsedData.Data;
              }

              // 如果正在刷新，则清空原数据
              if (this.refreshing) {
                this.inventoryItems = [];
                this.refreshing = false;
              }

              // 处理返回的数据格式并预加载图片URL
              const processedData = newData.map(item => {
                const processedItem = {
                  ...item,
                  id: item.Id,
                  name: `${item.Item_Name} ${item.Item_Model || ''}`.trim(),
                  description: item.Remark || '',
                  category: item.Category_Type || '未知',
                  status: item.Is_Low_Stock === '是' ? '紧张' : '充足',
                  company: item.Company || '',
                  location: item.Shelf_Location || '',
                  stock: item.Current_Stock || 0,
                  model: item.Item_Model || '',
                  brand: item.Item_Brand || '',
                  // 添加图片信息
                  Item_Images: item.Item_Images || [],
                  // 初始化图片URL为空字符串
                  imageUrl: ''
                };

                // 预加载图片URL
                if (processedItem.Item_Images && processedItem.Item_Images.length > 0) {
                  const firstImage = processedItem.Item_Images[0];
                  if (firstImage.File_Md5) {
                    // 调用后端接口获取临时下载URL
                    const param = {
                      remoteLocation: firstImage.File_Md5
                    };

                    SensorRequest.Minio_PresignedDownloadUrl5B(
                      JSON.stringify(param),
                      (respData) => {
                        if (respData) {
                          // 将URL中的http://127.0.0.1:9000替换为https://api-v2.sensor-smart.cn:22027
                          processedItem.imageUrl = respData.replace(
                            'http://127.0.0.1:9000',
                            'https://api-v2.sensor-smart.cn:22027'
                          );
                        } else {
                          processedItem.imageUrl = require('@/assets/暂无图片1.png');
                        }
                      },
                      (error) => {
                        console.error('获取图片URL失败:', error);
                        processedItem.imageUrl = require('@/assets/暂无图片1.png');
                      }
                    );
                  } else {
                    processedItem.imageUrl = require('@/assets/暂无图片1.png');
                  }
                } else {
                  processedItem.imageUrl = require('@/assets/暂无图片1.png');
                }

                return processedItem;
              });

              // 合并新数据
              if (this.currentPage === 1 && !this.refreshing) {
                this.inventoryItems = processedData;
              } else {
                // 防止重复添加相同ID的项目
                const newItems = processedData.filter(newItem =>
                  !this.inventoryItems.some(existingItem => existingItem.Id === newItem.Id)
                );
                this.inventoryItems = [...this.inventoryItems, ...newItems];
              }

              // 判断是否已加载完所有数据
              this.finished = processedData.length < this.pageSize;

              // 更新页码
              this.currentPage++;

            } catch (parseError) {
              console.error('解析库存信息响应失败:', parseError);
              this.inventoryItems = [];
              this.$toast.fail('数据解析失败');
            } finally {
              this.loading = false;
              resolve();
            }
          },
          (error) => {
            console.error('获取库存信息失败:', error);
            this.inventoryItems = [];
            this.$toast.fail('获取库存信息失败');
            this.loading = false;
            this.finished = true;
            resolve();
          }
        );
      });
    },

    // 下拉刷新
    async onRefresh() {
      // 清空列表，重新加载数据
      this.currentPage = 1;
      this.finished = false;
      await this.onLoad();
    },

    // 获取图片URL
    getImageUrl(item) {
      return item.imageUrl || require('@/assets/暂无图片1.png');
    },

    // 查看详情
    viewDetail(item) {
      // 跳转到库存详情页面V2，传递货架位置作为参数
      // alert('查看详情')
      const department = this.$route.params.department;
      if (department) {
        this.$router.push({
          path: `/${department}/inventoryDetailV2`,
          query: {
            shelfLocation: item.Shelf_Location
          }
        });
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
    },
    // 返回上一页
    goBack() {
      this.navigateTo('/index');
    },
    navigateTo(path) {
      const department = this.$route.params.department;
      if (department) {
        this.$router.push(`/${department}${path}`);
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
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
  height: calc(100vh - 150px); /* 设置固定高度以支持滚动 */
  overflow-y: auto;
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
