<template>
  <div class="task-page">
    <!-- 固定在顶部的搜索区域 -->
    <div class="search-section search-top fixed-top">
      <!-- 搜索类型切换 -->
      <div class="search-type-tabs">
        <div
          v-for="type in searchTypeOptions"
          :key="type.value"
          :class="['search-type-tab', { active: activeSearchTypes.includes(type.value) }]"
          @click="toggleSearchType(type.value)"
        >
          {{ type.label }}
          <van-icon v-if="activeSearchTypes.includes(type.value)" name="success" class="active-icon" />
        </div>
      </div>

      <div class="search-container">
        <!-- 项目编码下拉选择 -->
        <van-dropdown-menu v-if="activeSearchTypes.includes('projectCode')" class="search-dropdown">
          <van-dropdown-item
            v-model="searchParams.projectCode"
            :options="projectCodeOptions"
            @change="onProjectCodeChange"
          />
        </van-dropdown-menu>

        <!-- 任务名称搜索 -->
        <van-field
          v-if="activeSearchTypes.includes('taskName')"
          v-model="searchParams.taskName"
          placeholder="请输入任务名称"
          class="search-input"
          inputmode="search"
          enterkeyhint="search"
        />

        <!-- 任务状态下拉选择 -->
        <van-dropdown-menu v-if="activeSearchTypes.includes('taskStatus')" class="search-dropdown">
          <van-dropdown-item
            v-model="searchParams.taskStatus"
            :options="taskStatusOptions"
            @change="onTaskStatusChange"
          />
        </van-dropdown-menu>

        <!-- 搜索按钮 -->
        <van-button
          type="info"
          class="search-btn"
          @click="onSearch"
        >
          <van-icon name="search" />
          搜索
        </van-button>

        <!-- 重置按钮 -->
        <van-button
          type="info"
          class="reset-btn"
          @click="onReset"
        >
          <van-icon name="replay" />
          重置
        </van-button>

        <!-- 排序图标按钮 -->
        <van-icon
          :name="sortIcon"
          :class="['sort-icon-btn', { active: sortOrder !== 'none' }]"
          @click="toggleSort"
        />
      </div>
    </div>

    <!-- 固定在顶部的过滤器按钮 -->
    <div v-if="showFilters" class="filter-buttons fixed-top">
      <van-button
          v-for="status in ['已完成', '进行中', '未开始', '搁置', '待验收']"
          :key="status"
          :type="activeFilters.includes(status) ? 'primary' : 'default'"
          size="small"
          @click="toggleFilter(status)"
      >
        {{ status }}
      </van-button>
    </div>

    <!-- 任务列表区域 -->
    <div class="tasks-container">
      <!-- 任务列表卡片 -->
      <div class="task-section">
        <!-- 任务类型切换 -->
        <div class="task-type-switch">
          <button 
            :class="['switch-btn', { active: activeTaskType === 'participated' }]"
            @click="switchTaskType('participated')"
          >
            我参与的
          </button>
          <button 
            :class="['switch-btn', { active: activeTaskType === 'responsible' }]"
            @click="switchTaskType('responsible')"
          >
            我负责的
          </button>
        </div>

        <!-- 我参与的任务 -->
        <div v-if="activeTaskType === 'participated'">
          <van-pull-refresh
              v-model="participatedRefreshing"
              @refresh="onParticipatedRefresh">
            <div class="cards-container">
              <van-list
                  :loading="participatedLoading"
                  :finished="participatedFinished"
                  :finished-text="`共有 ${participatedTotal} 条任务记录，没有更多了`"
                  @load="loadParticipatedTasks"
              >
                <van-card
                    v-for="item in participatedList"
                    :key="item.ID_TaskInfo"
                    :title="`任务名称：${item.Task_Name || '未命名任务'}`"
                    :desc="formatParticipatedDesc(item)"
                    class="task-card share-card"
                >

                  <!-- 标签 -->
                  <template #tags>
                    <van-tag
                        :type="getTaskStatusType(item.Task_Status)"
                    >
                      {{ item.Task_Status }}
                    </van-tag>
                    <van-tag plain type="primary">
                      {{ formatDateRange(item.Task_StartTime, item.Task_ExEndTime) }}
                    </van-tag>
                  </template>

                  <template #footer>
                    <van-button
                        icon="eye-o"
                        round
                        size="small"
                        type="info"
                        @click="goToTaskDetailLook(item)"
                    >
                      查看
                    </van-button>
                  </template>
                </van-card>
              </van-list>
            </div>
          </van-pull-refresh>
        </div>

        <!-- 我负责的任务 -->
        <div v-else>
          <van-pull-refresh
              v-model="responsibleRefreshing"
              @refresh="onResponsibleRefresh">
            <div class="cards-container">
              <van-list
                  :loading="responsibleLoading"
                  :finished="responsibleFinished"
                  :finished-text="`共有 ${responsibleTotal} 条任务记录，没有更多了`"
                  @load="loadResponsibleTasks"
              >
                <van-card
                    v-for="item in responsibleList"
                    :key="item.ID_TaskInfo"
                    :title="`任务名称：${item.Task_Name || '未命名任务'}`"
                    :desc="formatParticipatedDesc(item)"
                    class="task-card share-card"
                >
                  <!-- 标签 -->
                  <template #tags>
                    <van-tag
                        :type="getTaskStatusType(item.Task_Status)"
                    >
                      {{ item.Task_Status }}
                    </van-tag>
                    <van-tag plain type="primary">
                      {{ formatDateRange(item.Task_StartTime, item.Task_ExEndTime) }}
                    </van-tag>
                  </template>

                  <template #footer>
                    <van-button
                        icon="eye-o"
                        round size="small"
                        type="info"
                        @click="goToTaskDetailLook(item)">
                      查看
                    </van-button>
                  </template>
                </van-card>
              </van-list>
            </div>
          </van-pull-refresh>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { Toast } from 'vant';
