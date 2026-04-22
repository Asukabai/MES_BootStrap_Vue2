<template>
  <div class="create-daily-report">
    <div class="header">
      <h2>填写日报</h2>
      <button class="back-button" @click="goBack">返回</button>
    </div>

    <div class="form-container">
      <form @submit.prevent="submitDailyReport">
        <div class="form-group">
          <label>日期</label>
          <input type="text" v-model="formData.date" disabled>
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
            label=" * 关联项目"
            placeholder="请选择项目"
            :rules="[]"
            search-placeholder="请输入项目名称或编码搜索"
            storage-key="recentProjects_DailyReport"
            @change="onProjectChange"
          />
        </div>

        <button type="submit" class="submit-button" :disabled="loading">
          {{ loading ? '提交中...' : '提交日报' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import SensorRequest from "@/utils/SensorRequest";
import {key_DingUserPhone} from "@/utils/Dingding";
import ProjectSelector from '../../components/ProjectSelector.vue';
import {key_DingName, key_DingUserIndex} from "../../utils/Dingding";

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
      loading: false
    };
  },
  mounted() {
    // 从路由参数中获取日期
    this.formData.date = this.$route.query.date || '';
    // 自动生成日报标题
    if (this.formData.date) {
      this.formData.title = `${this.formData.date}日报`;
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
      console.log('项目选择变化 - selectedProject:', this.selectedProject);
    },
    async submitDailyReport() {
      // 表单验证
      console.log('提交前验证 - selectedProject:', this.selectedProject);
      console.log('提交前验证 - formData:', this.formData);
      
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

      const localUserInfo = getLocalUserInfo();
      
      // 验证 Task_Creator
      if (!localUserInfo.name || localUserInfo.name.trim() === '') {
        this.$toast.fail('用户名称不能为空');
        return;
      }
      
      // 验证 Task_FinishTime (日期)
      if (!this.formData.date) {
        this.$toast.fail('日报日期不能为空');
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
      
      const requestParams = JSON.stringify({
        Task_Creator: {
          Person_DingID: localUserInfo.dingID,
          Person_Phone: localUserInfo.phone,
          Person_Name: localUserInfo.name
        },
        Task_Name: this.formData.title,
        Task_Priority: 0,
        Task_Description: this.formData.description,
        Project_Code: this.selectedProject.projectCode,
        Task_Leader: [{
          Person_Phone: localUserInfo.phone,
          Person_Name: localUserInfo.name,
          Person_DingID: localUserInfo.dingID
        }],
        Task_Participant: [{
          Person_Phone: localUserInfo.phone,
          Person_Name: localUserInfo.name,
          Person_DingID: localUserInfo.dingID
        }],
        Task_ParentID: null,
        Task_Files: [],
        Task_StageFile: [],
        Task_Evidence: [],
        Task_StartTime: formatDate(startDate),
        Task_ExEndTime: formatDate(endDate),
        Task_Status: '已完成',
        Id: null,
        Task_FinishTime: formatDate(startDate),
        TS_Create: null,
        Task_Type: 1,
        Task_WorkHour: this.formData.workHour
      });

      console.log('提交日报请求参数:', requestParams);

      try {
        const respData = await new Promise((resolve, reject) => {
          SensorRequest.TaskInfoAddFun(requestParams, resolve, reject);
        });

        console.log('提交日报成功:', respData);
        this.$toast.success('日报提交成功');

        // 跳转到任务日历页面
        const department = this.$route.params.department;
        this.$router.push(`/${department}/task-calendar`);
      } catch (error) {
        console.error('提交日报失败:', error);
        this.$toast.fail('日报提交失败');
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.create-daily-report {
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
</style>
