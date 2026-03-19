NEW_FILE_CODE
<template>
  <div class="project-selector-component">
    <van-field
      v-model="selectedProjectName"
      :name="fieldName"
      :label="label"
      :placeholder="placeholder"
      is-link
      readonly
      :rules="rules"
      @click="onProjectFieldClick"
    >
      <template #label>
        <slot name="label">
          <span>{{ label }}</span>
        </slot>
      </template>
      <template #input>
        <div v-if="selectedProjectName && selectedProjectCode" class="project-display">
          <span class="project-name">{{ selectedProjectName }}</span>
          <span class="project-code">[{{ selectedProjectCode }}]</span>
        </div>
      </template>
    </van-field>

    <!-- 项目选择器弹窗 -->
    <van-popup v-model="showPicker" position="bottom" closeable round>
      <div class="project-picker-container">
        <!-- 搜索框 -->
        <van-search
          v-model="searchKeyword"
          :placeholder="searchPlaceholder"
          @input="filterProjects"
          class="project-search"
        >
        </van-search>

        <!-- 历史选择区域 -->
        <div v-if="recentProjects.length > 0" class="recent-projects">
          <div class="recent-title">最近选择：</div>
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
              <van-icon
                name="cross"
                size="14px"
                class="recent-item-close"
                @click.stop="removeRecentProject(index)"
              />
            </van-tag>
          </div>
        </div>

        <!-- 项目列表 -->
        <div class="project-list">
          <div v-if="filteredProjectColumns.length === 0 && searchKeyword" class="no-project-result">
            未找到匹配的项目
          </div>
          <van-cell-group v-else>
            <van-cell
              v-for="(item, index) in filteredProjectColumns"
              :key="index"
              clickable
              @click="onProjectItemClick(item)"
              class="project-item"
            >
              <template #title>
                <div class="project-item-content">
                  <div class="project-item-name">{{ extractProjectName(item) }}</div>
                  <div v-if="extractProjectCode(item)" class="project-item-code">{{ extractProjectCode(item) }}</div>
                </div>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { Toast } from 'vant';
import SensorRequest from '../utils/SensorRequest.js';

