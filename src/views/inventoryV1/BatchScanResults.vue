<template>
  <div class="batch-scan-results-container">
    <div class="main-content">
      <!-- 结果概览 -->
      <van-cell-group class="result-card">
        <van-cell :border="false" class="count-cell">
          <div slot="title" class="count-text">
            <strong>扫码共计：{{ count }} 条 (去重后：{{ uniqueResults.length }} 条)</strong>
          </div>
        </van-cell>

        <!-- 结构化展示每条结果 -->
        <van-cell
          v-for="(result, index) in paginatedResults"
          :key="index"
          :border="false"
          class="result-item"
        >
          <div slot="title" class="result-title">
            <div class="result-header">
              <span>编码：{{ result.on }}</span>
              <div class="tags-container">
                <van-tag v-if="result.jlcDetail" type="success" size="mini">嘉立创商品</van-tag>
                <van-tag v-else type="default" size="mini">普通商品</van-tag>
              </div>
            </div>
          </div>
          <div slot="label" class="result-detail">
            <div class="detail-row">
              <span class="label">型号：</span>
              <span class="value">{{ result.pc || '暂无' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">品牌：</span>
              <span class="value">{{ result.pm || '暂无' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">数量：</span>
              <span class="value">{{ result.qty || 0 }}</span>
            </div>

            <!-- 展示嘉立创详情数据 -->
            <div v-if="result.jlcDetail" class="jlc-detail-section">
              <div class="section-divider"></div>
              <div class="section-title">
                <van-icon name="star" color="#ff976a" /> 嘉立创商品信息
              </div>

              <div class="jlc-info-grid">
                <div class="info-item" v-if="result.jlcDetail.Item_Name">
                  <span class="info-label">商品名称：</span>
                  <span class="info-value">{{ result.jlcDetail.Item_Name }}</span>
                </div>

                <div class="info-item" v-if="parseJlcMore(result.jlcDetail.Item_Mores).商品编号">
                  <span class="info-label">商品编号：</span>
                  <span class="info-value">{{ parseJlcMore(result.jlcDetail.Item_Mores).商品编号 }}</span>
                </div>

                <div class="info-item" v-if="result.jlcDetail.Item_Brand">
                  <span class="info-label">品牌：</span>
                  <span class="info-value">{{ result.jlcDetail.Item_Brand }}</span>
                </div>

                <div class="info-item" v-if="result.jlcDetail.Item_Model">
                  <span class="info-label">规格型号：</span>
                  <span class="info-value">{{ result.jlcDetail.Item_Model }}</span>
                </div>

                <div class="info-item" v-if="parseJlcMore(result.jlcDetail.Item_Mores).封装规格">
                  <span class="info-label">封装规格：</span>
                  <span class="info-value">{{ parseJlcMore(result.jlcDetail.Item_Mores).封装规格 }}</span>
                </div>

                <div class="info-item" v-if="parseJlcMore(result.jlcDetail.Item_Mores).最小包装单位">
                  <span class="info-label">最小包装单位：</span>
                  <span class="info-value">{{ parseJlcMore(result.jlcDetail.Item_Mores).最小包装单位 }}</span>
                </div>

                <div class="info-item" v-if="parseJlcMore(result.jlcDetail.Item_Mores).最小包装数量">
                  <span class="info-label">最小起订：</span>
                  <span class="info-value">{{ parseJlcMore(result.jlcDetail.Item_Mores).最小包装数量 }}</span>
                </div>

                <div class="info-item" v-if="parseJlcMore(result.jlcDetail.Item_Mores).产品毛重">
                  <span class="info-label">产品毛重：</span>
                  <span class="info-value">{{ parseJlcMore(result.jlcDetail.Item_Mores).产品毛重 }}</span>
                </div>

                <div class="info-item" v-if="parseJlcMore(result.jlcDetail.Item_Mores).一级目录名称">
                  <span class="info-label">一级目录：</span>
                  <span class="info-value">{{ parseJlcMore(result.jlcDetail.Item_Mores).一级目录名称 }}</span>
                </div>

                <div class="info-item" v-if="parseJlcMore(result.jlcDetail.Item_Mores).二级目录名称">
                  <span class="info-label">二级目录：</span>
                  <span class="info-value">{{ parseJlcMore(result.jlcDetail.Item_Mores).二级目录名称 }}</span>
                </div>

                <!-- 如果没有匹配到任何字段，显示提示信息 -->
                <div v-if="!hasAnyJlcField(result.jlcDetail)" class="no-jlc-data">
                  <van-empty :image-size="60" description="嘉立创详情数据为空或格式不匹配" />
                </div>
              </div>
            </div>

            <!-- 如果没有嘉立创详情数据，显示提示 -->
            <div v-else class="no-jlc-tip">
              <van-icon name="info-o" color="#999" />
              <span>该物品无嘉立创详情数据</span>
            </div>
          </div>
        </van-cell>
      </van-cell-group>

      <!-- 分页控件 -->
      <van-pagination
        v-if="uniqueResults.length > pageSize"
        v-model="currentPage"
        :total-items="uniqueResults.length"
        :items-per-page="pageSize"
        class="pagination"
      />

      <!-- 操作按钮 -->
      <div class="button-container">
        <van-button
          type="info"
          size="normal"
          block
          @click="clearAndRescan"
          class="action-button clear-btn"
        >
          清空列表重新扫码
        </van-button>
        <van-button
          type="primary"
          size="normal"
          block
          @click="navigateToForm"
          class="action-button confirm-btn"
        >
          确定批量添加
        </van-button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      results: [], // 所有扫码结果
      uniqueResults: [], // 去重后的结果
      count: 0, // 结果总数
      currentPage: 1, // 当前页码
      pageSize: 50 // 每页显示条数
    };
  },
  computed: {
    // 分页后的结果
    paginatedResults() {
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.uniqueResults.slice(start, end);
    }
  },
  created() {
    // 从查询参数中获取扫码结果
    try {
      const scannedResultsStr = this.$route.query.scannedResults || '[]';
      console.log('原始扫码结果:', scannedResultsStr);

      const rawResults = JSON.parse(scannedResultsStr);

      // 确保解析结果为数组
      if (!Array.isArray(rawResults)) {
        throw new Error('扫码结果不是有效的数组格式');
      }

      this.count = rawResults.length;

      // 去重处理 - 保留完整的数据结构（包括 jlcDetail）
      const seen = new Map();
      this.uniqueResults = rawResults.filter(item => {
        const key = `${item.on}-${item.pc}`; // 使用 on 和 pc 作为唯一标识

        if (seen.has(key)) {
          return false; // 重复项，过滤掉
        } else {
          seen.set(key, true);
          return true; // 保留该项
        }
      });

      // 调试信息：检查是否有 jlcDetail 数据
      console.log('去重后的结果:', this.uniqueResults);
      this.uniqueResults.forEach((item, index) => {
        console.log(`物品${index + 1}:`, {
          on: item.on,
          pc: item.pc,
          hasJlcDetail: !!item.jlcDetail,
          jlcDetail: item.jlcDetail
        });
      });

      // 提示用户去重信息
      if (this.count !== this.uniqueResults.length) {
        this.$toast(`检测到重复数据，已自动去重。原数据：${this.count} 条，去重后：${this.uniqueResults.length} 条`);
      }

      // 统计有多少物品有嘉立创详情数据
      const withJlcDetail = this.uniqueResults.filter(item => item.jlcDetail).length;
      if (withJlcDetail > 0) {
        this.$toast.success(`其中 ${withJlcDetail} 个物品包含嘉立创详情数据`);
      }
    } catch (error) {
      console.error('解析扫码结果失败:', error);
      this.$toast.fail('扫码结果解析失败，请检查数据格式是否正确');
    }
  },
  methods: {
    // 解析 Item_Mores 字段（JSON 字符串）
    parseJlcMore(itemMores) {
      if (!itemMores) return {};
      try {
        // 如果是字符串，尝试解析 JSON
        if (typeof itemMores === 'string') {
          return JSON.parse(itemMores);
        }
        // 如果已经是对象，直接返回
        return itemMores;
      } catch (e) {
        console.error('解析 Item_Mores 失败:', e);
        return {};
      }
    },

    // 检查是否有任意嘉立创字段
    hasAnyJlcField(jlcDetail) {
      if (!jlcDetail) return false;

      // 检查基本字段
      if (jlcDetail.Item_Name || jlcDetail.Item_Model || jlcDetail.Item_Brand) {
        return true;
      }

      // 检查 Item_Mores 中的字段
      const mores = this.parseJlcMore(jlcDetail.Item_Mores);
      const moreKeys = ['商品编号', '一级目录名称', '二级目录名称', '封装规格',
        '最小包装单位', '商品编排方式', '最小包装数量', '产品毛重'];

      return moreKeys.some(key => mores[key]);
    },

    // 根据库存数量返回样式类
    getStockClass(stock) {
      const numStock = parseInt(stock);
      if (numStock === 0) {
        return 'stock-zero';
      } else if (numStock < 100) {
        return 'stock-low';
      } else {
        return 'stock-normal';
      }
    },

    // 清空列表并重新扫码
    clearAndRescan() {
      this.results = [];
      this.uniqueResults = [];
      const department = this.$route.params.department;
      this.$router.push(`/${department}/inventory-management`);
    },

    // 跳转到批量添加表单页面
    navigateToForm() {
      if (this.uniqueResults.length > 0) {
        this.$toast.success('正在跳转到批量添加页面...');
        this.$router.push({
          path: '/batch-add-form',
          query: { data: JSON.stringify(this.uniqueResults) }
        });
      } else {
        this.$toast.fail('没有扫描到任何结果');
      }
    }
  }
};
</script>

<style scoped>
.batch-scan-results-container {
  padding: 16px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.main-content {
  max-width: 600px;
  margin: 0 auto;
}

.result-card {
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.count-cell {
  background-color: #e0f7fa;
  text-align: center;
}

.count-text {
  font-size: 16px;
  color: #00796b;
}

.result-item {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}

.result-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tags-container {
  display: flex;
  gap: 4px;
}

.no-jlc-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  color: #999;
}

.no-jlc-data {
  grid-column: 1 / -1;
  padding: 12px 0;
}

/* 嘉立创详情区域样式 */
.jlc-detail-section {
  margin-top: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #fff7e6 0%, #fff3e0 100%);
  border-radius: 8px;
  border: 1px solid #ffe0b2;
}

.section-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, #ff9800, transparent);
  margin: 8px 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #f57c00;
  margin-bottom: 12px;
}

.jlc-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  color: #333;
  font-weight: 500;
  word-break: break-word;
}

.price-text {
  color: #f44336;
  font-weight: bold;
  font-size: 14px;
}

.stock-zero {
  color: #9e9e9e;
}

.stock-low {
  color: #ff9800;
  font-weight: 600;
}

.stock-normal {
  color: #4caf50;
  font-weight: 600;
}

.description-text {
  line-height: 1.6;
  color: #666;
  font-size: 12px;
}

.pagination {
  margin: 16px 0;
  text-align: center;
}

.button-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-button {
  border-radius: 8px;
}
</style>