import {key_DingUserPhone} from '@/utils/Dingding';
import {GetDingUserToken} from "../../utils/Dingding";
import SensorRequestPage from "../../utils/SensorRequestPage";

function getLocalUserInfo() {
  const phone = localStorage.getItem(key_DingUserPhone);
  return {
    phone: phone || '',
  };
}

export default {
  name: 'TaskPage',
  data() {
    return {

      // 我参与的任务数据
      participatedList: [],
      participatedLoading: false,
      participatedFinished: false,
      participatedRefreshing: false,
      participatedCurrentPage: 1,
      participatedPageSize: 10,
      participatedTotal: 0,

      // 我负责的任务数据
      responsibleList: [],
      responsibleLoading: false,
      responsibleFinished: false,
      responsibleRefreshing: false,
      responsibleCurrentPage: 1,
      responsiblePageSize: 10,
      responsibleTotal: 0,

      // 搜索相关
      sortOrder: 'none',
      activeSearchTypes: ['taskName'],
      searchParams: {
        projectCode: '',
        taskName: '',
        taskStatus: ''
      },
      searchTypeOptions: [
        { label: '任务名称', value: 'taskName' },
        { label: '项目编码', value: 'projectCode' },
        { label: '任务状态', value: 'taskStatus' }
      ],
      // 任务列表切换
      activeTaskType: 'participated', // 'participated' 或 'responsible'
      taskStatusOptions: [
        { text: '全部', value: '' },
        { text: '已完成', value: '已完成' },
        { text: '进行中', value: '进行中' },
        { text: '未开始', value: '未开始' },
        { text: '搁置', value: '搁置' },
        { text: '待验收', value: '待验收' }
      ],
      projectCodeOptions: [
        { text: '全部', value: '' }
      ],
      hasSearched: false,

      // 其他
      showFilters: false, // 是否显示过滤器
      activeFilters: [] // 激活的过滤器
    };
  },
  mounted() {
    const department = this.$route.params.department
    GetDingUserToken(department,(token) => {},(token) => {})
    // 页面加载时请求 "我参与的" 和 "我负责的" 任务数据
    this.loadParticipatedTasks();
    this.loadResponsibleTasks();
  },
  computed: {
    sortIcon() {
      if (this.sortOrder === 'none') {
        return 'exchange';
      } else if (this.sortOrder === 'asc') {
        return 'ascending';
      } else {
        return 'descending';
      }
    }
  },
  methods: {
    // 更新项目编码选项
    updateProjectCodeOptions(newData) {
      const projectCodeSet = new Set();
      newData.forEach(task => {
        if (task.Project_Code) {
          projectCodeSet.add(task.Project_Code);
        }
      });

      const existingCodes = this.projectCodeOptions.filter(opt => opt.value !== '').map(opt => opt.value);
      projectCodeSet.forEach(code => {
        if (!existingCodes.includes(code)) {
          this.projectCodeOptions.push({ text: code, value: code });
        }
      });
    },

    // 项目编码下拉选择变化
    onProjectCodeChange(value) {
      if (value) {
        Toast({
          message: `已选择项目编码：${value}`,
          position: 'bottom'
        });
      }
    },

    // 任务状态下拉选择变化
    onTaskStatusChange(value) {
      if (value) {
        Toast({
          message: `已选择任务状态：${value}`,
          position: 'bottom'
        });
      }
    },

    // 切换任务类型
    switchTaskType(type) {
      this.activeTaskType = type;
    },

    // 切换搜索类型
    toggleSearchType(type) {
      const index = this.activeSearchTypes.indexOf(type);
      if (index > -1) {
        if (this.activeSearchTypes.length > 1) {
          this.activeSearchTypes.splice(index, 1);
        }
      } else {
        this.activeSearchTypes.push(type);
      }
      const typeObj = this.searchTypeOptions.find(t => t.value === type);
      const typeLabel = typeObj ? typeObj.label : type;
      Toast({
        message: `已${this.activeSearchTypes.includes(type) ? '添加' : '移除'} "${typeLabel}" 筛选条件`,
        position: 'bottom'
      });
    },

    // 切换排序方式
    toggleSort() {
      if (this.sortOrder === 'none') {
        this.sortOrder = 'asc';
        Toast({ message: '已切换为开始时间升序', position: 'bottom' });
      } else if (this.sortOrder === 'asc') {
        this.sortOrder = 'desc';
        Toast({ message: '已切换为开始时间降序', position: 'bottom' });
      } else {
        this.sortOrder = 'none';
        Toast({ message: '已切换为默认排序', position: 'bottom' });
      }
      this.applySort();
    },

    // 应用排序
    applySort() {
      if (this.sortOrder === 'none') {
        return;
      }

      // 对我参与的任务排序
      this.participatedList.sort((a, b) => {
        const timeA = new Date(a.Task_StartTime).getTime();
        const timeB = new Date(b.Task_StartTime).getTime();
        if (this.sortOrder === 'asc') {
          return timeA - timeB;
        } else {
          return timeB - timeA;
        }
      });

      // 对我负责的任务排序
      this.responsibleList.sort((a, b) => {
        const timeA = new Date(a.Task_StartTime).getTime();
        const timeB = new Date(b.Task_StartTime).getTime();
        if (this.sortOrder === 'asc') {
          return timeA - timeB;
        } else {
          return timeB - timeA;
        }
      });
    },

    // 执行搜索
    onSearch() {
      const hasSearchParams = this.activeSearchTypes.some(type => {
        if (type === 'projectCode') return this.searchParams.projectCode;
        if (type === 'taskName') return this.searchParams.taskName;
        if (type === 'taskStatus') return this.searchParams.taskStatus;
        return false;
      });

      if (!hasSearchParams) {
        Toast('请输入搜索条件');
        return;
      }

      this.hasSearched = true;

      // 重置两个标签页的数据
      this.participatedCurrentPage = 1;
      this.participatedList = [];
      this.participatedFinished = false;

      this.responsibleCurrentPage = 1;
      this.responsibleList = [];
      this.responsibleFinished = false;

      Toast.loading({ message: '搜索中...', forbidClick: true });

      // 执行搜索
      Promise.all([
        this.loadParticipatedTasks(),
        this.loadResponsibleTasks()
      ]).then(() => {
        Toast.success(`搜索完成`);
      });
    },

    // 重置搜索
    onReset() {
      Toast.loading({ message: '重置中...', forbidClick: true });
      this.searchParams = {
        projectCode: '',
        taskName: '',
        taskStatus: ''
      };
      this.activeSearchTypes = ['projectCode'];
      this.hasSearched = false;

      // 重置两个标签页的数据
      this.participatedCurrentPage = 1;
      this.participatedList = [];
      this.participatedFinished = false;

      this.responsibleCurrentPage = 1;
      this.responsibleList = [];
      this.responsibleFinished = false;

      Promise.all([
        this.loadParticipatedTasks(),
        this.loadResponsibleTasks()
      ]).then(() => {
        Toast.success('已重置');
      });
    },

    // 应用排序和过滤
    applySortAndFilter() {
      // 对我参与的任务进行排序和过滤
      let participatedList = [...this.participatedList];

      // 过滤
      if (this.activeFilters.length > 0) {
        participatedList = participatedList.filter(item =>
            this.activeFilters.includes(item.Task_Status)
        );
      }

      // 排序
      if (this.sortOrder !== 'none') {
        participatedList.sort((a, b) => {
          const timeA = new Date(a.Task_StartTime).getTime();
          const timeB = new Date(b.Task_StartTime).getTime();
          if (this.sortOrder === 'asc') {
            return timeA - timeB;
          } else {
            return timeB - timeA;
          }
        });
      }
      this.participatedList = participatedList;
    },

    // 切换过滤器显示
    toggleFilters() {
      this.showFilters = !this.showFilters;
    },

    // 切换特定过滤器
    toggleFilter(status) {
      const index = this.activeFilters.indexOf(status);
      if (index === -1) {
        this.activeFilters.push(status);
      } else {
        this.activeFilters.splice(index, 1);
      }
      this.applySortAndFilter();
    },

    // 下拉刷新 - 我参与的
    onParticipatedRefresh() {
      this.participatedRefreshing = true;
      this.participatedFinished = false;
      this.participatedCurrentPage = 1;
      this.participatedList = [];
      this.loadParticipatedTasks();
    },

    // 下拉刷新 - 我负责的
    onResponsibleRefresh() {
      this.responsibleRefreshing = true;
      this.responsibleFinished = false;
      this.responsibleCurrentPage = 1;
      this.responsibleList = [];
      this.loadResponsibleTasks();
    },

    getTaskStatusType(status) {
      switch (status) {
        case '已完成':
          return 'success';
        case '进行中':
          return 'primary';
        case '未开始':
          return 'default';
        case '搁置':
          return 'warning';
      }
    },
    // 判断任务是否已完成
    isTaskCompleted(status) {
      return status === "已完成";
    },

    // 处理任务按钮点击
    handleTaskButtonClick(item, action) {
      if (this.isTaskCompleted(item.Task_Status)) {
        this.$toast({
          message: "已完成的任务无法再次提交",
          duration: 2000,
          forbidClick: true
        });
        return;
      }

      if (action === "完成提交") {
        this.goToTaskDetail(item);
      } else if (action === "进度提交") {
        this.goToTaskDetailProgress(item);
      } else if (action === "查看") {
        this.goToTaskDetailLook(item);
      }
    },


    // 加载 "我参与的" 任务（调用 GetTaskInfoWithMeFun 接口）
    async loadParticipatedTasks() {
      this.participatedLoading = true;

      const userInfo = getLocalUserInfo();
      const requestParams = JSON.stringify({
        Person_Phone: userInfo.phone,
        Project_Code: this.searchParams.projectCode || '',
        Task_Name: this.searchParams.taskName || '',
        Task_Status: this.searchParams.taskStatus || '',
        PageIndex: this.participatedCurrentPage - 1,
        PageSize: this.hasSearched ? 1000 : this.participatedPageSize
      });

      try {
        const respData = await new Promise((resolve, reject) => {
          SensorRequestPage.GetTaskInfoWithMeFunPage(requestParams, resolve, reject);
        });

        const response = JSON.parse(respData);
        console.log("加载我参与的任务-原始响应数据:", respData);

        if (response.Data && Array.isArray(response.Data)) {
          let newData = response.Data;

          if (this.participatedCurrentPage === 1) {
            this.participatedList = newData;
            // 首次加载时更新项目编码选项
            if (!this.hasSearched) {
              this.updateProjectCodeOptions(newData);
            }
          } else {
            // 防止重复添加相同 ID 的任务
            const newItems = newData.filter(newItem =>
              !this.participatedList.some(existingItem => existingItem.ID_TaskInfo === newItem.ID_TaskInfo)
            );
            this.participatedList = [...this.participatedList, ...newItems];
          }

          // 如果是搜索状态，更新总数为过滤后的数量
          if (this.hasSearched) {
            this.participatedTotal = this.participatedList.length;
            this.participatedFinished = true;
          } else {
            // 根据返回的数据判断是否还有更多数据
            this.participatedFinished = response.Data.length < this.participatedPageSize;
          }
          this.participatedCurrentPage++;

          // 更新总记录数
          if (response.TotalCount !== undefined && !this.hasSearched) {
            this.participatedTotal = response.TotalCount;
          }
        } else {
          if (this.participatedCurrentPage === 1) {
            this.participatedList = [];
          }
          this.participatedFinished = true;
        }
      } catch (error) {
        console.error('加载我参与的任务失败:', error);
        this.$toast.fail('加载我参与的任务失败');
      } finally {
        this.participatedLoading = false;
        this.participatedRefreshing = false;
      }
    },

    // 加载 "我负责的" 任务（调用 GetPersonTaskInfoFun 接口）
    async loadResponsibleTasks() {
      this.responsibleLoading = true;

      const userInfo = getLocalUserInfo();
      const requestParams = JSON.stringify({
        Person_Phone: userInfo.phone,
        Project_Code: this.searchParams.projectCode || '',
        Task_Name: this.searchParams.taskName || '',
        Task_Status: this.searchParams.taskStatus || '',
        PageIndex: this.responsibleCurrentPage - 1,
        PageSize: this.hasSearched ? 1000 : this.responsiblePageSize
      });

      try {
        const respData = await new Promise((resolve, reject) => {
          SensorRequestPage.GetPersonTaskInfoFunPage(requestParams, resolve, reject);
        });

        const response = JSON.parse(respData);
        console.log("加载我负责的任务-原始响应数据:", respData);

        if (response.Data && Array.isArray(response.Data)) {
          let newData = response.Data;

          if (this.responsibleCurrentPage === 1) {
            this.responsibleList = newData;
            // 首次加载时更新项目编码选项
            if (!this.hasSearched) {
              this.updateProjectCodeOptions(newData);
            }
          } else {
            // 防止重复添加相同 ID 的任务
            const newItems = newData.filter(newItem =>
              !this.responsibleList.some(existingItem => existingItem.ID_TaskInfo === newItem.ID_TaskInfo)
            );
            this.responsibleList = [...this.responsibleList, ...newItems];
          }

          // 如果是搜索状态，更新总数为过滤后的数量
          if (this.hasSearched) {
            this.responsibleTotal = this.responsibleList.length;
            this.responsibleFinished = true;
          } else {
            // 根据返回的数据判断是否还有更多数据
            this.responsibleFinished = response.Data.length < this.responsiblePageSize;
          }
          this.responsibleCurrentPage++;

          // 更新总记录数
          if (response.TotalCount !== undefined && !this.hasSearched) {
            this.responsibleTotal = response.TotalCount;
          }
        } else {
          if (this.responsibleCurrentPage === 1) {
            this.responsibleList = [];
          }
          this.responsibleFinished = true;
        }
      } catch (error) {
        console.error('加载我负责的任务失败:', error);
        this.$toast.fail('加载我负责的任务失败');
      } finally {
        this.responsibleLoading = false;
        this.responsibleRefreshing = false;
      }
    },

    // 辅助方法：格式化 "我参与的" 任务描述
    formatParticipatedDesc(item) {
      const creatorName = item.Task_Creator && item.Task_Creator.Person_Name ? item.Task_Creator.Person_Name : '未知';
      return `任务创建人: ${creatorName}`;
    },


    // 新增方法：格式化起止时间范围（精确到天）
    formatDateRange(startDate, endDate) {
      if (!startDate || !endDate) return '时间未设置';

      const start = new Date(startDate).toLocaleDateString();
      const end = new Date(endDate).toLocaleDateString();

      return `时间范围：${start} 至 ${end}`;
    },

    // 跳转到任务提交页面
    goToTaskDetail(item) {
      console.log("跳转到任务提交页面:", item);
      // 提取需要的参数
      const taskName = item.Task_Name || '';
      const projectCode = item.Project_Code || '';
      const taskId = item.Id || '';
      console.log("跳转到任务提交页面:-- taskId: "+taskId)
      const taskDescription = item.Task_Description || '';
      // 构建查询参数
      const query = {
        taskName: taskName,
        projectCode: projectCode,
        Id: taskId, // 注意这里使用 "Id" 而不是 "taskId"
        taskDescription: taskDescription
      };
      const department = this.$route.params.department;
      this.$router.push({
        path: `/${department}/task-detail-last`,
        query: query
      });
    },    // 跳转到任务提交页面
    goToTaskDetailProgress(item) {
      console.log("跳转到任务提交页面:", item);
      // 提取需要的参数
      const taskName = item.Task_Name || '';
      const projectCode = item.Project_Code || '';
      const taskId = item.Id || '';
      console.log("跳转到任务提交页面:-- taskId: "+taskId)
      const taskDescription = item.Task_Description || '';
      // 构建查询参数
      const query = {
        taskName: taskName,
        projectCode: projectCode,
        Id: taskId, // 注意这里使用 "Id" 而不是 "taskId"
        taskDescription: taskDescription
      };
      const department = this.$route.params.department;
      this.$router.push({
        path: `/${department}/task-detail-progress`,
        query: query
      });
    },
    // 跳转到任务详情页
    goToTaskDetailLook(item) {
      const department = this.$route.params.department;
      console.log("跳转到任务详情页面:", item);
      this.$router.push({
        path: `/${department}/task-detail-look`,
        query: {
          taskId: item.ID_TaskInfo,
          taskData: encodeURIComponent(JSON.stringify(item)) // 新增：传递完整对象
        }
      });
    },

    handleSearchClick() {
      // 跳转到搜索页面，例如：
      // this.$router.push('/task-search') // 假设你的搜索页路径为 /task-search

      // 或者执行其他查询逻辑，比如弹出搜索框、触发 API 请求等
      console.log('执行查询任务操作')
      // alert('执行查询任务操作')
      Toast.success('执行查询任务操作 !')
    },
    handleAddClick() {
      console.log('点击了新增按钮')
      // alert('新增任务功能暂未实现')
      Toast.success('点击了新增按钮 ！')
    }
  }
}
</script>

