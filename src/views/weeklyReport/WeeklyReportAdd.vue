<template>
  <div class="weekly-report-add">
    <div class="content">
      <van-loading v-if="loading" size="24px" vertical>加载中...</van-loading>

      <van-form v-else @submit="onSubmit">
        <van-cell-group inset>
          <!-- 项目名称下拉选择 -->
          <van-field
            v-model="formData.Project_Name"
            label="项目名称"
            placeholder="请选择项目名称"
            is-link
            readonly
            @click="showProjectPicker = true"
          />
          <van-popup v-model="showProjectPicker" position="bottom">
            <van-picker
              show-toolbar
              :columns="projectList"
              @confirm="onProjectConfirm"
              @cancel="showProjectPicker = false"
            />
          </van-popup>

          <!-- 周次下拉选择 -->
          <van-field
            v-model="formData.Week_Display"
            label="周次"
            placeholder="请选择周次"
            is-link
            readonly
            @click="showWeekPicker = true"
          />
          <van-popup v-model="showWeekPicker" position="bottom">
            <van-picker
              show-toolbar
              :columns="weekList"
              @confirm="onWeekConfirm"
              @cancel="showWeekPicker = false"
            />
          </van-popup>

          <!-- 开始日期选择 -->
          <van-field
            v-model="formData.Week_StartDate"
            label="开始日期"
            placeholder="请选择开始日期"
            is-link
            readonly
            @click="showStartDatePicker = true"
          />
          <van-popup v-model="showStartDatePicker" position="bottom">
            <van-datetime-picker
              type="date"
              :min-date="minDate"
              :max-date="maxDate"
              :formatter="formatter"
              @confirm="onStartDateConfirm"
              @cancel="showStartDatePicker = false"
            />
          </van-popup>

          <!-- 结束日期选择 -->
          <van-field
            v-model="formData.Week_EndDate"
            label="结束日期"
            placeholder="请选择结束日期"
            is-link
            readonly
            @click="showEndDatePicker = true"
          />
          <van-popup v-model="showEndDatePicker" position="bottom">
            <van-datetime-picker
              type="date"
              :min-date="minDate"
              :max-date="maxDate"
              :formatter="formatter"
              @confirm="onEndDateConfirm"
              @cancel="showEndDatePicker = false"
            />
          </van-popup>

          <!-- 汇报人（从缓存中获取） -->
          <van-field
            v-model="formData.Report_Person.Person_Name"
            label="汇报人"
            placeholder="汇报人"
            readonly
          />

          <!-- 项目经理 -->
          <van-field
            v-model="formData.Project_Manager.Person_Name"
            label="项目经理"
            placeholder="请输入项目经理"
          />

          <!-- 项目年度 -->
          <van-field
            v-model.number="formData.Report_Year"
            label="项目年度"
            placeholder="请输入项目年度"
            type="number"
          />

          <!-- 实际工作内容 -->
          <van-field
            v-model="formData.Actual_Work"
            label="实际工作内容"
            type="textarea"
            placeholder="请输入实际工作内容"
            rows="6"
            autosize
          />

          <!-- 计划工作内容 -->
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
import { key_DingName, key_DingUserIndex, key_DingUserPhone } from '../../utils/Dingding.js';

