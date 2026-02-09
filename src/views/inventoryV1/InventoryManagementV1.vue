<template>
  <div class="inventory-page">
    <!-- 页面顶部搜索区域 -->
    <div class="search-section">
      <!-- 搜索标签切换 -->
      <div class="search-tags-container">
        <div class="search-tags">
          <div
            v-for="tag in searchTags"
            :key="tag.key"
            :class="['tag-item', { active: currentSearchTag === tag.key }]"
            @click="switchSearchTag(tag.key)"
          >
            <van-icon :name="tag.icon" class="tag-icon" />
            <span class="tag-label">{{ tag.label }}</span>
          </div>
        </div>
      </div>

      <!-- 搜索输入区域 -->
      <div class="search-input-container">
        <div class="search-input-wrapper">
          <van-field
            v-model="searchValue"
            :placeholder="getPlaceholder()"
            class="search-input"
            clearable
            @keyup.enter="onSearch"
            @clear="onSearch"
          />
        </div>

        <!-- 操作按钮 -->
        <div class="search-actions">
          <!-- 搜索按钮 -->
          <van-button
            class="action-btn search-btn"
            size="small"
            round
            @click="onSearch"
          >
            <van-icon name="search" />
          </van-button>
          <!-- 重置按钮 -->
          <van-icon
            name="replay"
            class="action-btn reset-icon"
            @click="onReset"
          />
          <!-- 筛选按钮 -->
          <van-icon
            name="filter-o"
            class="action-btn filter-btn"
            :class="{ active: isFilterActive }"
            @click="toggleFilterPopup"
          />
        </div>
      </div>

      <!-- 当前筛选条件展示 -->
      <div v-if="activeFilters.length > 0" class="active-filters">
        <div class="filters-tags">
          <van-tag
            v-for="filter in activeFilters"
            :key="filter.key"
            type="primary"
            size="medium"
            closeable
            @close="removeFilter(filter.key)"
          >
            {{ filter.label }}
          </van-tag>
        </div>
        <van-button
          type="primary"
          size="mini"
          plain
          @click="clearAllFilters"
        >
          清空筛选
        </van-button>
      </div>

      <!-- 筛选弹出层 -->
      <van-popup
        v-model="showFilterPopover"
        position="bottom"
        round
        :style="{ height: '60%' }"
      >
        <div class="filter-popup">
          <!-- 弹出层头部 -->
          <div class="filter-popup-header">
            <h3>筛选条件</h3>
            <van-icon name="cross" @click="closeFilterPopup" />
          </div>

          <!-- 筛选内容 -->
          <div class="filter-content">
            <!-- 分类筛选 -->
            <div class="filter-group">
              <h4 class="filter-group-title">物品分类</h4>
              <div class="filter-options">
                <div
                  v-for="option in categoryOptions"
                  :key="option.value"
                  :class="['filter-option', { active: filter.category === option.value }]"
                  @click="filter.category = option.value"
                >
                  <div class="option-content">
                    <div class="option-icon">
                      <van-icon :name="getCategoryIcon(option.value)" />
                    </div>
                    <span class="option-text">{{ option.text }}</span>
                  </div>
                  <van-icon
                    v-if="filter.category === option.value"
                    name="success"
                    class="check-icon"
                  />
                </div>
              </div>
            </div>

            <!-- 公司筛选 -->
            <div class="filter-group">
              <h4 class="filter-group-title">所属公司</h4>
              <div class="filter-options">
                <div
                  v-for="option in companyOptions"
                  :key="option.value"
                  :class="['filter-option', { active: filter.company === option.value }]"
                  @click="filter.company = option.value"
                >
                  <div class="option-content">
                    <div class="option-icon">
                      <van-icon name="building-o" />
                    </div>
                    <span class="option-text">{{ option.text }}</span>
                  </div>
                  <van-icon
                    v-if="filter.company === option.value"
                    name="success"
                    class="check-icon"
                  />
                </div>
              </div>
            </div>

            <!-- 库存状态筛选 -->
            <div class="filter-group">
              <h4 class="filter-group-title">库存状态</h4>
              <div class="filter-options">
                <div
                  v-for="option in stockStatusOptions"
                  :key="option.value"
                  :class="['filter-option', { active: filter.stockStatus === option.value }]"
                  @click="filter.stockStatus = option.value"
                >
                  <div class="option-content">
                    <div class="option-icon">
                      <van-icon :name="getStockStatusIcon(option.value)" />
                    </div>
                    <span class="option-text">{{ option.text }}</span>
                  </div>
                  <van-icon
                    v-if="filter.stockStatus === option.value"
                    name="success"
                    class="check-icon"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="filter-popup-actions">
            <van-button
              class="cancel-btn"
              block
              round
              @click="resetFilters"
            >
              重置筛选
            </van-button>
            <van-button
              class="confirm-btn"
              type="primary"
              block
              round
              @click="applyFilters"
            >
              应用筛选
            </van-button>
          </div>
        </div>
      </van-popup>
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
              <!-- 物品名称独占一行 -->
              <div class="item-title">物品名称：{{ item.Item_Name || '无名称' }}</div>

              <!-- 图片和信息区域横向排列 -->
              <div class="content-row">
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
                  <div class="action-buttons-container">
                    <!-- 选择复选框 -->
                    <div
                      class="select-checkbox-corner"
                      @click.stop="toggleItemSelection(item)"
                    >
                      <van-icon
                        :name="isItemSelected(item) ? 'success' : 'circle'"
                        :color="isItemSelected(item) ? '#1989fa' : '#c8c9cc'"
                      />
                    </div>
                  </div>

                  <!-- 型号和库存信息分行显示 -->
                  <div class="item-subtitle-line">
                    <span class="model-label">型号：</span>
                    <span class="model-value">{{ item.Item_Model && item.Item_Model.trim() !== '' ? item.Item_Model : '用户暂未填写' }}</span>
                  </div>
                  <div class="item-subtitle-line">
                    <span class="stock-label">库存：</span>
                    <span class="stock-value">{{ item.Current_Stock !== null && item.Current_Stock !== undefined && item.Current_Stock !== '' ? item.Current_Stock : '用户暂未填写' }}</span>
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
    <van-popup v-model="showSingleOperationPopup" position="bottom" :style="{ height: '70%' }">
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
            <!-- 删除按钮 -->
            <div
              class="type-option"
              @click="handleDeleteClick"
            >
              <van-icon name="delete" color="#FF6B6B" />
              <span>删除</span>
            </div>
          </div>
        </div>

        <!-- 数量输入 -->
        <div class="quantity-section" v-if="currentOperationType">
          <h4>{{ currentOperationType === 'inbound' ? '入库' : '出库' }}数量</h4>

          <!-- 修改：移除 disable-input 属性，允许直接输入 -->
          <div class="quantity-input">
            <van-stepper
              v-model="singleOperationQuantity"
              :min="1"
              :max="currentOperationType === 'outbound' ? (currentSelectedItem ? currentSelectedItem.Current_Stock : 0) : 999999"
              :step="1"
              theme="round"
              button-size="28"
            />
            <span class="quantity-text">{{ singleOperationQuantity }}</span>
          </div>

          <!-- 新增：自定义输入区域 -->
          <div class="custom-input-section">
            <h5>或自定义输入数量</h5>
            <van-field
              v-model="customQuantity"
              type="number"
              :placeholder="`请输入${currentOperationType === 'inbound' ? '入库' : '出库'}数量`"
              clearable
              @blur="onCustomQuantityBlur"
              @keyup.enter="applyCustomQuantity"
            >
              <template #button>
                <van-button size="small" type="primary" @click="applyCustomQuantity">应用</van-button>
              </template>
            </van-field>

            <!-- 快速输入按钮 -->
            <div class="quick-input-buttons">
              <van-button
                v-for="num in quickNumbers"
                :key="num"
                size="small"
                plain
                @click="quickInput(num)"
              >
                {{ num }}
              </van-button>
            </div>
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

    <!-- 悬浮按钮区域 -->
    <div class="floating-buttons">
      <CustomizableFloatingButton
        :initial-position="{ bottom: 200, right: 10 }"
        :icon-src="require('@/assets/返回.png')"
        :background-size="46"
        :icon-size="46"
        :on-click="goBack"
      />
      <CustomizableFloatingButton
        :initial-position="{ bottom: 130, right: 10 }"
        :icon-src="require('@/assets/高级检索.png')"
        :background-size="46"
        :icon-size="35"
        :on-click="navigateToAdvancedSearch"
      />
      <CustomizableFloatingButton
        :initial-position="{ bottom: 60, right: 10 }"
        :icon-src="require('@/assets/新增图标.png')"
        :background-size="46"
        :icon-size="46"
        :on-click="onFloatingButtonClick"
      />
    </div>
  </div>
