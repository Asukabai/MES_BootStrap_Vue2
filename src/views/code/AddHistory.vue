<template>
  <div class="add-history-container">
    <van-cell-group class="form-group">
      <!-- 资产编号 -->
      <van-field
        label="资产编号:"
        :value="form.productId"
        readonly
      />

      <!-- 归属项目 -->
      <van-field
        label="归属项目:"
        :value="`${form.projectName}—${form.projectCode}`"
        readonly
      />

      <!-- 所属模块 -->
      <van-field
        label="所属模块:"
        :value="form.moduleType"
        readonly
      />

      <!-- 模块名称 -->
      <van-field
        label="模块名称:"
        :value="form.moduleName"
        readonly
      />

      <!-- 操作类型 -->
      <van-field
        label="操作类型:"
        :value="form.moduleOperationType"
        readonly
      />

      <!-- 记录人员 -->
      <van-field
        label="记录人员:"
        :value="form.currentLocation"
        readonly
      />

      <!-- 上传文件 -->
      <van-cell title="上传文件:" :border="false">
        <div class="upload-section">
          <van-button type="info" size="small" @click="handleFileSelect">
            拍照/视频
          </van-button>
          <input
            id="fileInput"
            type="file"
            ref="fileInput"
            multiple
            accept="image/*,video/*"
            @change="handleFileChange"
            style="display: none;"
          >

          <div class="file-list">
            <div
              v-for="(file, index) in form.fileList"
              :key="index"
              class="file-item"
            >
              <div v-if="file.type === 'image'" class="image-wrapper">
                <img
                  :src="file.content"
                  class="file-preview"
                  @click="showImagePreview(index)"
                />
                <van-icon
                  name="delete"
                  class="delete-icon"
                  @click="deleteFile(index)"
                />
              </div>

              <div v-else-if="file.type === 'video'" class="video-wrapper">
                <video
                  :src="file.content"
                  controls
                  class="file-preview"
                ></video>
                <van-icon
                  name="delete"
                  class="delete-icon"
                  @click="deleteFile(index)"
                />
              </div>
            </div>
          </div>

          <div class="upload-hint">
            支持一次上传一个/多个文件，但不是必选项，若无法描述清楚，或需操作多步骤时应拍照/视频
          </div>
        </div>
      </van-cell>

      <!-- 清除文件按钮 -->
      <van-cell :border="false">
        <van-button
          size="small"
          @click="clearFiles"
          style="width: 100%;"
        >
          清除所有选择文件
        </van-button>
      </van-cell>

      <!-- 说明备注 -->
      <van-field
        v-model="form.operation"
        label="* 说明备注:"
        placeholder="请选择操作类型"
        @click="showOperationPicker = true"
        readonly
        clickable
      />

      <van-popup v-model="showOperationPicker" position="bottom">
        <van-picker
          :columns="operationOptions.map(option => option.label)"
          @confirm="onOperationConfirm"
          @cancel="showOperationPicker = false"
          :show-toolbar="true"
        >
          <template #toolbar>
            <div class="picker-toolbar">
              <span class="picker-cancel" @click="showOperationPicker = false">取消</span>
              <span class="picker-title">请选择操作类型</span>
              <span class="picker-confirm" @click="confirmOperation">确认</span>
            </div>
          </template>
        </van-picker>
      </van-popup>

      <!-- 焊接内容 -->
      <van-field
        v-if="form.operation === '焊接'"
        v-model="form.weldingContentText"
        label="* 焊接内容:"
        type="textarea"
        placeholder="请输入焊接内容，多个内容请用逗号分隔"
        rows="2"
        autosize
      />

      <!-- 装配内容 -->
      <van-field
        v-if="form.operation === '装配'"
        v-model="form.assembleContentText"
        label="* 装配内容:"
        type="textarea"
        placeholder="请输入装配内容，多个内容请用逗号分隔"
        rows="2"
        autosize
      />

      <!-- 测试结果 -->
      <van-cell v-if="form.operation === '测试'" title="* 测试结果:" :border="false">
        <van-radio-group v-model="form.testingContent" direction="horizontal">
          <van-radio name="成功">成功</van-radio>
          <van-radio name="失败">失败</van-radio>
        </van-radio-group>
      </van-cell>

      <!-- 失败原因 -->
      <van-field
        v-if="form.testingContent === '失败' && form.operation === '测试'"
        v-model="form.failureReason"
        label="* 失败原因:"
        type="textarea"
        placeholder="请简述失败原因"
        rows="2"
        autosize
      />

      <!-- 问题描述 -->
      <van-field
        v-if="form.operation === '问题描述'"
        v-model="form.questReason"
        label="* 问题描述:"
        type="textarea"
        placeholder="请简述遇到的问题/操作"
        rows="2"
        autosize
      />
    </van-cell-group>

    <!-- 按钮区域 -->
    <div class="button-container">
      <van-button
        type="info"
        block
        :loading="loading"
        :disabled="loading"
        @click="saveDataToBackend"
      >
        <span v-if="!loading">保存</span>
        <span v-else>上传中...</span>
      </van-button>

      <van-button
        block
        style="margin-top: 10px;"
        @click="goBack"
      >
        查看详情
      </van-button>
    </div>

    <!-- 图片预览 -->
    <van-image-preview
      v-model="showPreview"
      :images="previewImages"
      :start-position="previewStartIndex"
    />
  </div>
