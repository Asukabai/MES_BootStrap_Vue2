<template>
  <div class="seat-map-visualization">
    <!-- 弹窗容器 -->
    <van-popup
      v-model="internalShow"
      position="bottom"
      round
      :style="{ height: popupHeight, maxWidth: '600px', margin: '0 auto' }"
      @close="handleClose"
    >
      <div class="seat-map-popup">
        <!-- 弹窗头部 -->
        <div class="popup-header">
          <h3>{{ title }}</h3>
          <van-icon name="cross" @click="handleClose" />
        </div>

        <!-- 搜索控制区 -->
        <div v-if="showSearch" class="seat-map-search">
          <van-field
            v-model="searchKeyword"
            :placeholder="searchPlaceholder"
            clearable
            @input="handleFilter"
            @keyup.enter="handleFilter"
          >
            <template #button>
              <van-button size="small" type="primary" icon="search" @click="handleFilter" />
            </template>
          </van-field>
        </div>

        <!-- 图例说明 -->
        <div v-if="showLegend" class="seat-legend">
          <div class="legend-item">
            <div class="legend-seat available"></div>
            <span>{{ legendAvailableText }}</span>
          </div>
          <div class="legend-item">
            <div class="legend-seat occupied"></div>
            <span>{{ legendOccupiedText }}</span>
          </div>
          <div class="legend-item">
            <div class="legend-seat highlighted"></div>
            <span>{{ legendHighlightedText }}</span>
          </div>
          <div class="legend-item">
            <div class="legend-seat selected"></div>
            <span>{{ legendSelectedText }}</span>
          </div>
        </div>

        <!-- 座位图容器 -->
        <div class="seat-map-container" ref="seatMapContainer">
          <!-- 顶部货架标识 -->
          <div class="shelf-row-labels">
            <div class="label-placeholder"></div>
            <div v-for="col in cols" :key="'col-' + col" class="shelf-col-label">
              {{ getColLabel(col) }}
            </div>
          </div>

          <!-- 座位网格 -->
          <div class="seat-grid">
            <div
              v-for="row in rows"
              :key="'row-' + row"
              class="seat-row"
            >
              <!-- 左侧货架排标识 -->
              <div class="shelf-row-label">{{ getRowLabel(row) }}</div>

              <!-- 库位格子 -->
              <div
                v-for="col in cols"
                :key="'seat-' + row + '-' + col"
                :class="[
                  'seat-item',
                  getSeatClass(row, col),
                  { 'highlighted': isSeatHighlighted(row, col) },
                  { 'selected': isSeatSelected(row, col) }
                ]"
                @click="handleSeatClick(row, col)"
              >
                <!-- 库位编号 -->
                <div class="seat-code">{{ getSeatCode(row, col) }}</div>

                <!-- 物品信息（如果有） -->
                <div v-if="getSeatItem(row, col)" class="seat-info">
                  <div class="seat-item-name">{{ getSeatItemName(row, col) }}</div>
                  <div class="seat-item-stock">{{ stockLabelText }}: {{ getSeatItemStock(row, col) }}</div>
                </div>

                <!-- 占用状态图标 -->
                <van-icon
                  v-if="getSeatItem(row, col)"
                  :name="occupiedIcon"
                  class="seat-status-icon"
                  :color="occupiedIconColor"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 底部信息栏 -->
        <div v-if="showFooter" class="seat-map-footer">
          <div class="stats">
            <span>{{ totalLabel }}: {{ totalSeats }}</span>
            <span>{{ occupiedLabel }}: {{ occupiedSeats }}</span>
            <span>{{ availableLabel }}: {{ availableSeats }}</span>
          </div>
          <div class="actions">
            <van-button size="small" plain @click="handleReset">{{ resetButtonText }}</van-button>
            <van-button
              v-if="showNavigateButton"
              size="small"
              :type="navigateButtonType"
              @click="handleNavigate"
            >
              {{ navigateButtonText }}
            </van-button>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
