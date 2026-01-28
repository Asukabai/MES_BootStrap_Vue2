<template>
  <div class="advanced-search-page">
    <!-- 顶部搜索区域 -->
    <div class="search-container">
      <van-field
        v-model="searchKeyword"
        placeholder="请输入完整标签搜索"
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
      <!-- 重置按钮 -->
      <van-button
        type="default"
        class="reset-btn"
        @click="resetSearch"
      >
        重置
      </van-button>
    </div>

    <!-- 已选标签展示区域 - 仅在无搜索结果时显示 -->
    <div v-if="searchResults.length === 0" class="selected-tags-container">
      <div class="selected-tags-header">
        <span class="header-text">已选标签</span>
      </div>
      <div class="selected-tags-list">
        <van-tag
          v-for="(tag, index) in selectedTags"
          :key="index"
          closeable
          class="selected-tag"
          @close="removeTag(tag)"
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

    <!-- 常用标签选项 - 仅在无搜索结果时显示 -->
    <div v-if="searchResults.length === 0" class="common-tags-container">
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
          :type="isSelected(tag.name) ? 'primary' : 'default'"
          size="small"
          class="tag-button"
          @click="toggleTag(tag.name)"
        >
          {{ tag.name }}
        </van-button>
      </div>
    </div>

    <!-- 搜索结果区域 - 仅在有搜索结果时显示 -->
    <div v-if="searchResults.length > 0" class="search-results-container">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <van-cell
            v-for="item in searchResults"
            :key="item.Id"
            class="inventory-cell"
          >
            <div class="cell-content" @click="viewDetail(item)">
              <!-- 左侧图片区域（30%） -->
              <div class="image-section">
                <img
                  :src="getImageUrl(item)"
                  alt="物品图片"
                  class="item-image"
                  @error="onImageError"
                />
              </div>

              <!-- 右侧信息区域（70%） -->
              <div class="info-section">
                <div class="cell-header">
                  <div class="item-title">物品名称：{{ item.Item_Name }}</div>
                  <div class="item-subtitle">
                    型号：<span class="model-value">{{ item.Item_Model }}</span> |
                    库存：<span class="stock-value">{{ item.Current_Stock }}</span>
                  </div>
                </div>
                <div class="cell-body">
                  <div class="item-info">
                    <div class="info-row">
                      <span class="label">公司:</span>
                      <span class="value">{{ item.Company }}</span>
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

    <!-- 空状态 -->
    <div v-if="searchKeyword && searchResults.length === 0 && !loading" class="empty-state">
      <van-empty description="暂无相关库存信息" />
    </div>
    <CustomizableFloatingButton
      :initial-position="{ bottom: 100, right: 20 }"
      :icon-src="require('@/assets/返回.png')"
      :background-size="53"
      :icon-size="53"
      :on-click="goBack"
    />
  </div>
</template>
<script>
import { Toast } from 'vant';
import SensorRequestPage from '@/utils/SensorRequestPage.js';
import SensorRequest from '@/utils/SensorRequest.js'; // 添加此导入以获取图片URL
import {key_DingScannedInventoryQRCodeResult} from "@/utils/Dingding";
import CustomizableFloatingButton from "../../components/CustomizableFloatingButton.vue";

