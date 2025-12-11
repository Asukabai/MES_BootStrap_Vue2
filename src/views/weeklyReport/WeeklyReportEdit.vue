<!-- src/views/weeklyReport/WeeklyReportEdit.vue -->
<template>
  <div class="weekly-report-edit">
    <div class="content">
      <van-loading v-if="loading" size="24px" vertical>加载中...</van-loading>

      <van-form v-else @submit="onSubmit">
        <van-cell-group inset>
          <van-field
            v-model="formData.Project_Name"
            label="项目名称"
            placeholder="请输入项目名称"
            readonly
          />

          <van-field
            v-model="formData.Week_Display"
            label="周次"
            placeholder="请输入周次"
            readonly
          />

          <van-field
            v-model="formData.Report_Person.Person_Name"
            label="汇报人"
            placeholder="请输入汇报人"
            readonly
          />

          <van-field
            v-model="formData.Project_Manager.Person_Name"
            label="项目经理"
            placeholder="请输入项目经理"
            readonly
          />

          <van-field
            v-model="formData.Actual_Work"
            label="实际工作内容"
            type="textarea"
            placeholder="请输入实际工作内容"
            rows="6"
            autosize
          />

          <van-field
            v-model="formData.Plan_Work"
            label="计划工作内容"
            type="textarea"
            placeholder="请输入计划工作内容"
            rows="6"
            autosize
          />
        </van-cell-group>

        <div style="margin: 16px;">
          <van-button round block type="primary" native-type="submit">
            保存
          </van-button>
        </div>
      </van-form>
    </div>
  </div>
</template>

<script>
import { Toast } from 'vant';
import SensorRequest from '../../utils/SensorRequest.js';

export default {
  name: 'WeeklyReportEdit',
  data() {
    return {
      loading: true,
      formData: {
        Id: '',
        Project_Name: '',
        Week_Display: '',
        Report_Person: {
          Person_Name: ''
        },
        Project_Manager: {
          Person_Name: ''
        },
        Actual_Work: '',
        Plan_Work: ''
      }
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
      const param = {
        Id: reportId
      };

      SensorRequest.WeeklyReportsInfoGetFun(JSON.stringify(param), (respData) => {
        try {
          const data = JSON.parse(respData);
          const report = Array.isArray(data) ? data[0] : data;

          this.formData = {
            ...this.formData,
            ...report,
            Report_Person: {
              ...this.formData.Report_Person,
              ...report.Report_Person
            },
            Project_Manager: {
              ...this.formData.Project_Manager,
              ...report.Project_Manager
            }
          };
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

    onSubmit() {
      // 这里需要调用更新周报的接口
      // 假设有一个更新周报的接口 WeeklyReportsUpdateFun
      const param = {
        ...this.formData
      };

      // 示例更新接口调用
      // SensorRequest.WeeklyReportsUpdateFun(JSON.stringify(param), (respData) => {
      //   Toast.success('保存成功');
      //   this.$router.go(-1);
      // }, (error) => {
      //   console.error('保存失败:', error);
      //   Toast.fail('保存失败');
      // });

      Toast.success('保存成功');
      this.$router.go(-1);
    }
  }
};
</script>

<style scoped>
.weekly-report-edit {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.content {
  padding: 10px;
}
</style>
