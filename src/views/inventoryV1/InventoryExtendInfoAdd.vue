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
      <van-loading v-if="loading" size="24px" vertical>检查记录中...</van-loading>
      <div v-else>
        <van-cell title="物品颜色">
          <template #default>
            <van-field
              v-model="itemColor"
              type="text"
              placeholder="请输入物品颜色"
              :disabled="recordExists"
            />
          </template>
        </van-cell>

        <van-cell title="物品尺寸">
          <template #default>
            <van-field
              v-model="itemSize"
              type="text"
              placeholder="请输入物品尺寸"
              :disabled="recordExists"
            />
          </template>
        </van-cell>

        <van-cell title="物品单位">
          <template #default>
            <van-field
              v-model="itemUnit"
              type="text"
              placeholder="请输入物品单位"
              :disabled="recordExists"
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
              :disabled="recordExists"
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
          :disabled="recordExists"
        >
          <!-- 自定义上传区域内容 -->
          <div class="custom-upload-area">
            <img src="../../assets/custom-upload-icon2.png" alt="上传图标" style="width: 88px; height: 88px;" />
          </div>
        </van-uploader>
      </div>
    </div>

    <!-- 提交按钮组 -->
    <div style="padding: 15px; display: flex; gap: 25px; justify-content: center; margin-top: 5px;">
      <van-button
        type="info"
        style="width: 40%; font-size: 14px; padding: 8px 20px; margin-right: 5px;"
        @click="submitExtendInfo"
        :disabled="isSubmitting || recordExists"
      >
        {{ recordExists ? '已添加' : (isSubmitting ? '处理中...' : '提交') }}
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
  </div>
</template>

<script>
import SensorRequest from "../../utils/SensorRequest";

export default {
  name: 'InventoryExtendInfo',
  data() {
    return {
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
      isSubmitting: false,
      recordExists: false, // 新增：记录是否存在
      loading: true // 新增：检查状态
    };
  },
  mounted() {
    console.log('页面初始化 item 数据：', this.$route.query.item);
    console.log('页面初始化 inventoryId ：', this.inventoryId);
    console.log('页面初始化 itemName ：', this.itemName);
    console.log('页面初始化 shelfLocation ：', this.shelfLocation);
    console.log('页面初始化 itemModel ：', this.itemModel);

    if (this.inventoryId) {
      this.checkRecordExists(); // 检查记录是否存在
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
          return parsedItem.Id || parsedItem.id || parsedItem.inventoryId || '';
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

    // 检查记录是否存在
    checkRecordExists() {
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
              // 记录已存在
              this.recordExists = true;
              this.$toast.fail('该物品扩展信息已添加，请勿重复添加');
            } else {
              // 记录不存在，可以添加
              this.recordExists = false;
            }
          } catch (e) {
            console.error('检查记录是否存在失败:', e);
            this.recordExists = false; // 默认为不存在，允许添加
            this.$toast.fail('检查记录状态失败');
          }
          this.loading = false;
        },
        (error) => {
          console.error('检查记录是否存在失败:', error);
          this.recordExists = false; // 默认为不存在，允许添加
          this.$toast.fail('检查记录状态失败');
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
      if (this.recordExists) {
        this.$toast('该物品扩展信息已添加，请勿重复添加');
        return;
      }
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

    async submitExtendInfo() {
      if (this.isSubmitting) {
        this.$toast('请勿重复提交');
        return;
      }

      if (this.recordExists) {
        this.$toast.fail('该物品扩展信息已添加，请勿重复添加');
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
        this.imageList.length > 0;

      if (!hasFilledAllData) {
        this.$toast.fail('请填写所有扩展信息字段并上传至少一张图片');
        return;
      }

      this.isSubmitting = true;

      // 准备提交的数据
      const payload = {
        Inventory_ID: this.inventoryId,
        Item_Color: this.itemColor || '',
        Item_Size: this.itemSize || '',
        Item_Unit: this.itemUnit || '',
        Item_Material: this.itemMaterial || '',
        Item_Images: this.imageList.map(img => ({
          File_Name: img.File_Name,
          File_Md5: "",
          File_Base64: img.File_Base64,
          Upload_Time: img.Upload_Time
        }))
      };

      try {
        await new Promise((resolve, reject) => {
          SensorRequest.InventoryItemExtensionsAddFun(
            JSON.stringify(payload),
            resolve,
            (error) => reject(new Error(error.message))
          );
        });
        this.$toast.success('提交成功');
        // 清空表单
        this.itemColor = '';
        this.itemSize = '';
        this.itemUnit = '';
        this.itemMaterial = '';
        this.imageList = [];
        this.fileList = [];
        setTimeout(() => {
          this.$router.go(-1);
        }, 1000);
      } catch (error) {
        this.$toast.fail('提交失败：' + error.message);
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
</style>