export default {
  name: 'WeeklyReportAdd',
  data() {
    return {
      loading: true,
      showProjectPicker: false,
      showWeekPicker: false,
      showStartDatePicker: false,
      showEndDatePicker: false,
      projectList: [], // 项目列表
      weekList: [], // 周次列表
      minDate: new Date(2020, 0, 1),
      maxDate: new Date(2030, 11, 31),
      formData: {
        Project_Uuid: '',
        Project_Name: '',
        Week_Display: '',
        Week_StartDate: '',
        Week_EndDate: '',
        Report_Year: new Date().getFullYear(),
        Report_Person: {
          Person_DingID: '',
          Person_Phone: '',
          Person_Name: '',
          Person_Department: ''
        },
        Project_Manager: {
          Person_DingID: '',
          Person_Phone: '',
          Person_Name: '',
          Person_Department: ''
        },
        Actual_Work: '',
        Plan_Work: ''
      }
    };
  },
  created() {
    this.fetchProjectList(); // 加载项目列表
    this.fetchWeekList(); // 加载周次列表
    this.loadUserInfo(); // 加载用户信息
    this.loading = false;
  },
  methods: {
    goBack() {
      this.$router.go(-1);
    },

    // 加载用户信息
    loadUserInfo() {
      const name = localStorage.getItem(key_DingName);
      const phone = localStorage.getItem(key_DingUserPhone);
      const dingID = localStorage.getItem(key_DingUserIndex);

      // 确保所有字段都有默认值，不能为空字符串
      this.formData.Report_Person.Person_Name = name || '未知用户';
      this.formData.Report_Person.Person_Phone = phone || '0000000000';
      this.formData.Report_Person.Person_DingID = dingID || '0000000000';
      this.formData.Report_Person.Person_Department = '未知部门';
    },

    // 日期格式化函数
    formatter(type, val) {
      if (type === 'year') {
        return `${val}年`;
      } else if (type === 'month') {
        return `${val}月`;
      } else if (type === 'day') {
        return `${val}日`;
      }
      return val;
    },

    // 格式化日期为 YYYY-MM-DD 格式
    formatDate(date) {
      if (!date) return '';
      const d = new Date(date);
      let month = '' + (d.getMonth() + 1);
      let day = '' + d.getDate();
      const year = d.getFullYear();

      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;

      return [year, month, day].join('-');
    },

    // 获取项目列表
    fetchProjectList() {
      SensorRequest.ProjectInfoGetFun(
        '',
        (respData) => {
          try {
            const data = JSON.parse(respData);
            const list = Array.isArray(data) ? data : [data];
            // 提取项目名称字段
            this.projectList = list.map(p => p.Project_Name);
          } catch (error) {
            console.error('解析项目数据失败:', error);
            Toast.fail('项目数据解析失败');
          }
        },
        (error) => {
          console.error('获取项目列表失败:', error);
          Toast.fail('获取项目列表失败');
        }
      );
    },

    // 获取周次列表
    fetchWeekList() {
      SensorRequest.MeetingWeekDisplayGetFun(
        '',
        (respData) => {
          try {
            const data = JSON.parse(respData);
            const list = Array.isArray(data) ? data : [data];
            // 提取周次显示字段
            this.weekList = list.map(w => w.Week_Display || w);
          } catch (error) {
            console.error('解析周次数据失败:', error);
            Toast.fail('周次数据解析失败');
          }
        },
        (error) => {
          console.error('获取周次列表失败:', error);
          Toast.fail('获取周次列表失败');
        }
      );
    },

    // 生成项目UUID (19位数字字符串)
    generateProjectUuid() {
      // 生成19位数字字符串，模仿 "1394948616929411072" 格式
      let uuid = '';
      // 第一位不能为0
      uuid += Math.floor(Math.random() * 9) + 1;
      // 剩余18位
      for (let i = 0; i < 18; i++) {
        uuid += Math.floor(Math.random() * 10);
      }
      return uuid;
    },

    // 项目选择确认
    onProjectConfirm(value) {
      this.formData.Project_Name = value;
      this.showProjectPicker = false;

      // 确保汇报人信息完整
      if (!this.formData.Report_Person.Person_Name ||
        this.formData.Report_Person.Person_Name === '未知用户' ||
        !this.formData.Report_Person.Person_DingID) {
        this.loadUserInfo();
      }

      // 获取选中项目的详细信息
      SensorRequest.ProjectInfoGetFun(
        JSON.stringify({ Project_Name: value }),
        (respData) => {
          try {
            const data = JSON.parse(respData);
            if (data && data.length > 0) {
              const project = data[0];
              // 生成随机 Project_Uuid (19位数字字符串)
              this.formData.Project_Uuid = this.generateProjectUuid();
              // 设置项目经理信息，确保不为空
              this.formData.Project_Manager.Person_Name =
                (project.Project_Manager && project.Project_Manager.Person_Name) || '未知经理';
              this.formData.Project_Manager.Person_DingID =
                (project.Project_Manager && project.Project_Manager.Person_DingID) || '0000000000';
              this.formData.Project_Manager.Person_Phone =
                (project.Project_Manager && project.Project_Manager.Person_Phone) || '0000000000';
              this.formData.Project_Manager.Person_Department =
                (project.Project_Manager && project.Project_Manager.Person_Department) || '未知部门';
            } else {
              // 如果没有获取到项目信息，设置默认值
              this.formData.Project_Uuid = this.generateProjectUuid();
              this.formData.Project_Manager.Person_Name = '未知经理';
              this.formData.Project_Manager.Person_DingID = '0000000000';
              this.formData.Project_Manager.Person_Phone = '0000000000';
              this.formData.Project_Manager.Person_Department = '未知部门';
            }
          } catch (error) {
            console.error('解析项目详情失败:', error);
            // 出错时设置默认值
            this.formData.Project_Uuid = this.generateProjectUuid();
            this.formData.Project_Manager.Person_Name = '未知经理';
            this.formData.Project_Manager.Person_DingID = '0000000000';
            this.formData.Project_Manager.Person_Phone = '0000000000';
            this.formData.Project_Manager.Person_Department = '未知部门';
          }
        },
        (error) => {
          console.error('获取项目详情失败:', error);
          // 出错时设置默认值
          this.formData.Project_Uuid = this.generateProjectUuid();
          this.formData.Project_Manager.Person_Name = '未知经理';
          this.formData.Project_Manager.Person_DingID = '0000000000';
          this.formData.Project_Manager.Person_Phone = '0000000000';
          this.formData.Project_Manager.Person_Department = '未知部门';
        }
      );
    },

    // 周次选择确认
    onWeekConfirm(value) {
      this.formData.Week_Display = value;
      this.showWeekPicker = false;
    },

    // 开始日期选择确认
    onStartDateConfirm(value) {
      this.formData.Week_StartDate = this.formatDate(value);
      this.showStartDatePicker = false;
    },

    // 结束日期选择确认
    onEndDateConfirm(value) {
      this.formData.Week_EndDate = this.formatDate(value);
      this.showEndDatePicker = false;
    },

    onSubmit() {
      // 验证必填字段
      if (!this.formData.Project_Name) {
        Toast.fail('请选择项目名称');
        return;
      }

      if (!this.formData.Week_Display) {
        Toast.fail('请选择周次');
        return;
      }

      if (!this.formData.Week_StartDate || !this.formData.Week_EndDate) {
        Toast.fail('请选择开始日期和结束日期');
        return;
      }

      if (!this.formData.Actual_Work) {
        Toast.fail('请输入实际工作内容');
        return;
      }

      if (!this.formData.Plan_Work) {
        Toast.fail('请输入计划工作内容');
        return;
      }

      // 构建完整的提交数据，确保所有字段都不为空
      const submitData = {
        Project_Uuid: this.formData.Project_Uuid || this.generateProjectUuid(),
        Project_Name: this.formData.Project_Name,
        Week_Display: this.formData.Week_Display,
        Week_StartDate: this.formData.Week_StartDate,
        Week_EndDate: this.formData.Week_EndDate,
        Report_Year: this.formData.Report_Year,
        Report_Person: {
          Person_DingID: this.formData.Report_Person.Person_DingID || '0000000000',
          Person_Phone: this.formData.Report_Person.Person_Phone || '0000000000',
          Person_Name: this.formData.Report_Person.Person_Name || '未知用户',
          Person_Department: this.formData.Report_Person.Person_Department || '未知部门'
        },
        Project_Manager: {
          Person_DingID: this.formData.Project_Manager.Person_DingID || '0000000000',
          Person_Phone: this.formData.Project_Manager.Person_Phone || '0000000000',
          Person_Name: this.formData.Project_Manager.Person_Name || '未知经理',
          Person_Department: this.formData.Project_Manager.Person_Department || '未知部门'
        },
        Project_Nodes: '',
        Required_Nodes: '',
        Actual_CompletionNode: '',
        Countdown_Days: 0,
        Is_Delayed: '否',
        Delay_Reason: '',
        Actual_Work: this.formData.Actual_Work,
        Plan_Work: this.formData.Plan_Work
      };

      // 显示确认弹窗
      this.$dialog.confirm({
        title: '确认保存',
        message: '确定要保存当前周报吗？',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }).then(() => {
        console.log('提交的完整数据:', submitData);
        SensorRequest.WeeklyReportsInfoAddFun(JSON.stringify(submitData), (respData) => {
          try {
            const result = JSON.parse(respData);
            console.log('新增周报结果:', result);
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
            Toast.fail('保存失败: ' + (error.message || '数据解析失败'));
          }
        }, (error) => {
          console.error('保存失败:', error);
          Toast.fail('保存失败: ' + (error.message || '网络请求失败'));
        });
      }).catch(() => {
        // 用户点击取消，不执行保存操作
      });
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
