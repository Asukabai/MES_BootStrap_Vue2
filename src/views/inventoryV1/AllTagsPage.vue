<!-- src/views/inventoryV1/AllTagsPage.vue -->
<template>
  <div class="all-tags-page">
    <div class="all-tags-header">
      <van-nav-bar
        title="所有标签"
        left-arrow
        @click-left="$router.back()"
      />
    </div>
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
            type="default"
            size="mini"
            class="tag-button-small"
            @click="selectTag(tag.name)"
          >
            {{ tag.name }}
          </van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Toast } from 'vant';
import SensorRequestPage from '@/utils/SensorRequestPage.js';

export default {
  name: 'AllTagsPage',
  data() {
    return {
      allTags: [] // 所有标签，从API获取
    };
  },
  computed: {
    // 按字母分组的标签
    groupedTags() {
      const groups = {};
      this.allTags.forEach(tag => {
        const firstLetter = tag.name.charAt(0).toUpperCase();
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
          sortedGroups[letter] = groups[letter].sort((a, b) => a.name.localeCompare(b.name));
        });

      return sortedGroups;
    }
  },
  mounted() {
    this.loadAllTags();
  },
  methods: {
    // 加载所有标签
    loadAllTags() {
      SensorRequestPage.InventoryGetCommonTagsFun("",
        (JSON_response) => {
          let response = JSON.parse(JSON_response)
          if(response && Array.isArray(response)) {
            // 直接使用返回的数组，按照 Usage_Count 降序排列
            const sortedTags = response.map(item => ({
              name: item.Tag_Name,
              count: item.Usage_Count
            })).sort((a, b) => b.count - a.count);

            // 设置所有标签
            this.allTags = sortedTags;
          } else {
            Toast('获取标签数据失败');
          }
        },
        (error) => {
          console.error('获取标签数据错误:', error);
          Toast('获取标签数据失败');
        }
      );
    },

    // 选择标签
    selectTag(tagName) {
      // 将选中的标签传回上级页面
      this.$emit('tag-selected', tagName);
      // 或者直接将标签加入父组件的选中列表
      this.$router.go(-1); // 返回上级页面
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
.all-tags-page {
  padding: 16px;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.all-tags-header {
  background: white;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tags-alphabetically {
  background: white;
  border-radius: 8px;
  margin-bottom: 16px;
  padding: 8px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tags-detail-container {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

.tag-button-small {
  margin: 2px;
}
</style>
