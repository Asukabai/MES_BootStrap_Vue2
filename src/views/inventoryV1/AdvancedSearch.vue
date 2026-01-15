<template>
  <div class="advanced-search-page">
    <!-- 顶部搜索区域 -->
    <div class="search-header">
      <div class="search-container">
        <van-field
          v-model="searchKeyword"
          placeholder="输入关键词搜索"
          left-icon="search"
          class="search-input"
        />
        <van-button
          type="info"
          class="search-btn"
          @click="performSearch"
        >
          搜索
        </van-button>
      </div>
    </div>

    <!-- 已选标签展示区域 -->
    <div class="selected-tags-container">
      <div class="selected-tags-header">
        <span class="header-text">已选标签</span>
      </div>
      <div class="selected-tags-list">
        <van-tag
          v-for="(tag, index) in selectedTags"
          :key="index"
          closable
          @close="removeTag(tag)"
          class="selected-tag"
        >
          {{ tag }}
        </van-tag>
        <div
          v-if="selectedTags.length === 0"
          class="no-tags-message"
        >
          暂无已选标签
        </div>
      </div>
    </div>

    <!-- 常用标签选项 -->
    <div class="common-tags-container">
      <div class="common-tags-header">
        <span class="header-text">常用标签</span>
        <van-icon
          name="apps-o"
          class="expand-icon"
          @click="goToAllTags"
        />
      </div>
      <div class="tags-grid">
        <van-button
          v-for="(tag, index) in commonTags"
          :key="index"
          :type="isSelected(tag) ? 'primary' : 'default'"
          size="small"
          class="tag-button"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </van-button>
      </div>
    </div>

    <!-- 所有标签列表 -->
    <div class="all-tags-container">
      <div class="all-tags-header">
        <span class="header-text">所有标签</span>
      </div>
      <div class="tags-alphabetically">
        <van-cell-group>
          <van-cell
            v-for="(letterGroup, letter) in groupedTags"
            :key="letter"
            :title="letter"
            is-link
            @click="scrollToLetter(letter)"
          >
            <template #right-icon>
              <van-icon name="arrow" />
            </template>
          </van-cell>
        </van-cell-group>
      </div>
    </div>

    <!-- 标签详情列表 -->
    <div class="tags-detail-container">
      <div
        v-for="(letterGroup, letter) in groupedTags"
        :key="letter"
        :id="`letter-${letter}`"
        class="letter-group"
      >
        <h3 class="letter-header">{{ letter }}</h3>
        <div class="tags-list">
          <van-button
            v-for="(tag, index) in letterGroup"
            :key="index"
            :type="isSelected(tag) ? 'primary' : 'default'"
            size="mini"
            class="tag-button-small"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </van-button>
        </div>
      </div>
    </div>

    <!-- 搜索结果区域 -->
    <div class="search-results-container">
      <van-list
        v-model="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <van-cell
          v-for="item in searchResults"
          :key="item.id"
          :title="item.title"
          :label="item.description"
        />
      </van-list>
    </div>
  </div>
</template>

<script>
import { Toast } from 'vant';

