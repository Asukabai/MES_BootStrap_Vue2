<template>
  <div class="weekly-report-detail">
    <!-- 页面头部 -->
    <div class="header">
      <div class="project-info">
        <div class="project-name">{{ reportData.Project_Name }}</div>
        <div class="project-details">
          <span>项目经理：{{ reportData.Project_Manager && reportData.Project_Manager.Person_Name || '未知' }}</span>
          <span>汇报人：{{ reportData.Report_Person && reportData.Report_Person.Person_Name || '未知' }}</span>
        </div>
        <div class="project-details">
          <span>
            项目时间范围：
            <template v-if="formatDate(projectStartTime) && formatDate(projectEndTime)">
              {{ formatDate(projectStartTime) }} 至 {{ formatDate(projectEndTime) }}
            </template>
            <template v-else>
              暂无数据
            </template>
          </span>
        </div>
        <div class="project-details">
          <span>
            周报时间范围：
            <template v-if="reportData.Week_StartDate && reportData.Week_EndDate">
              {{ formatDate(reportData.Week_StartDate) }} 至 {{ formatDate(reportData.Week_EndDate) }}
            </template>
            <template v-else>
              暂无数据
            </template>
          </span>
        </div>
      </div>
      <div class="status-bar">
        <div class="week-info">周次：{{ reportData.Week_Display }}</div>
        <div class="status">
          状态：<span :class="['status-text', statusClass]">{{ statusText }}</span>
          <van-icon name="check" color="#07c56d" size="12px" v-if="countdownDays >= 0" />
        </div>
        <!-- 倒计时显示 -->
        <div class="countdown">
          <van-icon name="clock-o" color="#3f83f8" size="14px" />
          <span class="countdown-text">项目倒计时</span>
          <span class="countdown-days">{{ countdownDays !== null ? countdownDays + '天' : '无' }}</span>
        </div>
      </div>
    </div>
    <!-- 内容区域 -->
    <div class="content">
      <div class="tabs">
        <div
          class="tab-item"
          :class="{ active: activeTab === 'actual' }"
          @click="activeTab = 'actual'"
        >
          上周实际工作
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'plan' }"
          @click="activeTab = 'plan'"
        >
          本周计划工作
        </div>
      </div>

      <div class="work-content-container">
        <div class="work-content-wrapper">
          <div
            v-if="activeTab === 'actual'"
            class="work-content"
            v-html="formatWorkContent(reportData.Actual_Work)"
          ></div>
          <div
            v-else
            class="work-content"
            v-html="formatWorkContent(reportData.Plan_Work)"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {Toast} from 'vant';
import SensorRequest from '../../utils/SensorRequest.js';

