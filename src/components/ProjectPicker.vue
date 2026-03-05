<template>
  <div class="project-picker-wrapper">
    <!-- 触发选择的输入框 -->
    <van-field
      v-model="selectedProjectName"
      :label="label"
      :placeholder="placeholder"
      is-link
      readonly
      @click="showPicker = true"
      class="project-input-field"
    >
      <template #label>
        <span v-if="required" style="color: red;">*</span>
        <span>{{ label }}</span>
      </template>
    </van-field>

    <!-- 项目选择器弹窗 -->
    <van-popup v-model="showPicker" position="bottom" closeable round>
      <div class="project-picker-container">
        <!-- 搜索框 -->
        <van-search
          v-model="searchKeyword"
          placeholder="请输入项目名称搜索"
          @input="filterProjects"
          class="project-search"
        />

        <!-- 历史选择区域 -->
        <div v-if="recentProjects.length > 0" class="recent-projects">
          <div class="recent-title">最近选择:</div>
          <div class="recent-list">
            <van-tag
              v-for="(project, index) in recentProjects"
              :key="index"
              type="primary"
              size="medium"
              class="recent-item"
              @click="selectRecentProject(project)"
            >
              {{ project }}
            </van-tag>
          </div>
        </div>

        <!-- 项目列表 -->
        <div class="project-list">
          <van-picker
            show-toolbar
            :columns="filteredProjectColumns"
            @confirm="onConfirm"
            @cancel="showPicker = false"
          >
            <template #default>
              <!-- 如果没有搜索到项目时显示的提示 -->
              <div v-if="filteredProjectColumns.length === 0 && searchKeyword" class="no-project-result">
                未找到匹配的项目
              </div>
            </template>
          </van-picker>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { Toast } from 'vant';
import SensorRequest from '../utils/SensorRequest.js';

