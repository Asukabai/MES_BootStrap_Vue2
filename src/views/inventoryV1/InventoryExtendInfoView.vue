<template>
  <div>
    <!-- 显示从上一个页面传递过来的基础信息 -->
    <div class="info-display">
      <van-cell-group>
        <van-cell title="物品名称" :value="itemName" />
        <van-cell title="货架位置" :value="shelfLocation" />
        <van-cell title="物品型号" :value="itemModel" />
      </van-cell-group>
    </div>

    <!-- 扩展信息展示卡片 -->
    <div class="card-container" style="margin-top: 0px; padding-bottom: 20px;">
      <van-loading v-if="loading" size="24px" vertical>加载中...</van-loading>
      <div v-else-if="Object.keys(extendInfo).length === 0">
        <div class="no-record-message">
          <van-icon name="warning-o" size="40" color="#ff976a" />
          <p class="message-text">该物品暂无扩展信息，请先新增扩展信息</p>
        </div>
      </div>
      <div v-else>
        <van-cell title="物品颜色" :value="extendInfo.Item_Color || '未填写'" />
        <van-cell title="物品尺寸" :value="extendInfo.Item_Size || '未填写'" />
        <van-cell title="物品单位" :value="extendInfo.Item_Unit || '未填写'" />

        <van-cell title="物品材质">
          <template #default>
            <div class="material-content">{{ extendInfo.Item_Material || '未填写' }}</div>
          </template>
        </van-cell>

        <!-- 图片展示区域 -->
        <van-cell title="扩展图片" v-if="extendInfo.Item_Images && extendInfo.Item_Images.length > 0" />
        <div class="image-container" v-if="extendInfo.Item_Images && extendInfo.Item_Images.length > 0">
          <div
            v-for="(img, index) in extendInfo.Item_Images"
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
      </div>
    </div>

    <!-- 返回按钮 -->
    <div style="padding: 15px; display: flex; justify-content: center; margin-top: 5px;">
      <van-button
        type="default"
        style="width: 60%; font-size: 14px; padding: 8px 20px;"
        @click="goBack"
      >
        返回
      </van-button>
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
import SensorRequest from "../../utils/SensorRequest";

export default {
  name: 'InventoryExtendInfoView',
  data() {
    return {
      inventoryId: this.getInventoryId(),
      itemName: this.getItemName(),
      shelfLocation: this.getShelfLocation(),
      itemModel: this.getItemModel(),
      extendInfo: {},
      loading: true,
      // 新增图片预览相关数据
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
  mounted() {
    console.log('页面初始化 item 数据：', this.$route.query.item);
    console.log('页面初始化 inventoryId ：', this.inventoryId);
    if (this.inventoryId) {
      this.fetchExtendInfo();
    } else {
      this.$toast.fail('物品ID不能为空');
      this.loading = false;
    }
  },
  methods: {
    // 获取库存ID
    getInventoryId() {
      const routeItem = this.$route.query.item;
      if (routeItem) {
        try {
          const parsedItem = JSON.parse(routeItem);
          return parsedItem.Inventory_ID || parsedItem.Id || parsedItem.id || parsedItem.inventoryId || '';
        } catch (e) {
          console.error('解析路由参数，获取库存ID失败:', e);
        }
      }
      return '';
    },

    // 获取物品名称
    getItemName() {
      const routeItem = this.$route.query.item;
      if (routeItem) {
        try {
          const parsedItem = JSON.parse(routeItem);
          return parsedItem.Item_Name || '';
        } catch (e) {
          console.error('解析物品名称失败:', e);
        }
      }
      return '';
    },

    // 获取货架位置
    getShelfLocation() {
      const routeItem = this.$route.query.item;
      if (routeItem) {
        try {
          const parsedItem = JSON.parse(routeItem);
          return parsedItem.Shelf_Location || '';
        } catch (e) {
          console.error('解析货架位置失败:', e);
        }
      }
      return '';
    },

    // 获取物品型号
    getItemModel() {
      const routeItem = this.$route.query.item;
      if (routeItem) {
        try {
          const parsedItem = JSON.parse(routeItem);
          return parsedItem.Item_Model || '';
        } catch (e) {
          console.error('解析物品型号失败:', e);
        }
      }
      return '';
    },

    // 获取扩展信息
    fetchExtendInfo() {
      if (!this.inventoryId) {
        this.$toast.fail('物品ID不能为空');
        this.loading = false;
        return;
      }

      // 构造请求体
      const payload = {
        Inventory_ID: this.inventoryId
      };

      SensorRequest.InventoryItemExtensionsGetFun(
        JSON.stringify(payload),
        (respData) => {
          try {
            const result = JSON.parse(respData);
            if (result && result.length > 0) {
              // 假设后端返回的是数组，取第一个结果
              this.extendInfo = result[0];
            } else {
              this.extendInfo = {};
              this.$toast.fail('该物品暂无扩展信息，请先新增扩展信息');
            }
          } catch (e) {
            console.error('解析扩展信息失败:', e);
            this.extendInfo = {};
            this.$toast.fail('解析扩展信息失败');
          }
          this.loading = false;
        },
        (error) => {
          console.error('获取扩展信息失败:', error);
          this.extendInfo = {};
          this.$toast.fail('获取扩展信息失败');
          this.loading = false;
        }
      );
    },

    // 预览图片 - 修改此方法
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

    // 返回上一页
    goBack() {
      this.$router.go(-1);
    }
  }
};
</script>

<style scoped>
.card-container {
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin: 10px;
  padding: 10px;
}

.info-display {
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin: 10px;
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

.no-record-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.message-text {
  margin-top: 10px;
  font-size: 16px;
  color: #666;
  text-align: center;
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