export default {
  name: 'WeeklyReportDetail',
  data() {
    return {
      loading: true,
      reportData: {},
      activeTab: 'actual',
      countdownDays: null, // 修改初始值为null而不是0
      timer: null, // 定时器引用
      projectStartTime: '',
      projectEndTime: ''
    };
  },
  computed: {
    statusClass() {
      return this.countdownDays >= 0 ? 'normal' : 'overdue';
    },
    statusText() {
      return this.countdownDays >= 0 ? '正常' : '逾期';
    }
  },
  created() {
    this.loadReportDetail();
  },
  mounted() {
    // 每分钟更新一次倒计时
    this.timer = setInterval(() => {
      this.calculateCountdown();
    }, 60000);
  },
  beforeDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  },
  methods: {
    loadReportDetail() {
      const reportId = this.$route.params.id;
      console.log('加载周报ID:', reportId);

      // 正确获取查询参数
      const query = this.$route.query;
      let projectInfo = {};

      // 检查是否有 projectInfo 查询参数
      if (query.projectInfo) {
        try {
          projectInfo = JSON.parse(decodeURIComponent(query.projectInfo));
          console.log('加载周报 Project_Name 详情:', projectInfo.Project_Name);
          console.log('加载周报 Week_Display 详情:', projectInfo.Week_Display);
          console.log('加载周报 Report_Person 详情:', projectInfo.Report_Person.Person_Name);
        } catch (error) {
          console.error('解析 projectInfo 参数失败:', error);
          // 如果解析失败，使用默认值或提示错误
          this.$toast.fail('参数格式错误');
          return;
        }
      }

      // 构造请求参数，包含项目名称和周次
      const param = {
        Project_Name: projectInfo.Project_Name || '',
        Week_Display: projectInfo.Week_Display || ''
      };

      const param1 = {
        Project_Name: projectInfo.Project_Name || '',
      };

      // 首先获取项目信息
      SensorRequest.ProjectInfoGetFun(JSON.stringify(param1), (respData) => {
        try {
          const data = JSON.parse(respData);
          console.log('加载周报 Project_Name 详情:', projectInfo.Project_Name);
          if (data && data.length > 0) {
            const projectInfo = data[0];
            this.projectStartTime = projectInfo.Project_StartTime;
            this.projectEndTime = projectInfo.Project_ExEndTime;
            // 添加这行来确保获取数据后重新计算倒计时
            this.calculateCountdown();
          }
        } catch (error) {
          console.error('解析项目信息失败:', error);
        }
      }, (error) => {
        console.error('获取项目信息失败:', error);
      });

      // 获取周报详情
      SensorRequest.WeeklyReportsInfoGetFun(JSON.stringify(param), (respData) => {
        try {
          const data = JSON.parse(respData);

          // 如果只有一个对象，保持原有逻辑
          if (!Array.isArray(data)) {
            this.reportData = data;
          } else if (data.length === 1) {
            this.reportData = data[0];
          } else {
            // 如果有多个对象，根据汇报人姓名筛选
            const cachedUserName = projectInfo.Report_Person;
            // alert(cachedUserName)
            // 如果找到匹配的报告，使用匹配的报告
            this.reportData = data.find(item =>
              item.Report_Person && item.Report_Person.Person_Name === cachedUserName
            );
          }
          console.log('获取周报详情，reportData数据是:', this.reportData);
          // 数据加载完成后计算倒计时
          this.calculateCountdown();
        } catch (error) {
          console.error('解析周报详情失败:', error);
          Toast.fail('数据解析失败');
        } finally {
          this.loading = false;
        }
      }, (error) => {
        console.error('获取周报详情失败:', error);
        Toast.fail('获取周报详情失败');
        this.loading = false;
      });
    },


    calculateCountdown() {
      if (!this.projectEndTime) {
        this.countdownDays = null; // 当没有结束时间时设置为null
        return;
      }
      const today = new Date();
      const deadline = new Date(this.projectEndTime);
      const diffTime = deadline - today;
      this.countdownDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    },

    formatWorkContent(content) {
      if (!content) return '';
      // 将换行符转换为 HTML 换行标签
      return content.replace(/\r?\n/g, '<br>');
    }
  }
};
</script>

<style scoped>
.weekly-report-detail {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 头部样式 */
.header {
  background: white;
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.project-info {
  margin-bottom: 8px;
}

.project-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.project-details {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #333;
  margin-top: 8px;
}

.status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.status-text {
  color: #07c56d;
  font-weight: 500;
}

.status-text.normal {
  color: #07c56d;
}

.status-text.overdue {
  color: #f44336;
}

/* 倒计时样式 */
.countdown {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #3f83f8;
  font-weight: 500;
}

.countdown-text {
  font-weight: 500;
}

.countdown-days {
  font-weight: bold;
  color: #3f83f8;
  font-size: 16px;
}

/* 项目时间信息样式 */
.project-time-info {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 14px;
  color: #666;
}

.time-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.label {
  font-weight: 500;
  color: #999;
  font-size: 14px;
}

.value {
  color: #333;
}

/* 内容区域样式 */
.content {
  padding: 16px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.tab-item {
  padding: 8px 12px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  border-radius: 4px 4px 0 0;
  transition: all 0.3s ease;
}

.tab-item.active {
  background: #f0f8ff;
  color: #333;
  font-weight: 500;
  border-bottom: 2px solid #3f83f8;
}

.work-content-container {
  background: #3f83f8;
  border-radius: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 8px;
}

.work-content-wrapper {
  position: relative;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
}

.work-content {
  white-space: pre-line;
  line-height: 1.6;
  color: #333;
  font-size: 14px;
}
</style>