export default {
  name: 'ProjectPicker',
  props: {
    // 选中的项目代码 (用于 v-model 双向绑定)
    value: {
      type: String,
    },
    // 标签文本
    label: {
      type: String,
    },
    // 占位符
    placeholder: {
      type: String,
      default: '请选择关联项目'
    },
    // 是否必填
    required: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      showPicker: false,
      selectedProjectName: '', // 用于显示选中的项目名称
      projectColumns: [], // 项目名称列表，用于选择器显示
      filteredProjectColumns: [], // 过滤后的项目列表
      fullProjectList: [], // 保存完整的项目信息 (包含 Project_Code 和 Project_Name)
      searchKeyword: '', // 搜索关键词
      recentProjects: [] // 最近选择的项目
    };
  },
  watch: {
    // 监听外部传入的 value 变化
    value(newVal) {
      if (newVal !== this.selectedProjectName) {
        this.selectedProjectName = newVal;
      }
    },
    // 监听弹窗打开状态
    showPicker(newVal) {
      if (newVal) {
        // 当弹出选择器时，重置搜索状态
        this.searchKeyword = '';
        this.filterProjects();
      }
    }
  },
  created() {
    this.loadProjectOptions();
    this.loadRecentProjects();
    this.filteredProjectColumns = this.projectColumns;
    // 如果外部传入了值，同步到本地
    if (this.value) {
      this.selectedProjectName = this.value;
    }
  },
  methods: {
    // 加载项目选项
    loadProjectOptions() {
      const param = {};
      SensorRequest.ProjectInfoGetFun(JSON.stringify(param), (respData) => {
        try {
          let data = [];
          if (typeof respData === 'string') {
            data = JSON.parse(respData);
          } else {
            data = respData;
          }

          // 确保是数组格式
          const projectList = Array.isArray(data) ? data : (data.data || []);

          // 保存完整的项目信息
          this.fullProjectList = projectList;

          // 只提取项目名称用于选择器显示
          this.projectColumns = projectList.map(project =>
            project.Project_Name || project.name || project.projectName || '未知项目'
          );
          this.filteredProjectColumns = this.projectColumns;
        } catch (error) {
          console.error('解析项目数据失败:', error);
          Toast.fail('项目数据解析失败');
        }
      }, (error) => {
        console.error('获取项目信息失败:', error);
        Toast.fail('获取项目信息失败');
      });
    },

    // 过滤项目列表
    filterProjects() {
      if (!this.searchKeyword) {
        this.filteredProjectColumns = this.projectColumns;
        return;
      }

      // 将搜索关键词转换为小写进行比较
      const keyword = this.searchKeyword.toLowerCase().trim();

      this.filteredProjectColumns = this.projectColumns.filter(project =>
        project.toLowerCase().includes(keyword)
      );
    },

    // 选择器确认事件
    onConfirm(value) {
      this.selectProject(value);
    },

    // 选择最近项目
    selectRecentProject(projectName) {
      this.selectProject(projectName);
    },

    // 选择项目的统一处理函数
    selectProject(projectName) {
      this.selectedProjectName = projectName;
      this.showPicker = false;

      // 查找对应的项目代码
      const selectedProject = this.fullProjectList.find(project =>
        (project.Project_Name || project.name || project.projectName) === projectName
      );

      const projectCode = selectedProject ? (selectedProject.Project_Code || '') : '';

      // 向父组件发送选中事件，包含项目名称和项目代码
      this.$emit('input', projectName);
      this.$emit('change', {
        projectName: projectName,
        projectCode: projectCode
      });

      // 保存到历史记录
      this.saveToRecentProjects(projectName);
    },

    // 保存到最近选择
    saveToRecentProjects(projectName) {
      // 限制历史记录数量为 5 条
      const maxRecentCount = 5;
      if (!this.recentProjects.includes(projectName)) {
        this.recentProjects.unshift(projectName);
        if (this.recentProjects.length > maxRecentCount) {
          this.recentProjects.pop();
        }
        // 保存到本地存储
        localStorage.setItem('recentProjects', JSON.stringify(this.recentProjects));
      }
    },

    // 加载最近选择
    loadRecentProjects() {
      const stored = localStorage.getItem('recentProjects');
      if (stored) {
        this.recentProjects = JSON.parse(stored);
      }
    },

    // 清空选择
    clear() {
      this.selectedProjectName = '';
      this.$emit('input', '');
      this.$emit('change', {
        projectName: '',
        projectCode: ''
      });
    },

    // 获取完整的项目信息
    getFullProjectList() {
      return this.fullProjectList;
    },

    // 根据项目名称获取项目代码
    getProjectCodeByName(projectName) {
      const project = this.fullProjectList.find(p =>
        (p.Project_Name || p.name || p.projectName) === projectName
      );
      return project ? (project.Project_Code || '') : '';
    }
  }
};
</script>

<style scoped>
.project-picker-wrapper {
  width: 100%;
}

/* 关键样式：让输入框内容靠左显示 */
.project-input-field :deep(.van-cell) {
  display: flex;
  align-items: center;
}

.project-input-field :deep(.van-cell__value) {
  display: flex;
  align-items: center;
  justify-content: flex-start !important;
  flex: 1;
  min-width: 0;
}

.project-input-field :deep(.van-field__body) {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
  text-align: left;
}

.project-input-field :deep(.van-field__control) {
  text-align: left !important;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 针对移动端优化 */
@media screen and (max-width: 768px) {
  .project-input-field :deep(.van-cell) {
    padding-left: 12px;
    padding-right: 12px;
  }

  .project-input-field :deep(.van-field__label) {
    width: auto;
    min-width: 80px;
    flex-shrink: 0;
  }

  .project-input-field :deep(.van-field__body) {
    max-width: calc(100% - 90px);
  }
}

.project-picker-container {
  background-color: #fff;
  border-radius: 16px 16px 0 0;
  overflow: hidden;
}

.project-search {
  background-color: #fff;
}

.recent-projects {
  padding: 12px 16px;
  border-bottom: 1px solid #f2f3f5;
  background-color: #fafafa;
}

.recent-title {
  font-size: 14px;
  color: #646566;
  margin-bottom: 8px;
  font-weight: 500;
}

.recent-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recent-item {
  cursor: pointer;
}

.recent-item:hover {
  opacity: 0.8;
}

.project-list {
  max-height: 300px;
  overflow-y: auto;
}

.no-project-result {
  padding: 20px;
  text-align: center;
  color: #969799;
  font-size: 14px;
}
</style>