export default {
  name: 'AdvancedSearch',
  components: {CustomizableFloatingButton},
  data() {
    return {
      searchKeyword: '', // 搜索关键词
      selectedTags: [], // 已选择的标签
      commonTags: [], // 常用标签，从API获取
      searchResults: [], // 搜索结果
      loading: false,
      finished: false,
      refreshing: false,
      currentPage: 1,
      pageSize: 10
    };
  },
  mounted() {
    // 页面加载时获取所有标签和常用标签
    this.loadCommonTags();
  },
  methods: {
    goBack() {
      this.navigateTo('/inventoryV1');
    },
    // 加载常用标签
    loadCommonTags() {
      SensorRequestPage.InventoryGetCommonTagsFun("",
        (JSON_response) => {
          let response = JSON.parse(JSON_response)
          if(response && Array.isArray(response)) {
            // 直接使用返回的数组，按照 Usage_Count 降序排列
            const sortedTags = response.map(item => ({
              name: item.Tag_Name,
              count: item.Usage_Count
            })).sort((a, b) => b.count - a.count);

            // 如果标签数量不足9个，展示所有标签；否则取前9个
            this.commonTags = sortedTags.slice(0, 30);
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

    // 重置搜索
    resetSearch() {
      this.searchKeyword = '';
      this.selectedTags = [];
      this.searchResults = [];
      this.currentPage = 1;
      this.finished = false;

      // 显示重置提示
      Toast.success('页面已重置');
    },

    // 执行搜索
    performSearch() {
      return new Promise((resolve, reject) => {
        if (!this.searchKeyword && this.selectedTags.length === 0) {
          Toast('请输入关键词或选择标签');
          reject(new Error('缺少搜索条件'));
          return;
        }

        // 第一页搜索时清空之前的结果
        if (this.currentPage === 1) {
          this.searchResults = [];
        }

        // 合并搜索关键词和选中标签，并去重
        let allTags = [...this.selectedTags];

        // 如果搜索关键词不为空且不是已选标签的一部分，则加入
        if (this.searchKeyword.trim()) {
          // 检查是否已存在于选中标签中（避免重复）
          if (!allTags.includes(this.searchKeyword.trim())) {
            allTags.push(this.searchKeyword.trim());
          }
        }

        // 去重处理
        allTags = [...new Set(allTags)];

        // 构造请求参数
        const params = {
          PageIndex: this.currentPage - 1, // 页码从0开始
          PageSize: this.pageSize,
          Item_Tags: allTags, // 合并后的标签数组（包含关键词和选中标签）
          Item_Name: "", // 搜索关键词不再单独传递，而是作为标签处理
          Category_Type: "", // 分类类型（可后续扩展）
          Company: "" // 公司（可后续扩展）
        };
        // 调用搜索接口
        SensorRequestPage.InventorySearchByTagsFun(JSON.stringify(params),
          (respData) => {
            try {
              // 解析响应数据 - 新的数据格式是字符串化的JSON
              let parsedData = null;
              if (typeof respData === 'string') {
                parsedData = JSON.parse(respData);
              } else {
                parsedData = respData;
              }

              // 提取实际的Data数组
              let newData = [];
              if (parsedData && parsedData.Data) {
                newData = parsedData.Data;
              } else if (parsedData && Array.isArray(parsedData)) {
                // 如果返回的是数组本身
                newData = parsedData;
              }

              // 检查是否返回了空数据
              if (Array.isArray(newData) && newData.length === 0) {
                if (this.currentPage === 1) {
                  // 如果是第一页就返回空数据，说明没有符合条件的结果
                  this.searchResults = [];
                  this.finished = true; // 设置为true防止继续加载
                  Toast('未找到匹配的库存信息');
                } else {
                  // 如果是后续页面返回空数据，说明已经到底了
                  this.finished = true;
                }
                resolve(); // 成功完成
                return;
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
                      (urlRespData) => {
                        if (urlRespData) {
                          // 将URL中的http://127.0.0.1:9000替换为https://api-v2.sensor-smart.cn:22027
                          processedItem.imageUrl = urlRespData.replace(
                            'http://127.0.0.1:9000',
                            'https://api-v2.sensor-smart.cn:22027'
                          );

                          // 更新列表中的该项
                          const index = this.searchResults.findIndex(result => result.Id === processedItem.Id);
                          if (index !== -1) {
                            this.$set(this.searchResults, index, processedItem);
                          }
                        } else {
                          processedItem.imageUrl = require('@/assets/暂无图片1.png');
                        }
                      },
                      (error) => {
                        console.error('获取图片URL失败:', error);
                        processedItem.imageUrl = require('@/assets/暂无图片1.png');

                        // 更新列表中的该项
                        const index = this.searchResults.findIndex(result => result.Id === processedItem.Id);
                        if (index !== -1) {
                          this.$set(this.searchResults, index, processedItem);
                        }
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
                this.searchResults = processedData;
              } else {
                // 防止重复添加相同ID的项目
                const newItems = processedData.filter(newItem =>
                  !this.searchResults.some(existingItem => existingItem.Id === newItem.Id)
                );
                this.searchResults = [...this.searchResults, ...newItems];
              }

              // 根据返回的数据判断是否还有更多数据
              // 如果返回的数据量小于页面大小，则表示已到最后一页
              this.finished = processedData.length < this.pageSize;
              this.currentPage++;

              resolve(); // 成功完成
            } catch (error) {
              console.error('处理库存数据时出错:', error);
              Toast('数据处理失败');
              reject(error);
            }
          },
          (error) => {
            console.error('搜索库存信息失败:', error);
            Toast('搜索失败');
            this.finished = true;
            reject(error);
          }
        );
      });
    },

    // 加载搜索结果
    async onLoad() {
      // 只有在有更多数据时才加载下一页
      if (!this.finished) {
        this.currentPage++;
        try {
          await this.performSearch(); // 使用当前的搜索条件加载数据
        } catch (error) {
          console.error('加载数据失败:', error);
        }
      }
      this.loading = false; // 在请求完成后设置为false
    },

    // 下拉刷新
    async onRefresh() {
      this.currentPage = 1;
      this.finished = false;

      try {
        await this.performSearch();
        Toast.success('页面已刷新');
      } catch (error) {
        console.error('刷新失败:', error);
        Toast.fail('刷新失败');
      } finally {
        this.refreshing = false;
      }
    },

    // 跳转到所有标签页面
    goToAllTags() {
      // this.$router.go(-1);
      this.navigateTo('/allTagsPage');
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

    // 查看详情
    viewDetail(item) {
      console.log('查看详情:', item);
      console.log('查看详情类型:', typeof item);

      // 检查是否为对象，如果不是则记录错误
      if (typeof item !== 'object' || item === null) {
        console.error('传入的参数不是对象:', item);
        // 如果需要，可以从搜索结果中查找对应项
        const foundItem = this.searchResults.find(result =>
          result.Shelf_Location === item || result.Id === item
        );
        if (foundItem) {
          item = foundItem;
          console.log('从搜索结果中找到的完整对象:', item);
        }
      }

      console.log('货架位置:', item.Shelf_Location);

      // 将当前物品信息保存到sessionStorage中(模拟扫码情况)
      sessionStorage.setItem(key_DingScannedInventoryQRCodeResult, item.Shelf_Location);

      // 跳转到库存详情页面
      const department = this.$route.params.department;
      if (department) {
        this.$router.push(`/${department}/inventoryDetailV1`);
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
    },

    // 修改获取图片URL方法
    getImageUrl(item) {
      // 直接返回预加载的图片URL
      return item.imageUrl || require('@/assets/暂无图片1.png');
    },

    // 图片加载失败时的处理
    onImageError(event) {
      event.target.src = require('@/assets/暂无图片1.png');
    }
  }
};
</script>


<style scoped>
/* 样式保持不变 */
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
  height: 40px;
  margin-right: 8px;
  background: linear-gradient(to bottom, #1989fa, #0d6efd);
  border: none;
  border-radius: 25px;
  box-shadow:
    0 4px 6px rgba(25, 137, 250, 0.3),
    0 1px 3px rgba(0, 0, 0, 0.1);
  font-weight: 500;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.search-btn::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  background: linear-gradient(145deg, #2196F3, #1E88E5);
  border-radius: 23px;
  z-index: -1;
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.3);
}

.search-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 6px 10px rgba(25, 137, 250, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.15);
  background: linear-gradient(to bottom, #2196F3, #1565C0);
}

.search-btn:active {
  transform: translateY(1px);
  box-shadow:
    0 2px 4px rgba(25, 137, 250, 0.2),
    0 1px 2px rgba(0, 0, 0, 0.1);
}

.reset-btn {
  width: 80px;
  height: 40px;
  background: linear-gradient(to bottom, #f0f0f0, #e0e0e0);
  color: #333;
  border: none;
  border-radius: 25px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.1);
  font-weight: 500;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.reset-btn::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  background: linear-gradient(145deg, #f5f5f5, #dcdcdc);
  border-radius: 23px;
  z-index: -1;
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.5);
}

.reset-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 6px 10px rgba(0, 0, 0, 0.15),
    0 2px 4px rgba(0, 0, 0, 0.1);
  background: linear-gradient(to bottom, #f5f5f5, #d0d0d0);
}

.reset-btn:active {
  transform: translateY(1px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.05);
}

/* 添加一个过渡容器样式 */
.search-container {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 0;
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

.search-results-container {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-top: 16px;
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
  position: relative; /* 为删除按钮定位做准备 */
  cursor: pointer; /* 表示这是一个可点击的卡片 */
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
}

.item-image {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #eee;
}

.info-section {
  width: 70%;
  position: relative;
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
}
.item-subtitle {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  font-weight: 500; /* 整体加粗 */
}

.item-subtitle .model-value {
  font-weight: 500; /* 型号加粗 */
}

.item-subtitle .stock-value {
  font-weight: 600; /* 库存加粗 */
  color: orange;    /* 库存橙色 */
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
  flex-wrap: wrap; /* 允许换行 */
  font-size: 12px; /* 减小字体 */
  align-items: baseline;
  gap: 8px; /* 添加间隙 */
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
  margin-right: 2px; /* 减少间距 */
  flex-shrink: 0;
  font-size: 11px; /* 减小标签字体 */
}

.value {
  color: #666;
  flex: 1;
  word-break: break-all;
  font-size: 12px; /* 减小值字体 */
}

.empty-state {
  padding: 50px 16px;
}

/* 确保列表有足够的高度以便下拉刷新操作 */
.van-list {
  min-height: 300px;
}
</style>
