<template>
  <div class="inventory-detail-page">
    <div class="container">
      <van-loading v-if="loading" size="24px" vertical>加载中...</van-loading>
      <div v-else>
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <!-- 展示所有信息的卡片 -->
          <van-card
            v-if="currentItem "
            class="detail-card"
          >
            <div slot="desc" class="detail-content">
              <van-cell-group>
                <!-- 基本信息 -->
                <van-cell title="物品名称">
                  <span class="item-name" slot="default">{{ currentItem.Item_Name }}</span>
                </van-cell>
                <van-cell title="货架位置" :value="currentItem.Shelf_Location" />
                <van-cell title="物品型号" :value="currentItem.Item_Model" />
                <!-- 标签展示区域 -->
                <van-cell title="物品标签">
                  <template #default>
                    <div class="tags-display-container">
                      <template v-if="currentItem.Item_Tags && currentItem.Item_Tags.length > 0">
                        <div
                          v-for="(tag, index) in currentItem.Item_Tags"
                          :key="index"
                          class="display-tag-item"
                        >
                          <span class="tag-text">{{ tag }}</span>
                        </div>
                      </template>
                      <span v-else class="no-tags">暂无标签</span>
                    </div>
                  </template>
                </van-cell>
                <van-cell title="物品颜色" :value="currentItem.Item_Color || '未填写'" />
                <van-cell title="物品尺寸" :value="currentItem.Item_Size || '未填写'" />
                <van-cell title="物品单位" :value="currentItem.Item_Unit || '未填写'" />
                <van-cell title="物品材质">
                  <template #default>
                    <div class="material-content">{{ currentItem.Item_Material || '未填写' }}</div>
                  </template>
                </van-cell>
                <van-cell title="当前库存">
                  <span :class="stockStatusClass" slot="default">{{ currentItem.Current_Stock }}</span>
                </van-cell>
                <van-cell title="物品品牌" :value="currentItem.Item_Brand" />
                <van-cell title="类别类型" :value="currentItem.Category_Type" />
                <van-cell title="预警阈值" :value="currentItem.Warning_Threshold" />
                <van-cell title="库存状态">
                  <span :class="stockStatusClass" slot="default">{{ stockStatusText }}</span>
                </van-cell>
                <van-cell title="备注" :value="currentItem.Remark" />
                <van-cell title="公司" :value="currentItem.Company" />

                <!-- 更多信息 -->
                <van-cell title="更多信息" v-if="currentItem.Item_Mores && currentItem.Item_Mores !== ''">
                  <template #default>
                    <div class="more-info-content">
                      <div v-for="(value, key, index) in parsedMoreInfo" :key="index" class="more-info-item">
                        <span class="more-info-key">{{ key }}:</span>
                        <span class="more-info-value">{{ value }}</span>
                      </div>
                    </div>
                  </template>
                </van-cell>

                <!-- 图片展示区域 -->
                <van-cell title="物品图片" v-if="currentItem.Item_Images && currentItem.Item_Images.length > 0" />
                <div class="image-container" v-if="currentItem.Item_Images && currentItem.Item_Images.length > 0">
                  <div
                    v-for="(img, index) in currentItem.Item_Images"
                    :key="index"
                    class="image-item-container"
                  >
                    <div class="image-info">
                      <span class="file-name">{{ img.File_Name }}</span>
                      <span class="upload-time">{{ formatTime(img.Upload_Time) }}</span>
                    </div>
                    <!-- 直接显示图片 -->
                    <img
                      :src="currentItem.processedImageUrls && currentItem.processedImageUrls[index] ? currentItem.processedImageUrls[index] : require('@/assets/暂无图片1.png')"
                      :alt="img.File_Name"
                      class="direct-image-preview"
                      @click="openImagePreview(currentItem.processedImageUrls[index], img.File_Name)"
                      @error="onImageError"
                    />
                  </div>
                </div>
                <van-cell v-else title="扩展图片" value="暂无图片" />
              </van-cell-group>
            </div>
          </van-card>
          <van-empty v-else-if="!currentItem" description="暂无库存信息录入，请点击 + 按钮进行信息新增，或请确认扫描二维码是否正确" />
        </van-pull-refresh>

        <CustomizableFloatingButton
          v-if="currentItem"
          :initial-position="{ bottom: 60, right: 130 }"
          :icon-src="require('@/assets/返回.png')"
          :background-size="49"
          :icon-size="49"
          :on-click="goBack"
        />

        <!-- 只有当有内容时才显示主功能按钮 -->
        <ExpandableFloatingButton
          v-if="currentItem"
          :initial-position="{ bottom: 60, right: 205 }"
          :main-icon="mainIcon"
          :sub-buttons="actionButtons"
        />

        <!-- 当没有内容时，只显示新增按钮 -->
        <template v-if="!currentItem">
          <FloatingActionButton
            @click="onFloatingButtonClick"
            :initial-position="{ bottom: 150, right: 20 }"
          />
        </template>
      </div>
    </div>

    <!-- 图片预览弹窗 -->
    <van-popup v-model="showImagePreview" position="center" :style="{ width: '95%', height: '95%', padding: '10px', backgroundColor: 'rgba(0,0,0,0.9)' }" @close="closeImagePreview">
      <div class="image-preview-container">
        <div class="image-preview-header">
          <span class="image-filename">{{ currentImageFileName }}</span>
          <van-icon name="close" class="close-icon" @click="closeImagePreview" />
        </div>
        <div class="image-preview-content">
          <img :src="currentImageUrl" :alt="currentImageFileName" class="preview-image-full" @load="onImageLoad" @error="onImageErrorPreview" />
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
// 在 script 部分导入图片
import SensorRequest from '../../utils/SensorRequest';
import {key_DingScannedInventoryQRCodeResult, key_DingName, key_DingUserIndex, key_DingUserPhone} from '../../utils/Dingding';
import FloatingActionButton from "../../components/FloatingActionButton.vue";
import ExpandableFloatingButton from "../../components/ExpandableFloatingButton.vue"; // 新增导入
import SensorRequestPage from "../../utils/SensorRequestPage";
import CustomizableFloatingButton from "../../components/CustomizableFloatingButton.vue";
// 创建一个图标管理器
const icons = {
  main: require('@/assets/企业头像.png'),
  fix: require('@/assets/修改.png'),
  log: require('@/assets/日志管理.png'),
  out: require('@/assets/出库.png'),
  in: require('@/assets/入库.png'),
};
export default {
  name: 'InventoryDetail',
  components: {
    CustomizableFloatingButton,
    FloatingActionButton,
    ExpandableFloatingButton // 新增组件注册
  },
  data() {
    return {
      mainIcon: require('@/assets/省略号.png'),  // 使用 require 函数
      loading: true,
      refreshing: false, // 添加刷新状态
      inventoryItems: [],
      currentItem: null,
      selectedIndex: 0, // 新增选中索引

      // 图片预览相关数据
      showImagePreview: false,
      currentImageUrl: '',
      currentImageFileName: '',
    };
  },
  // 添加 activated 钩子
  // this.$router.push(): 创建新组件实例 → 触发 created、mounted
  // this.$router.go(-1): 返回历史记录 → 如果组件被缓存，则触发 activated
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
    },
    // 解析更多字段信息
    parsedMoreInfo() {
      if (!this.currentItem || !this.currentItem.Item_Mores) {
        return {};
      }

      try {
        // 尝试解析JSON字符串
        return JSON.parse(this.currentItem.Item_Mores);
      } catch (e) {
        console.error('解析更多字段信息失败:', e);
        // 如果解析失败，返回空对象
        return {};
      }
    },
    // 操作按钮配置
