<template>
  <div class="daily-report-detail">
    <div class="header">
      <h2>查看日报</h2>
      <div class="header-actions">
        <button class="edit-button" @click="goToEdit">
          <img src="@/assets/修改.png" alt="编辑" class="edit-icon">
          编辑
        </button>
        <button class="back-button" @click="goBack">返回</button>
      </div>
    </div>
    
    <div class="report-container" v-if="reportData">
      <div class="report-item">
        <label>日报标题</label>
        <span>{{ reportData.Task_Name }}</span>
      </div>
      
      <div class="report-item">
        <label>日期</label>
        <span>{{ formatDate(reportData.Task_StartTime) }}</span>
      </div>
      
      <div class="report-item">
        <label>工作内容</label>
        <span>{{ reportData.Task_Description }}</span>
      </div>
      
      <div class="report-item">
        <label>工作时长</label>
        <span>{{ reportData.Task_WorkHour }} 小时</span>
      </div>
      
      <div class="report-item">
        <label>项目编码</label>
        <span>{{ reportData.Project_Code || '无' }}</span>
      </div>
      
      <div class="report-item">
        <label>状态</label>
        <span>{{ reportData.Task_Status }}</span>
      </div>
      
      <div class="report-item">
        <label>创建时间</label>
        <span>{{ formatDateTime(reportData.Ts_create) }}</span>
      </div>
    </div>
    
    <div class="loading" v-if="loading">
      <p>加载中...</p>
    </div>
    
    <div class="error" v-if="error">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script>
import SensorRequest from "@/utils/SensorRequest";
import {key_DingUserPhone} from "@/utils/Dingding";

function getLocalUserInfo() {
  const phone = localStorage.getItem(key_DingUserPhone);
  return {
    phone: phone || '',
  };
}

export default {
  data() {
    return {
      reportData: null,
      loading: true,
      error: ''
    };
  },
  mounted() {
    // 从路由参数中获取日报ID
    const reportId = this.$route.query.id;
    if (reportId) {
      this.loadReportDetail(reportId);
    } else {
      this.error = '未找到日报ID';
      this.loading = false;
    }
  },
  methods: {
    goBack() {
      this.$router.go(-1);
    },
    goToEdit() {
      const department = this.$route.params.department;
      if (department && this.reportData) {
        // 跳转到编辑日报页，传递日报ID
        this.$router.push(`/${department}/editDailyReport?id=${this.reportData.Id}`);
      } else {
        console.error('未找到 department 参数或日报信息');
      }
    },
    async loadReportDetail(reportId) {
      this.loading = true;
      
      const userInfo = getLocalUserInfo();
      const requestParams = JSON.stringify({
        Id: reportId,
        Person_Phone: userInfo.phone
      });
      
      try {
        const respData = await new Promise((resolve, reject) => {
          SensorRequest.GetPersonTaskInfoFunPage(requestParams, resolve, reject);
        });
        
        const reports = JSON.parse(respData);
        if (reports && reports.length > 0) {
          this.reportData = reports[0];
        } else {
          this.error = '未找到日报信息';
        }
      } catch (error) {
        console.error('加载日报详情失败:', error);
        this.error = '加载日报详情失败';
      } finally {
        this.loading = false;
      }
    },
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN');
    },
    formatDateTime(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN');
    }
  }
};
</script>

<style scoped>
.daily-report-detail {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  color: #333;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.edit-button {
  background: none;
  border: none;
  font-size: 16px;
  color: #1989fa;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.edit-icon {
  width: 16px;
  height: 16px;
}

.back-button {
  background: none;
  border: none;
  font-size: 16px;
  color: #1989fa;
  cursor: pointer;
}

.report-container {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.report-item {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.report-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.report-item label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
  font-size: 14px;
}

.report-item span {
  display: block;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

.loading,
.error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.error {
  color: #ff4d4f;
}
</style>