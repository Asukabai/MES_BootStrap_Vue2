<template>
  <div class="task-calendar">
    <!-- 自定义日历组件 -->
    <div class="calendar-scroll-container">
      <custom-calendar
          :current-month="currentMonth"
          :tasks="taskData"
          @select-date="onDateSelected"
          @month-change="onMonthChange"
      />
    </div>

    <!-- 连接处美化元素 -->
    <div class="calendar-task-divider">
      <div class="divider-wave"></div>
    </div>

    <!-- 日报展示卡片 -->
    <div class="task-card-container">
      <div class="task-list">
        <template v-if="selectedDailyReport">
          <div class="task-card">
            <h4>日报：{{ selectedDailyReport.TaskInfo ? selectedDailyReport.TaskInfo.Task_Name : '无日报信息' }}</h4>
            <p>描述：{{ selectedDailyReport.TaskInfo ? selectedDailyReport.TaskInfo.Task_Description : '无描述' }}</p>
            <p>状态：{{ selectedDailyReport.TaskInfo ? selectedDailyReport.TaskInfo.Task_Status : '未填写' }}</p>
            <p>日期：{{ selectedDailyReport.Date }}</p>
            <div class="task-actions">
              <!-- 未来日期 -->
              <div v-if="new Date(selectedDailyReport.Date) > new Date(new Date().setHours(23, 59, 59, 999))" class="no-report">
                <p>无法填写未来日期的日报</p>
              </div>
              <!-- 一个月之前的日期 -->
              <div v-else-if="new Date(selectedDailyReport.Date) < new Date(new Date().setMonth(new Date().getMonth() - 1)).setHours(0, 0, 0, 0)" class="no-report">
                <p>只能查看一个月之前的日报</p>
              </div>
              <!-- 工作日且有TaskInfo（已填写） -->
              <button class="submit-button" @click="goToEditDailyReport" v-else-if="selectedDailyReport.IsWorkday && selectedDailyReport.TaskInfo">
                <img src="@/assets/upload_task.png" alt="编辑日报" class="button-icon">
                编辑日报
              </button>
              <!-- 工作日但无TaskInfo（未填写） -->
              <button class="submit-button" @click="goToCreateDailyReport" v-else-if="selectedDailyReport.IsWorkday && !selectedDailyReport.TaskInfo">
                <img src="@/assets/upload_task.png" alt="填写日报" class="button-icon">
                填写日报
              </button>
              <!-- 非工作日 -->
              <div v-else class="no-report">
                <p>该日期不需要填写日报</p>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="empty-state">
          <div class="task-card">
            <h4>请选择日期</h4>
            <p>点击日历上的日期查看日报信息</p>
          </div>
        </div>
      </div>
    </div>
    <CustomizableFloatingButton
      :initial-position="{ bottom: 70, right: 20 }"
      :icon-src="require('@/assets/返回.png')"
      :background-size="49"
      :icon-size="49"
      :on-click="goBack"
    />
  </div>
</template>


<script>
import CustomCalendar from '@/components/CustomCalendar.vue';
import SensorRequest from "@/utils/SensorRequest";
import {key_DingUserPhone} from "@/utils/Dingding";
import {GetDingUserToken} from "../../utils/Dingding";
import CustomizableFloatingButton from "../../components/CustomizableFloatingButton.vue";


