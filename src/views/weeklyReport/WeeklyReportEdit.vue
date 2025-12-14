<template>
  <div class="weekly-report-edit">
    <div class="content">
      <van-loading v-if="loading" size="24px" vertical>加载中...</van-loading>

      <van-form v-else @submit="onSubmit">
        <van-cell-group inset>
          <!-- 修改项目名称为下拉选择框 -->
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
              :default-index="selectedProjectIndex"
              @confirm="onProjectConfirm"
              @cancel="showProjectPicker = false"
            />
          </van-popup>

          <!-- 修改周次为下拉选择框 -->
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
              :default-index="selectedWeekIndex"
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
      showProjectPicker: false,
      showWeekPicker: false,
      showStartDatePicker: false,
      showEndDatePicker: false,
      projectList: [], // 项目列表
      weekList: [], // 周次列表
      selectedProjectIndex: 0,
      selectedWeekIndex: 0,
      minDate: new Date(2020, 0, 1),
      maxDate: new Date(2030, 11, 31),
      formData: {
        Id: '',
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
    this.loadReportDetail();
    this.fetchProjectList(); // 加载项目列表
    this.fetchWeekList(); // 加载周次列表
  },
  methods: {
    goBack() {
      this.$router.go(-1);
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

    // 格式化日期显示（处理ISO格式日期）
    formatDisplayDate(dateString) {
      if (!dateString) return '';
      // 处理 ISO 格式日期字符串
      const date = new Date(dateString);
      return this.formatDate(date);
    },

    loadReportDetail() {
      // 从路由查询参数中获取传递的数据
      const query = this.$route.query;

      if (query.reportData) {
        try {
          // 解析传递的报告数据
          const reportData = JSON.parse(decodeURIComponent(query.reportData));
          console.log("解析传递的报告数据: ", reportData);

          // 格式化日期字段
          if (reportData.Week_StartDate) {
            reportData.Week_StartDate = this.formatDisplayDate(reportData.Week_StartDate);
          }
          if (reportData.Week_EndDate) {
            reportData.Week_EndDate = this.formatDisplayDate(reportData.Week_EndDate);
          }

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

          // 设置默认选中项索引
          if (this.formData.Project_Name) {
            this.selectedProjectIndex = this.projectList.indexOf(this.formData.Project_Name);
          }
          if (this.formData.Week_Display) {
            this.selectedWeekIndex = this.weekList.indexOf(this.formData.Week_Display);
          }
        } catch (error) {
          console.error('解析报告数据失败:', error);
          Toast.fail('数据解析失败');
        }
      }

      // 无论成功或失败，都设置 loading 为 false
      this.loading = false;
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

            // 设置默认选中项索引
            if (this.formData.Project_Name) {
              this.selectedProjectIndex = this.projectList.indexOf(this.formData.Project_Name);
            }
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

            // 设置默认选中项索引
            if (this.formData.Week_Display) {
              this.selectedWeekIndex = this.weekList.indexOf(this.formData.Week_Display);
            }
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

    // 项目选择确认
    onProjectConfirm(value, index) {
      this.formData.Project_Name = value;
      this.selectedProjectIndex = index;
      this.showProjectPicker = false;

      // 获取选中项目的详细信息
      SensorRequest.ProjectInfoGetFun(
        JSON.stringify({ Project_Name: value }),
        (respData) => {
          try {
            const data = JSON.parse(respData);
            console.log("编辑页面：获取选中项目的详细信息: ", data);
            if (data && data.length > 0) {
              const project = data[0];
              // alert( "编辑：project.uuid: "+project.Uuid)
              this.formData.Project_Uuid = project.Uuid || '';
              // 设置项目经理信息，确保不为空
              // 注意：根据后端数据结构，项目经理信息在 Project_Leader 数组中
              if (project.Project_Leader && project.Project_Leader.length > 0) {
                const leader = project.Project_Leader[0]; // 取第一个作为项目经理
                this.formData.Project_Manager.Person_Name = leader.Person_Name || '未知经理';
                this.formData.Project_Manager.Person_DingID = leader.Person_DingID || '0000000000';
                this.formData.Project_Manager.Person_Phone = leader.Person_Phone || '0000000000';
                this.formData.Project_Manager.Person_Department = leader.Person_Department || '未知部门';
              } else {
                // 如果没有项目经理信息，设置默认值
                this.formData.Project_Manager.Person_Name = '未知经理';
                this.formData.Project_Manager.Person_DingID = '0000000000';
                this.formData.Project_Manager.Person_Phone = '0000000000';
                this.formData.Project_Manager.Person_Department = '未知部门';
              }
            } else {
              // 如果没有获取到项目信息，设置默认值
              this.formData.Project_Uuid = '';
              this.formData.Project_Manager.Person_Name = '未知经理';
              this.formData.Project_Manager.Person_DingID = '0000000000';
              this.formData.Project_Manager.Person_Phone = '0000000000';
              this.formData.Project_Manager.Person_Department = '未知部门';
            }
          } catch (error) {
            console.error('解析项目详情失败:', error);
            // 出错时设置默认值
            this.formData.Project_Uuid = '';
            this.formData.Project_Manager.Person_Name = '未知经理';
            this.formData.Project_Manager.Person_DingID = '0000000000';
            this.formData.Project_Manager.Person_Phone = '0000000000';
            this.formData.Project_Manager.Person_Department = '未知部门';
          }
        },
        (error) => {
          console.error('获取项目详情失败:', error);
          // 出错时设置默认值
          this.formData.Project_Uuid = '';
          this.formData.Project_Manager.Person_Name = '未知经理';
          this.formData.Project_Manager.Person_DingID = '0000000000';
          this.formData.Project_Manager.Person_Phone = '0000000000';
          this.formData.Project_Manager.Person_Department = '未知部门';
        }
      );
    },

    // 周次选择确认
    onWeekConfirm(value, index) {
      this.formData.Week_Display = value;
      this.selectedWeekIndex = index;
      this.showWeekPicker = false;

      // 检查周次格式是否为 XXXX-XXXX-XXXX 格式（如 2025-1101-1106）
      const weekPattern = /^(\d{4})-(\d{4})-(\d{4})$/;
      const match = value.match(weekPattern);

      if (match) {
        const year = match[1];        // 年份
        const startDateStr = match[2]; // 开始日期部分
        const endDateStr = match[3];   // 结束日期部分

        // 解析开始日期：MMDD 格式
        if (startDateStr.length === 4) {
          const startMonth = startDateStr.substring(0, 2);
          const startDay = startDateStr.substring(2, 4);
          // 添加前导零格式化
          const formattedStartMonth = startMonth.padStart(2, '0');
          const formattedStartDay = startDay.padStart(2, '0');
          this.formData.Week_StartDate = `${year}-${formattedStartMonth}-${formattedStartDay}`;
        }

        // 解析结束日期：MMDD 格式
        if (endDateStr.length === 4) {
          const endMonth = endDateStr.substring(0, 2);
          const endDay = endDateStr.substring(2, 4);
          // 添加前导零格式化
          const formattedEndMonth = endMonth.padStart(2, '0');
          const formattedEndDay = endDay.padStart(2, '0');
          this.formData.Week_EndDate = `${year}-${formattedEndMonth}-${formattedEndDay}`;
        }
      } else {
        // 如果格式不匹配，清空日期并提示用户手动选择
        this.formData.Week_StartDate = '';
        this.formData.Week_EndDate = '';
        Toast.fail('周次格式不匹配，请手动选择日期');
      }
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
