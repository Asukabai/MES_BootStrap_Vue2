<template>
  <div class="project-manage">
    <!-- 页面顶部搜索区域 -->
    <div class="search-section search-top">
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
        <!-- 项目名称搜索输入框 -->
        <van-field
          v-if="activeSearchTypes.includes('projectName')"
          v-model="searchParams.projectName"
          placeholder="请输入项目名称关键词"
          class="search-input"
          inputmode="search"
          enterkeyhint="search"
        />

        <!-- 项目编码下拉框 -->
        <van-dropdown-menu v-if="activeSearchTypes.includes('projectCode')" class="search-dropdown">
          <van-dropdown-item
            v-model="searchParams.projectCode"
            :options="projectCodeOptions"
            @change="onProjectCodeChange"
          />
        </van-dropdown-menu>

        <!-- 负责人搜索输入框 -->
        <van-field
          v-if="activeSearchTypes.includes('leader')"
          v-model="searchParams.leader"
          placeholder="请输入负责人姓名"
          class="search-input"
          inputmode="search"
          enterkeyhint="search"
        />

        <!-- 参与人搜索输入框 -->
        <van-field
          v-if="activeSearchTypes.includes('participant')"
          v-model="searchParams.participant"
          placeholder="请输入参与人姓名"
          class="search-input"
          inputmode="search"
          enterkeyhint="search"
        />

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

    <!-- 结果列表 -->
    <div class="results-section">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
            v-model="loading"
            :finished="finished"
            :finished-text="`共有 ${total} 条项目记录，没有更多了`"
            @load="onLoadMore"
          >
            <van-cell
              v-for="(project, index) in list"
              :key="project.Id"
              class="project-card"
              @click="toggleExpand(index)"
            >
              <van-cell-group :border="false">
                <!-- 基础信息始终显示 -->
                <van-cell title="项目编号">
                  <template #default>
                    <span class="highlight-code">{{ project.Project_Code || '暂无数据' }}</span>
                  </template>
                </van-cell>

                <!-- 项目名称 + 展开箭头 -->
                <van-cell title="项目名称" :value="project.Project_Name || '暂无数据'">
                  <template #right-icon>
                    <span style="color: #999; font-size: 14px;">
                      {{ project.expanded ? ' ▼' : ' ▶' }}
                    </span>
                  </template>
                </van-cell>

                <!-- 扩展内容带动画 -->
                <transition name="slide">
                  <div v-show="project.expanded">
                    <!-- 项目描述 -->
                    <van-cell title="项目描述" :value="project.Project_Description || '暂无描述'" />

                    <!-- 负责人 -->
                    <van-cell
                      title="负责人"
                      :value="formatLeaders(project.Project_Leader)"
                      is-link
                      @click.stop="showLeaderDetail(project.Project_Leader)"
                    />

                    <!-- 参与者 -->
                    <van-cell
                      title="参与者"
                      :value="formatParticipantCount(project.Project_Participant)"
                      is-link
                      @click.stop="showParticipantDetail(project.Project_Participant)"
                    />

                    <!-- 开始时间 -->
                    <van-cell title="开始时间" :value="formatDate(project.Project_StartTime)" />

                    <!-- 预计结束时间 -->
                    <van-cell title="预计结束时间" :value="formatDate(project.Project_ExEndTime)" />

                    <!-- 状态 -->
                    <van-cell title="状态">
                      <template #default>
                        <span :class="['status-text', getStatusClass(project.Project_Status)]">
                          {{ project.Project_Status }}
                        </span>
                      </template>
                    </van-cell>

                    <!-- 文件列表 -->
                    <van-cell
                      title="文件列表"
                      :value="formatFileCount(project.Project_Files)"
                      :is-link="canShowFile(project.Project_Files)"
                      @click="canShowFile(project.Project_Files) ? showFileDialog(project.Project_Files) : null"
                    />
                  </div>
                </transition>
              </van-cell-group>
            </van-cell>
          </van-list>

          <!-- 空状态 -->
          <div v-if="list.length === 0 && !loading" class="empty-state">
            <van-empty description="暂无相关项目信息" />
          </div>
        </van-pull-refresh>
    </div>
    <CustomizableFloatingButton
      :initial-position="{ bottom: 90, right: 20 }"
      :icon-src="require('@/assets/返回.png')"
      :background-size="49"
      :icon-size="49"
      :on-click="goBack"
    />
  </div>
</template>

