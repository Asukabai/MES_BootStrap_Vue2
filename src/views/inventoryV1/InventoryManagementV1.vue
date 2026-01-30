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

    <!-- 批量操作栏 -->
    <div v-if="selectedOperations.length > 0" class="batch-operation-bar">
      <div class="batch-info">
        已选择 {{ selectedOperations.length }} 个操作
      </div>
      <div class="batch-actions">
        <van-button
          size="small"
          type="warning"
          @click="showBatchConfirmation"
          :disabled="selectedOperations.length === 0"
        >
          执行操作
        </van-button>
        <van-button
          size="small"
          @click="clearSelection"
        >
          清空选择
        </van-button>
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
          >
            <div class="cell-content">
              <!-- 选择复选框 - 放在左上角，不影响布局 -->
              <div
                class="select-checkbox-corner"
                @click.stop="toggleItemSelection(item)"
              >
                <van-icon
                  :name="isItemSelected(item) ? 'success' : 'circle'"
                  :color="isItemSelected(item) ? '#1989fa' : '#c8c9cc'"
                />
              </div>

              <!-- 左侧图片区域（30%） -->
              <div
                class="image-section"
                @click.stop="previewImage(item)"
              >
                <img
                  :src="getImageUrl(item)"
                  alt="物品图片"
                  class="item-image"
                  @error="onImageError"
                />
              </div>

              <!-- 右侧信息区域（70%） -->
              <div
                class="info-section"
                @click="viewDetail(item.Shelf_Location)"
              >
                <!-- 右上角删除按钮 -->
                <div class="delete-btn" @click.stop="showDeleteDialog(item)">
                  <van-icon name="delete" />
                </div>

                <div class="cell-header">
                  <div class="item-title">物品名称：{{ item.Item_Name }}</div>

                  <!-- 型号和库存信息分行显示 -->
                  <div class="item-subtitle-line">
                    <span class="model-label">型号：</span>
                    <span class="model-value">{{ item.Item_Model && item.Item_Model.trim() !== '' ? item.Item_Model : '用户暂未填写' }}</span>
                  </div>
                  <div class="item-subtitle-line">
                    <span class="stock-label">库存：</span>
                    <span class="stock-value">{{ item.Current_Stock !== null && item.Current_Stock !== undefined && item.Current_Stock !== '' ? item.Current_Stock : '用户暂未填写' }}</span>
                  </div>
                </div>

                <!-- 公司和位置信息分行显示 -->
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
                  </div>
                </div>
              </div>
            </div>
          </van-cell>
        </van-list>
      </van-pull-refresh>
    </div>

    <!-- 图片预览弹窗 -->
    <van-image-preview
      v-model="showImagePreview"
      :images="previewImages"
      :start-position="previewStartPos"
      @close="onPreviewClose"
      @click-overlay="onPreviewClose"
    >
      <!-- 自定义关闭按钮 -->
