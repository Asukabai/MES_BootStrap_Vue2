<template>
  <div class="batch-scan-results-container">
    <div class="main-content">
      <!-- 结果概览 -->
      <van-cell-group class="result-card">
        <van-cell :border="false" class="count-cell">
          <div slot="title" class="count-text">
            <strong>扫码共计: {{ count }} 条 (去重后: {{ uniqueResults.length }} 条)</strong>
          </div>
        </van-cell>

        <!-- 结构化展示每条结果 -->
        <van-cell
          v-for="(result, index) in paginatedResults"
          :key="index"
          :border="false"
          class="result-item"
        >
          <div slot="title" class="result-title">编码:{{ result.on }}</div>
          <div slot="label" class="result-detail">
            型号: {{ result.pc }} | 数量: {{ result.qty }}
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
      console.log('原始扫码结果:', scannedResultsStr); // 调试信息
      alert('扫码结果:'+ scannedResultsStr)

      const rawResults = JSON.parse(scannedResultsStr);

      // 确保解析结果为数组
      if (!Array.isArray(rawResults)) {
        throw new Error('扫码结果不是有效的数组格式');
      }

      this.count = rawResults.length;

      // 去重处理
      const seen = new Set();
      this.uniqueResults = rawResults.filter(item => {
        const key = `${item.name}-${item.model}`; // 使用 name 和 model 作为唯一标识
        if (seen.has(key)) {
          return false;
        } else {
          seen.add(key);
          return true;
        }
      });

      // 提示用户去重信息
      if (this.count !== this.uniqueResults.length) {
        this.$toast(`检测到重复数据，已自动去重。原数据: ${this.count} 条，去重后: ${this.uniqueResults.length} 条`);
      }
    } catch (error) {
      console.error('解析扫码结果失败:', error);
      this.$toast.fail('扫码结果解析失败，请检查数据格式是否正确');
    }
  },
  methods: {
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
}

.result-detail {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
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