<style scoped>

.task-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
  position: relative;
}

/* 固定顶部的元素 */
.fixed-top {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 搜索区域样式 */
.search-section {
  padding: 15px;
  margin-bottom: 0;
}

.search-type-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.search-type-tab {
  padding: 8px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 20px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-type-tab:hover {
  border-color: #3f83f8;
  color: #3f83f8;
}

.search-type-tab.active {
  background: #3f83f8;
  color: white;
  border-color: #3f83f8;
}

.active-icon {
  font-size: 12px;
}

.search-container {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
}

.search-input {
  flex: 1;
  min-width: 200px;
  border-radius: 8px;
  overflow: hidden;
}

.search-btn {
  width: 100px;
  border-radius: 8px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.reset-btn {
  width: 100px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.sort-icon-btn {
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 8px;
  transition: all 0.3s ease;
}

.sort-icon-btn.active {
  color: #3f83f8;
}

.sort-icon-btn:active {
  opacity: 0.7;
}

/* 过滤器按钮 */
.filter-buttons {
  padding: 10px;
  border-top: 1px solid #e8e8e8;
}

.filter-buttons .van-button {
  margin-right: 10px;
  margin-bottom: 10px;
}

/* 任务列表容器 */
.tasks-container {
  padding: 20px 0;
}

/* 任务区域 */
.task-section {
  background: #fff;
  border-radius: 12px;
  margin: 0 15px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 任务类型切换 */
.task-type-switch {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
}

.switch-btn {
  flex: 1;
  padding: 15px 20px;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.switch-btn:hover {
  color: #3f83f8;
}

.switch-btn.active {
  color: #3f83f8;
  font-weight: bold;
}

.switch-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #3f83f8;
}

/* 任务区域内容 */
.task-section > .van-pull-refresh {
  min-height: 300px;
}

/* 卡片容器 */
.cards-container {
  padding: 10px 2.5%; /* 2.5%的左右padding实现95%宽度 */
  padding-bottom: 20px;
}

.share-card {
  margin-bottom: 15px;
  border-radius: 16px; /* 更加圆润 */
  overflow: hidden;
  background: linear-gradient(135deg, #ffffff, #f8f9fa); /* 渐变背景 */
  transition: transform 0.3s ease, box-shadow 0.3s ease; /* 添加过渡效果 */
  box-shadow: 0 5px 10px rgba(69, 125, 222, 0.6); /* 改为淡蓝色阴影 */
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

.share-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.1); /* 半透明白色遮罩 */
  z-index: 1;
}

.share-card >>> .van-card__content {
  position: relative;
  z-index: 2;
}

.share-card >>> .van-card__header {
  position: relative;
  z-index: 2;
}

.share-card >>> .van-card__body {
  position: relative;
  z-index: 2;
}

.share-card >>> .van-card__footer {
  position: relative;
  z-index: 2;
}

.share-card >>> .van-card__title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.share-card >>> .van-card__desc {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.share-card:hover {
  transform: translateY(-2px); /* 悬停时轻微上移 */
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.van-card__thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 12px; /* 缩略图也更加圆润 */
}

.van-card__footer .van-button {
  font-size: 12px;
  padding: 0 12px;
  height: 30px;
  margin-left: 8px;
}

.van-tag {
  border-radius: 8px; /* 标签也更加圆润 */
}

/* 保留原有的部分样式 */
.filter-buttons {
  padding: 10px;
}

.filter-buttons .van-button {
  margin-right: 10px;
  margin-bottom: 10px;
}
</style>
