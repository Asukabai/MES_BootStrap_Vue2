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
import { Toast, Dialog } from 'vant'
import * as XLSX from 'xlsx'
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
      const maxSize = 5 * 1024 * 1024; // 5MB
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

    // 验证 Excel 文件内容
    async validateExcelContent(file) {
      try {
        // 读取文件内容
        const data = await this.readFileAsArrayBuffer(file);
        const workbook = XLSX.read(data, { type: 'array' });

        // 获取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 转换为 JSON 格式
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // 验证行数（排除标题行）
        const dataRows = jsonData.slice(1); // 排除标题行

        if (dataRows.length > 100) {
          Dialog.alert({
            title: '提示',
            message: `文件内容行数超出限制！最多支持100条数据，当前文件包含${dataRows.length}条数据，请拆分后分别上传。`
          }).then(() => {
            // 验证失败后清空已选择的文件
            this.selectedFile = null;
            Toast('文件不符合要求已清空列表，请修改后重新上传');
          });
          return false;
        }

        // 验证 A列和J列的组合唯一性
        const combinationSet = new Set();
        const duplicateCombinations = [];

        // 存储验证错误信息
        const validationErrors = [];

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];

          // 检查是否至少有14列数据（N列是第14列）
          if (row.length < 14) {
            validationErrors.push(`第${i + 2}行数据不完整，缺少必要列信息，请检查数据完整性。`);
            continue; // 跳过此行后续验证
          }

          // 检查整行是否全为空（A到N列）
          const isRowEmpty = row.slice(0, 14).every(cell =>
            cell === null || cell === undefined || String(cell).trim() === ''
          );

          if (!isRowEmpty) {
            // 如果不是全空行，则验证必填字段
            const colA = row[0];  // A列 - 货架编号
            const colB = row[1];  // B列 - 物品名称
            const colE = row[4];  // E列 - 当前库存
            const colF = row[5];  // F列 - 品牌
            const colH = row[7];  // H列 - 预警阈值
            const colJ = row[9];  // J列 - 公司

            // 检查必填字段是否为空
            if (colA === null || colA === undefined || String(colA).trim() === '') {
              validationErrors.push(`第${i + 2}行A列(货架编号)不能为空`);
            }
            if (colB === null || colB === undefined || String(colB).trim() === '') {
              validationErrors.push(`第${i + 2}行B列(物品名称)不能为空`);
            }
            if (colE === null || colE === undefined || String(colE).trim() === '') {
              validationErrors.push(`第${i + 2}行E列(当前库存)不能为空`);
            }
            if (colF === null || colF === undefined || String(colF).trim() === '') {
              validationErrors.push(`第${i + 2}行F列(品牌)不能为空`);
            }
            if (colH === null || colH === undefined || String(colH).trim() === '') {
              validationErrors.push(`第${i + 2}行H列(预警阈值)不能为空`);
            }
            if (colJ === null || colJ === undefined || String(colJ).trim() === '') {
              validationErrors.push(`第${i + 2}行J列(公司)不能为空`);
            }

            // 检查F列为"项目"时，G列不能为空
            if (String(colF).trim() === '项目') {
              const colG = row[6];  // G列 - 关联项目
              if (colG === null || colG === undefined || String(colG).trim() === '') {
                validationErrors.push(`第${i + 2}行F列值为"项目"时，G列(关联项目)不能为空`);
              }
            }
          }

          // 验证A列和J列的组合唯一性（只对非全空行进行验证）
          if (!isRowEmpty) {
            const colAValue = String(row[0] || '').trim(); // A列
            const colJValue = String(row[9] || '').trim(); // J列

            const combination = `${colAValue}_${colJValue}`;

            if (combinationSet.has(combination)) {
              duplicateCombinations.push(`${colAValue}-${colJValue}`);
            } else {
              combinationSet.add(combination);
            }
          }
        }

        // 如果有验证错误，统一显示
        if (validationErrors.length > 0) {
          Dialog.alert({
            title: '数据验证错误',
            message: validationErrors.join('\n'),
            messageAlign: 'left'
          }).then(() => {
            // 验证失败后清空已选择的文件
            this.selectedFile = null;
            Toast('文件不符合要求已清空列表，请修改后重新上传');
          });
          return false;
        }

        // 如果有重复组合，显示错误
        if (duplicateCombinations.length > 0) {
          Dialog.alert({
            title: '提示',
            message: `检测到重复的A列和J列组合：${duplicateCombinations.join(', ')}。请确保A列与J列的组合内容不重复后再上传。`
          }).then(() => {
            // 验证失败后清空已选择的文件
            this.selectedFile = null;
            Toast('文件不符合要求已清空列表，请修改后重新上传');
          });
          return false;
        }

        // 验证H列（第8列，索引为7）的值不能小于0
        const invalidHValues = [];
        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          if (row.length >= 8) { // 至少有8列数据才能检查H列
            const hValue = row[7]; // H列是第8列，索引为7
            if (hValue !== undefined && hValue !== null && hValue !== '') {
              const numericValue = Number(hValue);
              if (isNaN(numericValue) || numericValue < 0) {
                invalidHValues.push(`第${i + 2}行`);
              }
            }
          }
        }

        if (invalidHValues.length > 0) {
          Dialog.alert({
            title: '提示',
            message: `H列（预警阈值）的值不能小于0，请检查以下行：${invalidHValues.join(', ')}`
          }).then(() => {
            // 验证失败后清空已选择的文件
            this.selectedFile = null;
            Toast('文件不符合要求已清空列表，请修改后重新上传');
          });
          return false;
        }

        return true; // 验证通过
      } catch (error) {
        console.error('验证Excel文件时发生错误:', error);
        Dialog.alert({
          title: '提示',
          message: '读取Excel文件时发生错误，请检查文件格式是否正确。'
        }).then(() => {
          // 验证失败后清空已选择的文件
          this.selectedFile = null;
          Toast('文件不符合要求已清空列表，请修改后重新上传');
        });
        return false;
      }
    },

    // 将文件读取为 ArrayBuffer
    readFileAsArrayBuffer(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target.result);
        };
        reader.onerror = (error) => {
          reject(error);
        };
        reader.readAsArrayBuffer(file);
      });
    },

    async uploadFile() {
      if (!this.selectedFile) {
        Toast.fail('请选择要上传的文件');
        return;
      }

      // 先验证 Excel 文件内容
      const isValid = await this.validateExcelContent(this.selectedFile);
      if (!isValid) {
        return; // 如果验证失败，则不执行上传
      }

      this.uploading = true;

      try {
        // 将文件转换为Base64
        const base64 = await this.fileToBase64(this.selectedFile);

        // 发送到后端的参数
        const uploadParams = {
          File_Name: this.selectedFile.name,
          File_Base64: base64,// Base64编码的文件内容
          File_Md5: "" // Base64编码的文件内容
        };

        // 调用后端API上传文件
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
