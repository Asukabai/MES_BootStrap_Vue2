<template>
  <div>
    <div class="info-display">
      <van-cell-group>
        <van-cell title="物品名称" :value="itemName" />
        <van-cell title="货架位置" :value="shelfLocation" />
        <van-cell title="物品型号" :value="itemModel" />
      </van-cell-group>
    </div>

    <!-- 所有表单内容的卡片 -->
    <div class="card-container" style="margin-top: 0px; padding-bottom: 20px;">
      <van-loading v-if="loading" size="24px" vertical>加载中...</van-loading>
      <div v-else-if="!recordExists">
        <div class="no-record-message">
          <van-icon name="warning-o" size="40" color="#ff976a" />
          <p class="message-text">该物品暂无扩展信息，请先新增扩展信息</p>
        </div>
      </div>
      <div v-else>
        <van-cell title="物品颜色">
          <template #default>
            <van-field
              v-model="itemColor"
              type="text"
              placeholder="请输入物品颜色"
            />
          </template>
        </van-cell>

        <van-cell title="物品尺寸">
          <template #default>
            <van-field
              v-model="itemSize"
              type="text"
              placeholder="请输入物品尺寸"
            />
          </template>
        </van-cell>

        <van-cell title="物品单位">
          <template #default>
            <van-field
              v-model="itemUnit"
              type="text"
              placeholder="请输入物品单位"
            />
          </template>
        </van-cell>

        <van-cell title="物品材质">
          <template #default>
            <van-field
              v-model="itemMaterial"
              rows="2"
              autosize
              type="textarea"
              maxlength="100"
              placeholder="请输入物品材质信息（最多100字）"
              show-word-limit
            />
          </template>
        </van-cell>

        <van-cell title="上传图片(正视图、左视图、俯视图)">
          <template #label>
            <span class="upload-note">支持点击图标上传图片，但总大小不得超过10M，总数不得超过5个</span>
          </template>
        </van-cell>
        <van-uploader
          v-model="fileList"
          :after-read="onAfterRead"
          multiple
          :max-count="5"
          upload-text="上传图片"
          accept="image/*"
        >
          <!-- 自定义上传区域内容 -->
          <div class="custom-upload-area">
            <img src="../../assets/custom-upload-icon2.png" alt="上传图标" style="width: 88px; height: 88px;" />
          </div>
        </van-uploader>

        <!-- 已有图片展示区域 -->
        <van-cell title="已上传图片" v-if="existingImagesToKeep.length > 0" />
        <div class="existing-image-container" v-if="existingImagesToKeep.length > 0">
          <div
            v-for="(img, index) in existingImagesToKeep"
            :key="`existing-${index}`"
            class="existing-image-item"
          >
            <div class="existing-image-info">
              <span class="file-name">{{ img.File_Name }}</span>
              <span class="upload-time">{{ formatTime(img.Upload_Time) }}</span>
            </div>
            <div class="image-actions">
              <van-button
                type="default"
                size="small"
                class="preview-button"
                @click="previewExistingImage(img)"
              >
                预览
              </van-button>
              <van-button
                type="danger"
                size="small"
                class="delete-button"
                @click="removeExistingImage(index)"
              >
                删除
              </van-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 提交按钮组 -->
    <div style="padding: 15px; display: flex; gap: 25px; justify-content: center; margin-top: 5px;">
      <van-button
        type="info"
        style="width: 40%; font-size: 14px; padding: 8px 20px; margin-right: 5px;"
        @click="submitExtendInfo"
        :disabled="isSubmitting || !recordExists"
      >
        {{ !recordExists ? '无记录' : (isSubmitting ? '处理中...' : '提交') }}
      </van-button>

      <van-button
        type="default"
        style="width: 40%; font-size: 14px; padding: 8px 20px; margin-left: 5px;"
        @click="cancelAndGoBack"
        :disabled="isSubmitting"
      >
        取消并返回
      </van-button>
    </div>

    <!-- 加载遮罩 -->
    <van-overlay :show="isSubmitting">
      <div class="loading-box">正在处理中，请稍候...</div>
    </van-overlay>

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
  name: 'InventoryExtendInfoEdit',
  data() {
    return {
      ID: '', // 初始化为空字符串，将在加载数据时设置
      inventoryId: this.getInventoryId(),
      itemColor: '',
      itemSize: '',
      itemUnit: '',
      itemMaterial: '',
      // 添加用于显示的字段
      itemName: this.getItemName(),
      shelfLocation: this.getShelfLocation(),
      itemModel: this.getItemModel(),
      fileList: [],
      imageList: [],
      existingImages: [], // 存储已有的图片（原始数据）
      existingImagesToKeep: [], // 存储用户选择保留的原有图片
      isSubmitting: false,
      recordExists: false, // 记录是否存在
      loading: true, // 加载状态
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
    console.log('页面初始化 itemName ：', this.itemName);
    console.log('页面初始化 shelfLocation ：', this.shelfLocation);
    console.log('页面初始化 itemModel ：', this.itemModel);

    if (this.inventoryId) {
      this.loadExtendInfo(); // 加载扩展信息
    } else {
      this.$toast.fail('物品ID不能为空');
      this.loading = false;
    }
  },
  methods: {
    // 获取库存ID用于请求体
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
    // 获取物品名称作为显示值
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

    // 获取货架位置作为显示值
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

    // 获取物品型号作为显示值
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

    // 加载扩展信息
    loadExtendInfo() {
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
              // 记录存在，加载数据
              this.recordExists = true;
              const extendInfo = result[0];
              // 从后端响应中获取扩展信息记录的ID
              this.ID = extendInfo.Id || extendInfo.id || '';
              this.itemColor = extendInfo.Item_Color || '';
              this.itemSize = extendInfo.Item_Size || '';
              this.itemUnit = extendInfo.Item_Unit || '';
              this.itemMaterial = extendInfo.Item_Material || '';
              this.existingImages = extendInfo.Item_Images || [];
              // 初始化保留的原有图片列表
              this.existingImagesToKeep = [...this.existingImages];
            } else {
              // 记录不存在
              this.recordExists = false;
              this.$toast.info('该物品暂无扩展信息，请先新增扩展信息');
            }
          } catch (e) {
            console.error('加载扩展信息失败:', e);
            this.recordExists = false;
            this.$toast.fail('加载扩展信息失败');
          }
          this.loading = false;
        },
        (error) => {
          console.error('获取扩展信息失败:', error);
          this.recordExists = false;
          this.$toast.fail('获取扩展信息失败');
          this.loading = false;
        }
      );
    },

    // 将文件转换为base64的方法
    processFileToBase64(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1]; // 获取base64数据部分
        const fileInfo = {
          File_Name: file.file ? file.file.name : file.name,
          File_Base64: base64,
          Upload_Time: new Date().toISOString()
        };
        this.imageList.push(fileInfo);
      };
      reader.readAsDataURL(file.file || file);
    },

    onAfterRead(file) {
      // 检查文件类型
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const files = Array.isArray(file) ? file : [file];

      for (const f of files) {
        if (!f.file || !f.file.type) {
          this.$toast.fail('无法识别文件类型，请上传有效的图片文件');
          return;
        }

        if (!allowedTypes.includes(f.file.type)) {
          this.$toast.fail(`不支持的文件类型: ${f.file.type}，请上传图片文件`);
          return;
        }
      }

      // 处理单个文件，将其转换为base64
      if (Array.isArray(file)) {
        // 如果是多文件，逐个处理
        file.forEach(f => this.processFileToBase64(f));
      } else {
        // 单个文件处理
        this.processFileToBase64(file);
      }
    },

    // 预览已有图片 - 修改此方法
    previewExistingImage(img) {
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

    // 删除原有图片
    removeExistingImage(index) {
      // 使用splice方法直接修改数组，确保Vue能检测到变化
      this.existingImagesToKeep.splice(index, 1);
      this.$toast.success('图片已删除');
    },

    // 格式化时间显示
    formatTime(timeString) {
      if (!timeString) return '';
      const date = new Date(timeString);
      return date.toLocaleString('zh-CN');
    },

    async submitExtendInfo() {
      if (this.isSubmitting) {
        this.$toast('请勿重复提交');
        return;
      }

      if (!this.recordExists) {
        this.$toast.fail('该物品暂无扩展信息，请先新增扩展信息');
        return;
      }

      // 验证ID存在且有效
      if (!this.inventoryId || this.inventoryId === '' || this.inventoryId === 'undefined' || this.inventoryId === null) {
        this.$toast.fail('物品ID不能为空，请从物品详情页面进入');
        return;
      }

      // 验证用户是否填写了所有扩展信息字段
      const hasFilledAllData = this.itemColor.trim() !== '' &&
        this.itemSize.trim() !== '' &&
        this.itemUnit.trim() !== '' &&
        this.itemMaterial.trim() !== '' &&
        (this.imageList.length > 0 || this.existingImagesToKeep.length > 0); // 至少有一张图片（新上传的或保留的）

      if (!hasFilledAllData) {
        this.$toast.fail('请填写所有扩展信息字段并上传至少一张图片');
        return;
      }

      // 验证图片信息至少有一个字段不为空
      const allImages = [...this.existingImagesToKeep, ...this.imageList];
      const hasValidImageInfo = allImages.some(img =>
        (img.File_Md5 && img.File_Md5.trim() !== '') ||
        (img.File_Base64 && img.File_Base64.trim() !== '')
      );

      if (!hasValidImageInfo) {
        this.$toast.fail('编辑图片不能为空');
        return;
      }

      this.isSubmitting = true;

      // 准备提交的数据（合并保留的原有图片和新上传的图片）
      const payload = {
        Id: this.ID,
        Inventory_ID: this.inventoryId,
        Item_Color: this.itemColor || '',
        Item_Size: this.itemSize || '',
        Item_Unit: this.itemUnit || '',
        Item_Material: this.itemMaterial || '',
        Item_Images: allImages.map(img => ({
          File_Name: img.File_Name,
          File_Md5: img.File_Md5 || "", // 保留原有的MD5
          File_Base64: img.File_Base64 || "",
          Upload_Time: img.Upload_Time || new Date().toISOString()
        }))
      };

      try {
        await new Promise((resolve, reject) => {
          SensorRequest.InventoryItemExtensionsUpdateFun( // 使用更新接口
            JSON.stringify(payload),
            (respData) => {
              resolve(respData); // 成功时调用 resolve
            },
            (error) => {
              reject(new Error(error.message)); // 失败时调用 reject
            }
          );
        });
        this.$toast.success('修改成功');
        // 清空表单
        this.itemColor = '';
        this.itemSize = '';
        this.itemUnit = '';
        this.itemMaterial = '';
        this.imageList = [];
        this.fileList = [];
        this.existingImages = [];
        this.existingImagesToKeep = [];
        setTimeout(() => {
          this.$router.go(-1);
        }, 1000);
      } catch (error) {
        this.$toast.fail('修改失败：' + error.message);
      } finally {
        this.isSubmitting = false;
      }
    },

    cancelAndGoBack() {
      if (this.isSubmitting) {
        this.$toast('请勿操作，当前正在提交中');
        return;
      }
      // 清空表单
      this.itemColor = '';
      this.itemSize = '';
      this.itemUnit = '';
      this.itemMaterial = '';
      this.imageList = [];
      this.fileList = [];
      this.existingImages = [];
      this.existingImagesToKeep = [];
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

.upload-note {
  font-size: 12px; /* 设置字体大小 */
  color: #999; /* 设置字体颜色为灰色 */
}

.loading-box {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 16px;
  text-align: center;
  padding: 20px;
}
.van-button--default {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #e0e0e0;
}

.info-display {
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin: 10px;
  padding: 10px;
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

.existing-image-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 0;
}

.existing-image-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border: 1px solid #eee;
  border-radius: 5px;
  background-color: #f0f0f0;
}

.existing-image-info {
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

.image-actions {
  display: flex;
  gap: 5px;
}

.preview-button {
  flex-shrink: 0;
  margin-left: 5px;
}

.delete-button {
  flex-shrink: 0;
  margin-left: 5px;
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
