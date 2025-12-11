<template>
  <div class="weekly-report-add">
    <div class="content">
      <van-form @submit="onSubmit">
        <van-cell-group inset>
          <van-field
            v-model="formData.Project_Name"
            label="项目名称"
            placeholder="请输入项目名称"
            :rules="[{ required: true, message: '请填写项目名称' }]"
          />
          <van-field
            v-model="formData.Week_Display"
            label="周次"
            placeholder="例如: 2025-1117-1121"
            :rules="[{ required: true, message: '请填写周次' }]"
          />
          <van-field
            v-model="formData.Report_Person.Person_Name"
            label="汇报人"
            placeholder="请输入汇报人姓名"
            :rules="[{ required: true, message: '请填写汇报人' }]"
          />
          <van-field
            v-model="formData.Project_Manager.Person_Name"
            label="项目经理"
            placeholder="请输入项目经理姓名"
            :rules="[{ required: true, message: '请填写项目经理' }]"
          />
          <van-field
            v-model="formData.Actual_Work"
            label="实际工作内容"
            type="textarea"
            placeholder="请输入实际工作内容"
            rows="6"
            autosize
            :rules="[{ required: true, message: '请填写实际工作内容' }]"
          />
          <van-field
            v-model="formData.Plan_Work"
            label="计划工作内容"
            type="textarea"
            placeholder="请输入计划工作内容"
            rows="6"
            autosize
            :rules="[{ required: true, message: '请填写计划工作内容' }]"
          />
        </van-cell-group>

        <div style="margin: 16px;">
          <van-button round block type="primary" native-type="submit">
            提交
          </van-button>
        </div>
      </van-form>
    </div>
  </div>
</template>

<script>
import { Toast } from 'vant';
// 如果有新增周报的接口，请在这里引入
// import SensorRequest from '../../utils/SensorRequest.js';

export default {
  name: 'WeeklyReportAdd',
  data() {
    return {
      formData: {
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
  methods: {
    onClickLeft() {
      this.$router.go(-1);
    },

    onSubmit() {
      // 这里需要调用新增周报的接口
      // 示例代码：
      /*
      const param = {
        ...this.formData
      };

      SensorRequest.WeeklyReportsAddFun(JSON.stringify(param), (respData) => {
        Toast.success('新增成功');
        this.$router.go(-1);
      }, (error) => {
        console.error('新增失败:', error);
        Toast.fail('新增失败');
      });
      */

      // 临时提示，实际开发中需要调用真实接口
      Toast.success('新增成功');
      this.$router.go(-1);
    }
  }
};
</script>

<style scoped>
.weekly-report-add {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.content {
  padding: 10px;
}
</style>