function getLocalUserInfo() {
  const phone = localStorage.getItem(key_DingUserPhone);
  return {
    phone: phone || '',
  };
}
export default {
  components: {
    CustomizableFloatingButton,
    CustomCalendar
  },
  data() {
    return {
      currentMonth: new Date(),
      taskData: [],
      selectedDate: this.formatDate(new Date()),
      selectedDailyReport: null,
      dailyReports: [],
      loading: false
    };
  },
  created() {
    this.onDateSelected(this.formatDate(new Date()));
  },
  mounted() {
    const department = this.$route.params.department
    GetDingUserToken(department,(token) => {},(token) => {})
    // 页面加载时请求日报数据
    this.loadDailyReports();
  },
  methods: {
    goBack() {
      // this.$router.go(-1);
      this.navigateTo('/index');
    },
    navigateTo(path) {
      const department = this.$route.params.department;
      if (department) {
        this.$router.push(`/${department}${path}`);
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
    },
    // 检查日期是否在允许的范围内
    isDateInAllowedRange(dateStr) {
      const selectedDate = new Date(dateStr);
      const currentDate = new Date();
      currentDate.setHours(23, 59, 59, 999);
      
      // 未来日期不允许
      if (selectedDate > currentDate) {
        return false;
      }
      
      return true;
    },
    // 检查是否可以编辑日报（只能编辑今天及一个月内的日报）
    canEditReport(dateStr) {
      const selectedDate = new Date(dateStr);
      const currentDate = new Date();
      currentDate.setHours(23, 59, 59, 999);
      
      // 未来日期不允许编辑
      if (selectedDate > currentDate) {
        return false;
      }
      
      // 一个月之前的日期不允许编辑
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      oneMonthAgo.setHours(0, 0, 0, 0);
      
      return selectedDate >= oneMonthAgo;
    },
    // 加载日报数据（调用 GetPersonTaskMonthWorkdayFun 接口）
    async loadDailyReports() {
      this.loading = true;

      const userInfo = getLocalUserInfo();
      const currentDate = this.currentMonth; // 使用当前选中的月份
      const requestParams = JSON.stringify({
        Task_Year: currentDate.getFullYear().toString(),
        Task_Month: (currentDate.getMonth() + 1).toString(),
        Person_Phone: userInfo.phone // 默认为示例手机号
      });

      try {
        const respData = await new Promise((resolve, reject) => {
          SensorRequest.GetPersonTaskMonthWorkdayFun(requestParams, resolve, reject);
        });

        const dailyReports = JSON.parse(respData);
        console.log("任务日历-加载日报数据-原始响应数据:", respData);
        console.log("任务日历-加载日报数据-解析后的数据:", dailyReports);

        this.dailyReports = dailyReports;
        this.processDailyReportData();
      } catch (error) {
        console.error('任务日历-加载日报数据失败:', error);
        alert('任务日历-加载日报数据失败');
      } finally {
        this.loading = false;
      }
    },

    // 处理日报数据，将后端返回的数据转换为日历组件需要的格式
    processDailyReportData() {
      const processedTasks = [];

      this.dailyReports.forEach(item => {
        // 只有工作日且有TaskInfo的日期需要显示为可点击状态
        if (item.IsWorkday && item.TaskInfo) {
          processedTasks.push({
            title: item.TaskInfo.Task_Name || '',
            description: item.TaskInfo.Task_Description || '',
            status: item.TaskInfo.Task_Status || '未填写',
            date: item.Date,
            hasReport: !!item.TaskInfo
          });
        }
      });

      this.taskData = processedTasks;
      this.filterDailyReportByDate(this.selectedDate);
    },

    onDateSelected(dateStr) {
      this.selectedDate = dateStr;
      this.filterDailyReportByDate(dateStr);
    },

    filterDailyReportByDate(dateStr) {
      // 查找选中日期的日报信息
      this.selectedDailyReport = this.dailyReports.find(item => item.Date === dateStr);
    },

    goToDailyReportDetail() {
      const department = this.$route.params.department;
      if (department && this.selectedDailyReport && this.selectedDailyReport.TaskInfo) {
        // 检查日期是否在允许的范围内
        if (this.canEditReport(this.selectedDailyReport.Date)) {
          // 跳转到日报详情页，传递日报ID
          this.$router.push(`/${department}/dailyReportDetail?id=${this.selectedDailyReport.TaskInfo.Id}`);
        } else {
          alert('只能查看一个月之前的日报，无法修改');
        }
      } else {
        console.error('未找到 department 参数或日报信息');
      }
    },

    goToCreateDailyReport() {
      const department = this.$route.params.department;
      if (department && this.selectedDailyReport) {
        // 检查日期是否在允许的范围内
        if (this.canEditReport(this.selectedDailyReport.Date)) {
          // 跳转到创建日报页，传递日期
          this.$router.push(`/${department}/createDailyReport?date=${this.selectedDailyReport.Date}`);
        } else {
          alert('无法填写未来日期或一个月之前的日报');
        }
      } else {
        console.error('未找到 department 参数或日期信息');
      }
    },
    goToEditDailyReport() {
      const department = this.$route.params.department;
      if (department && this.selectedDailyReport && this.selectedDailyReport.TaskInfo) {
        // 检查日期是否在允许的范围内
        if (this.canEditReport(this.selectedDailyReport.Date)) {
          // 跳转到编辑日报页，传递完整的日报信息
          const reportInfo = {
            id: this.selectedDailyReport.TaskInfo.Id,
            date: this.selectedDailyReport.Date,
            title: this.selectedDailyReport.TaskInfo.Task_Name,
            description: this.selectedDailyReport.TaskInfo.Task_Description,
            workHour: this.selectedDailyReport.TaskInfo.Task_WorkHour,
            projectCode: this.selectedDailyReport.TaskInfo.Project_Code
          };
          this.$router.push({
            path: `/${department}/editDailyReport`,
            query: {
              reportInfo: JSON.stringify(reportInfo)
            }
          });
        } else {
          alert('只能查看一个月之前的日报，无法修改');
        }
      } else {
        console.error('未找到 department 参数或日报信息');
      }
    },
    // 处理月份变化事件
    onMonthChange(data) {
      // 更新当前月份
      this.currentMonth = new Date(data.year, data.month - 1, 1);
      // 重新加载日报数据
      this.loadDailyReports();
    },


    formatDate(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
};
</script>

<style scoped>
.task-calendar {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.calendar-scroll-container {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 10px;
  background-color: #fff;
  border-radius: 16px 16px 16px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin: 10px 10px 0 10px;
}

/* 新增的连接处美化样式 */
.calendar-task-divider {
  position: relative;
  height: 20px;
  display: flex;
  justify-content: center;
  z-index: 10;
}

.divider-wave {
  width: 100%;
  height: 20px;
  background-size: cover;
  margin-top: -1px;
}

.task-card-container {
  margin: 10px 10px 0 10px;
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 20px 20px 0 0;
  background: linear-gradient(to bottom, #ffffff, #f9f9f9);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  margin-top: -10px;
  position: relative;
  z-index: 1;
}

.task-list {
  padding: 0 15px;
}



.empty-state .task-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 180px;
}

.empty-state .task-card h4 {
  margin: 0 0 8px 0;
}

.empty-state .task-card p {
  margin: 0;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  margin: 10px 0 5px 0;
  color: #333;
}

.task-actions {
  text-align: right;
  margin-top: 10px;
}

.task-card {
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 15px;
  margin-bottom: 15px;
  transition: all 0.3s ease;
  width: 100%;
  height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.task-card h4 {
  margin: 0 0 6px 0;
  font-size: 16px;
  line-height: 1.3;
}

.task-card p {
  margin: 0 0 4px 0;
  font-size: 14px;
  line-height: 1.4;
}

.task-card .task-actions {
  margin-top: 8px;
}

.submit-button {
  background-color: #3f83f8;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
  display: inline-flex;
  align-items: center;
}

.button-icon {
  width: 14px;
  height: 14px;
  margin-right: 5px;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}
</style>