export default {
  name: 'SeatMapVisualization',
  props: {
    // 显示状态
    show: {
      type: Boolean,
      default: false
    },

    // 标题
    title: {
      type: String,
      default: '库位可视化'
    },

    // 数据源：库存列表
    inventoryList: {
      type: Array,
      required: true,
      default: () => []
    },

    // 布局配置
    rows: {
      type: Number,
      default: 10
    },
    cols: {
      type: Number,
      default: 8
    },

    // 是否自动计算布局
    autoLayout: {
      type: Boolean,
      default: true
    },

    // 搜索配置
    showSearch: {
      type: Boolean,
      default: true
    },
    searchPlaceholder: {
      type: String,
      default: '搜索物品名称或位置（如：电源、A2L-3-002）'
    },

    // 图例配置
    showLegend: {
      type: Boolean,
      default: true
    },
    legendAvailableText: {
      type: String,
      default: '空闲库位'
    },
    legendOccupiedText: {
      type: String,
      default: '占用库位'
    },
    legendHighlightedText: {
      type: String,
      default: '搜索结果'
    },
    legendSelectedText: {
      type: String,
      default: '已选择'
    },

    // 底部配置
    showFooter: {
      type: Boolean,
      default: true
    },
    totalLabel: {
      type: String,
      default: '总库位'
    },
    occupiedLabel: {
      type: String,
      default: '占用'
    },
    availableLabel: {
      type: String,
      default: '空闲'
    },

    // 按钮配置
    resetButtonText: {
      type: String,
      default: '重置视图'
    },
    showNavigateButton: {
      type: Boolean,
      default: true
    },
    navigateButtonText: {
      type: String,
      default: '查看选中'
    },
    navigateButtonType: {
      type: String,
      default: 'primary'
    },

    // 其他配置
    popupHeight: {
      type: String,
      default: '85%'
    },
    showLocationField: {
      type: String,
      default: 'Shelf_Location'
    },
    itemNameField: {
      type: String,
      default: 'Item_Name'
    },
    itemStockField: {
      type: String,
      default: 'Current_Stock'
    },
    itemModelField: {
      type: String,
      default: 'Item_Model'
    },
    occupiedIcon: {
      type: String,
      default: 'shopping-cart-o'
    },
    occupiedIconColor: {
      type: String,
      default: '#1989fa'
    }
  },
  data() {
    return {
      internalShow: this.show,
      seatMapData: [],
      searchKeyword: '',
      filteredResults: [],
      selectedSeat: null,
      totalSeats: 0,
      occupiedSeats: 0,
      availableSeats: 0
    };
  },
  watch: {
    show(val) {
      this.internalShow = val;
      if (val) {
        this.$nextTick(() => {
          this.initSeatMap();
        });
      }
    },
    inventoryList: {
      handler() {
        if (this.internalShow) {
          this.initSeatMap();
        }
      },
      deep: true
    }
  },
  methods: {
    // 初始化座位图
    initSeatMap() {
      if (this.autoLayout) {
        this.calculateLayout();
      }
      this.generateSeatMapData();
      this.countSeatStats();
    },

    // 计算布局
    calculateLayout() {
      if (!this.inventoryList || this.inventoryList.length === 0) {
        return;
      }

      const maxRow = Math.max(...this.inventoryList.map(item => {
        const location = item[this.showLocationField] || '';
        const match = location.match(/([A-Z])(\d+)/i);
        return match ? parseInt(match[2]) : 0;
      }), 0);

      const maxCol = Math.max(...this.inventoryList.map(item => {
        const location = item[this.showLocationField] || '';
        const match = location.match(/([A-Z])(\d+)/i);
        return match ? match[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0) + 1 : 0;
      }), 0);

      this.$emit('update:rows', Math.max(maxRow, 10));
      this.$emit('update:cols', Math.max(maxCol, 8));
    },

    // 生成座位图数据
    generateSeatMapData() {
      this.seatMapData = [];

      for (let row = 1; row <= this.rows; row++) {
        const rowData = [];
        for (let col = 1; col <= this.cols; col++) {
          const seatCode = this.getSeatCode(row, col);
          const item = this.inventoryList.find(i => i[this.showLocationField] === seatCode);

          rowData.push({
            row,
            col,
            code: seatCode,
            item: item || null,
            occupied: !!item
          });
        }
        this.seatMapData.push(rowData);
      }
    },

    // 统计座位数据
    countSeatStats() {
      this.totalSeats = this.rows * this.cols;
      this.occupiedSeats = this.seatMapData.flat().filter(s => s.occupied).length;
      this.availableSeats = this.totalSeats - this.occupiedSeats;
    },

    // 获取行标签
    getRowLabel(row) {
      return String.fromCharCode('A'.charCodeAt(0) + row - 1);
    },

    // 获取列标签
    getColLabel(col) {
      return col.toString();
    },

    // 获取座位编码
    getSeatCode(row, col) {
      return `${this.getRowLabel(row)}${col}`;
    },

    // 获取座位样式类
    getSeatClass(row, col) {
      const seat = this.seatMapData[row - 1] && this.seatMapData[row - 1][col - 1];
      if (!seat) return '';
      return seat.occupied ? 'occupied' : 'available';
    },

    // 判断座位是否高亮
    isSeatHighlighted(row, col) {
      if (!this.searchKeyword) return false;
      const seat = this.seatMapData[row - 1] && this.seatMapData[row - 1][col - 1];
      if (!seat) return false;

      const keyword = this.searchKeyword.toLowerCase();
      const matchByLocation = seat.code.toLowerCase().includes(keyword);
      const matchByItemName = seat.item && seat.item[this.itemNameField] && seat.item[this.itemNameField].toLowerCase().includes(keyword);
      const matchByModel = seat.item && seat.item[this.itemModelField] && seat.item[this.itemModelField].toLowerCase().includes(keyword);

      return matchByLocation || matchByItemName || matchByModel;
    },

    // 判断座位是否被选中
    isSeatSelected(row, col) {
      return this.selectedSeat && this.selectedSeat.row === row && this.selectedSeat.col === col;
    },

    // 获取座位上的物品
    getSeatItem(row, col) {
      const seat = this.seatMapData[row - 1] && this.seatMapData[row - 1][col - 1];
      return seat ? seat.item : null;
    },

    // 获取座位上物品的名称
    getSeatItemName(row, col) {
      const item = this.getSeatItem(row, col);
      return item && item[this.itemNameField] ? item[this.itemNameField] : '';
    },

    // 获取座位上物品的库存
    getSeatItemStock(row, col) {
      const item = this.getSeatItem(row, col);
      return item && item[this.itemStockField] !== undefined ? item[this.itemStockField] : 0;
    },

    // 处理座位点击事件
    handleSeatClick(row, col) {
      const seat = this.seatMapData[row - 1] && this.seatMapData[row - 1][col - 1];
      if (!seat) return;

      this.selectedSeat = { row, col, ...seat };

      if (seat.item) {
        this.$toast.success(`已选择：${seat.code} - ${seat.item[this.itemNameField]}`);
      } else {
        this.$toast.info(`空闲库位：${seat.code}`);
      }

      // 触发选中事件
      this.$emit('seat-click', seat);
    },

    // 筛选座位图
    handleFilter() {
      if (!this.searchKeyword) {
        this.filteredResults = [];
        return;
      }

      const keyword = this.searchKeyword.toLowerCase();
      this.filteredResults = this.seatMapData.flat().filter(seat => {
        const matchByLocation = seat.code.toLowerCase().includes(keyword);
        const matchByItemName = seat.item && seat.item[this.itemNameField] && seat.item[this.itemNameField].toLowerCase().includes(keyword);
        const matchByModel = seat.item && seat.item[this.itemModelField] && seat.item[this.itemModelField].toLowerCase().includes(keyword);
        return matchByLocation || matchByItemName || matchByModel;
      });

      if (this.filteredResults.length > 0) {
        this.$toast.success(`找到 ${this.filteredResults.length} 个匹配项`);
      } else {
        this.$toast.fail('未找到匹配项');
      }
    },

    // 重置视图
    handleReset() {
      this.searchKeyword = '';
      this.filteredResults = [];
      this.selectedSeat = null;
      this.initSeatMap();
      this.$emit('reset');
    },

    // 导航到选中的座位
    handleNavigate() {
      if (!this.selectedSeat) {
        this.$toast.info('请先选择一个库位');
        return;
      }

      // 触发导航事件
      this.$emit('navigate', this.selectedSeat);
    },

    // 关闭弹窗
    handleClose() {
      this.internalShow = false;
      this.selectedSeat = null;
      this.$emit('update:show', false);
      this.$emit('close');
    }
  },
  mounted() {
    if (this.show) {
      this.initSeatMap();
    }
  }
};
</script>

