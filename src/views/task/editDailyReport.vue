<template>
  <div class="edit-daily-report">
    <div class="header">
      <h2>编辑日报</h2>
      <button class="back-button" @click="goBack">返回</button>
    </div>
    
    <div class="form-container" v-if="!loading">
      <form @submit.prevent="submitDailyReport">
        <div class="form-group">
          <label>日期</label>
          <input type="text" v-model="formData.date" disabled>
        </div>
        
        <div class="form-group">
          <label>日报标题</label>
          <input type="text" v-model="formData.title" required>
        </div>
        
        <div class="form-group">
          <label>工作内容</label>
          <textarea v-model="formData.description" rows="4" required></textarea>
        </div>
        
        <div class="form-group">
          <label>工作时长（小时）</label>
          <input type="number" v-model="formData.workHour" step="0.5" min="0" required>
        </div>
        
        <div class="form-group">
          <ProjectSelector
            field-name="Project_Code"
            label=" * 项目"
            placeholder="请选择项目"
            :rules="[]"
            search-placeholder="请输入项目名称或编码搜索"
            storage-key="recentProjects_DailyReport"
            @change="onProjectChange"
          />
        </div>
        
        <button type="submit" class="submit-button" :disabled="loading">
          {{ loading ? '提交中...' : '保存修改' }}
        </button>
      </form>
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
import {key_DingUserPhone, key_DingName, key_DingUserIndex} from "@/utils/Dingding";
import ProjectSelector from '../../components/ProjectSelector.vue';

function getLocalUserInfo() {
  const name = localStorage.getItem(key_DingName);
  const phone = localStorage.getItem(key_DingUserPhone);
  const dingID = localStorage.getItem(key_DingUserIndex); // 使用 key_DingUserIndex 作为 DingID

  return {
    name: name || '',
    phone: phone || '',
    dingID: dingID || ''
  };
}

export default {
  components: {
    ProjectSelector
  },
  data() {
    return {
      formData: {
        date: '',
        title: '',
        description: '',
        workHour: 7.5,
        projectCode: ''
      },
      selectedProject: null,
      reportId: '',
      loading: true,
      error: ''
    };
  },
  mounted() {
    // 从路由参数中获取日报信息
    const reportInfoStr = this.$route.query.reportInfo;
    if (reportInfoStr) {
      try {
        const reportInfo = JSON.parse(reportInfoStr);
        this.reportId = reportInfo.id;
        this.formData = {
          date: reportInfo.date,
          title: reportInfo.title,
          description: reportInfo.description,
          workHour: reportInfo.workHour,
          projectCode: reportInfo.projectCode || ''
        };
        this.loading = false;
      } catch (error) {
        console.error('解析日报信息失败:', error);
        this.error = '解析日报信息失败';
        this.loading = false;
      }
    } else {
      this.error = '未找到日报信息';
      this.loading = false;
    }
  },
  methods: {
    goBack() {
      this.$router.go(-1);
    },
    onProjectChange(project) {
      // 处理项目选择变化
      this.selectedProject = project;
      this.formData.projectCode = project ? project.projectCode : '';
    },
    async submitDailyReport() {
      // 表单验证
      if (!this.formData.title || this.formData.title.trim() === '') {
        this.$toast.fail('请填写日报标题');
        return;
      }
      
      if (!this.formData.description || this.formData.description.trim() === '') {
        this.$toast.fail('请填写工作内容');
        return;
      }
      
      if (!this.formData.workHour || this.formData.workHour <= 0) {
        this.$toast.fail('请填写有效的工作时长');
        return;
      }
      
      if (!this.selectedProject || !this.selectedProject.projectCode) {
        this.$toast.fail('请选择关联项目');
        return;
      }

      this.loading = true;

      // 构造日期对象
      const startDate = new Date(this.formData.date);
      const endDate = new Date(this.formData.date);
      endDate.setHours(23, 59, 59, 999);
      
      // 格式化日期为 YYYY-MM-DDTHH:MM:SS 格式
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };

      const userInfo = getLocalUserInfo();
      const requestParams = JSON.stringify({
        Id: this.reportId,
        Task_Creator: {
          Person_DingID: userInfo.dingID,
          Person_Phone: userInfo.phone,
          Person_Name: userInfo.name
        },
        Task_Name: this.formData.title,
        Task_Priority: 0,
        Task_Description: this.formData.description,
        Project_Code: this.selectedProject.projectCode,
        Task_Leader: [{
          Person_Phone: userInfo.phone,
          Person_Name: userInfo.name,
          Person_DingID: userInfo.dingID
        }],
        Task_Participant: [{
          Person_Phone: userInfo.phone,
          Person_Name: userInfo.name,
          Person_DingID: userInfo.dingID
        }],
        Task_ParentID: null,
        Task_Files: [],
        Task_StageFile: [],
        Task_Evidence: [],
        Task_StartTime: formatDate(startDate),
        Task_ExEndTime: formatDate(endDate),
        Task_Status: '已完成',
        Task_FinishTime: formatDate(startDate),
        TS_Create: null,
        Task_Type: 1,
        Task_WorkHour: this.formData.workHour
      });
      
      try {
        const respData = await new Promise((resolve, reject) => {
          SensorRequest.TaskInfoUpdateFun(requestParams, resolve, reject);
        });
        
        console.log('更新日报成功:', respData);
        this.$toast.success('日报更新成功');
        
        // 跳转到任务日历页面
        const department = this.$route.params.department;
        this.$router.push(`/${department}/task-calendar`);
      } catch (error) {
        console.error('更新日报失败:', error);
        this.$toast.fail('日报更新失败');
      } finally {
        this.loading = false;
      }
    },
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN');
    }
  }
};
</script>

<style scoped>
.edit-daily-report {
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

.back-button {
  background: none;
  border: none;
  font-size: 16px;
  color: #1989fa;
  cursor: pointer;
}

.form-container {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group textarea {
  resize: vertical;
}

.submit-button {
  width: 100%;
  background-color: #1989fa;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 20px;
}

.submit-button:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
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