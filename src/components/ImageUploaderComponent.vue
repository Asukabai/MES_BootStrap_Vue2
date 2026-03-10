<template>
  <div class="image-uploader-component">
    <van-cell :title="title" :label="label">
      <template #label>
        <span v-if="!label && note" class="upload-note">{{ note }}</span>
      </template>

      <van-uploader
        v-model="fileList"
        :after-read="onAfterRead"
        :multiple="multiple"
        :max-count="maxCount"
        :upload-text="uploadText"
        :accept="accept"
        :max-size="maxSize"
        @oversize="onOversize"
      >
        <!-- 自定义上传区域内容 -->
        <div class="custom-upload-area">
          <img
            v-if="customIcon"
            :src="customIcon"
            :alt="uploadText"
            :style="iconStyle"
          />
          <van-icon v-else name="photograph" size="32" color="#999" />
        </div>
      </van-uploader>
    </van-cell>
  </div>
</template>

<script>
import { Toast } from 'vant';

export default {
  name: 'ImageUploaderComponent',
  props: {
    // 标题
    title: {
      type: String,
      default: '物品图片'
    },
    // 副标题/说明
    label: {
      type: String,
      default: ''
    },
    // 提示信息（当 label 为空时显示）
    note: {
      type: String,
      default: '支持点击图标上传图片，但总大小不得超过 5M，总数不得超过 3 个'
    },
    // 文件列表（支持 v-model）
    fileList: {
      type: Array,
      default: () => []
    },
    // 是否支持多选
    multiple: {
      type: Boolean,
      default: true
    },
    // 最大上传数量
    maxCount: {
      type: Number,
      default: 3
    },
    // 上传文本
    uploadText: {
      type: String,
      default: '上传图片'
    },
    // 接受的文件类型
    accept: {
      type: String,
      default: 'image/*'
    },
    // 最大文件大小（字节），默认 5MB
    maxSize: {
      type: Number,
      default: 5 * 1024 * 1024
    },
    // 自定义图标路径
    customIcon: {
      type: String,
      default: ''
    },
    // 图标样式
    iconStyle: {
      type: [String, Object],
      default: 'width: 88px; height: 88px;'
    }
  },
  data() {
    return {
      internalFileList: this.fileList
    };
  },
  watch: {
    fileList(newVal) {
      this.internalFileList = newVal;
    }
  },
  methods: {
    // 读取文件后触发
    onAfterRead(file) {
      console.log('[ImageUploaderComponent.onAfterRead] 文件读取完成:', file);

      // 如果是多文件
      if (file.file && file.file.length) {
        file.file.forEach(item => {
          this.processFile(item);
        });
      } else {
        this.processFile(file);
      }

      // 触发 input 事件，支持 v-model
      this.$emit('input', this.internalFileList);

      // 触发 after-read 事件（如果父组件传了）
      if (this.$attrs['after-read']) {
        this.$attrs['after-read'](file);
      }
    },

    // 处理单个文件
    processFile(file) {
      console.log('[ImageUploaderComponent.processFile] 处理文件:', file);

      // 检查文件大小
      if (file.file && file.file.size > this.maxSize) {
        Toast.fail(`图片大小不能超过 ${this.maxSize / 1024 / 1024}MB`);
        return;
      }

      // 添加到文件列表
      this.internalFileList.push(file);

      // 检查数量限制
      if (this.internalFileList.length > this.maxCount) {
        this.internalFileList.splice(this.maxCount);
        Toast.warn(`最多只能上传 ${this.maxCount} 张图片`);
      }
    },

    // 文件大小超出限制
    onOversize() {
      console.log('[ImageUploaderComponent.onOversize] 文件大小超出限制');
      Toast.fail(`图片大小不能超过 ${this.maxSize / 1024 / 1024}MB`);
    },

    // 删除文件
    deleteFile(index) {
      this.internalFileList.splice(index, 1);
      this.$emit('input', this.internalFileList);
    },

    // 清空文件列表
    clear() {
      this.internalFileList = [];
      this.$emit('input', this.internalFileList);
    },

    // 获取文件列表
    getFileList() {
      return this.internalFileList;
    }
  }
};
</script>

<style scoped>
.image-uploader-component {
  width: 100%;
}

.custom-upload-area {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px;
}

.upload-note {
  font-size: 12px;
  color: #969799;
  line-height: 1.5;
}
</style>