<style scoped>
/* 座位图弹窗样式 */
.seat-map-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.seat-map-popup .popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #ebedf0;
}

.seat-map-popup .popup-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #323233;
}

.seat-map-search {
  padding: 12px 16px;
  border-bottom: 1px solid #ebedf0;
}

/* 图例说明 */
.seat-legend {
  display: flex;
  justify-content: space-around;
  padding: 12px;
  background: #f7f8fa;
  border-bottom: 1px solid #ebedf0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #646566;
}

.legend-seat {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #ebedf0;
}

.legend-seat.available {
  background: #f2f3f5;
}

.legend-seat.occupied {
  background: #1989fa;
  border-color: #1989fa;
}

.legend-seat.highlighted {
  background: #07c160;
  border-color: #07c160;
  animation: pulse 1.5s infinite;
}

.legend-seat.selected {
  background: #ff976a;
  border-color: #ff976a;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* 座位图容器 */
.seat-map-container {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: #f7f8fa;
}

.shelf-row-labels {
  display: flex;
  margin-bottom: 8px;
}

.label-placeholder {
  width: 40px;
  flex-shrink: 0;
}

.shelf-col-label {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: #969799;
  min-width: 50px;
}

.seat-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.seat-row {
  display: flex;
  gap: 8px;
}

.shelf-row-label {
  width: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  background: #ebedf0;
  border-radius: 4px;
}

/* 座位项 */
.seat-item {
  flex: 1;
  min-width: 50px;
  height: 70px;
  background: #f2f3f5;
  border: 2px solid #ebedf0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.seat-item:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.seat-item.available {
  background: #f2f3f5;
}

.seat-item.occupied {
  background: #e8f3ff;
  border-color: #1989fa;
}

.seat-item.highlighted {
  background: #e8fcef;
  border-color: #07c160;
  border-width: 3px;
  animation: highlight-pulse 1s infinite;
}

.seat-item.selected {
  background: #fff7e6;
  border-color: #ff976a;
  border-width: 3px;
}

@keyframes highlight-pulse {
  0%, 100% {
    box-shadow: 0 0 0 rgba(7, 193, 96, 0.3);
  }
  50% {
    box-shadow: 0 0 12px rgba(7, 193, 96, 0.6);
  }
}

/* 座位编码 */
.seat-code {
  font-size: 12px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 2px;
}

/* 座位物品信息 */
.seat-info {
  width: 100%;
  overflow: hidden;
  text-align: center;
}

.seat-item-name {
  font-size: 10px;
  color: #646566;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 1px;
}

.seat-item-stock {
  font-size: 9px;
  color: #969799;
}

/* 状态图标 */
.seat-status-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 14px;
}

/* 底部信息栏 */
.seat-map-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #ebedf0;
  background: #fff;
}

.stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #646566;
}

.stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
