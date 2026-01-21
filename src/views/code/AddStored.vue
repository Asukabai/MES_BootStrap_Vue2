<template>
  <div class="add-stored-container">
    <van-cell-group class="form-group">
      <van-field
        label="资产编号:"
        :value="form.productId"
        readonly
      />
      <van-field
        label="资产类型:"
        :value="form.productType"
        readonly
      />

      <van-field
        label="资产状态:"
        value="未入库-未领用"
        readonly
      />

      <van-field
        label="记录人:"
        :value="form.currentLocation"
        readonly
      />

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
          :columns="operationOptions"
          @confirm="onOperationConfirm"
          @cancel="showOperationPicker = false"
        />
      </van-popup>

      <van-field
        v-if="form.operation === '入库并领用'"
        v-model="form.belongContentLabel"
        label="* 归属项目:"
        placeholder="请选择所属项目"
        @click="showProjectPicker = true"
        readonly
        clickable
      />

      <van-popup v-model="showProjectPicker" position="bottom">
        <van-picker
          :columns="belongContentsForPicker"
          @confirm="onProjectConfirm"
          @cancel="showProjectPicker = false"
        />
      </van-popup>
    </van-cell-group>

    <div class="button-container">
      <van-button
        type="info"
        size="large"
        :loading="loading"
        :disabled="loading"
        @click="saveDataToBackend"
      >
        <span v-if="!loading">保存</span>
        <span v-else>上传中...</span>
      </van-button>
      <van-button
        size="large"
        style="margin-top: 10px;"
        @click="goBack"
      >
        返回查看页面
      </van-button>
    </div>
  </div>
</template>

<script>
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
  key_DingUserPhone,
  departmentPrefix,
} from "@/utils/Dingding";
import SensorRequest from "@/utils/SensorRequest";
import {Toast} from "vant";

function getLocalUserInfo() {
  const name = localStorage.getItem(key_DingName);
  const phone = localStorage.getItem(key_DingUserPhone);
  const dingID = localStorage.getItem(key_DingUserIndex);

  return {
    name: name || '',
    phone: phone || '',
    dingID: dingID || ''
  };
}

export default {
  data() {
    return {
      form: {
        productType: '',
        productId: this.getProductId(),
        currentLocation: this.getProductPerson(),
        fileList: [],
        operation: '',
        productState: this.getProductState(),
        belongContent: '',
        belongContentLabel: '' // 添加用于显示的标签
      },
      loading: false,
      operationOptions: [
        { text: '入库并领用', value: '入库并领用' }  // 使用 text/value 格式
      ],
      belongContents: [], // 获取领用时候的归属项目
      productType: '',
      showOperationPicker: false,
      showProjectPicker: false,
      belongContentsForPicker: [] // 用于 picker 的选项
    };
  },
  created() {
    // 直接从路由参数中获取 Module_Type
    const moduleType = this.$route.query.Module_Type;
    const moduleName = this.$route.query.Module_Name;

    if (moduleType && moduleName) {
      this.form.productType = `${moduleType} - ${moduleName}`;
    } else if (moduleType) {
      this.form.productType = moduleType;
    } else {
      this.form.productType = '暂无配置，无法获取';
    }
    this.fetchBelongOptions();
    this.fetchWeldingOptions();
    this.fetchAssembleOptions();
  },
  methods: {
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
    getProductState() {
      const storedProductState = sessionStorage.getItem(key_DingResponseStored) + "—" + sessionStorage.getItem(key_DingResponseUsed) || cachedResponseStored + "-" + cachedResponseUsed;
      console.log('getProductState 是: ', storedProductState);
      return storedProductState;
    },
    onOperationConfirm(value) {
      this.form.operation = value;
      this.showOperationPicker = false;
    },
    onProjectConfirm(value) {
      // 查找选中的项目对象
      const selected = this.belongContents.find(item => item.label === value);
      if (selected) {
        this.form.belongContent = selected.value;
        this.form.belongContentLabel = value;
      }
      this.showProjectPicker = false;
    },
    cancel() {
      this.form.fileList = [];
      this.form.desc = '';
    },
    deleteFile(index) {
      this.form.fileList.splice(index, 1);
    },
    resetTestingFields() {
      this.form.weldingContent = '';
      this.form.testingContent = '';
      this.form.failureReason = '';
      this.form.questReason = '';
      this.form.assembleContent = '';
    },
    // 获取项目列表
    fetchBelongOptions() {
      SensorRequest.ProjectInfoGetFun(
        '',
        (respData) => {
          const data = JSON.parse(respData);
          const list = Array.isArray(data) ? data : [data];
          this.belongContents = list.map(item => {
            let code = item.Project_Code;
            // alert("code:"+ code)
            let name = item.Project_Name;
            // alert("name:"+ name)
            return {
              label: `${code} - ${name}`,
              value: JSON.stringify({ Project_Code: code, Project_Name: name })
            };
          });
          // 更新 picker 数据源
          this.belongContentsForPicker = this.belongContents.map(item => item.label);
          console.log("belongContentsForPicker:", this.belongContentsForPicker);
        },
        (error) => {
          console.error(error);
          this.$toast({
            message: error,
            type: 'error'
          });
        }
      );
    },

    fetchWeldingOptions() {},

    fetchAssembleOptions() {},

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
        this.$dialog.alert({
          message: '请完成备注后再保存！'
        });
        return;
      }
      this.loading = true;

      const selectedProject = this.form.belongContent ? JSON.parse(this.form.belongContent) : {};

      const reqData = {
        Asset_Code: this.form.productId,
        Project_Name: selectedProject.Project_Name || "",
        Project_Code: selectedProject.Project_Code || "",
        Asset_Remarks: this.form.operation === "入库并领用" ? "入库并领用" : "",
        Asset_Status: "0",
        Operation_Type: "入库并领用",
        Operation_Description: "入库并领用",
        Operation_User: {
          Person_DingID: getLocalUserInfo().dingID,
          Person_Phone: getLocalUserInfo().phone,
          Person_Name: getLocalUserInfo().name
        }
      };

      SensorRequest.AssetInfoAddFun(JSON.stringify(reqData))
        .then(response => {
          console.log('保存成功:', response);
          this.$toast.success('保存成功!');
          setTimeout(() => {
            this.resetTestingFields();
            const department = this.$route.params.department;
            this.$router.push(`/${department}/code/HistoryView`);
          }, 500);
        })
        .catch(error => {
          console.error('保存失败:', error);
          this.$toast.fail('保存失败: ' + error.message || error);
        })
        .finally(() => {
          this.loading = false;
        });
    },

    goBack() {
      const department = this.$route.params.department;
      this.$router.push(`/${department}/code/HistoryView`);
    }
  },
};
</script>

<style scoped>
.add-stored-container {
  padding-top: 6px; /* 为顶部导航栏留出空间 */
  background-color: #f7f8fa;
  min-height: 100vh;
}

.form-group {
  margin: 16px;
}

.button-container {
  padding: 16px;
}

.van-field {
  background-color: white;
  margin-bottom: 10px;
  border-radius: 8px;
}
</style>
