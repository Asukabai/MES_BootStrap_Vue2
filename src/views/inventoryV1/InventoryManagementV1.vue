<template>
  <div class="inventory-page">
    <!-- 页面顶部搜索区域 -->
    <div class="search-section search-top">
      <div class="search-container">
        <!-- 搜索输入框 -->
        <van-field
          v-model="searchValue"
          placeholder="请输入库存物品关键词"
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
            v-model="filter.category"
            :options="categoryOptions"
            @change="onFilterChange"
          />
          <van-dropdown-item
            v-model="filter.status"
            :options="statusOptions"
            @change="onFilterChange"
          />
        </van-dropdown-menu>
      </div>
    </div>
    <!-- 结果列表 -->
    <div class="results-section">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <van-cell
            v-for="item in list"
            :key="item.Id"
            class="inventory-cell"
            @click="viewDetail(item.Shelf_Location)"
          >
            <div class="cell-content">
              <div class="cell-header">
                <div class="item-title">物品名称：{{ item.Item_Name }}</div>
                <div class="item-title">物品类型：{{ item.Item_Model }}</div>
                <div class="item-stock">库存数量: {{ item.Current_Stock }}</div>
              </div>
              <div class="cell-body">
                <div class="item-info">
                  <div class="info-row">
                    <span class="label">公司:</span>
                    <span class="value">{{ item.Company }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">位置:</span>
                    <span class="value">{{ item.Shelf_Location }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">分类:</span>
                    <span class="value">{{ item.Category_Type }}</span>
                  </div>
                </div>
              </div>
            </div>
          </van-cell>
        </van-list>
      </van-pull-refresh>
    </div>

    <!-- 空状态 -->
    <div v-if="hasSearched && list.length === 0 && !loading" class="empty-state">
      <van-empty description="暂无相关库存信息" />
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
import FloatingActionButton from '../../components/FloatingActionButton.vue';
import {key_DingScannedInventoryQRCodeResult} from "../../utils/Dingding";
import SensorRequestPage from "../../utils/SensorRequestPage"; // 引入组件
export default {
  name: 'InventoryManagementV1',
  components: {
    FloatingActionButton // 注册组件
  },
  data() {
    return {
      isNavigating: false, // 添加导航状态标识
      searchValue: '',
      hasSearched: false,
      showInboundPopup: false,
      showOutboundPopup: false,
      showInboundTypePicker: false,
      showOutboundTypePicker: false,
      showProjectPicker: false,
      showOutboundProjectPicker: false,
      filter: {
        category: '',
        status: ''
      },
      // 下拉菜单选项
      categoryOptions: [
        { text: '全部分类', value: '' },
        { text: '耗材', value: '耗材' },
        { text: '公用', value: '公用' },
        { text: '项目', value: '项目' },
        { text: '其他', value: '其他' }
      ],
      statusOptions: [
        { text: '全部公司', value: '' },
        { text: '晟思', value: '晟思' },
        { text: '大钧', value: '大钧' },
        { text: '星移', value: '星移' }
      ],
      inboundTypeColumns: [
        { text: '采购入库', value: 1 },
        { text: '生产入库', value: 2 },
        { text: '其他入库', value: 3 }
      ],
      outboundTypeColumns: [
        { text: '项目领用', value: 4 },
        { text: '日常领用', value: 5 },
        { text: '其他出库', value: 6 }
      ],
      projectColumns: [],
      list: [],
      loading: false,
      finished: false,
      refreshing: false,
      currentPage: 1,
      pageSize: 10,
      total: 0,
      currentItem: {},
      inboundQuantity: 1,
      outboundQuantity: 1,
      inboundType: 1,
      outboundType: 4,
      inboundProject: '',
      outboundProject: '',
      inboundRemark: '',
      outboundRemark: '',
      outboundError: ''
    };
  },
  created() {
    this.loadProjectOptions();
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
      this.navigateTo('/inventory/addV1');
      // 延迟重置导航状态
      setTimeout(() => {
        this.isNavigating = false;
      }, 10);
    },
    onSearch() {
      if (this.searchValue || this.filter.category || this.filter.status) {
        this.hasSearched = true;
        this.currentPage = 1;
        this.list = [];
        this.finished = false;
        this.onLoad();
      } else {
        Toast('请输入搜索关键词或选择筛选条件');
      }
    },

    resetFilter() {
      this.filter = {
        category: '',
        status: ''
      };
    },

    // 新增筛选变化处理方法
    onFilterChange() {
      if (this.searchValue || this.filter.category || this.filter.status) {
        this.onSearch();
      }
    },

    // 新增重置按钮处理方法
    onReset() {
      // 清空搜索关键词
      this.searchValue = '';

      // 重置筛选条件
      this.filter = {
        category: '',
        status: ''
      };

      // 重置分页和数据状态
      this.currentPage = 1;
      this.list = [];
      this.finished = false;
      this.hasSearched = false;

      // 重新加载数据
      this.onLoad();
    },

    loadProjectOptions() {
      const param = {};
      SensorRequest.ProjectInfoGetFun(JSON.stringify(param), (respData) => {
        if (respData && respData.data) {
          this.projectColumns = respData.data.map(project => project.name || project.projectName);
        }
      }, (error) => {
        console.error('获取项目信息失败:', error);
      });
    },

    onLoad() {
      return new Promise((resolve) => {
        this.loading = true;

        // 构造请求参数，按照后端接口要求的格式
        const param = {
          PageIndex: this.currentPage - 1, // 后端可能使用0基索引
          PageSize: this.pageSize,
          Item_Name: this.searchValue, // 搜索关键词对应物品名称
          Shelf_Location: "", // 货架位置搜索
          Item_Model: "", // 物品型号搜索
          Item_Brand: "", // 物品品牌搜索
          Category_Type: this.filter.category, // 分类筛选
          Company: this.filter.status // 公司筛选
        };

        // 调用后端接口获取库存数据
        SensorRequestPage.InventoryItemGetFun(JSON.stringify(param), (respData) => {
          try {
            let parsedData = null;

            // 解析响应数据 - 新的数据格式是字符串化的JSON
            if (typeof respData === 'string') {
              parsedData = JSON.parse(respData);
            } else {
              parsedData = respData;
            }

            // 提取实际的Data数组
            let newData = [];
            if (parsedData && parsedData.Data) {
              newData = parsedData.Data;
            }

            // 处理返回的数据格式
            const processedData = newData.map(item => ({
              ...item,
              id: item.Id,
              name: `${item.Item_Name} ${item.Item_Model || ''}`.trim(),
              description: item.Remark || '',
              category: item.Category_Type || '未知',
              status: item.Is_Low_Stock === '是' ? '紧张' : '充足',
              company: item.Company || '',
              location: item.Shelf_Location || '',
              stock: item.Current_Stock || 0,
              model: item.Item_Model || '',
              brand: item.Item_Brand || ''
            }));

            if (this.currentPage === 1) {
              this.list = processedData;
            } else {
              // 防止重复添加相同ID的项目
              const newItems = processedData.filter(newItem =>
                !this.list.some(existingItem => existingItem.Id === newItem.Id)
              );
              this.list = [...this.list, ...newItems];
            }

            // 根据返回的数据判断是否还有更多数据
            // 如果返回的数据量小于页面大小，则表示已到最后一页
            this.finished = processedData.length < this.pageSize;
            this.currentPage++;

            // 更新总记录数
            if (parsedData && parsedData.TotalCount !== undefined) {
              this.total = parsedData.TotalCount;
            }

          } catch (error) {
            console.error('处理库存数据时出错:', error);
            Toast('数据处理失败');
          } finally {
            this.loading = false;
            resolve();
          }
        }, (error) => {
          console.error('获取库存信息失败:', error);
          Toast('获取库存信息失败');
          this.loading = false;
          this.finished = true;
          resolve();
        });
      });
    },

    onRefresh() {
      this.currentPage = 1;
      this.list = [];
      this.finished = false;
      this.onLoad().then(() => {
        this.refreshing = false;
      }).catch(() => {
        this.refreshing = false;
      });
    },

    viewDetail(item) {
      // 将当前物品信息保存到sessionStorage中(模拟扫码情况)
      sessionStorage.setItem(key_DingScannedInventoryQRCodeResult, item);
      // 跳转到库存详情页面
      const department = this.$route.params.department;
      if (department) {
        this.$router.push(`/${department}/inventoryDetailV1`);
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
    },
  }
};
</script>

<style scoped>
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
}

.cell-content {
  padding: 10px 12px;
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
  align-self: flex-end;/* 确保库存数量在右侧 */
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
  justify-content: flex-end;
  gap: 8px;
}

.empty-state {
  padding: 50px 16px;
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
