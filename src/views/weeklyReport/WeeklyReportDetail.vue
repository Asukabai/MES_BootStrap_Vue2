<template>
  <div class="weekly-report-detail">

    <div class="content">
      <van-loading v-if="loading" size="24px" vertical>加载中...</van-loading>

      <div v-else class="report-card">
        <van-cell-group>
          <van-cell title="项目名称" :value="reportData.Project_Name" />
          <van-cell title="汇报人" :value="reportData.Report_Person.Person_Name" />
          <van-cell title="周次" :value="reportData.Week_Display" />
          <van-cell title="项目经理" :value="reportData.Project_Manager.Person_Name" />
          <van-cell title="汇报时间" :value="formatDate(reportData.Ts_create)" />
        </van-cell-group>

        <van-cell-group title="实际工作内容">
          <van-cell>
            <div class="work-content" v-html="formatWorkContent(reportData.Actual_Work)"></div>
          </van-cell>
        </van-cell-group>

        <van-cell-group title="计划工作内容">
          <van-cell>
            <div class="work-content" v-html="formatWorkContent(reportData.Plan_Work)"></div>
          </van-cell>
        </van-cell-group>
      </div>
    </div>
  </div>
</template>

<script>
import { Toast } from 'vant';
import SensorRequest from '../../utils/SensorRequest.js';

export default {
  name: 'WeeklyReportDetail',
  data() {
    return {
      loading: true,
      reportData: {}
    };
  },
  created() {
    this.loadReportDetail();
  },
  methods: {
    onClickLeft() {
      this.$router.go(-1);
    },

    loadReportDetail() {
      const reportId = this.$route.params.id;
      // 这里需要根据实际情况调用获取周报详情的接口
      // 假设有一个获取单个周报详情的接口
      const param = {
        Id: reportId
      };

      // 示例：如果 WeeklyReportsInfoGetFun 支持通过 ID 查询单条记录
      SensorRequest.WeeklyReportsInfoGetFun(JSON.stringify(param), (respData) => {
        try {
          const data = JSON.parse(respData);
          this.reportData = Array.isArray(data) ? data[0] : data;
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

    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
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

.content {
  padding: 10px;
}

.report-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 10px;
}

.work-content {
  white-space: pre-line;
  line-height: 1.5;
  color: #333;
}
</style>