// 操作按钮配置
    actionButtons() {
      return [
        {
          icon: icons.out,  // 本地图片路径
          handler: this.goToOutbound,
          label: '快速出库',
          position: { x: 15, y: 160 }  // 自定义位置
        },
        {
          icon: icons.in, // 本地图片路径
          handler: this.goToInbound,
          label: '快速入库',
          position: { x: 15, y: 175 } // 自定义位置
        },
        {
          icon: icons.fix,    // 本地图片路径
          handler: this.goToExtendInfoEdit,
          label: '修改信息',
          position: { x: -60, y: 24 }  // 自定义位置
        },
        {
          icon: icons.log,    // 本地图片路径
          handler: this.goToLog,
          label: '操作日志',
          position: { x: 85, y: -75 } // 自定义位置
        }
      ];
    }
  },
  methods: {
    goBack() {
      // this.$router.go(-1);
      this.navigateTo('/inventoryV1');
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
    onFloatingButtonClick() {
      // 防止重复点击
      if (this.isNavigating) return;
      this.isNavigating = true;
      // alert('点击了悬浮按钮')
      this.navigateTo('/inventory/addV1');
      // 延迟重置导航状态
      setTimeout(() => {
        this.isNavigating = false;
      }, 10);
    },
    goToExtendInfoView() {
      // 跳转到查看扩展信息页面
      if (this.currentItem) {
        this.$router.push({
          name: 'InventoryExtendInfoView',
          params: {
            department: this.$route.params.department
          },
          query: {
            item: JSON.stringify(this.currentItem)
          }
        });
      } else {
        this.$toast.fail('未查询到物品信息');
      }
    },

    goToExtendInfoEdit() {
      // 跳转到编辑扩展信息页面
      if (this.currentItem) {
        this.$router.push({
          name: 'InventoryInfoEdit',
          params: {
            department: this.$route.params.department
          },
          query: {
            item: JSON.stringify(this.currentItem)
          }
        });
      } else {
        this.$toast.fail('未查询到物品信息');
      }
    },

    goToExtendInfoAdd() {
      // 跳转到新增扩展信息页面
      if (this.currentItem) {
        this.$router.push({
          name: 'InventoryExtendInfoAdd',
          params: {
            department: this.$route.params.department
          },
          query: {
            item: JSON.stringify(this.currentItem)
          }
        });
      } else {
        this.$toast.fail('未查询到物品信息');
      }
    },

    // 打开图片预览
    openImagePreview(imageUrl, fileName) {
      if (imageUrl && fileName) {
        this.currentImageUrl = imageUrl;
        this.currentImageFileName = fileName;
        this.showImagePreview = true;
      }
    },

    // 关闭图片预览
    closeImagePreview() {
      this.showImagePreview = false;
      this.currentImageUrl = '';
      this.currentImageFileName = '';
    },

    // 图片加载完成
    onImageLoad() {
      console.log('预览图片加载完成');
    },

    // 预览图片加载失败
    onImageErrorPreview(event) {
      console.error('预览图片加载失败:', event);
      event.target.src = require('@/assets/暂无图片1.png');
    },

    // 记录查看操作
    addViewRecord() {
      if (!this.currentItem) {
        console.warn('当前没有物品信息，无法记录查看操作');
        return;
      }
      // 构造查看操作的事务请求参数
      const requestData = {
        PageIndex: 0,
        PageSize: 10,
        Inventory_ID: this.currentItem.Id, // 使用当前物品的ID作为库存ID
        Transaction_Type: "查看", // 操作类型为"查看"
        Quantity_Change: 0,
        Current_Quantity: 0,
        Report_Person: {
          Person_Name: this.getLocalUserInfo().name,
          Person_Phone: this.getLocalUserInfo().phone,
          Person_DingID: this.getLocalUserInfo().dingID
        },
        Remark: `${this.getLocalUserInfo().name} 查看了物品: ${this.currentItem.Item_Name}`
      };

      // 调用事务记录接口
      SensorRequestPage.InventoryTransactionAddFun(
        JSON.stringify(requestData),
        (respData) => {
          console.log('查看操作记录添加成功:', respData);
        },
        (error) => {
          console.error('查看操作记录添加失败:', error);
          this.$toast.fail('查看操作记录添加失败: ' + (error.message || '未知错误'));
        }
      );
    },

    // 获取本地用户信息
    getLocalUserInfo() {
      const name = localStorage.getItem(key_DingName);
      const phone = localStorage.getItem(key_DingUserPhone);
      const dingID = localStorage.getItem(key_DingUserIndex);

      return {
        name: name || '',
        phone: phone || '',
        dingID: dingID || ''
      };
    },

    // 在数据加载时预处理图片URL
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
      console.log('获取库存信息参数：', params);
      SensorRequestPage.InventoryItemGetFun(
        JSON.stringify(params),
        (respData) => {
          try {
            // 解析响应数据
            const responseJson = JSON.parse(respData);

            // 从 Data 数组中获取库存项 （根据后端返回值结构解析）
            if (responseJson.Data && Array.isArray(responseJson.Data) && responseJson.Data.length > 0) {
              this.inventoryItems = responseJson.Data;

              // 处理第一个物品，预加载图片URL
              const item = this.inventoryItems[0];

              // 如果有图片，预加载图片URL
              if (item.Item_Images && item.Item_Images.length > 0) {
                item.processedImageUrls = [];
                let loadedCount = 0;

                item.Item_Images.forEach((img, index) => {
                  if (img.File_Md5) {
                    const param = {
                      remoteLocation: img.File_Md5
                    };

                    SensorRequest.Minio_PresignedDownloadUrl5B(
                      JSON.stringify(param),
                      (respData) => {
                        if (respData) {
                          // 将URL中的http://127.0.0.1:9000替换为https://api-v2.sensor-smart.cn:22027
                          const modifiedUrl = respData.replace(
                            'http://127.0.0.1:9000',
                            'https://api-v2.sensor-smart.cn:22027'
                          );
                          // 设置预处理的图片URL
                          if (!item.processedImageUrls) {
                            item.processedImageUrls = [];
                          }
                          item.processedImageUrls[index] = modifiedUrl;

                          loadedCount++;
                          // 如果所有图片都已加载完成，更新currentItem并记录查看操作
                          if (loadedCount === item.Item_Images.length) {
                            this.currentItem = item;
                            // 记录查看操作
                            this.addViewRecord();
                          }
                        } else {
                          // 使用默认图片
                          if (!item.processedImageUrls) {
                            item.processedImageUrls = [];
                          }
                          item.processedImageUrls[index] = require('@/assets/暂无图片1.png');

                          loadedCount++;
                          // 如果所有图片都已加载完成，更新currentItem并记录查看操作
                          if (loadedCount === item.Item_Images.length) {
                            this.currentItem = item;
                            // 记录查看操作
                            this.addViewRecord();
                          }
                        }
                      },
                      (error) => {
                        console.error('获取图片URL失败:', error);
                        // 使用默认图片
                        if (!item.processedImageUrls) {
                          item.processedImageUrls = [];
                        }
                        item.processedImageUrls[index] = require('@/assets/暂无图片1.png');

                        loadedCount++;
                        // 如果所有图片都已加载完成，更新currentItem并记录查看操作
                        if (loadedCount === item.Item_Images.length) {
                          this.currentItem = item;
                          // 记录查看操作
                          this.addViewRecord();
                        }
                      }
                    );
                  } else {
                    // 如果没有MD5，使用默认图片
                    if (!item.processedImageUrls) {
                      item.processedImageUrls = [];
                    }
                    item.processedImageUrls[index] = require('@/assets/暂无图片1.png');
                    loadedCount++;
                    // 如果所有图片都已加载完成，更新currentItem并记录查看操作
                    if (loadedCount === item.Item_Images.length) {
                      this.currentItem = item;
                      // 记录查看操作
                      this.addViewRecord();
                    }
                  }
                });
                // 如果没有图片，直接设置currentItem并记录查看操作
                if (item.Item_Images.length === 0) {
                  this.currentItem = item;
                  // 记录查看操作
                  this.addViewRecord();
                }
              } else {
                // 如果没有图片，直接设置currentItem并记录查看操作
                this.currentItem = item;
                // 记录查看操作
                this.addViewRecord();
              }

              this.$toast.success('数据加载成功');
            } else {
              this.inventoryItems = [];
              this.currentItem = null;
              this.$toast.fail('暂未查询到数据');
            }
          } catch (parseError) {
            console.error('解析库存信息响应失败:', parseError);
            this.inventoryItems = [];
            this.currentItem = null;
            this.$toast.fail('数据格式错误');
          }

          this.loading = false;
        },
        (error) => {
          console.error('获取库存信息失败:', error);
          this.$toast.fail('获取库存信息失败');
          this.loading = false;
        }
      );
    },

    // 图片加载失败时的处理
    onImageError(event) {
      event.target.src = require('@/assets/暂无图片1.png');
    },

    // 获取文件扩展名
    getFileExtension(fileName) {
      return fileName.split('.').pop().toLowerCase();
    },

    // 格式化时间显示
    formatTime(timeString) {
      if (!timeString) return '';
      const date = new Date(timeString);
      return date.toLocaleString('zh-CN');
    },

    // 添加下拉刷新处理方法
    onRefresh() {
      this.loadInventoryData();
      setTimeout(() => {
        this.refreshing = false;
      }, 1000);
    },

    goToOutbound() {
      // 跳转到出库页面，传递当前选中的物品信息
      if (this.currentItem) {
        this.$router.push({
          name: 'InventoryOutboundV1',
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
          name: 'InventoryInboundV1',
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
          name: 'InventoryLogV1',
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
  margin-top: 10px;
  padding: 0 20px;
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
  border-radius: 10px;
  font-size: 12px;
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

.material-content {
  word-break: break-word;
  white-space: pre-wrap;
  color: #333;
}

.image-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 0;
}

.image-item-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border: 1px solid #eee;
  border-radius: 5px;
  background-color: #f9f9f9;
}

.image-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.file-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.upload-time {
  font-size: 12px;
  color: #999;
}

.direct-image-preview {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #eee;
  margin-left: 10px;
  cursor: pointer;
}

.direct-image-preview:hover {
  opacity: 0.8;
  transform: scale(1.05);
  transition: all 0.3s ease;
}

.van-button--default {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #e0e0e0;
}

/* 更多信息样式 */
.more-info-content {
  width: 100%;
}

.more-info-item {
  display: flex;
  flex-direction: column;
  padding: 5px 0;
  border-bottom: 1px solid #f5f5f5;
}

.more-info-item:last-child {
  border-bottom: none;
}

.more-info-key {
  font-weight: bold;
  color: #333;
  margin-bottom: 2px;
}

.more-info-value {
  color: #666;
  word-break: break-word;
}

/* 图片预览弹窗样式 */
.image-preview-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #000;
  color: #fff;
}

.image-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: rgba(0, 0, 0, 0.7);
  border-bottom: 1px solid #333;
}

.image-filename {
  font-size: 14px;
  max-width: 80%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-icon {
  font-size: 24px;
  cursor: pointer;
}

.image-preview-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  padding: 10px;
}

.preview-image-full {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

/* 标签展示样式 */
.tags-display-container {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  justify-content: flex-end; /* 右对齐 */
  align-items: center;
  min-height: 24px;
  width: 100%;
  /* 不设置max-width，让flex容器自然填充剩余空间 */
}

.display-tag-item {
  display: inline-flex;
  align-items: center;
  background-color: #f5f5f5;
  border: 1px solid #ebedf0;
  border-radius: 16px;
  padding: 4px 8px;
  font-size: 12px;
  line-height: 1.2;
  color: #333;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1; /* 允许收缩 */
  box-sizing: border-box; /* 确保盒子模型正确 */
}

.no-tags {
  color: #969799;
  font-size: 14px;
  text-align: right; /* 右对齐 */
}
</style>