<!--      <template #cover>-->
<!--&lt;!&ndash;        <div style="position: absolute; top: 0; left: 0; width: 100px; height: 100px; background: red;">&ndash;&gt;-->
<!--&lt;!&ndash;          测试插槽&ndash;&gt;-->
<!--&lt;!&ndash;        </div>&ndash;&gt;-->
<!--        <div class="custom-close-button" @click="onPreviewClose">-->
<!--          <van-icon name="cross" size="24" color="#fff" />-->
<!--        </div>-->
<!--      </template>-->
      <template slot="cover">
        <div class="custom-close-button" @click="onPreviewClose">
          <van-icon name="cross" size="30" color="#fff" />
        </div>
      </template>
    </van-image-preview>

    <!-- 空状态 -->
    <div v-if="hasSearched && list.length === 0 && !loading" class="empty-state">
      <van-empty description="暂无相关库存信息" />
    </div>

    <!-- 删除确认弹窗 -->
    <van-dialog
      v-model="showDeleteConfirm"
      title="确认删除"
      :message="deleteConfirmMessage"
      :show-cancel-button="true"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
      :confirm-button-text="'删除'"
      :confirm-button-color="'#ee0a24'"
    />

    <!-- 库存不为零提示弹窗 -->
    <van-dialog
      v-model="showStockCheckDialog"
      title="库存检查"
      :message="stockCheckMessage"
      :show-confirm-button="false"
      :show-cancel-button="true"
      @cancel="cancelDelete"
      :cancel-button-text="'关闭'"
    />

    <!-- 单个物品操作弹窗 -->
    <van-popup v-model="showSingleOperationPopup" position="bottom" :style="{ height: '60%' }">
      <div class="single-operation-popup">
        <div class="popup-header">
          <h3>选择操作</h3>
          <van-icon name="cross" @click="closeSingleOperationPopup" />
        </div>

        <div class="selected-item-info">
          <h4>{{ currentSelectedItem ? currentSelectedItem.Item_Name : '' }}</h4>
          <p>当前库存: {{ currentSelectedItem ? currentSelectedItem.Current_Stock : 0 }}</p>
        </div>

        <!-- 操作类型选择 -->
        <div class="operation-type-selection" v-if="!currentOperationType">
          <h4>请选择操作类型</h4>
          <div class="type-options">
            <div
              class="type-option"
              :class="{ active: currentOperationType === 'inbound' }"
              @click="selectOperationType('inbound')"
            >
              <van-icon name="plus" color="#4CAF50" />
              <span>入库</span>
            </div>
            <div
              class="type-option"
              :class="{ active: currentOperationType === 'outbound' }"
              @click="selectOperationType('outbound')"
            >
              <van-icon name="minus" color="#F44336" />
              <span>出库</span>
            </div>
          </div>
        </div>

        <!-- 数量输入 -->
        <div class="quantity-section" v-if="currentOperationType">
          <h4>{{ currentOperationType === 'inbound' ? '入库' : '出库' }}数量</h4>

          <div class="quantity-input">
            <van-stepper
              v-model="singleOperationQuantity"
              :min="1"
              :max="currentOperationType === 'outbound' ? (currentSelectedItem ? currentSelectedItem.Current_Stock : 0) : 999999"
              :step="1"
              theme="round"
              button-size="28"
              disable-input
            />
            <span class="quantity-text">{{ singleOperationQuantity }}</span>
          </div>

          <div class="quantity-preview">
            <p>操作后库存:
              <span :class="currentOperationType === 'inbound' ? 'inbound-preview' : 'outbound-preview'">
                {{ postOperationStock }}
              </span>
            </p>
          </div>

          <van-field
            v-model="singleOperationRemark"
            type="textarea"
            label="备注"
            placeholder="请输入备注信息"
            rows="2"
            autosize
          />

          <div class="action-buttons">
            <van-button
              block
              :type="currentOperationType === 'inbound' ? 'primary' : 'danger'"
              @click="confirmSingleOperation"
            >
              确认{{ currentOperationType === 'inbound' ? '入库' : '出库' }}
            </van-button>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 批量操作确认弹窗 -->
    <van-popup v-model="showBatchConfirmPopup" position="bottom" :style="{ height: '80%' }">
      <div class="batch-confirmation-popup">
        <div class="popup-header">
          <h3>批量操作确认</h3>
          <van-icon name="cross" @click="closeBatchConfirmation" />
        </div>

        <div class="confirmation-summary">
          <p>总共选择 {{ getSelectedStats().total }} 个操作</p>
          <p>入库操作: {{ getSelectedStats().inbound }} 个</p>
          <p>出库操作: {{ getSelectedStats().outbound }} 个</p>
        </div>

        <div class="operations-list">
          <h4>操作明细</h4>
          <div
            v-for="(op, index) in selectedOperations"
            :key="`${op.item.Id}-${index}`"
            class="operation-item"
          >
            <div class="item-info">
              <span class="item-name">{{ op.item.Item_Name }}</span>
              <span class="operation-type" :class="op.operationType">
                {{ op.operationType === 'inbound' ? '入库' : '出库' }}
              </span>
            </div>
            <div class="operation-details">
              <span class="quantity">数量: {{ op.quantity }}</span>
              <span class="current-stock">当前库存: {{ op.item.Current_Stock }}</span>
            </div>
            <div class="operation-remark" v-if="op.remark">
              备注: {{ op.remark }}
            </div>
          </div>
        </div>

        <div class="confirmation-actions">
          <van-button
            block
            type="primary"
            @click="executeBatchOperations"
            :loading="batchOperationLoading"
          >
            确认执行
          </van-button>
        </div>
      </div>
    </van-popup>

    <CustomizableFloatingButton
      :initial-position="{ bottom: 200, right: 10 }"
      :icon-src="require('@/assets/返回.png')"
      :background-size="53"
      :icon-size="53"
      :on-click="goBack"
    />
    <!-- 使用自定义图标悬浮按钮 -->
    <CustomizableFloatingButton
      :initial-position="{ bottom: 130, right: 10 }"
      :icon-src="require('@/assets/高级检索.png')"
      :background-size="55"
      :icon-size="35"
      :on-click="navigateToAdvancedSearch"
    />
    <!-- 使用自定义图标悬浮按钮 -->
    <CustomizableFloatingButton
      :initial-position="{ bottom: 60, right: 10 }"
      :icon-src="require('@/assets/新增图标.png')"
      :background-size="53"
      :icon-size="53"
      :on-click="onFloatingButtonClick"
    />
  </div>
