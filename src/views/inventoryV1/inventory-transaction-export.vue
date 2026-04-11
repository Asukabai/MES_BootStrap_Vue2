<template>
  <div class="inventory-transaction-export">
    <div class="container">
      <h2 class="page-title">库存操作记录导出</h2>

      <div class="form-container">
        <!-- 所属公司 -->
        <div class="form-item">
          <div class="form-label">请选择所属公司</div>
          <div class="form-control select-control">
            <van-field
              v-model="formData.Company"
              placeholder="请选择所属公司"
              readonly
              clickable
              @click="showCompanyAction = true"
            />
          </div>
        </div>

        <!-- 关联项目 -->
        <div class="form-item">
          <project-selector
            ref="projectSelector"
            field-name="Project_Code"
            label=" * 关联项目"
            placeholder="请选择关联项目"
            :rules="[]"
            search-placeholder="请输入项目名称或编码搜索"
            storage-key="recentProjects_Export"
            @change="onProjectChange"
          />
        </div>

        <!-- 时间选择 -->
        <div class="form-item">
          <div class="form-label">时间范围:</div>
          <div class="time-selector">
            <van-field
              v-model="startDate"
              placeholder="请选择开始时间"
              readonly
              clickable
              @click="showStartDatePicker = true"
              class="time-field"
            />
            <van-popup
              v-model="showStartDatePicker"
              position="bottom"
              round
            >
              <van-datetime-picker
                type="date"
                v-model="startDateValue"
                @confirm="handleStartDateConfirm"
                @cancel="showStartDatePicker = false"
                show-toolbar
                title="选择开始时间"
              />
            </van-popup>

            <van-field
              v-model="endDate"
              placeholder="请选择结束时间"
              readonly
              clickable
              @click="showEndDatePicker = true"
              class="time-field"
            />
            <van-popup
              v-model="showEndDatePicker"
              position="bottom"
              round
            >
              <van-datetime-picker
                type="date"
                v-model="endDateValue"
                @confirm="handleEndDateConfirm"
                @cancel="showEndDatePicker = false"
                show-toolbar
                title="选择结束时间"
              />
            </van-popup>
          </div>
        </div>

        <!-- 操作类型 -->
        <div class="form-item">
          <div class="form-label">操作类型:</div>
          <div class="operation-type">
            <van-radio-group v-model="operationTypes.type" size="large">
              <van-radio name="出库">出库</van-radio>
              <van-radio name="入库">入库</van-radio>
            </van-radio-group>
          </div>
        </div>

        <!-- 按钮区域 -->
        <div class="button-area">
          <van-button type="info" @click="handleReset" class="round-button">重置条件</van-button>
          <van-button type="info" @click="handleExport" class="round-button">导出 Excel</van-button>

        </div>
      </div>
    </div>
    <!-- 悬浮按钮组件 -->
    <CustomizableFloatingButton
      :initial-position="{ bottom: 200, right: 10 }"
      :icon-src="require('@/assets/返回.png')"
      :background-size="46"
      :icon-size="46"
      :on-click="goBack"
    />
    <!-- 页脚 -->
    <div class="footer">
      <p>@ {{ currentYear }} <a href="https://www.sensor-smart.com/" target="_blank">陕西晟思智能测控有限公司</a></p>
    </div>

    <!-- 公司动作面板 -->
    <van-action-sheet
      v-model="showCompanyAction"
      :actions="companyActions"
      @select="onCompanySelect"
      cancel-text="取消"
      close-on-click-action
    />
  </div>
</template>

<script>
import SensorRequest from '../../utils/SensorRequest.js';
import ExpandableFloatingButton from "../../components/ExpandableFloatingButton.vue";
import CustomizableFloatingButton from "../../components/CustomizableFloatingButton.vue";
import ProjectSelector from "../../components/ProjectSelector.vue";
import { Toast } from 'vant';
import { downloadFile } from '../../utils/fileUtils';