</template>

<script>
import { Dialog, Toast, ImagePreview } from 'vant';
import SensorRequest from '../../utils/SensorRequest.js';
import FloatingActionButton from '../../components/FloatingActionButton.vue';
import { key_DingScannedInventoryQRCodeResult } from "../../utils/Dingding";
import SensorRequestPage from "../../utils/SensorRequestPage";
import CustomizableFloatingButton from "../../components/CustomizableFloatingButton.vue";
import { key_DingName, key_DingUserIndex, key_DingUserPhone } from "../../utils/Dingding";

// 添加 Promise.allSettled 的 polyfill
if (!Promise.allSettled) {
  Promise.allSettled = function (promises) {
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
    FloatingActionButton
  },
  data() {
    return {
      isNavigating: false,
      searchValue: this.getStoredSearchValue(),
      hasSearched: false,
      showInboundPopup: false,
      showOutboundPopup: false,
      showInboundTypePicker: false,
      showOutboundTypePicker: false,
      showProjectPicker: false,
      showOutboundProjectPicker: false,

      // 筛选相关数据
      showFilterPopover: false,
      filter: {
        category: this.getStoredFilterValue('category'),
        company: this.getStoredFilterValue('company'),
        stockStatus: this.getStoredFilterValue('stockStatus')
      },

      currentSearchTag: 'itemName',
      searchTags: [
        { key: 'itemName', label: '物品名称', icon: 'apps-o' },
        { key: 'itemModel', label: '物品型号', icon: 'setting-o' },
        { key: 'company', label: '公司', icon: 'building-o' },
        { key: 'location', label: '位置', icon: 'location-o' }
      ],

      // 筛选选项
      categoryOptions: [
        { text: '全部类型', value: '', icon: 'apps-o' },
        { text: '耗材', value: '耗材', icon: 'send-gift-o' },
        { text: '公用', value: '公用', icon: 'share-o' },
        { text: '项目', value: '项目', icon: 'todo-list-o' },
        { text: '其他', value: '其他', icon: 'ellipsis' }
      ],
      companyOptions: [
        { text: '全部公司', value: '', icon: 'building-o' },
        { text: '晟思智能', value: '晟思智能', icon: 'home-o' },
        { text: '大钧科技', value: '大钧科技', icon: 'shop-o' },
        { text: '星移科技', value: '星移科技', icon: 'star-o' },
        { text: '总公司', value: '总公司', icon: 'gem-o' }
      ],
      stockStatusOptions: [
        { text: '全部状态', value: '', icon: 'bars' },
        { text: '库存充足', value: '充足', icon: 'good-job-o' },
        { text: '库存紧张', value: '紧张', icon: 'warning-o' },
        { text: '库存为零', value: '为零', icon: 'minus-o' },
        { text: '库存异常', value: '异常', icon: 'clear-o' }
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
      showDeleteConfirm: false,
      showStockCheckDialog: false,
      deletingItem: null,

      selectedOperations: [],
      isSelectMode: false,

      showSingleOperationPopup: false,
      currentSelectedItem: null,
      currentOperationType: null,
      singleOperationQuantity: 1,
      singleOperationRemark: '',

      customQuantity: '',
      quickNumbers: [5, 10, 20, 50, 100],

      showBatchConfirmPopup: false,
      batchOperationLoading: false,

      showImagePreview: false,
      previewImages: [],
      previewStartPos: 0
    };
  },
  created() {
    this.loadProjectOptions();
    // 如果有存储的搜索值或筛选值，自动执行搜索
    if (this.searchValue || this.filter.category || this.filter.company || this.filter.stockStatus) {
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
    batchOperationStats() {
      const inboundCount = this.selectedOperations.filter(op => op.operationType === 'inbound').length;
      const outboundCount = this.selectedOperations.filter(op => op.operationType === 'outbound').length;
      return {
        total: this.selectedOperations.length,
        inbound: inboundCount,
        outbound: outboundCount
      };
    },
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
    },

    // 新增计算属性：判断是否有激活的筛选条件
    isFilterActive() {
      return this.filter.category || this.filter.company || this.filter.stockStatus;
    },

    // 新增计算属性：当前激活的筛选标签
    activeFilters() {
      const filters = [];

      if (this.filter.category) {
        const option = this.categoryOptions.find(opt => opt.value === this.filter.category);
        if (option) {
          filters.push({
            key: 'category',
            label: `分类: ${option.text}`,
            value: this.filter.category
          });
        }
      }

      if (this.filter.company) {
        const option = this.companyOptions.find(opt => opt.value === this.filter.company);
        if (option) {
          filters.push({
            key: 'company',
            label: `公司: ${option.text}`,
            value: this.filter.company
          });
        }
      }

      if (this.filter.stockStatus) {
        const option = this.stockStatusOptions.find(opt => opt.value === this.filter.stockStatus);
        if (option) {
          filters.push({
            key: 'stockStatus',
            label: `状态: ${option.text}`,
            value: this.filter.stockStatus
          });
        }
      }

      return filters;
    }
  },
  methods: {
    // 切换搜索标签
    switchSearchTag(tagKey) {
      this.currentSearchTag = tagKey;
      // 切换标签时不清空搜索值，但需要重新执行搜索
      if (this.searchValue) {
        this.onSearch();
      }
    },

    // 获取占位符文本
    getPlaceholder() {
      const placeholderMap = {
        itemName: '搜索物品名称...',
        itemModel: '搜索物品型号...',
        company: '搜索公司名称...',
        location: '搜索位置信息...'
      };
      return placeholderMap[this.currentSearchTag] || '搜索...';
    },

    // 获取分类图标
    getCategoryIcon(value) {
      const iconMap = {
        '': 'apps-o',
        '耗材': 'send-gift-o',
        '公用': 'share-o',
        '项目': 'todo-list-o',
        '其他': 'ellipsis'
      };
      return iconMap[value] || 'apps-o';
    },

    // 获取库存状态图标
    getStockStatusIcon(value) {
      const iconMap = {
        '': 'bars',
        '充足': 'good-job-o',
        '紧张': 'warning-o',
        '为零': 'minus-o',
        '异常': 'clear-o'
      };
      return iconMap[value] || 'bars';
    },

    // 切换筛选弹出层
    toggleFilterPopup() {
      this.showFilterPopover = !this.showFilterPopover;
    },

    // 关闭筛选弹出层
    closeFilterPopup() {
      this.showFilterPopover = false;
    },

    // 应用筛选
    applyFilters() {
      this.saveFilterValue();
      this.showFilterPopover = false;
      this.onSearch();
    },

    // 重置筛选
    resetFilters() {
      this.filter = {
        category: '',
        company: '',
        stockStatus: ''
      };
      this.showFilterPopover = false;
    },

    // 移除单个筛选条件
    removeFilter(filterKey) {
      this.filter[filterKey] = '';
      this.saveFilterValue();
      this.onSearch();
    },

    // 清除所有筛选条件
    clearAllFilters() {
      this.resetFilters();
      this.saveFilterValue();
      this.onSearch();
    },

    // 返回上一页
    goBack() {
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
      if (this.isNavigating) return;
      this.isNavigating = true;
      this.navigateTo('/inventory/addV1');
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
      Object.keys(this.filter).forEach(key => {
        localStorage.setItem(`inventoryFilter_${key}`, this.filter[key]);
      });
    },

    // 清除本地存储的搜索状态
    clearStoredSearchState() {
      localStorage.removeItem('inventorySearchValue');
      Object.keys(this.filter).forEach(key => {
        localStorage.removeItem(`inventoryFilter_${key}`);
      });
    },

    // 搜索方法
    onSearch() {
      if (this.searchValue || this.isFilterActive) {
        this.saveSearchValue();
        this.saveFilterValue();
        this.hasSearched = true;
        this.currentPage = 1;
        this.list = [];
        this.finished = false;
        this.clearSelection();

        // 构造请求参数
        const param = {
          PageIndex: this.currentPage - 1,
          PageSize: this.pageSize,
          Item_Name: this.currentSearchTag === 'itemName' ? this.searchValue : '',
          Item_Model: this.currentSearchTag === 'itemModel' ? this.searchValue : '',
          Company: this.currentSearchTag === 'company' ? this.searchValue : '',
          Shelf_Location: this.currentSearchTag === 'location' ? this.searchValue : '',
          Category_Type: this.filter.category,
          Company_Filter: this.filter.company
          // 注意：stockStatus 筛选需要后端接口支持
        };

        this.onLoad(param);
      } else {
        Toast('请输入搜索关键词或选择筛选条件');
      }
    },

    // 重置搜索
    onReset() {
      this.searchValue = '';
      this.resetFilters();
      this.currentPage = 1;
      this.list = [];
      this.finished = false;
      this.hasSearched = false;
      this.clearSelection();
      this.clearStoredSearchState();
      this.onLoad();
      Toast('已重置搜索和筛选条件');
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

    // 加载数据
    onLoad(param) {
      return new Promise((resolve) => {
        this.loading = true;

        // 构造请求参数，按照后端接口要求的格式
        const requestParam = param || {
          PageIndex: this.currentPage - 1,
          PageSize: this.pageSize,
          Item_Name: this.searchValue,
          Shelf_Location: "",
          Item_Model: "",
          Item_Brand: "",
          Category_Type: this.filter.category,
          Company: this.filter.company
        };

        // 调用后端接口获取库存数据
        SensorRequestPage.InventoryItemGetFun(JSON.stringify(requestParam), (respData) => {
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
      this.clearSelection();
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

    // 预览图片
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
            Toast('数据解析失败，无法确认删除' + error);
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
        Inventory_ID: this.deletingItem.Id,
        Transaction_Type: "删除",
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
        this.customQuantity = '';
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
      // 清空自定义输入
      this.customQuantity = '';
    },

    // 新增：自定义输入框失去焦点时的处理
    onCustomQuantityBlur() {
      this.applyCustomQuantity();
    },

    // 新增：应用自定义输入的数量
    applyCustomQuantity() {
      if (!this.customQuantity || this.customQuantity.trim() === '') {
        return;
      }

      const numValue = parseInt(this.customQuantity);

      // 验证输入是否有效
      if (isNaN(numValue) || numValue <= 0) {
        Toast('请输入有效的正数');
        return;
      }

      // 验证出库数量是否超过库存
      if (this.currentOperationType === 'outbound' &&
        numValue > (this.currentSelectedItem ? this.currentSelectedItem.Current_Stock : 0)) {
        Toast(`出库数量不能超过当前库存 ${(this.currentSelectedItem ? this.currentSelectedItem.Current_Stock : 0)}`);
        return;
      }

      // 验证入库数量最大值
      if (this.currentOperationType === 'inbound' && numValue > 999999) {
        Toast('入库数量不能超过 999999');
        return;
      }

      // 应用自定义数量
      this.singleOperationQuantity = numValue;
      Toast.success(`已设置数量为 ${numValue}`);
    },

    // 新增：快速输入
    quickInput(num) {
      // 验证出库数量是否超过库存
      if (this.currentOperationType === 'outbound' &&
        num > (this.currentSelectedItem ? this.currentSelectedItem.Current_Stock : 0)) {
        Toast(`出库数量不能超过当前库存 ${(this.currentSelectedItem ? this.currentSelectedItem.Current_Stock : 0)}`);
        return;
      }

      // 验证入库数量最大值
      if (this.currentOperationType === 'inbound' && num > 999999) {
        Toast('入库数量不能超过 999999');
        return;
      }

      this.singleOperationQuantity = num;
      this.customQuantity = num.toString();
      Toast.success(`已设置数量为 ${num}`);
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
      this.customQuantity = '';
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
    },

    // 新增删除点击事件
    handleDeleteClick() {
      if (!this.currentSelectedItem) {
        Toast('请选择要删除的物品');
        return;
      }

      this.deletingItem = this.currentSelectedItem;

      // 检查库存数量
      if (this.currentSelectedItem.Current_Stock > 0) {
        this.showStockCheckDialog = true;
      } else {
        this.showDeleteConfirm = true;
      }

      this.closeSingleOperationPopup();
    }
  }
};
</script>

<style scoped>
.inventory-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
}

/* 搜索区域样式 */
.search-section {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: linear-gradient(135deg, #3f83f8 0%, #2c6be0 100%);
  padding: 16px;
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  box-shadow: 0 8px 24px rgba(63, 131, 248, 0.2);
}

/* 搜索标签容器 */
.search-tags-container {
  margin-bottom: 16px;
}

.search-tags {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.tag-item:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.tag-item.active {
  background: #ffffff;
  color: #3f83f8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tag-icon {
  font-size: 16px;
}

.tag-label {
  font-weight: 500;
}

/* 搜索输入容器 */
.search-input-container {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  background: #ffffff;
  border-radius: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
}

.search-input-wrapper:focus-within {
  box-shadow: 0 4px 16px rgba(63, 131, 248, 0.3);
  transform: translateY(-2px);
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #3f83f8;
  z-index: 1;
  font-size: 18px;
}

.search-input {
  padding-left: 48px !important;
  padding-right: 16px !important;
  background: transparent !important;
  border: none !important;
  height: 48px;
  font-size: 15px;
}

.search-input::placeholder {
  color: #a0aec0;
}

/* 操作按钮 */
.search-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #ffffff;
  color: #3f83f8;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.action-btn.active {
  background: #3f83f8;
  color: #ffffff;
}

.reset-btn {
  width: auto;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.reset-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 激活的筛选条件展示 */
.active-filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.filters-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 筛选弹出层样式 */
.filter-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.filter-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.filter-popup-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.filter-popup-header .van-icon {
  font-size: 20px;
  color: #999;
  cursor: pointer;
}

/* 筛选内容 */
.filter-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.filter-group {
  margin-bottom: 24px;
}

.filter-group-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
}

.filter-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.filter-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-option:hover {
  border-color: #3f83f8;
  background: #f0f7ff;
}

.filter-option.active {
  border-color: #3f83f8;
  background: #f0f7ff;
}

.option-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.option-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 8px;
  color: #3f83f8;
}

.filter-option.active .option-icon {
  background: #3f83f8;
  color: #ffffff;
}

.option-text {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.filter-option.active .option-text {
  color: #3f83f8;
}

.check-icon {
  color: #3f83f8;
  font-size: 16px;
}

/* 筛选操作按钮 */
.filter-popup-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #f0f0f0;
  background: #ffffff;
}

.filter-popup-actions .van-button {
  flex: 1;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
}

.cancel-btn {
  border: 2px solid #e9ecef;
  color: #666;
}

.confirm-btn {
  background: linear-gradient(135deg, #3f83f8 0%, #2c6be0 100%);
  border: none;
}

/* 结果列表区域 */
.results-section {
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
}

/* 批量操作栏样式 */
.batch-operation-bar {
  position: sticky;
  top: 0;
  z-index: 9999;
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

/* 单元格样式 */
.inventory-cell {
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.item-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  display: block;
  margin-bottom: 8px;
}

.cell-content {
  display: flex;
  flex-direction: column;
  padding: 8px;
  position: relative;
  cursor: pointer;
}

.content-row {
  display: flex;
  width: 100%;
}

.image-section {
  width: 30%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 8px;
  cursor: zoom-in;
}

.info-section {
  width: 70%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.cell-content:hover {
  background-color: #f8f8f8;
}

.item-image {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #eee;
}

/* 角落选择复选框样式 */
.select-checkbox-corner {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  margin-bottom: 8px;
}

/* 删除按钮样式 */
.delete-btn {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  margin-bottom: 8px;
  transition: background-color 0.2s;
}

.delete-btn:hover {
  background-color: #e0e0e0;
}

.delete-btn .van-icon {
  font-size: 16px;
  color: #ff6b6b;
}

.action-buttons-container {
  position: absolute;
  right: -10px;
  display: flex;
  flex-direction: column;
  z-index: 2;
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

/* 公司和位置信息 */
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

/* 空状态 */
.empty-state {
  padding: 50px 16px;
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

/* 自定义输入区域样式 */
.custom-input-section {
  margin: 16px 0;
  padding: 12px;
  background-color: #f8f8f8;
  border-radius: 8px;
}

.custom-input-section h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
}

.quick-input-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.quick-input-buttons .van-button {
  flex: 1;
  min-width: 60px;
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

/* 悬浮按钮区域 */
.floating-buttons {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 999;
}

/* 响应式调整 */
@media (max-width: 480px) {
  .search-tags {
    gap: 6px;
  }

  .tag-item {
    padding: 6px 12px;
    font-size: 12px;
  }

  .search-input-container {
    gap: 8px;
  }

  .action-btn {
    width: 44px;
    height: 44px;
    font-size: 18px;
  }

  .reset-btn {
    padding: 0 16px;
    font-size: 13px;
  }

  .filter-options {
    grid-template-columns: 1fr;
  }
}
</style>