<script>import { Toast } from 'vant';
import SensorRequestPage from '../../utils/SensorRequestPage.js';
import SensorRequest from '../../utils/SensorRequest';
import {GetDingUserToken} from "../../utils/Dingding";
import CustomizableFloatingButton from "../../components/CustomizableFloatingButton.vue";

export default {
  name: 'ProjectManage',
  components: {
    CustomizableFloatingButton
  },
  data() {
    return {
      list: [],
      loading: false,
      refreshing: false,
      finished: false,
      currentPage: 1,
      pageSize: 10,
      total: 0,
      errorMessage: '',
      hasSearched: false,
      sortOrder: 'none',
      activeSearchTypes: ['projectName'],
      searchParams: {
        projectName: '',
        projectCode: '',
        leader: '',
        participant: ''
      },
      searchTypeOptions: [
        { label: '项目名称', value: 'projectName' },
        { label: '项目编码', value: 'projectCode' },
        { label: '负责人', value: 'leader' },
        { label: '参与人', value: 'participant' }
      ],
      projectCodeOptions: [],
      allProjects: []
    };
  },
  created() {
    this.onLoad();
    this.fetchProjectCodesAndCompanies();
  },
  mounted() {
    const department = this.$route.params.department
    GetDingUserToken(department,(token) => {},(token) => {})
    window.vueApp = this; // 挂载到 window，供 HTML 调用
  },
  methods: {
    goBack() {
      this.navigateTo('/index');
    },
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
    onProjectCodeChange(value) {
      if (value) {
        Toast({
          message: `已选择项目编码：${value}`,
          position: 'bottom'
        });
      }
    },
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
    applySort() {
      if (this.sortOrder === 'none') {
        return;
      }
      this.list.sort((a, b) => {
        const timeA = new Date(a.Project_StartTime).getTime();
        const timeB = new Date(b.Project_StartTime).getTime();
        if (this.sortOrder === 'asc') {
          return timeA - timeB;
        } else {
          return timeB - timeA;
        }
      });
    },
    onSearch() {
      const hasSearchParams = this.activeSearchTypes.some(type => {
        if (type === 'projectName') return this.searchParams.projectName;
        if (type === 'projectCode') return this.searchParams.projectCode;
        if (type === 'leader') return this.searchParams.leader;
        if (type === 'participant') return this.searchParams.participant;
        return false;
      });

      if (!hasSearchParams) {
        Toast('请输入搜索条件');
        return;
      }

      this.hasSearched = true;
      this.currentPage = 1;
      this.list = [];
      this.finished = false;
      Toast.loading({ message: '搜索中...', forbidClick: true });
      this.fetchProjectList().then(() => {
        Toast.success(`找到 ${this.list.length} 条项目记录`);
      });
    },
    onReset() {
      Toast.loading({ message: '重置中...', forbidClick: true });
      this.searchParams = {
        projectName: '',
        projectCode: '',
        leader: '',
        participant: ''
      };
      this.activeSearchTypes = ['projectName'];
      this.hasSearched = false;
      this.currentPage = 1;
      this.list = [];
      this.finished = false;
      this.fetchProjectList().then(() => {
        Toast.success('已重置');
      });
    },
    fetchProjectCodesAndCompanies() {
      SensorRequest.ProjectInfoGetFun(
        '',
        (respData) => {
          try {
            const data = JSON.parse(respData);
            const list = Array.isArray(data) ? data : [data];
            this.allProjects = list;

            const projectCodeSet = new Set();

            list.forEach(p => {
              if (p.Project_Code) {
                projectCodeSet.add(p.Project_Code);
              }
            });

            this.projectCodeOptions = [
              { text: '全部', value: '' },
              ...Array.from(projectCodeSet).map(code => ({ text: code, value: code }))
            ];
          } catch (e) {
            console.error('解析项目编码和公司数据失败:', e);
          }
        },
        (error) => {
          console.error('获取项目编码和公司失败:', error);
        }
      );
    },
    filterProjectData(data) {
      console.log('过滤前数据条数:', data.length);
      console.log('搜索类型:', this.activeSearchTypes);
      console.log('搜索参数:', this.searchParams);
      return data.filter(item => {
        let match = true;

        if (this.activeSearchTypes.includes('projectName') && this.searchParams.projectName) {
          const itemName = item.Project_Name || '';
          const searchName = this.searchParams.projectName || '';
          match = match && itemName.toLowerCase().includes(searchName.toLowerCase());
        }

        if (this.activeSearchTypes.includes('projectCode') && this.searchParams.projectCode) {
          match = match && item.Project_Code === this.searchParams.projectCode;
        }

        if (this.activeSearchTypes.includes('leader') && this.searchParams.leader) {
          match = match && item.Project_Leader && item.Project_Leader.some(l =>
            l.Person_Name && l.Person_Name.includes(this.searchParams.leader)
          );
        }

        if (this.activeSearchTypes.includes('participant') && this.searchParams.participant) {
          match = match && item.Project_Participant && item.Project_Participant.some(p =>
            p.Person_Name && p.Person_Name.includes(this.searchParams.participant)
          );
        }

        console.log('项目:', item.Project_Name, '匹配结果:', match);
        return match;
      });
    },
    navigateTo(path) {
      const department = this.$route.params.department;
      if (department) {
        this.$router.push(`/${department}${path}`);
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
    },
    downloadFile(fileMd5) {
      if (!fileMd5) {
        this.$toast.fail('无法获取文件标识，请联系管理员');
        return;
      }
      const requestParam = JSON.stringify({
        remoteLocation: fileMd5,
      });
      SensorRequestPage.Minio_PresignedDownloadUrl5B(
          requestParam,
          (respData) => {
            let result;
            try {
              result = respData;
            } catch (e) {
              this.$toast.fail('服务器返回数据异常');
              console.error('接口返回数据不是合法 JSON', e);
              return;
            }

            const fileUrl = result;
            if (!fileUrl) {
              this.$toast.fail('未能获取文件下载地址');
              console.error('接口未返回有效 URL', result);
              return;
            }

            // 替换域名和端口
            const signPart = fileUrl.split('http://127.0.0.1:9000')[1];
            const finalUrl = `https://api-v2.sensor-smart.cn:22027${signPart}`;

            // 打开下载链接
            window.open(finalUrl, '_blank');
          },
          (error) => {
            this.$toast.fail('加载下载链接失败，请检查网络或稍后再试');
            console.error('获取下载链接失败:', error);
          }
      );
    },
    onLoad() {
      this.fetchProjectList();
    },
    fetchProjectList() {
      return new Promise((resolve) => {
        this.loading = true;
        const param = {
          PageIndex: this.currentPage - 1,
          PageSize: this.hasSearched ? 1000 : this.pageSize
        };
        SensorRequestPage.ProjectInfoGetFunPage(
          JSON.stringify(param),
          (respData) => {
            try {
              const response = JSON.parse(respData);
              if (response.Data && Array.isArray(response.Data)) {
                let newData = response.Data;

                // 初始化 expanded 字段
                newData = newData.map(p => ({
                  ...p,
                  expanded: false
                }));

                // 如果是搜索状态，进行前端过滤
                if (this.hasSearched) {
                  newData = this.filterProjectData(newData);
                }

                if (this.currentPage === 1) {
                  this.list = newData;
                } else {
                  // 防止重复添加相同 ID 的项目
                  const newItems = newData.filter(newItem =>
                    !this.list.some(existingItem => existingItem.Id === newItem.Id)
                  );
                  this.list = [...this.list, ...newItems];
                }

                // 如果是搜索状态，更新总数为过滤后的数量
                if (this.hasSearched) {
                  this.total = this.list.length;
                  this.finished = true;
                } else {
                  // 根据返回的数据判断是否还有更多数据
                  this.finished = response.Data.length < this.pageSize;
                }
                this.currentPage++;

                // 更新总记录数
                if (response.TotalCount !== undefined && !this.hasSearched) {
                  this.total = response.TotalCount;
                }

              } else {
                if (this.currentPage === 1) {
                  this.list = [];
                }
                this.finished = true;
                if (this.currentPage === 1) {
                  this.$toast.fail('数据格式错误');
                }
              }
            } catch (parseError) {
              console.error('解析项目信息响应失败:', parseError);
              this.$toast.fail('数据解析失败');
              if (this.currentPage === 1) {
                this.list = [];
              }
            } finally {
              this.loading = false;
              this.refreshing = false;
              resolve();
            }
          },
          (error) => {
            console.error('获取项目信息失败:', error);
            this.$toast.fail('获取项目信息失败');
            this.loading = false;
            this.refreshing = false;
            this.finished = true;
            resolve();
          }
        );
      });
    },
    onRefresh() {
      this.currentPage = 1;
      this.list = [];
      this.finished = false;
      Toast.loading({ message: '刷新中...', forbidClick: true });
      this.fetchProjectList().then(() => {
        this.refreshing = false;
        Toast.success('刷新成功');
      });
    },
    onLoadMore() {
      if (this.finished) return;
      Toast.loading({ message: '加载中...', forbidClick: true, duration: 0 });
      this.fetchProjectList().then(() => {
        Toast.clear();
      });
    },
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return `${date.getFullYear()}-${this.padZero(date.getMonth() + 1)}-${this.padZero(date.getDate())}`;
    },
    padZero(value) {
      return value.toString().padStart(2, '0');
    },
    // 控制卡片展开/收起
    toggleExpand(index) {
      const project = this.list[index];
      if (project) {
        this.$set(this.list, index, {
          ...project,
          expanded: !project.expanded
        });
      }
    },
    // 格式化参与者数量
    formatParticipantCount(participants) {
      return participants && participants.length > 0 ? `共 ${participants.length} 位参与者` : '暂无参与者';
    },
    // 显示参与者详情（弹窗）
    showParticipantDetail(participants) {
      const content = participants.map(p => `${p.Person_Name} (${p.Person_Phone})`).join('<br>');
      this.$dialog.alert({
        title: '参与者列表',
        message: content,
        dangerouslyUseHTMLString: true
      });
    },
    canShowFile(files) {
      return files && files.length > 0;
    },
    // 返回状态文本对应 class
    getStatusClass(status) {
      switch (status) {
        case '进行中':
          return 'status-running';
        case '已完成':
          return 'status-finished';
        case '已延期':
          return 'status-delayed';
        case '已开始':
          return 'status-started';
        default:
          return 'status-default';
      }
    },
    // 格式化负责人显示
    formatLeaders(leaders) {
      if (!leaders || leaders.length === 0) return '暂无负责人';
      const count = leaders.length;
      if (count <= 3) {
        return leaders.map(l => l.Person_Name).join('、');
      }
      return `${leaders.slice(0, 3).map(l => l.Person_Name).join('、')} 等 ${count} 人`;
    },
    // 显示负责人详情（弹窗）
    showLeaderDetail(leaders) {
      const content = leaders.map(l => `${l.Person_Name} (${l.Person_Phone})`).join('<br>');
      this.$dialog.alert({
        title: '负责人列表',
        message: content,
        dangerouslyUseHTMLString: true
      });
    },
    // 格式化文件数量
    formatFileCount(files) {
      return files && files.length > 0 ? `共 ${files.length} 个文件` : '暂无文件';
    },
    // 查看文件详情（弹窗）
    showFileDialog(files) {
      const content = files.map(f => {
        return `<a href="javascript:void(0);" onclick="window.vueApp.downloadFile('${f.File_Md5}')">${f.File_Name}（上传时间：${this.formatDate(f.Upload_Time)}）</a>`;
      }).join('<br>');

      this.$dialog.alert({
        title: '文件列表',
        message: content,
        dangerouslyUseHTMLString: true
      });
    }
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
  }
};
</script>