</template>

<script>
import SensorRequest from "../../utils/SensorRequest.js";
import {
  key_DingName,
  key_DingScannedResult,
  key_DingUserIndex,
  cachedProductId,
  cachedProductPerson,
  cachedPersonIndex,
  key_DingResponseStored,
  key_DingResponseUsed,
  cachedResponseStored,
  cachedResponseUsed,
  departmentPrefix,
} from "@/utils/Dingding.js";

export default {
  data() {
    return {
      form: {
        productId: this.getProductId(),
        currentLocation: this.getProductPerson(),
        productState: this.getProductState(),
        fileList: [],
        operation: '',
        weldingContent: [],
        weldingContentText: '',
        testingContent: '',
        failureReason: '',
        questReason: '',
        assembleContent: [],
        assembleContentText: '',
        projectName: '',
        projectCode: '',
        moduleType: '',
        moduleName: '',
        moduleOperationType: ''
      },
      loading: false,
      showOperationPicker: false,
      operationOptions: [
        { label: '焊接', value: '焊接' },
        { label: '测试', value: '测试' },
        { label: '装配', value: '装配' },
        { label: '其他', value: '其他' },
        { label: '问题描述', value: '问题描述' }
      ],
      weldingOptions: [],
      assembleOptions: [],
      belongContents: [],
      isUsed: sessionStorage.getItem(key_DingResponseUsed) || cachedResponseUsed,
      isStored: sessionStorage.getItem(key_DingResponseStored) || cachedResponseStored,
      showPreview: false,
      previewImages: [],
      previewStartIndex: 0
    };
  },
  created() {
    this.fetchAssetInfo();
  },
  watch: {
    'form.operation': function(newVal) {
      this.resetFieldsBasedOnOperation(newVal);
    }
  },
  methods: {
    // 显示图片预览
    showImagePreview(index) {
      this.previewImages = this.form.fileList
        .filter(file => file.type === 'image')
        .map(file => file.content);
      this.previewStartIndex = this.form.fileList
        .filter(file => file.type === 'image')
        .findIndex(file => file.content === this.form.fileList[index].content);
      this.showPreview = true;
    },

    // 添加获取资产信息的方法
    fetchAssetInfo() {
      const storedProductId = sessionStorage.getItem(key_DingScannedResult) || cachedProductId;
      const param = { Asset_Code: storedProductId };

      SensorRequest.GetAssetInfoByAssetCodeFun(JSON.stringify(param), (response) => {
        let JSON_response = JSON.parse(response);
        let assetInfo = null;

        if (Array.isArray(JSON_response)) {
          if (JSON_response.length > 0) {
            assetInfo = JSON_response[0];
          }
        } else if (JSON_response && typeof JSON_response === 'object') {
          assetInfo = JSON_response;
        }

        if (assetInfo) {
          this.form.projectName = assetInfo.Project_Name || '';
          this.form.projectCode = assetInfo.Project_Code || '';
          this.form.moduleType = assetInfo.Module_Type || '';
          this.form.moduleName = assetInfo.Module_Name || '';
          this.form.moduleOperationType = assetInfo.Module_OperationType || '';
        } else {
          this.$toast({
            message: '数据解析失败',
            type: 'fail'
          });
        }
      }, (error) => {
        console.error(error);
        this.$toast({
          message: '获取资产信息失败: ' + error,
          type: 'fail'
        });
      });
    },

    resetFieldsBasedOnOperation(operation) {
      if (operation === '焊接') {
        this.form.testingContent = '';
        this.form.failureReason = '';
        this.form.questReason = '';
        this.form.assembleContent = [];
        this.form.assembleContentText = '';
      } else if (operation === '测试') {
        this.form.weldingContent = [];
        this.form.weldingContentText = '';
        this.form.questReason = '';
        this.form.assembleContent = [];
        this.form.assembleContentText = '';
      } else if (operation === '装配') {
        this.form.weldingContent = [];
        this.form.weldingContentText = '';
        this.form.testingContent = '';
        this.form.failureReason = '';
        this.form.questReason = '';
      } else if (operation === '问题描述') {
        this.form.weldingContent = [];
        this.form.weldingContentText = '';
        this.form.testingContent = '';
        this.form.failureReason = '';
        this.form.assembleContent = [];
        this.form.assembleContentText = '';
      } else if (operation === '其他') {
        this.form.weldingContent = [];
        this.form.weldingContentText = '';
        this.form.testingContent = '';
        this.form.failureReason = '';
        this.form.questReason = '';
        this.form.assembleContent = [];
        this.form.assembleContentText = '';
      }
    },

    getProductState() {
      const storedProductState = sessionStorage.getItem(key_DingResponseStored) + "—" + sessionStorage.getItem(key_DingResponseUsed) || cachedResponseStored + "-" + cachedResponseUsed;
      console.log('getProductState 是: ', storedProductState);
      return storedProductState;
    },

    getProductId() {
      const storedProductId = sessionStorage.getItem(key_DingScannedResult) || cachedProductId;
      console.log('cachedProductId 是: ', cachedProductId);
      return storedProductId;
    },

    getPersonIndex() {
      const storedPersonIndex = sessionStorage.getItem(key_DingUserIndex) || cachedPersonIndex;
      console.log('cachedPersonIndex 是: ', cachedPersonIndex);
      return storedPersonIndex;
    },

    getProductPerson() {
      const storedProductPerson = localStorage.getItem(key_DingName);
      console.log('cachedProductPerson 是: ', cachedProductPerson);
      return storedProductPerson;
    },

    handleFileSelect() {
      console.log('文件选择操作触发');
      this.$refs.fileInput.click();
    },

    handleFileChange(event) {
      console.log('文件改变事件触发');
      let files = event.target.files;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!this.checkFileType(file)) {
          this.$toast('文件格式不符合要求，图片只能识别png、jpg、jpeg，视频只能识别mp4、avi、mov!');
          continue;
        }
        const reader = new FileReader();
        reader.onload = e => {
          let fileType = file.type.includes('video') ? 'video' : 'image';
          this.form.fileList.push({ content: e.target.result, type: fileType, file: file });
        };
        reader.readAsDataURL(file);
      }
    },

    checkFileType(file) {
      const imageTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      const videoTypes = ['video/mp4', 'video/avi', 'video/quicktime'];
      if (file.type.includes('image')) {
        return imageTypes.includes(file.type);
      } else if (file.type.includes('video')) {
        return videoTypes.includes(file.type);
      }
      return false;
    },

    cancel() {
      this.form.fileList = [];
      this.form.desc = '';
    },

    deleteFile(index) {
      this.form.fileList.splice(index, 1);
    },

    clearFiles() {
      this.form.fileList = [];
    },

    resetTestingFields() {
      this.form.weldingContent = '';
      this.form.weldingContentText = '';
      this.form.testingContent = '';
      this.form.failureReason = '';
      this.form.questReason = '';
      this.form.assembleContent = '';
      this.form.assembleContentText = '';
    },

    toBase64(file, callback) {
      console.log('开始转换文件为Base64编码');
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        callback(base64);
      };
      reader.onerror = error => {
        console.error('Error converting file to base64:', error);
      };
    },

    saveDataToBackend() {
      console.log('开始保存数据到后端');
      if (!this.form.operation) {
        this.$toast('请完成备注后再保存！');
        return;
      }
      this.loading = true;

      const reqData = {
        Asset_Code: this.form.productId,
        Operation_Type: this.form.operation,
        Operation_Description: this.getOperationDescription(),
        Operation_User: {
          Person_DingID: this.getPersonIndex() || "",
          Person_Phone: "",
          Person_Name: this.form.currentLocation || ""
        },
        Operation_Evidence: this.getOperationEvidence()
      };

      SensorRequest.AssetOperationInfoAddFun(JSON.stringify(reqData), (response) => {
        console.log('保存成功:', response);
        this.$toast.success('保存成功!');
        setTimeout(() => {
          this.resetTestingFields();
          const department = this.$route.params.department;
          this.$router.push(`/${department}/HistoryView`);
        }, 500);
      }, (error) => {
        console.error('保存失败:', error);
        this.$toast.fail('保存失败！');
        this.loading = false;
      });
    },

    getOperationDescription() {
      let description = this.form.operation;

      if (this.form.operation === '焊接' && this.form.weldingContentText) {
        description += ": " + this.form.weldingContentText;
      } else if (this.form.operation === '装配' && this.form.assembleContentText) {
        description += ": " + this.form.assembleContentText;
      } else if (this.form.operation === '测试') {
        description += ": " + this.form.testingContent;
        if (this.form.testingContent === '失败' && this.form.failureReason) {
          description += " - " + this.form.failureReason;
        }
      } else if (this.form.operation === '问题描述' && this.form.questReason) {
        description += ": " + this.form.questReason;
      }

      return description;
    },

    getOperationEvidence() {
      if (this.form.fileList.length === 0) {
        return [{
          File_Name: "",
          File_Base64: "",
          File_Md5: "",
          Upload_Time: ""
        }];
      }

      const evidenceList = [];

      const promises = this.form.fileList.map((file, index) => {
        return new Promise((resolve) => {
          this.toBase64(file.file, base64 => {
            evidenceList.push({
              File_Name: file.file.name || `file_${index}`,
              File_Base64: base64,
              File_Md5: "",
              Upload_Time: new Date().toISOString()
            });
            resolve();
          });
        });
      });

      Promise.all(promises).then(() => {
        // 文件转换完成后，可以使用evidenceList
      });
      return evidenceList;
    },

    goBack() {
      const department = this.$route.params.department;
      this.$router.push(`/${department}/HistoryView`);
    },
    // 操作确认方法
    onOperationConfirm(value) {
      const selectedOption = this.operationOptions.find(option => option.label === value);
      if (selectedOption) {
        this.form.operation = selectedOption.value;
      }
      this.showOperationPicker = false;
    },

    confirmOperation() {
      const selectedValue = this.form.operation || this.operationOptions[0].label;
      this.onOperationConfirm(selectedValue);
    }
  },
};
</script>

<style scoped>
.add-history-container {
  padding-top: 6px;
  background-color: #f7f8fa;
  min-height: 100vh;
}

.form-group {
  margin: 16px;
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.upload-section {
  width: 100%;
}

.file-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.file-item {
  position: relative;
  width: 80px;
  height: 80px;
}

.image-wrapper,
.video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.file-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.delete-icon {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #fff;
  border-radius: 50%;
  z-index: 1;
  cursor: pointer;
}

.upload-hint {
  font-size: 12px;
  color: #969799;
  margin-top: 10px;
}

.button-container {
  padding: 16px;
}

.picker-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid #ebedf0;
}

.picker-cancel,
.picker-confirm {
  color: #1989fa;
  font-size: 14px;
}

.picker-title {
  font-size: 16px;
  font-weight: 500;
  flex: 1;
  text-align: center;
}
</style>
