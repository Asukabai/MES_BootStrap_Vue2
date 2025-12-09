<template>
  <div class="inventory-page">
    <!-- 页面顶部搜索区域 -->
    <div class="search-section search-top">
      <div class="search-container">
        <!-- 搜索输入框 -->
        <van-field
          v-model="searchValue"
          placeholder="请输入搜索关键词"
          class="search-input"
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
            @click="viewDetail(item)"
          >
            <div class="cell-content">
              <div class="cell-header">
                <div class="item-title">{{ item.Item_Name }} {{ item.Item_Model }}</div>
                <div class="item-stock">库存: {{ item.Current_Stock }}</div>
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
  </div>
</template>

<script>
import { Toast } from 'vant';
import SensorRequest from '../../utils/SensorRequest.js';

export default {
  name: 'InventoryManagement',
  data() {
    return {
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
        { text: '半成品', value: '半成品' },
        { text: '成品', value: '成品' },
        { text: '辅助材料', value: '辅助材料' }
      ],
      statusOptions: [
        { text: '全部状态', value: '' },
        { text: '充足', value: '充足' },
        { text: '紧张', value: '紧张' },
        { text: '缺货', value: '缺货' },
        { text: '停产', value: '停产' }
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
          Company: "" // 公司筛选
        };

        // 调用后端接口获取库存数据
        SensorRequest.InventoryItemsGetFun(JSON.stringify(param), (respData) => {
          try {
            let newData = [];
            if (typeof respData === 'string') {
              newData = JSON.parse(respData);
            } else if (respData && Array.isArray(respData)) {
              newData = respData;
            } else if (respData && respData.data) {
              newData = Array.isArray(respData.data) ? respData.data : [respData.data];
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

            // 判断是否还有更多数据
            this.finished = processedData.length < this.pageSize;
            this.currentPage++;

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
      Toast(`查看 ${item.Item_Name} 的详细信息`);
      // 这里可以跳转到详情页面
      // this.$router.push(`/inventory/detail/${item.Id}`);
    },
  }
};
</script>

<style scoped>
.inventory-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.search-section {
  padding: 0;
  background-color: white;
  transition: all 0.3s ease;
}

.search-top {
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.search-container {
  display: flex;
  padding: 10px 16px 0 16px;
  gap: 10px;
}

.search-input {
  flex: 1;
}

.search-btn {
  width: 80px;
}

.reset-btn {
  width: 80px;
}

.filter-container {
  padding: 10px 16px;
}

.results-section {
  padding: 16px;
  padding-top: 0;
}

.inventory-cell {
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
  background-color: white;
}

.cell-content {
  padding: 12px 16px;
}

.cell-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.item-stock {
  font-size: 14px;
  color: #666;
}

.cell-body {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.item-info {
  flex: 1;
}

.info-row {
  display: flex;
  margin-bottom: 4px;
  font-size: 13px;
}

.label {
  color: #999;
  margin-right: 4px;
  min-width: 40px;
}

.value {
  color: #666;
  flex: 1;
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
