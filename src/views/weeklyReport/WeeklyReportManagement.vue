<template>
  <div class="inventory-page">
    <!-- 页面顶部搜索区域 -->
    <div class="search-section search-top">
      <div class="search-container">
        <!-- 搜索输入框 -->
        <van-field
          v-model="searchValue"
          placeholder="请输入项目名称关键词"
          class="search-input"
          inputmode="search"
          enterkeyhint="search"
        />
        <!-- 搜索按钮 -->
        <van-button
          type="primary"
          class="search-btn"
          @click="onSearch"
        >
          搜索
        </van-button>

        <!-- 重置按钮 -->
        <van-button
          type="default"
          class="reset-btn"
          @click="onReset"
        >
          重置
        </van-button>
      </div>

      <!-- 筛选下拉框 -->
      <div class="filter-container">
        <van-dropdown-menu>
          <van-dropdown-item
            v-model="filter.reporter"
            :options="reporterOptions"
            @change="onFilterChange"
          />
          <van-dropdown-item
            v-model="filter.week"
            :options="weekOptions"
            @change="onFilterChange"
          />
        </van-dropdown-menu>
      </div>
    </div>
    <!-- 结果列表 -->
    <div class="results-section">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <div>
          <van-cell
            v-for="item in list"
            :key="item.Id"
            class="inventory-cell"
          >
            <div class="cell-content">
              <div class="cell-header">
                <div class="item-title">项目名称：{{ item.Project_Name }}</div>
                <div class="item-title">汇报人：{{ item.Report_Person.Person_Name }}</div>
                <div class="item-stock">周次: {{ item.Week_Display }}</div>
              </div>
              <!-- 卡片底部操作栏 -->
              <div class="cell-footer">
                <van-button
                  type="info"
                  @click="viewDetail(item)"
                  round
                  size="small"    style="margin-right: 10px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);"
                >
                  查看详情
                </van-button>
                <van-button
                  type="info"
                  @click="editReport(item)"
                  round
                  size="small"    style="box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);"
                >
                  周报编辑
                </van-button>
              </div>
            </div>
          </van-cell>
        </div>

        <!-- 空状态 -->
        <div v-if="hasSearched && list.length === 0 && !loading" class="empty-state">
          <van-empty description="暂无相关周报信息" />
        </div>
        <!-- 加载完成提示 -->
        <div v-if="list.length > 0 && !loading" class="finished-text">没有更多了</div>
      </van-pull-refresh>
    </div>
    <!-- 添加悬浮按钮 -->
    <FloatingActionButton
      @click="onFloatingButtonClick"
      :initial-position="{ bottom: 80, right: 20 }"
    />
  </div>
</template>

<script>
import { Toast } from 'vant';
import SensorRequest from '../../utils/SensorRequest.js';
import FloatingActionButton from "../../components/FloatingActionButton.vue";