</template>

<script>
import {Dialog, Toast, ImagePreview} from 'vant';
import SensorRequest from '../../utils/SensorRequest.js';
import FloatingActionButton from '../../components/FloatingActionButton.vue';
import {key_DingScannedInventoryQRCodeResult} from "../../utils/Dingding";
import SensorRequestPage from "../../utils/SensorRequestPage";
import CustomizableFloatingButton from "../../components/CustomizableFloatingButton.vue"; // 引入组件
import {key_DingName, key_DingUserIndex, key_DingUserPhone} from "../../utils/Dingding";

// 添加 Promise.allSettled 的 polyfill
if (!Promise.allSettled) {
  Promise.allSettled = function(promises) {
    return Promise.all(promises.map(p =>
      Promise.resolve(p).then(value => ({
        status: 'fulfilled',
        value
      }), reason => ({
        status: 'rejected',
        reason
      }))
    ));
  };
}

export default {
  name: 'InventoryManagementV1',
  components: {
    CustomizableFloatingButton,
    FloatingActionButton // 注册组件
  },
  data() {
    return {
      isNavigating: false, // 添加导航状态标识
      searchValue: this.getStoredSearchValue(), // 从本地存储获取搜索值
      hasSearched: false,
      showInboundPopup: false,
      showOutboundPopup: false,
      showInboundTypePicker: false,
      showOutboundTypePicker: false,
      showProjectPicker: false,
      showOutboundProjectPicker: false,
      filter: {
        category: this.getStoredFilterValue('category'), // 从本地存储获取筛选值
        status: this.getStoredFilterValue('status')
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
      outboundError: '',
      showDeleteConfirm: false, // 控制删除确认弹窗显示
      showStockCheckDialog: false, // 控制库存检查弹窗显示
      deletingItem: null, // 正在删除的项目

      // 修改：操作记录改为对象数组，包含操作类型
      selectedOperations: [], // 选中的操作列表 [{item, operationType, quantity, remark}]
      isSelectMode: false, // 是否处于选择模式

      // 新增：单个物品操作相关
      showSingleOperationPopup: false,     // 单个物品操作弹窗
      currentSelectedItem: null,           // 当前选中的物品
      currentOperationType: null,          // 当前操作类型（inbound/outbound）
      singleOperationQuantity: 1,          // 单个物品操作数量
      singleOperationRemark: '',           // 单个物品操作备注

      // 修改：批量操作相关
      showBatchConfirmPopup: false,        // 批量确认弹窗
      batchOperationLoading: false,        // 批量操作加载状态

      // 新增：图片预览相关
      showImagePreview: false,
      previewImages: [],
      previewStartPos: 0
    };
  },
  created() {
    this.loadProjectOptions();
    // 如果有存储的搜索值或筛选值，自动执行搜索
    if (this.searchValue || this.filter.category || this.filter.status) {
      this.$nextTick(() => {
        this.hasSearched = true;
        this.onLoad();
      });
    }
  },
  computed: {
    deleteConfirmMessage() {
      return this.deletingItem ?
        `确定要删除物品 "${this.deletingItem.Item_Name}" 吗？此操作不可恢复。` :
        '确定要删除此物品吗？此操作不可恢复。';
    },
    stockCheckMessage() {
      return this.deletingItem ?
        `物品 "${this.deletingItem.Item_Name}" 当前库存为 ${this.deletingItem.Current_Stock}，请先将库存清零后再删除。` :
        '当前物品库存不为零，请先清空库存后再删除。';
    },
    // 批量操作统计
    batchOperationStats() {
      const inboundCount = this.selectedOperations.filter(op => op.operationType === 'inbound').length;
      const outboundCount = this.selectedOperations.filter(op => op.operationType === 'outbound').length;
      return {
        total: this.selectedOperations.length,
        inbound: inboundCount,
        outbound: outboundCount
      };
    },
    // 计算操作后库存 - 修复模板编译错误
    postOperationStock() {
      if (!this.currentOperationType || !this.currentSelectedItem) {
        return 0;
      }

      const currentStock = this.currentSelectedItem.Current_Stock || 0;
      const quantity = this.singleOperationQuantity || 0;

      if (this.currentOperationType === 'inbound') {
        return currentStock + quantity;
      } else if (this.currentOperationType === 'outbound') {
        return currentStock - quantity;
      }

      return currentStock;
    }
  },
  methods: {
    // 返回上一页
    goBack() {
      // 清除本地存储的搜索状态
      this.clearStoredSearchState();
      this.navigateTo('/index');
    },
    // 跳转到高级检索页面
    navigateToAdvancedSearch() {
      const department = this.$route.params.department;
      if (department) {
        this.$router.push(`/${department}/advanced-search`);
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
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

    // 获取存储的搜索值
    getStoredSearchValue() {
      return localStorage.getItem('inventorySearchValue') || '';
    },

    // 获取存储的筛选值
    getStoredFilterValue(key) {
      return localStorage.getItem(`inventoryFilter_${key}`) || '';
    },

    // 保存搜索值到本地存储
    saveSearchValue() {
      localStorage.setItem('inventorySearchValue', this.searchValue);
    },

    // 保存筛选值到本地存储
    saveFilterValue() {
      localStorage.setItem('inventoryFilter_category', this.filter.category);
      localStorage.setItem('inventoryFilter_status', this.filter.status);
    },

    // 清除本地存储的搜索状态
    clearStoredSearchState() {
      localStorage.removeItem('inventorySearchValue');
      localStorage.removeItem('inventoryFilter_category');
      localStorage.removeItem('inventoryFilter_status');
    },

    onSearch() {
      if (this.searchValue || this.filter.category || this.filter.status) {
        this.saveSearchValue();
        this.saveFilterValue();
        this.hasSearched = true;
        this.currentPage = 1;
        this.list = [];
        this.finished = false;
        this.clearSelection(); // 清除选择状态
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
        this.saveFilterValue();
        this.onSearch();
      } else {
        // 如果只是清除筛选，也要重置选择状态
        this.clearSelection();
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

      // 重置选择状态
      this.clearSelection();

      // 清除本地存储的搜索状态
      this.clearStoredSearchState();

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

    // 修改 onLoad 方法以预加载图片 URL
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

            // 处理返回的数据格式并预加载图片URL
            const processedData = newData.map(item => {
              const processedItem = {
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
                brand: item.Item_Brand || '',
                // 添加图片信息
                Item_Images: item.Item_Images || [],
                // 初始化图片URL为空字符串
                imageUrl: ''
              };

              // 预加载图片URL
              if (processedItem.Item_Images && processedItem.Item_Images.length > 0) {
                const firstImage = processedItem.Item_Images[0];
                if (firstImage.File_Md5) {
                  // 调用后端接口获取临时下载URL
                  const param = {
                    remoteLocation: firstImage.File_Md5
                  };

                  SensorRequest.Minio_PresignedDownloadUrl5B(
                    JSON.stringify(param),
                    (respData) => {
                      if (respData) {
                        // 将URL中的http://127.0.0.1:9000替换为https://api-v2.sensor-smart.cn:22027
                        processedItem.imageUrl = respData.replace(
                          'http://127.0.0.1:9000',
                          'https://api-v2.sensor-smart.cn:22027'
                        );
                      } else {
                        processedItem.imageUrl = require('@/assets/暂无图片1.png');
                      }
                    },
                    (error) => {
                      console.error('获取图片URL失败:', error);
                      processedItem.imageUrl = require('@/assets/暂无图片1.png');
                    }
                  );
                } else {
                  processedItem.imageUrl = require('@/assets/暂无图片1.png');
                }
              } else {
                processedItem.imageUrl = require('@/assets/暂无图片1.png');
              }

              return processedItem;
            });

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

    // 修改获取图片URL方法
    getImageUrl(item) {
      // 直接返回预加载的图片URL
      return item.imageUrl || require('@/assets/暂无图片1.png');
    },

    onRefresh() {
      this.currentPage = 1;
      this.list = [];
      this.finished = false;
      this.clearSelection(); // 清除选择状态
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

    // 新增：预览图片
    previewImage(item) {
      // 获取当前物品的所有图片
      const images = [];
      if (item.Item_Images && item.Item_Images.length > 0) {
        item.Item_Images.forEach(img => {
          if (img.File_Md5) {
            // 使用MinIO接口获取预览URL
            const param = {
              remoteLocation: img.File_Md5
            };
            SensorRequest.Minio_PresignedDownloadUrl5B(
              JSON.stringify(param),
              (url) => {
                if (url) {
                  // 将URL中的http://127.0.0.1:9000替换为https://api-v2.sensor-smart.cn:22027
                  const finalUrl = url.replace(
                    'http://127.0.0.1:9000',
                    'https://api-v2.sensor-smart.cn:22027'
                  );
                  images.push(finalUrl);
                } else {
                  images.push(require('@/assets/暂无图片1.png'));
                }

                // 当收集完所有图片URL后显示预览
                if (images.length === item.Item_Images.length) {
                  this.previewImages = images;
                  this.showImagePreview = true;
                  this.previewStartPos = 0;
                }
              },
              (error) => {
                console.error('获取图片URL失败:', error);
                images.push(require('@/assets/暂无图片1.png'));

                // 当收集完所有图片URL后显示预览
                if (images.length === item.Item_Images.length) {
                  this.previewImages = images;
                  this.showImagePreview = true;
                  this.previewStartPos = 0;
                }
              }
            );
          } else {
            images.push(require('@/assets/暂无图片1.png'));

            // 当收集完所有图片URL后显示预览
            if (images.length === item.Item_Images.length) {
              this.previewImages = images;
              this.showImagePreview = true;
              this.previewStartPos = 0;
            }
          }
        });
      } else {
        // 如果没有图片，显示占位图
        this.previewImages = [require('@/assets/暂无图片1.png')];
        this.showImagePreview = true;
        this.previewStartPos = 0;
      }
    },

    // 预览关闭回调
    onPreviewClose() {
      this.showImagePreview = false;
    },

    // 显示操作菜单（包括删除选项）
    showOperationMenu(item) {
      this.currentItem = item;
      Dialog({
        title: '操作选项',
        message: `对物品 "${item.Item_Name}" 进行操作`,
        actions: [
          {
            name: '删除',
            color: '#ee0a24',
            callback: () => {
              this.showDeleteDialog(item);
            }
          },
          {
            name: '查看详情',
            callback: () => {
              this.viewDetail(item.Shelf_Location);
            }
          }
        ],
        actionsDirection: 'vertical',
        overlay: true,
        closeOnClickOverlay: true
      });
    },

    // 显示删除确认弹窗
    showDeleteDialog(item) {
      this.deletingItem = item;

      // 检查库存数量
      if (item.Current_Stock > 0) {
        // 如果库存大于0，显示库存检查弹窗
        this.showStockCheckDialog = true;
      } else {
        // 如果库存为0，直接显示删除确认弹窗
        this.showDeleteConfirm = true;
      }
    },

    // 确认删除
    confirmDelete() {
      if (!this.deletingItem) {
        Toast('删除失败：未找到要删除的项目');
        return;
      }

      // 检查是否为储物箱位置，如果有其他物品则不能删除
      this.checkStorageBoxStatusAndDelete();
    },

    // 检查储物箱状态并执行删除
    checkStorageBoxStatusAndDelete() {
      // 获取当前物品的货架位置
      const shelfLocation = this.deletingItem.Shelf_Location;

      // 调用后端接口验证该位置的物品数量
      const params = {
        Shelf_Location: shelfLocation
      };

      SensorRequestPage.InventoryItemGetFun(
        JSON.stringify(params),
        (respData) => {
          try {
            // 解析响应数据
            let responseJson = JSON.parse(respData);
            // 从 Data 数组中获取库存项
            if (responseJson.Data && Array.isArray(responseJson.Data)) {
              // 如果该位置只有一个物品，或者该位置没有其他物品，可以执行删除
              if (responseJson.Data.length === 1) {
                // 执行删除操作
                this.executeDelete();
              } else {
                // 如果该位置有多个物品，不允许删除
                Toast(`该位置(${shelfLocation})为储物箱！请将此位置所有物品移出后再执行删除操作！`);
                this.showDeleteConfirm = false;
                this.deletingItem = null;
              }
            } else {
              Toast('数据格式错误，无法确认删除');
              this.showDeleteConfirm = false;
              this.deletingItem = null;
            }
          } catch (error) {
            console.error('解析库存信息响应失败:', error);
            Toast('数据解析失败，无法确认删除'+ error);
            this.showDeleteConfirm = false;
            this.deletingItem = null;
          }
        },
        (error) => {
          console.error('获取库存信息失败:', error);
          Toast('获取库存信息失败，无法确认删除');
          this.showDeleteConfirm = false;
          this.deletingItem = null;
        }
      );
    },

    // 执行删除操作
    executeDelete() {
      // 构造删除请求参数
      const param = {
        "Id": this.deletingItem.Id
      };

      // 调用删除接口
      SensorRequestPage.InventoryItemDeleteFun(
        JSON.stringify(param),
        (respData) => {
          Toast('删除成功');
          // 从列表中移除已删除的项目
          this.list = this.list.filter(item => item.Id !== this.deletingItem.Id);
          // 在重置状态前先记录删除操作（否则会出现ID不存在的情况）
          this.addDeletionRecord();
          // 重置状态
          this.showDeleteConfirm = false;
          this.deletingItem = null;
        },
        (error) => {
          console.error('删除库存失败:', error);
          Toast('删除失败，请重试');
          this.showDeleteConfirm = false;
          this.deletingItem = null;
        }
      );
    },
    // 添加删除记录的方法
    addDeletionRecord() {
      // 构造删除操作的事务请求参数
      const requestData = {
        PageIndex: 0,
        PageSize: 10,
        Inventory_ID: this.deletingItem.Id, // 使用删除项目的ID作为库存ID
        Transaction_Type: "删除", // 操作类型为"删除"
        Quantity_Change: 0,
        Current_Quantity: 0,
        Report_Person: {
          Person_Name: this.getLocalUserInfo().name,
          Person_Phone: this.getLocalUserInfo().phone,
          Person_DingID: this.getLocalUserInfo().dingID
        },
        Remark: `${this.getLocalUserInfo().name} 删除了物品: ${this.deletingItem.Item_Name}`
      };

      // 调用事务记录接口
      SensorRequestPage.InventoryTransactionAddFun(
        JSON.stringify(requestData),
        (respData) => {
          console.log('删除操作记录添加成功:', respData);
        },
        (error) => {
          console.error('删除操作记录添加失败:', error);
          this.$toast.fail('删除操作记录添加失败: ' + (error.message || '未知错误'));
        }
      );
    },

    // 获取本地用户信息
    getLocalUserInfo() {
      const name = localStorage.getItem(key_DingName);
      const phone = localStorage.getItem(key_DingUserPhone);
      const dingID = localStorage.getItem(key_DingUserIndex);

      return {
        name: name || '',
        phone: phone || '',
        dingID: dingID || ''
      };
    },

    // 取消删除
    cancelDelete() {
      this.showDeleteConfirm = false;
      this.showStockCheckDialog = false;
      this.deletingItem = null;
    },
    // 图片加载失败时的处理
    onImageError(event) {
      event.target.src = require('@/assets/暂无图片1.png');
    },

    // 修改：选择物品相关方法 - 实现单个物品操作
    toggleItemSelection(item) {
      // 检查该物品是否已有操作记录
      const existingOpIndex = this.selectedOperations.findIndex(op => op.item.Id === item.Id);

      if (existingOpIndex > -1) {
        // 如果已存在操作记录，移除它
        this.selectedOperations.splice(existingOpIndex, 1);
      } else {
        // 如果不存在，显示操作选择弹窗
        this.currentSelectedItem = item;
        this.showSingleOperationPopup = true;
        this.currentOperationType = null;
        this.singleOperationQuantity = 1;
        this.singleOperationRemark = '';
      }
    },

    // 检查物品是否已被选中进行操作
    isItemSelected(item) {
      return this.selectedOperations.some(op => op.item.Id === item.Id);
    },

    // 清除选择（修改为清除操作列表）
    clearSelection() {
      this.selectedOperations = [];
      this.isSelectMode = false;
    },

    // 选择操作类型（入库/出库）
    selectOperationType(type) {
      this.currentOperationType = type;
      // 重置数量为1
      this.singleOperationQuantity = 1;
    },

    // 确认单个物品操作
    confirmSingleOperation() {
      if (!this.currentOperationType) {
        Toast('请选择操作类型');
        return;
      }

      if (!this.singleOperationQuantity || this.singleOperationQuantity <= 0) {
        Toast('请输入有效数量');
        return;
      }

      // 对于出库操作，验证库存
      if (this.currentOperationType === 'outbound' &&
        this.singleOperationQuantity > (this.currentSelectedItem ? this.currentSelectedItem.Current_Stock : 0)) {
        Toast(`出库数量不能超过当前库存 ${(this.currentSelectedItem ? this.currentSelectedItem.Current_Stock : 0)}`);
        return;
      }

      // 添加到操作列表
      this.selectedOperations.push({
        item: this.currentSelectedItem,
        operationType: this.currentOperationType,
        quantity: this.singleOperationQuantity,
        remark: this.singleOperationRemark
      });

      // 关闭弹窗
      this.closeSingleOperationPopup();
    },

    // 关闭单个物品操作弹窗
    closeSingleOperationPopup() {
      this.showSingleOperationPopup = false;
      this.currentSelectedItem = null;
      this.currentOperationType = null;
      this.singleOperationQuantity = 1;
      this.singleOperationRemark = '';
    },

    // 计算选中统计信息
    getSelectedStats() {
      const inboundOps = this.selectedOperations.filter(op => op.operationType === 'inbound');
      const outboundOps = this.selectedOperations.filter(op => op.operationType === 'outbound');

      return {
        total: this.selectedOperations.length,
        inbound: inboundOps.length,
        outbound: outboundOps.length
      };
    },
    // 显示批量确认弹窗
    showBatchConfirmation() {
      if (this.selectedOperations.length === 0) {
        Toast('请至少选择一个物品进行操作');
        return;
      }
      this.showBatchConfirmPopup = true;
    },
    // 关闭批量确认弹窗
    closeBatchConfirmation() {
      this.showBatchConfirmPopup = false;
    },
    // 执行批量操作
    // 修改 executeBatchOperations 方法
    async executeBatchOperations() {
      if (this.selectedOperations.length === 0) {
        Toast('没有待处理的操作');
        return;
      }
      this.batchOperationLoading = true;
      try {
        // 使用 Promise.all 和错误捕获替代 allSettled
        const promises = this.selectedOperations.map(operation =>
          this.executeSingleOperation(operation)
            .then(result => ({ status: 'fulfilled', value: result }))
            .catch(error => ({ status: 'rejected', reason: error }))
        );
        const results = await Promise.all(promises);
        // 统计成功和失败数量
        const successful = results.filter(result => result.status === 'fulfilled').length;
        const failed = results.filter(result => result.status === 'rejected').length;

        if (failed > 0) {
          Toast(`操作完成！成功: ${successful}，失败: ${failed}`);
        } else {
          Toast.success(`全部 ${successful} 个操作执行成功！`);
        }
        // 清空操作列表并刷新
        this.clearSelection();
        this.closeBatchConfirmation();
        this.onRefresh();

      } catch (error) {
        console.error('批量操作失败:', error);
        Toast.fail('批量操作失败');
      } finally {
        this.batchOperationLoading = false;
      }
    },

    // 执行单个操作
    executeSingleOperation(operation) {
      return new Promise((resolve, reject) => {
        const { item, operationType, quantity, remark } = operation;

        // 构造请求参数
        const requestData = {
          PageIndex: 0,
          PageSize: 10,
          Inventory_ID: item.Id.toString(),
          Transaction_Type: operationType === 'inbound' ? '入库' : '出库',
          Quantity_Change: operationType === 'inbound' ? quantity : -quantity,
          Current_Quantity: operationType === 'inbound'
            ? item.Current_Stock + quantity
            : item.Current_Stock - quantity,
          Report_Person: {
            Person_Name: this.getLocalUserInfo().name,
            Person_Phone: this.getLocalUserInfo().phone,
            Person_DingID: this.getLocalUserInfo().dingID
          },
          Remark: `${operationType === 'inbound' ? '批量入库' : '批量出库'}: ${quantity}, ${remark || '无备注'}`
        };

        // 调用接口
        SensorRequestPage.InventoryTransactionAddFun(
          JSON.stringify(requestData),
          (respData) => {
            console.log(`${item.Item_Name} ${operationType === 'inbound' ? '入库' : '出库'}成功`);
            resolve(respData);
          },
          (error) => {
            console.error(`${item.Item_Name} ${operationType === 'inbound' ? '入库' : '出库'}失败:`, error);
            reject(error);
          }
        );
      });
    }
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

/* 批量操作栏样式 */
.batch-operation-bar {
  position: sticky;
  top: 0;
  z-index: 999;
  background: #fff;
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.batch-info {
  font-weight: bold;
  color: #1989fa;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.results-section {
  padding: 10px;
}

.inventory-cell {
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.cell-content {
  display: flex;
  padding: 8px;
  position: relative; /* 为删除按钮和复选框定位做准备 */
  cursor: pointer; /* 表示这是一个可点击的卡片 */
}

/* 角落选择复选框样式 - 放在左上角，不影响布局 */
.select-checkbox-corner {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.cell-content:hover {
  background-color: #f8f8f8; /* 鼠标悬停时的视觉反馈 */
}

.image-section {
  width: 30%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 8px;
  cursor: zoom-in; /* 表示图片可点击预览 */
}

.item-image {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #eee;
}

.info-section {
  width: 70%; /* 恢复原始宽度，不再减去复选框的宽度 */
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  background-color: #f5f5f5;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.delete-btn:hover {
  background-color: #e0e0e0;
}

.delete-btn .van-icon {
  font-size: 16px;
  color: #ff6b6b;
}

.cell-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 4px;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  flex: 1;
  margin-right: 4px;
  line-height: 1.3;
  margin-bottom: 4px;
}

/* 型号和库存信息分行显示 */
.item-subtitle-line {
  display: flex;
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
  width: 100%;
}

.item-subtitle-line:last-child {
  margin-bottom: 4px;
}

.model-label, .stock-label {
  font-weight: 500;
  margin-right: 4px;
  color: #333;
}

.model-value, .stock-value {
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-value {
  color: orange;
  font-weight: 600;
}

.cell-body {
  display: flex;
  flex-direction: column;
  margin-bottom: 4px;
}

.item-info {
  flex: 1;
}

.info-row {
  display: flex;
  font-size: 12px;
  align-items: baseline;
  margin-bottom: 2px;
  width: 100%;
}

.info-row:last-child {
  margin-bottom: 0;
}

.label {
  color: #999;
  margin-right: 4px;
  flex-shrink: 0;
  font-size: 11px;
  width: 40px;
}

.value {
  color: #666;
  flex: 1;
  word-break: break-all;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 隐藏原有的按钮区域 */
.cell-footer {
  display: none;
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

/* 批量操作弹窗样式 */
.batch-operation-popup {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.batch-operation-popup .popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 500;
}

.selected-items-summary {
  margin-bottom: 16px;
}

.selected-items-summary p {
  font-weight: bold;
  margin-bottom: 8px;
}

.selected-list {
  max-height: 150px;
  overflow-y: auto;
}

.selected-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.selected-item .current-stock {
  color: #999;
  font-size: 12px;
}

.operation-form {
  flex: 1;
  overflow-y: auto;
}

.action-buttons {
  margin-top: 16px;
}

/* 单个物品操作弹窗样式 */
.single-operation-popup {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.single-operation-popup .popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 500;
}

.selected-item-info {
  margin-bottom: 16px;
  padding: 12px;
  background-color: #f8f8f8;
  border-radius: 8px;
}

.selected-item-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #333;
}

.selected-item-info p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.operation-type-selection {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.operation-type-selection h4 {
  margin-bottom: 24px;
  font-size: 16px;
  color: #333;
}

.type-options {
  display: flex;
  gap: 24px;
  width: 100%;
  justify-content: center;
}

.type-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  width: 100px;
}

.type-option.active {
  border-color: #3f83f8;
  background-color: #f0f7ff;
}

.type-option span {
  margin-top: 8px;
  font-size: 14px;
  color: #333;
}

.quantity-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.quantity-section h4 {
  margin-bottom: 12px;
  font-size: 16px;
  color: #333;
}

.quantity-input {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px 0;
}

.quantity-text {
  margin: 0 16px;
  font-size: 18px;
  font-weight: bold;
  min-width: 40px;
  text-align: center;
}

.quantity-preview {
  margin: 16px 0;
  padding: 12px;
  background-color: #f8f8f8;
  border-radius: 8px;
  text-align: center;
}

.quantity-preview p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.inbound-preview {
  color: #4CAF50;
  font-weight: bold;
}

.outbound-preview {
  color: #F44336;
  font-weight: bold;
}

/* 批量确认弹窗样式 */
.batch-confirmation-popup {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.confirmation-summary {
  margin-bottom: 16px;
  padding: 12px;
  background-color: #f0f7ff;
  border-radius: 8px;
}

.confirmation-summary p {
  margin: 4px 0;
  font-size: 14px;
  color: #333;
}

.operations-list h4 {
  margin: 16px 0 8px 0;
  font-size: 16px;
  color: #333;
}

.operation-item {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 8px;
}

.item-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.item-name {
  font-weight: 500;
  color: #333;
}

.operation-type {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: white;
}

.operation-type.inbound {
  background-color: #4CAF50;
}

.operation-type.outbound {
  background-color: #F44336;
}

.operation-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.operation-remark {
  font-size: 12px;
  color: #888;
  font-style: italic;
}

.confirmation-actions {
  margin-top: auto;
  padding-top: 16px;
}

/* 自定义全图预览图片-关闭按钮样式 */
.custom-close-button {
  background-color: red;
  width: 35px;
  height: 35px;
  top: 15px;
  right: 15px;
}
</style>