export default {
  name: 'ProjectSelector',
  props: {
    // 字段名
    fieldName: {
      type: String,
      default: 'Project_Code'
    },
    // 标签文本
    label: {
      type: String,
      default: '*关联项目'
    },
    // 占位符
    placeholder: {
      type: String,
      default: '请选择关联项目'
    },
    // 搜索框占位符
    searchPlaceholder: {
      type: String,
      default: '请输入项目名称或编码搜索'
    },
    // 验证规则
    rules: {
      type: Array,
      default: () => [{ required: true, message: '请选择关联项目' }]
    },
    // 是否启用最近选择功能
    enableRecent: {
      type: Boolean,
      default: true
    },
    // 最近选择的最大数量
    maxRecentCount: {
      type: Number,
      default: 5
    },
    // 本地存储键名
    storageKey: {
      type: String,
      default: 'recentProjects'
    }
  },
  data() {
    return {
      showPicker: false,
      selectedProjectName: '', // 用于显示选中的项目名称
      selectedProjectCode: '', // 用于显示选中的项目编码
      projectColumns: [], // 显示用的项目列表（名称 + 编码）
      filteredProjectColumns: [], // 过滤后的项目列表
      fullProjectList: [], // 完整的项目信息列表
      searchKeyword: '', // 搜索关键词
      recentProjects: [] // 最近选择的项目
    };
  },
  created() {
    this.loadProjectOptions();
    if (this.enableRecent) {
      this.loadRecentProjects();
    }
  },
  watch: {
    showPicker(newVal) {
      if (newVal) {
        // 当弹出选择器时，重置搜索状态
        this.searchKeyword = '';
        this.filterProjects();
      }
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

          // 保存完整的项目信息（包含 Project_Code 和 Project_Name）
          this.fullProjectList = projectList;

          // 显示项目名称 + 项目编码的组合
          this.projectColumns = projectList.map(project => {
            const projectName = project.Project_Name || project.name || project.projectName || '未知项目';
            const projectCode = project.Project_Code || '';
            // 返回带有项目编码的显示文本
            return projectCode ? `${projectName} [${projectCode}]` : projectName;
          });
          this.filteredProjectColumns = this.projectColumns; // 初始化过滤后的项目列表
        } catch (error) {
          console.error('解析项目数据失败:', error);
          Toast.fail('项目数据解析失败');
        }
      }, (error) => {
        console.error('获取项目信息失败:', error);
        Toast.fail('获取项目信息失败');
      });
    },

    // 项目字段点击事件
    onProjectFieldClick() {
      this.showPicker = true;
      this.searchKeyword = '';
      this.filterProjects();
    },

    // 项目列表项点击事件
    onProjectItemClick(itemText) {
      // 从显示文本中提取项目名称
      const projectName = this.extractProjectName(itemText);
      this.onProjectConfirm(projectName);
    },

    // 提取项目名称
    extractProjectName(item) {
      if (typeof item === 'string') {
        // 如果是字符串格式 "项目名称 [编码]"
        const match = item.match(/^(.*?)\s*\[/);
        return match ? match[1].trim() : item;
      }
      return item.Project_Name || item.name || item.projectName || '未知项目';
    },

    // 提取项目编码
    extractProjectCode(item) {
      if (typeof item === 'string') {
        // 如果是字符串格式 "项目名称 [编码]"
        const match = item.match(/\[(.*?)\]/);
        return match ? match[1] : '';
      }
      return item.Project_Code || '';
    },

    // 项目确认选择
    onProjectConfirm(value) {
      // 保存选中的项目名称用于显示
      this.selectedProjectName = value;
      this.showPicker = false;

      // 查找对应的项目代码并更新表单
      const selectedProject = this.fullProjectList.find(project =>
        (project.Project_Name || project.name || project.projectName) === value
      );
      if (selectedProject) {
        this.selectedProjectCode = selectedProject.Project_Code || '';
        // 触发事件，将选中的项目信息传递给父组件
        this.$emit('change', {
          projectName: this.selectedProjectName,
          projectCode: this.selectedProjectCode,
          fullData: selectedProject
        });
      }
      // 保存到历史记录
      if (this.enableRecent) {
        this.saveToRecentProjects(value);
      }
    },

    // 过滤项目列表
    filterProjects() {
      if (!this.searchKeyword) {
        this.filteredProjectColumns = this.projectColumns;
        return;
      }

      // 将搜索关键词转换为小写进行比较
      const keyword = this.searchKeyword.toLowerCase().trim();

      // 同时支持项目名称和项目编码搜索
      this.filteredProjectColumns = this.projectColumns.filter((project, index) => {
        const projectName = project.toLowerCase();
        const projectCode = (this.fullProjectList[index].Project_Code || '').toLowerCase();
        return projectName.includes(keyword) || projectCode.includes(keyword);
      });
    },

    // 选择最近项目
    selectRecentProject(projectName) {
      this.selectedProjectName = projectName;
      this.showPicker = false;

      // 更新表单中的项目代码
      const selectedProject = this.fullProjectList.find(project =>
        (project.Project_Name || project.name || project.projectName) === projectName
      );
      if (selectedProject) {
        this.selectedProjectCode = selectedProject.Project_Code || '';
        // 触发事件
        this.$emit('change', {
          projectName: this.selectedProjectName,
          projectCode: this.selectedProjectCode,
          fullData: selectedProject
        });
      }
      // 保存到历史记录
      if (this.enableRecent) {
        this.saveToRecentProjects(projectName);
      }
    },

    // 移除最近选择的项目
    removeRecentProject(index) {
      this.recentProjects.splice(index, 1);
      // 更新本地存储
      localStorage.setItem(this.storageKey, JSON.stringify(this.recentProjects));
      Toast.success('已清除最近选择');
    },

    // 保存到最近选择
    saveToRecentProjects(projectName) {
      // 限制历史记录数量为配置的最大值
      if (!this.recentProjects.includes(projectName)) {
        this.recentProjects.unshift(projectName); // 添加到开头
        if (this.recentProjects.length > this.maxRecentCount) {
          this.recentProjects.pop(); // 超出限制则移除最后一条
        }
        // 保存到本地存储
        localStorage.setItem(this.storageKey, JSON.stringify(this.recentProjects));
      }
    },

    // 加载最近选择
    loadRecentProjects() {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.recentProjects = JSON.parse(stored);
      }
    },

    // 清空选择
    clearSelection() {
      this.selectedProjectName = '';
      this.selectedProjectCode = '';
      this.$emit('change', {
        projectName: '',
        projectCode: '',
        fullData: null
      });
    },

    // 设置选中的项目（用于回显或导入数据）
    setProject(projectName, projectCode = '') {
      this.selectedProjectName = projectName;
      this.selectedProjectCode = projectCode;

      // 查找完整的项目信息
      const selectedProject = this.fullProjectList.find(project =>
        (project.Project_Name || project.name || project.projectName) === projectName
      );

      if (selectedProject && !projectCode) {
        this.selectedProjectCode = selectedProject.Project_Code || '';
      }

      // 触发事件
      this.$emit('change', {
        projectName: this.selectedProjectName,
        projectCode: this.selectedProjectCode,
        fullData: selectedProject || null
      });
    }
  }
};
</script>

<style scoped>
.project-selector-component {
  width: 100%;
}

.project-display {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.project-name {
  flex: 1;
  color: #323233;
}

.project-code {
  color: #1989fa;
  font-weight: 500;
  font-size: 13px;
  white-space: nowrap;
}

/* 项目选择器样式 */
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
  position: relative;
  padding-right: 24px;
}

.recent-item:hover {
  opacity: 0.8;
}

.recent-item-close {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  color: #fff;
  opacity: 0.8;
  transition: all 0.2s;
}

.recent-item-close:hover {
  opacity: 1;
  color: #ff7676;
}

.project-list {
  max-height: 300px;
  overflow-y: auto;
}

.project-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f2f3f5;
}

.project-item:last-child {
  border-bottom: none;
}

.project-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-item-name {
  flex: 1;
  font-size: 14px;
  color: #323233;
}

.project-item-code {
  font-size: 12px;
  color: #1989fa;
  font-weight: 500;
  margin-left: 8px;
  white-space: nowrap;
}

.no-project-result {
  padding: 20px;
  text-align: center;
  color: #969799;
  font-size: 14px;
}
</style>
