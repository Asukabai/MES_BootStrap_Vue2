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
          />

          <van-field
            v-model="formData.Week_Display"
            label="周次"
            placeholder="请输入周次"
          />

          <van-field
            v-model="formData.Report_Person.Person_Name"
            label="汇报人"
            placeholder="请输入汇报人"
          />

          <van-field
            v-model="formData.Project_Manager.Person_Name"
            label="项目经理"
            placeholder="请输入项目经理"
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

        <div style="margin: 16px; display: flex; justify-content: center; gap: 16px;">
          <van-button
            round
            type="default"
            @click="goBack"
            size="large"
            style="padding: 12px 24px; border-radius: 18px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);"
          >
            取消返回
          </van-button>
          <van-button
            round
            type="info"
            native-type="submit"
            size="large"
            style="padding: 12px 24px; border-radius: 18px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);"
          >
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
    goBack() {
      this.$router.go(-1);
    },

    loadReportDetail() {
      // 从路由查询参数中获取传递的数据
      const query = this.$route.query;

      if (query.reportData) {
        try {
          // 解析传递的报告数据
          const reportData = JSON.parse(decodeURIComponent(query.reportData));
          console.log("解析传递的报告数据: ", reportData);

          // 将数据赋值给 formData
          this.formData = {
            ...this.formData,
            ...reportData,
            Report_Person: {
              ...this.formData.Report_Person,
              ...reportData.Report_Person
            },
            Project_Manager: {
              ...this.formData.Project_Manager,
              ...reportData.Project_Manager
            }
          };
        } catch (error) {
          console.error('解析报告数据失败:', error);
          Toast.fail('数据解析失败');
        }
      }

      // 无论成功或失败，都设置 loading 为 false
      this.loading = false;
    },

    onSubmit() {
      // 显示确认弹窗
      this.$dialog.confirm({
        title: '确认保存',
        message: '确定要保存当前修改吗？',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }).then(() => {
        // 调用更新周报接口
        const param = {
          ...this.formData
        };

        SensorRequest.WeeklyReportsInfoUpdateFun(JSON.stringify(param), (respData) => {
          try {
            const result = JSON.parse(respData);
            console.log('保存周报结果:', result);
            if (result) {
              Toast.success('保存成功');
              setTimeout(() => {
                this.$router.go(-1);
              }, 1000);
            } else {
              Toast.fail('保存失败');
            }
          } catch (error) {
            console.error('处理响应失败:', error);
            Toast.fail('保存失败');
          }
        }, (error) => {
          console.error('保存失败:', error);
          Toast.fail('保存失败');
        });
      }).catch(() => {
        // 用户点击取消，不执行保存操作
      });
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