export default {
  name: 'WeeklyReportManagement',
  components: {FloatingActionButton},
  data() {
    return {
      isNavigating: false,
      searchValue: '',
      hasSearched: false,
      filter: {
        reporter: '',
        week: ''
      },
      // 下拉菜单选项
      reporterOptions: [
        { text: '全部汇报人', value: '' }
      ],
      weekOptions: [
        { text: '全部周次', value: '' }
      ],
      list: [],
      loading: false,
      refreshing: false,
      allData: [], // 存储所有数据用于筛选
      uniqueReporters: [], // 存储唯一的汇报人
      uniqueWeeks: [] // 存储唯一的周次
    };
  },
  created() {
    this.onLoad();
  },
  methods: {
    navigateTo(path) {
      const department = this.$route.params.department;
      if (department) {
        this.$router.push(`/${department}${path}`);
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
    },
    onFloatingButtonClick() {
      // 防止重复点击
      if (this.isNavigating) return;
      this.isNavigating = true;
      // alert('点击了悬浮按钮')
      this.navigateTo('/weeklyReport/add');
      // 延迟重置导航状态
      setTimeout(() => {
        this.isNavigating = false;
      }, 10);
    },
    onSearch() {
      if (this.searchValue || this.filter.reporter || this.filter.week) {
        this.hasSearched = true;
        this.filterData();
      } else {
        Toast('请输入搜索关键词或选择筛选条件');
      }
    },

    // 新增筛选变化处理方法
    onFilterChange() {
      // 修改：总是执行筛选，不管筛选条件是否为空
      this.hasSearched = true;
      this.filterData();
    },

    // 新增重置按钮处理方法
    onReset() {
      // 清空搜索关键词
      this.searchValue = '';

      // 重置筛选条件
      this.filter = {
        reporter: '',
        week: ''
      };

      // 重置数据状态
      this.hasSearched = false;

      // 显示所有数据
      this.list = [...this.allData];
      this.$toast.success('数据已刷新');
    },

    onLoad() {
      this.loading = true;
      // 构造请求参数
      const param = {
        Project_Name: "",
        Week_Display: ""
      };
      // 调用后端接口获取周报数据
      SensorRequest.WeeklyReportsInfoGetFun(JSON.stringify(param), (respData) => {
        try {
          let newData = [];
          if (typeof respData === 'string') {
            newData = JSON.parse(respData);
          } else if (respData && Array.isArray(respData)) {
            newData = respData;
          } else if (respData && respData.data) {
            newData = Array.isArray(respData.data) ? respData.data : [respData.data];
          }
          console.log("获取周报数据 newData:",newData);
          this.allData = newData;
          // 提取唯一的汇报人和周次
          this.extractUniqueFilters();
          // 显示数据
          this.list = [...this.allData];

        } catch (error) {
          console.error('处理周报数据时出错:', error);
          Toast('数据处理失败');
        } finally {
          this.loading = false;
          this.refreshing = false;
        }
        Toast('数据刷新成功');
      }, (error) => {
        console.error('获取周报信息失败:', error);
        Toast('获取周报信息失败');
        this.loading = false;
        this.refreshing = false;
      });
    },

    // 提取唯一的汇报人和周次用于筛选
    extractUniqueFilters() {
      // 提取唯一的汇报人
      const reporters = [...new Set(this.allData
        .filter(item => item.Report_Person && item.Report_Person.Person_Name)
        .map(item => item.Report_Person.Person_Name)
      )];
      this.uniqueReporters = reporters.map(reporter => ({
        text: reporter,
        value: reporter
      }));
      this.reporterOptions = [{ text: '全部汇报人', value: '' }, ...this.uniqueReporters];

      // 提取唯一的周次
      const weeks = [...new Set(this.allData
        .filter(item => item.Week_Display)
        .map(item => item.Week_Display)
      )];
      this.uniqueWeeks = weeks.map(week => ({
        text: week,
        value: week
      }));
      this.weekOptions = [{ text: '全部周次', value: '' }, ...this.uniqueWeeks];
    },

    // 根据筛选条件过滤数据
    filterData() {
      let filteredData = this.allData;

      // 根据项目名称搜索
      if (this.searchValue) {
        filteredData = filteredData.filter(item =>
          item.Project_Name && item.Project_Name.includes(this.searchValue)
        );
      }

      // 根据汇报人筛选
      if (this.filter.reporter) {
        filteredData = filteredData.filter(item =>
          item.Report_Person.Person_Name === this.filter.reporter
        );
      }

      // 根据周次筛选
      if (this.filter.week) {
        filteredData = filteredData.filter(item =>
          item.Week_Display === this.filter.week
        );
      }

      this.list = filteredData;
    },

    onRefresh() {
      this.onLoad();
    },

    viewDetail(item) {
      // 跳转到周报详情页面
      const department = this.$route.params.department;
      if (department) {
        // 使用 query 参数传递项目信息
        this.$router.push({
          path: `/${department}/weeklyReport/detail/${item.Id}`,
          query: {
            projectInfo: encodeURIComponent(JSON.stringify({
              Project_Name: item.Project_Name,
              Week_Display: item.Week_Display,
              // 添加汇报人信息，供详情页面筛选使用
              Report_Person: item.Report_Person.Person_Name
            }))
          }
        });
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
    },
    editReport(item) {
      // 跳转到周报编辑页面
      const department = this.$route.params.department;
      if (department) {
        // 传递完整的周报信息作为路由参数
        this.$router.push({
          path: `/${department}/weeklyReport/edit/${item.Id}`,
          query: {
            reportData: encodeURIComponent(JSON.stringify(item))
          }
        });
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
    },
    // 格式化日期
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    },

    // 截断文本
    truncateText(text, length) {
      if (!text) return '';
      return text.length > length ? text.substring(0, length) + '...' : text;
    }
  }
};
</script>

<style scoped>
/* 样式保持不变 */
.search-section {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: #3f83f8;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
}

.search-container {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  flex: 1;
  border: 2px solid #fff;
  border-radius: 25px;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-btn, .reset-btn {
  border-radius: 25px;
  padding: 10px 20px;
  font-weight: 500;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  border: none;
}

.search-btn {
  background: white;
  color: black;
}

.reset-btn {
  background: white;
  color: black;
}

.search-btn:active, .reset-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.inventory-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.search-top {
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.filter-container {
  padding: 8px 12px;
}

.results-section {
  padding: 18px;
}

.inventory-cell {
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative;
}

.cell-content {
  padding: 10px 12px;
  position: relative;
  z-index: 2;
}

.cell-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 8px;
}

.item-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  flex: 1;
  margin-right: 4px;
  line-height: 1.3;
}

.item-stock {
  font-size: 14px;
  font-weight: 600;
  color: orange;
  white-space: nowrap;
  align-self: flex-end; /* 确保库存数量在右侧 */
}

.cell-body {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.item-info {
  flex: 1;
}

.info-row {
  display: flex;
  margin-bottom: 3px;
  font-size: 12px;
  align-items: baseline;
}

/* 确保所有 info-row 内的文本统一 */
.info-row {
  display: flex;
  margin-bottom: 4px;
  font-size: 14px;
  align-items: baseline; /* 确保文本基线对齐 */
}

.label {
  color: #999;
  margin-right: 4px;
  min-width: 30px;
  flex-shrink: 0; /* 防止标签被压缩 */
}

.value {
  color: #666;
  flex: 1;
  word-break: break-all; /* 防止长文本溢出 */
}

.cell-footer {
  display: flex;
  justify-content: flex-start; /* 左对齐 */
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.empty-state {
  padding: 50px 16px;
}

.finished-text {
  text-align: center;
  padding: 16px;
  color: #999;
  font-size: 14px;
}

.quick-operation-popup {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 500;
}

.item-info {
  padding: 12px;
  background-color: #f8f8f8;
  border-radius: 8px;
  margin-bottom: 16px;
}

.item-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.item-details {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.stock-info, .max-outbound {
  font-size: 14px;
  color: #333;
}

.popup-actions {
  margin-top: auto;
  display: flex;
  gap: 12px;
}

.popup-actions .van-button {
  flex: 1;
}

.stock-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.quick-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.quick-actions .van-button {
  width: 30px;
  height: 30px;
  padding: 0;
}
</style>
