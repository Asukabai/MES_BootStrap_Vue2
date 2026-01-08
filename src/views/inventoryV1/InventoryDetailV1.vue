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
                    <van-button
                      type="primary"
                      size="small"
                      class="preview-button"
                      @click="previewImage(img)"
                    >
                      预览
                    </van-button>
                  </div>
                </div>
                <van-cell v-else title="扩展图片" value="暂无图片" />
              </van-cell-group>
            </div>
          </van-card>
          <van-empty v-else-if="!currentItem" description="暂无库存信息录入，请点击 + 按钮进行信息新增，或请确认扫描二维码是否正确" />
        </van-pull-refresh>

        <!-- 使用可展开悬浮按钮替换原来的按钮组 -->
        <ExpandableFloatingButton
          :initial-position="{ bottom: 60, right: 10 }"
          :main-icon="mainIcon"
          :sub-buttons="actionButtons"

        />
        <!-- 添加悬浮按钮 -->
        <template v-if="!currentItem">
          <FloatingActionButton
            @click="onFloatingButtonClick"
            :initial-position="{ bottom: 150, right: 10 }"
          />
        </template>
      </div>
    </div>

    <!-- 图片预览弹窗 -->
    <van-popup v-model="showImagePreview" position="center" :style="{ width: '90%', height: '90%', padding: '10px' }" @close="closeImagePreview">
      <div class="image-preview-container" v-if="currentImage">
        <div class="image-preview-header">
          <span class="image-filename">{{ currentImage.File_Name }}</span>
          <van-icon name="close" class="close-icon" @click="closeImagePreview" />
        </div>
        <div class="image-preview-content"
             @touchstart="handleTouchStart"
             @touchmove="handleTouchMove"
             @touchend="handleTouchEnd"
             @touchcancel="handleTouchEnd">
          <div class="preview-image-wrapper"
               :style="{ transform: `translate(${translateX}px, ${translateY}px) scale(${currentZoom})` }">
            <img :src="currentImageUrl"
                 :alt="currentImage.File_Name"
                 class="preview-image"
                 @load="onImageLoad"
                 @error="onImageError" />
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
// 在 script 部分导入图片
import SensorRequest from '../../utils/SensorRequest';
import {key_DingScannedInventoryQRCodeResult} from '../../utils/Dingding';
import FloatingActionButton from "../../components/FloatingActionButton.vue";
import ExpandableFloatingButton from "../../components/ExpandableFloatingButton.vue"; // 新增导入
import SensorRequestPage from "../../utils/SensorRequestPage";
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
    FloatingActionButton,
    ExpandableFloatingButton // 新增组件注册
  },
  data() {
    return {
      mainIcon: require('@/assets/蓝莓.png'),  // 使用 require 函数
      loading: true,
      refreshing: false, // 添加刷新状态
      inventoryItems: [],
      currentItem: null,
      selectedIndex: 0, // 新增选中索引

      // 图片预览相关数据
      showImagePreview: false,
      currentImage: null,
      currentImageUrl: '',
      currentZoom: 1, // 当前缩放比例
      translateX: 0, // X轴偏移量
      translateY: 0, // Y轴偏移量
      lastTranslateX: 0, // 上一次X轴偏移量
      lastTranslateY: 0, // 上一次Y轴偏移量
      // 手势缩放相关数据
      touchStartDistance: 0,
      touchStartZoom: 1,
      isPinching: false,
      // 双击缩放相关
      lastTapTime: 0,
      // 平移相关数据
      touchStartX: 0,
      touchStartY: 0,
      lastTouchX: 0,
      lastTouchY: 0,
      isDragging: false,
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
    actionButtons() {
      return [
        {
          icon: icons.out,  // 本地图片路径
          handler: this.goToOutbound,
          label: '快速出库'
        },
        {
          icon: icons.in, // 本地图片路径
          handler: this.goToInbound,
          label: '快速入库'
        },
        {
          icon: icons.fix,    // 本地图片路径
          handler: this.goToExtendInfoEdit,
          label: '修改信息'
        },
        {
          icon: icons.log,    // 本地图片路径
          handler: this.goToLog,
          label: '操作日志'
        }
      ];
    }
  },
  methods: {
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
      this.navigateTo('/inventory/add');
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

    // 预览图片
    previewImage(img) {
      // 判断是否为图片文件
      const fileExt = this.getFileExtension(img.File_Name).toLowerCase();
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

      if (imageExtensions.includes(fileExt)) {
        // 是图片文件，直接在弹窗中预览
        this.showImageInPopup(img);
      } else {
        this.$toast.fail('该文件并非图片文件，无法预览');
      }
    },

    // 在弹窗中显示图片
    showImageInPopup(img) {
      // 调用后端接口获取临时下载URL
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

            // 设置当前图片信息
            this.currentImage = img;
            this.currentImageUrl = modifiedUrl;
            this.currentZoom = 1; // 重置缩放比例
            this.translateX = 0; // 重置X轴偏移
            this.translateY = 0; // 重置Y轴偏移
            this.lastTranslateX = 0;
            this.lastTranslateY = 0;
            this.showImagePreview = true; // 显示弹窗
          } else {
            this.$toast.fail('获取文件预览链接失败');
          }
        },
        (error) => {
          this.$toast.fail('获取文件预览链接失败: ' + error);
        }
      );
    },

    // 触摸开始事件
    handleTouchStart(event) {
      if (event.touches.length === 2) {
        // 双指触摸开始，记录初始距离
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        this.touchStartDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        this.touchStartZoom = this.currentZoom;
        this.isPinching = true;
        this.isDragging = false; // 停止平移
      } else if (event.touches.length === 1) {
        // 单指触摸，记录初始位置
        this.touchStartX = event.touches[0].clientX;
        this.touchStartY = event.touches[0].clientY;
        this.lastTouchX = event.touches[0].clientX;
        this.lastTouchY = event.touches[0].clientY;
        this.isDragging = true;
        this.isPinching = false; // 停止缩放

        // 检测双击
        const currentTime = new Date().getTime();
        if (currentTime - this.lastTapTime < 300) {
          // 双击事件，切换缩放状态
          this.toggleZoom();
          event.preventDefault();
        }
        this.lastTapTime = currentTime;
      }
    },

    // 触摸移动事件
    handleTouchMove(event) {
      if (event.touches.length === 2 && this.isPinching) {
        // 双指触摸移动，计算缩放
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        // 计算缩放比例
        const scale = currentDistance / this.touchStartDistance;
        this.currentZoom = Math.max(0.5, Math.min(this.touchStartZoom * scale, 5)); // 限制缩放范围

        // 计算新的平移位置，以两指中心为缩放中心
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;

        // 更新平移位置
        this.translateX = this.lastTranslateX + (centerX - this.touchStartX) * (this.currentZoom - this.touchStartZoom) / this.touchStartZoom;
        this.translateY = this.lastTranslateY + (centerY - this.touchStartY) * (this.currentZoom - this.touchStartZoom) / this.touchStartZoom;
      } else if (event.touches.length === 1 && this.isDragging && this.currentZoom > 1) {
        // 单指移动，计算平移
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.lastTouchX;
        const deltaY = touch.clientY - this.lastTouchY;

        this.translateX += deltaX;
        this.translateY += deltaY;

        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
      }
    },

    // 触摸结束事件
    handleTouchEnd() {
      if (this.isPinching) {
        // 结束缩放时，更新最后的平移值
        this.lastTranslateX = this.translateX;
        this.lastTranslateY = this.translateY;
      } else if (this.isDragging) {
        // 结束平移时，更新最后的平移值
        this.lastTranslateX = this.translateX;
        this.lastTranslateY = this.translateY;
      }

      this.isPinching = false;
      this.isDragging = false;
    },

    // 双击切换缩放
    toggleZoom() {
      if (this.currentZoom > 1) {
        this.currentZoom = 1; // 恢复原始大小
        this.translateX = 0; // 重置X轴偏移
        this.translateY = 0; // 重置Y轴偏移
        this.lastTranslateX = 0;
        this.lastTranslateY = 0;
      } else {
        this.currentZoom = 2; // 放大到2倍
      }
    },

    // 关闭图片预览弹窗
    closeImagePreview() {
      this.showImagePreview = false;
      this.currentImage = null;
      this.currentImageUrl = '';
      this.currentZoom = 1;
      this.translateX = 0;
      this.translateY = 0;
      this.lastTranslateX = 0;
      this.lastTranslateY = 0;
      // 重置触摸状态
      this.touchStartDistance = 0;
      this.touchStartZoom = 1;
      this.isPinching = false;
      this.isDragging = false;
    },

    // 图片加载完成
    onImageLoad() {
      console.log('图片加载完成');
    },

    // 图片加载失败
    onImageError() {
      this.$toast.fail('图片加载失败');
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

              // 自动选择第一个物品
              this.currentItem = this.inventoryItems[0];
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

.preview-button {
  flex-shrink: 0;
  margin-left: 10px;
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
  overflow: hidden;
  padding: 10px;
  position: relative;
}

.preview-image-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.1s ease;
  transform-origin: center;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: grab;
}

.preview-image:active {
  cursor: grabbing;
}
</style>