<style scoped>
.highlight-code {
  padding: 4px 10px;
  border-radius: 4px;
  background-color: #ffe066; /* 黄色系高亮背景 */
  color: #333;
  font-weight: bold;
}

.status-text {
  font-weight: bold;
  padding: 0 4px;
}

.status-running {
  color: #1989fa; /* 进行中 - 蓝色 */
}

.status-finished {
  color: #07c160; /* 已完成 - 绿色 */
}

.status-delayed {
  color: #ff3333; /* 已延期 - 红色 */
}

.status-started {
  color: #f0a100; /* 已开始 - 橙色 */
}

.status-default {
  color: #666; /* 默认 - 灰色 */
}

.search-section {
  background: #fff;
  padding: 15px;
  margin-bottom: 10px;
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

.search-dropdown {
  margin: 0 10px;
  min-width: 120px;
  border-radius: 8px;
  overflow: hidden;
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

.project-manage {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

.content {
  padding: 0 10px;
}

.results-section {
  padding: 10px;
  height: calc(100vh - 200px);
  overflow-y: auto;
}

/* 卡片样式 */
.project-card {
  margin-bottom: 10px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); /* 默认阴影 */
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
}

.project-card:active {
  background: #f8f8f8;
}

/* 过渡动画 */
.slide-enter-active,
.slide-leave-active {
  max-height: 200px;
  transition: all 0.3s ease;
  overflow: hidden;
}
.slide-enter,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.empty-state {
  padding: 60px 0;
}

.finished-text {
  text-align: center;
  padding: 16px;
  color: #999;
  font-size: 14px;
}
</style>