export default {
  name: 'InventoryTransactionExport',
  components: {CustomizableFloatingButton, ExpandableFloatingButton, ProjectSelector},
  data() {
    return {
      currentYear: new Date().getFullYear(),
      // 表单数据
      formData: {
        Project_Code: '',
        Transaction_Type: '',
        Company: '',
        StartTime: '',
        EndTime: ''
      },
      // 时间选择
      startDate: '',
      endDate: '',
      startDateValue: new Date(),
      endDateValue: new Date(),
      // 操作类型
      operationTypes: {
        type: '出库'
      },
      // 选择器显示状态
      showCompanyAction: false,
      showStartDatePicker: false,
      showEndDatePicker: false,
      // 公司选项
      companyOptions: [
        { text: '晟思', value: '晟思' },
        { text: '大钧', value: '大钧' },
        { text: '星移', value: '星移' },
        { text: '所有', value: '' }
      ],
      // 时间列表
      yearList: Array.from({length: 10}, (_, i) => (new Date().getFullYear() - i).toString()),
      monthList: Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0'))
    };
  },
  computed: {
    // 公司动作列表
    companyActions() {
      return this.companyOptions.map(option => ({
        name: option.text,
        value: option.value
      }));
    }
  },
  watch: {
    'operationTypes.type'(newVal) {
      if (newVal) {
        Toast.success(`已选择：${newVal}`);
      }
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
    // 返回上一页
    goBack() {
      this.navigateTo('/index');
    },
    // 处理项目选择变化
    onProjectChange(data) {
      this.formData.Project_Code = data.projectCode;
    },
    // 公司选择
    onCompanySelect(item) {
      this.formData.Company = item.value;
      Toast.success(`已选择：${item.name}`);
    },
    // 开始时间选择确认
    handleStartDateConfirm(value) {
      // 验证开始时间不能大于当前时间
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      const selectedStartDate = new Date(value);
      selectedStartDate.setHours(0, 0, 0, 0);
      
      if (selectedStartDate > currentDate) {
        Toast.fail('开始时间不能大于当前时间');
        return;
      }
      
      this.startDateValue = value;
      this.startDate = this.formatDate(value);
      this.formData.StartTime = this.startDate;
      this.showStartDatePicker = false;
    },
    // 结束时间选择确认
    handleEndDateConfirm(value) {
      // 验证结束时间不能大于当前时间
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      const selectedEndDate = new Date(value);
      selectedEndDate.setHours(0, 0, 0, 0);
      
      if (selectedEndDate > currentDate) {
        Toast.fail('结束时间不能大于当前时间');
        return;
      }
      
      // 验证结束时间不能小于开始时间
      if (this.startDateValue) {
        const selectedStartDate = new Date(this.startDateValue);
        selectedStartDate.setHours(0, 0, 0, 0);
        
        if (selectedEndDate < selectedStartDate) {
          Toast.fail('结束时间不能小于开始时间');
          return;
        }
      }
      
      this.endDateValue = value;
      this.endDate = this.formatDate(value);
      this.formData.EndTime = this.endDate;
      this.showEndDatePicker = false;
    },
    // 格式化日期
    formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    // 导出
    handleExport() {
      // 构建操作类型
      this.formData.Transaction_Type = this.operationTypes.type;

      // 验证表单
      if (!this.startDate) {
        this.$toast.fail('请选择开始时间');
        return;
      }
      
      if (!this.endDate) {
        this.$toast.fail('请选择结束时间');
        return;
      }

      // 调用后端接口
      SensorRequest.InventoryTransactionsExportToExcelFun(
        JSON.stringify(this.formData),
        (response) => {
          this.$toast.success('导出成功 !');
          // 处理导出文件
          this.handleExportFile(response);
        },
        (error) => {
          console.error('导出失败:', error);
          this.$toast.fail('导出失败:' + error);
        }
      );
    },
    // 处理导出文件
    handleExportFile(response) {
      // 解析后端返回的数据
      if (response) {
        const responseJson = typeof response === 'string' ? JSON.parse(response) : response;

        if (responseJson.File_Name && responseJson.File_Md5) {
          Toast.success('文件导出成功，正在下载...');
          // 获取 department 参数
          const department = this.$route.params.department;
          if (!department) {
            Toast.fail('路由参数缺失');
            return;
          }
          // 调用 downloadFile 方法下载文件
          downloadFile(responseJson, department);

          // 延迟返回，给用户下载时间
          setTimeout(() => {
            this.goBack();
          }, 2000);
        } else {
          Toast.fail('导出数据格式错误');
        }
      } else {
        Toast.fail('未查询到符合条件的库存信息');
      }
    },
    // 重置
    handleReset() {
      this.formData = {
        Project_Code: '',
        Transaction_Type: '',
        Company: '',
        StartTime: '',
        EndTime: ''
      };
      this.startDate = '';
      this.endDate = '';
      this.startDateValue = new Date();
      this.endDateValue = new Date();
      this.operationTypes = {
        type: '出库'
      };
      // 清空项目选择器
      if (this.$refs.projectSelector) {
        this.$refs.projectSelector.clearSelection();
      }
      Toast('条件重置成功 ！');
    }
  }
};
</script>

<style scoped>
.inventory-transaction-export {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.container {
  width: 100%;
  max-width: 800px;
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  padding: 50px;
  margin: 40px 0;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 40px;
  text-align: center;
  color: #333;
  letter-spacing: 1px;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-label {
  font-size: 15px;
  color: #555;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.select-control {
  width: 100%;
}

.time-selector {
  display: flex;
  gap: 24px;
}

.time-field {
  flex: 1;
}

.operation-type {
  display: flex;
  align-items: center;
  padding: 10px 0;
}

.operation-type .van-radio-group {
  display: flex;
  gap: 60px;
  align-items: center;
}

.operation-type .van-radio {
  margin: 0;
  display: inline-block;
}

.button-area {
  display: flex;
  gap: 24px;
  margin-top: 40px;
  justify-content: center;
}

.button-area van-button {
  min-width: 140px;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.round-button {
  border-radius: 50px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.round-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0));
  border-radius: 50px 50px 0 0;
}

.round-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.round-button:active {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.button-area van-button[type="info"] {
  background-color: #3f83f8;
  border-color: #3f83f8;
  color: #ffffff;
}

.button-area van-button[type="info"]:hover {
  background-color: #2563eb;
  border-color: #2563eb;
}

/* 日期选择器样式 */
.time-field {
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
}

.time-field .van-field__control {
  border-radius: 8px;
}

.operation-type {
  display: flex;
  gap: 40px;
  align-items: center;
  padding: 10px 0;
}

.footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  padding: 10px 0;
  color: #666;
  font-size: 14px;
  background-color: #f5f7fa;
}

.footer a {
  color: #3fb3fb;
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    padding: 30px 20px;
    margin: 20px 0;
  }

  .page-title {
    font-size: 22px;
    margin-bottom: 30px;
  }

  .time-selector {
    flex-direction: column;
    gap: 12px;
  }

  .operation-type {
    gap: 20px;
  }

  .button-area {
    flex-direction: column;
    gap: 12px;
  }

  .button-area van-button {
    width: 100%;
    height: 44px;
    font-size: 15px;
  }
}

/* 大屏幕优化 */
@media (min-width: 1200px) {
  .container {
    max-width: 900px;
    padding: 60px;
  }

  .page-title {
    font-size: 32px;
  }

  .form-container {
    gap: 30px;
  }

  .form-label {
    font-size: 16px;
  }
}
</style>