export default {
  name: 'AdvancedSearch',
  data() {
    return {
      searchKeyword: '', // 搜索关键词
      selectedTags: [], // 已选择的标签
      commonTags: [
        '耗材', '公用', '项目', '工具', '设备',
        '晟思', '大钧', '星移', '库存紧张', '待采购'
      ], // 常用标签
      allTags: [
        'A类物品', 'B类物品', 'C类物品', '采购', '生产',
        '入库', '出库', '盘点', '报废', '借用',
        '归还', '转移', '维修', '保养', '检测',
        '验收', '退货', '调拨', '报损', '盘盈',
        '盘亏', '耗材', '公用', '项目', '工具',
        '设备', '原材料', '成品', '半成品', '备件',
        '易耗品', '危险品', '贵重品', '精密仪器', '实验器材',
        '办公用品', '劳保用品', '安全防护', '消防器材', '应急物资',
        '晟思', '大钧', '星移', '库存紧张', '待采购',
        '待领用', '待归还', '待审批', '已审批', '已驳回'
      ], // 所有标签
      searchResults: [], // 搜索结果
      loading: false,
      finished: false,
      page: 1,
      pageSize: 10
    };
  },
  computed: {
    // 按字母分组的标签
    groupedTags() {
      const groups = {};
      this.allTags.forEach(tag => {
        const firstLetter = tag.charAt(0).toUpperCase();
        if (!groups[firstLetter]) {
          groups[firstLetter] = [];
        }
        groups[firstLetter].push(tag);
      });

      // 按字母顺序排序
      const sortedGroups = {};
      Object.keys(groups)
        .sort()
        .forEach(letter => {
          sortedGroups[letter] = groups[letter].sort();
        });

      return sortedGroups;
    }
  },
  methods: {
    // 检查标签是否已选中
    isSelected(tag) {
      return this.selectedTags.includes(tag);
    },

    // 切换标签选中状态
    toggleTag(tag) {
      const index = this.selectedTags.indexOf(tag);
      if (index > -1) {
        // 如果已选中，则取消选中
        this.selectedTags.splice(index, 1);
      } else {
        // 如果未选中，则添加到选中列表
        this.selectedTags.push(tag);
      }
    },

    // 移除已选标签
    removeTag(tag) {
      const index = this.selectedTags.indexOf(tag);
      if (index > -1) {
        this.selectedTags.splice(index, 1);
      }
    },

    // 执行搜索
    performSearch() {
      if (!this.searchKeyword && this.selectedTags.length === 0) {
        Toast('请输入关键词或选择标签');
        return;
      }

      // 这里应该调用实际的搜索接口
      Toast(`正在搜索关键词: ${this.searchKeyword}, 标签: ${this.selectedTags.join(',')}`);

      // 模拟搜索结果
      this.page = 1;
      this.searchResults = [];
      this.finished = false;
      this.onLoad();
    },

    // 加载搜索结果
    onLoad() {
      // 模拟异步加载数据
      setTimeout(() => {
        for (let i = 0; i < this.pageSize; i++) {
          const id = (this.page - 1) * this.pageSize + i + 1;
          this.searchResults.push({
            id: id,
            title: `物品 ${id}`,
            description: `这是第 ${id} 个物品的详细描述，包含相关信息和属性`
          });
        }

        this.page++;
        this.loading = false;

        // 模拟没有更多数据
        if (this.page > 3) {
          this.finished = true;
        }
      }, 1000);
    },

    // 跳转到所有标签页面
    goToAllTags() {
      // 这里可以跳转到一个专门展示所有标签的页面
      Toast('跳转到所有标签页面');
      // this.$router.push('/all-tags');
    },

    // 滚动到特定字母区域
    scrollToLetter(letter) {
      const element = document.getElementById(`letter-${letter}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
};
</script>

<style scoped>
.advanced-search-page {
  padding: 16px;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.search-header {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-container {
  display: flex;
  gap: 8px;
}

.search-input {
  flex: 1;
}

.search-btn {
  width: 80px;
}

.selected-tags-container {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.selected-tags-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-text {
  font-weight: 500;
  font-size: 16px;
  color: #333;
}

.selected-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-tag {
  margin-bottom: 4px;
}

.no-tags-message {
  color: #999;
  font-style: italic;
}

.common-tags-container {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.common-tags-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.expand-icon {
  font-size: 20px;
  color: #3f83f8;
  cursor: pointer;
}

.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}

.tag-button {
  margin: 2px;
}

.tag-button-small {
  margin: 2px;
}

.all-tags-container {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tags-alphabetically {
  max-height: 200px;
  overflow-y: auto;
}

.letter-group {
  margin-bottom: 20px;
}

.letter-header {
  margin: 16px 0 8px 0;
  font-size: 18px;
  font-weight: bold;
  color: #3f83f8;
  border-bottom: 1px solid #eee;
  padding-bottom: 4px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.search-results-container {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.van-cell {
  padding: 12px 16px;
}
</style>
