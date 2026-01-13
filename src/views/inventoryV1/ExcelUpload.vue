<template>
  <div class="excel-upload-page">
    <!-- 使用 Flexbox 实现垂直水平居中 -->
    <div class="upload-container">
      <h2>Excel库存物品信息批量导入</h2>
      <div
        class="upload-area"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx,.xls"
          @change="handleFileSelect"
          style="display: none;"
        />
        <div class="upload-instruction" v-if="!selectedFile">
          <van-icon name="description" size="40" color="#ccc" />
          <p>拖拽Excel文件到此处</p>
          <p>或</p>
          <van-button type="info" @click="$refs.fileInput.click()">选择文件</van-button>
        </div>
        <div class="file-info" v-else>
          <van-icon name="success" size="24" color="#07c160" />
          <p>{{ selectedFile.name }}</p>
          <p class="file-size">{{ formatFileSize(selectedFile.size) }}</p>
        </div>
      </div>

      <div class="upload-actions">
        <van-button
          type="default"
          @click="goBack"
          :disabled="uploading"
        >
          取消
        </van-button>
        <van-button
          type="info"
          @click="uploadFile"
          :disabled="!selectedFile || uploading"
          :loading="uploading"
        >
          {{ uploading ? '上传中...' : '上传' }}
        </van-button>
      </div>
    </div>
  </div>
</template>


<script>
import { Toast } from 'vant'
import SensorRequestPage from "../../utils/SensorRequestPage";

export default {
  name: 'ExcelUpload',
  data() {
    return {
      selectedFile: null,
      uploading: false
    }
  },
  methods: {
    handleFileSelect(event) {
      const files = event.target.files;
      if (files.length > 0) {
        this.validateAndSetFile(files[0]);
      }
    },

    validateAndSetFile(file) {
      // 验证文件类型
      const validTypes = ['application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!validTypes.includes(file.type)) {
        Toast.fail('请选择有效的Excel文件(.xls 或 .xlsx)');
        return;
      }

      // 验证文件大小 (例如限制为10MB)
      const maxSize = 5 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        Toast.fail('文件大小不能超过5MB');
        return;
      }

      this.selectedFile = file;
    },

    handleDrop(event) {
      event.preventDefault();
      this.handleDragLeave(event);

      if (event.dataTransfer.files.length) {
        this.validateAndSetFile(event.dataTransfer.files[0]);
      }
    },

    handleDragOver(event) {
      event.preventDefault();
      const uploadArea = event.target.closest('.upload-area');
      if (uploadArea) {
        uploadArea.classList.add('drag-over');
      }
    },

    handleDragLeave(event) {
      event.preventDefault();
      const uploadArea = event.target.closest('.upload-area');
      if (uploadArea) {
        uploadArea.classList.remove('drag-over');
      }
    },

    formatFileSize(size) {
      if (size < 1024) return size + ' B';
      else if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
      else return (size / 1048576).toFixed(1) + ' MB';
    },

    async uploadFile() {
      if (!this.selectedFile) {
        Toast.fail('请选择要上传的文件');
        return;
      }

      this.uploading = true;

      try {
        // 将文件转换为Base64
        const base64 = await this.fileToBase64(this.selectedFile);

        // 发送到后端的参数
        const uploadParams = {
          File_Name: this.selectedFile.name,
          // fileSize: this.selectedFile.size,
          // fileType: this.selectedFile.type,
          File_Base64: base64,// Base64编码的文件内容
          File_Md5: "" // Base64编码的文件内容

        };

        // 调用后端API上传文件
        // 示例调用（需要根据实际API接口调整）
        SensorRequestPage.InventoryFileUploadAnalysisFun(
          JSON.stringify(uploadParams),
          (respData) => {
            Toast.success('文件上传成功');
            // 解析后端返回的数据并跳转到预览页面
            if (respData) {
              this.$router.push({
                name: 'InventoryPreview',
                params: {
                  department: this.$route.params.department
                },
                query: {
                  item: encodeURIComponent(JSON.stringify(respData))
                }
              });
            } else {
              this.$toast.fail('未查询到物品信息');
            }
          },
          (error) => {
            Toast.fail('上传失败: ' + error);
            this.uploading = false;
          }
        );


      } catch (error) {
        console.error('上传失败:', error);
        Toast.fail('上传失败: ' + error.message);
        this.uploading = false;
      }
    },

    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          // 移除data URL前缀，只保留Base64部分
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = error => reject(error);
      });
    },

    goBack() {
      // 清空已选择的文件
      this.selectedFile = null;
      // 返回上一页
      this.$router.go(-1);
    }
  }
}
</script>

<style scoped>
.excel-upload-page {
  padding: 20px;
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  justify-content: center;
  align-items: center;
}

.upload-container {
  width: 100%;
  max-width: 700px;
  background: white;
  border-radius: 15px;
  padding: 50px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}


.upload-container h2 {
  text-align: center;
  margin-bottom: 20px;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
  transition: border-color 0.3s;
  cursor: pointer;
  margin-bottom: 20px;
}

.upload-area.drag-over {
  border-color: #07c160;
  background-color: rgba(7, 193, 96, 0.05);
}

.upload-instruction p {
  margin: 10px 0;
  color: #666;
}

.file-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.file-size {
  color: #999;
  font-size: 12px;
  margin-top: 5px;
}

.upload-actions {
  display: flex;
  gap: 10px;
}

.upload-actions .van-button {
  flex: 1;
}
</style>
