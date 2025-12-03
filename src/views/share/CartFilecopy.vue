<!--<template>-->
<!--  <div class="page-container">-->
<!--    <van-nav-bar-->
<!--        title="文件分享"-->
<!--        left-icon="link-o"-->
<!--        :right-text="''"-->
<!--        @click-left="handleTitleClick"-->
<!--    >-->
<!--      <template #right>-->
<!--        <van-icon name="search" size="18" @click="handleSearchIconClick" />-->
<!--      </template>-->
<!--    </van-nav-bar>-->

<!--    &lt;!&ndash; 内容区域 &ndash;&gt;-->
<!--    <div class="content-wrapper">-->
<!--      &lt;!&ndash; 搜索组件 &ndash;&gt;-->
<!--      <search-bar-->
<!--          v-model="searchQuery"-->
<!--          :sort-order="sortOrder"-->
<!--          @submit="handleSearchSubmit"-->
<!--          @reset="resetSearch"-->
<!--          @update:sort-order="sortOrder = $event"-->
<!--      />-->

<!--      &lt;!&ndash; 卡片列表 &ndash;&gt;-->
<!--      <van-row gutter="12" class="card-row">-->
<!--        <van-col-->
<!--            v-for="item in paginatedCartList"-->
<!--            :key="item.id"-->
<!--            span="12"-->
<!--            class="card-col"-->
<!--        >-->
<!--          <van-card-->
<!--              :desc="item.desc"-->
<!--              :title="item.title"-->
<!--              class="custom-card"-->
<!--          >-->
<!--            &lt;!&ndash; 标签 &ndash;&gt;-->
<!--            <template #tags>-->
<!--              <van-tag plain type="danger" v-for="(tag, index) in item.tags" :key="index">{{ tag }}</van-tag>-->
<!--            </template>-->

<!--            &lt;!&ndash; 按钮 &ndash;&gt;-->
<!--            <template #footer>-->
<!--              <van-button-->
<!--                  icon="guide-o"-->
<!--                  round-->
<!--                  plain-->
<!--                  size="small"-->
<!--                  type="primary"-->
<!--                  @click="goToDetail(item)"-->
<!--                  class="action-btn view-btn"-->
<!--              >-->
<!--                查看-->
<!--              </van-button>-->
<!--              <van-button-->
<!--                  icon="edit"-->
<!--                  round-->
<!--                  plain-->
<!--                  size="small"-->
<!--                  type="info"-->
<!--                  class="action-btn record-btn"-->
<!--                  @click="goToRecord(item)"-->
<!--              >-->
<!--                记录-->
<!--              </van-button>-->
<!--            </template>-->
<!--          </van-card>-->
<!--        </van-col>-->
<!--      </van-row>-->

<!--      &lt;!&ndash; 分页 &ndash;&gt;-->
<!--      <div class="pagination-wrapper">-->
<!--        <base-pagination-->
<!--            v-model="currentPage"-->
<!--            :total-items="filteredCartList.length"-->
<!--            :page-size="itemsPerPage"-->
<!--            @page-change="handlePageChange"-->
<!--            @update:page-size="updatePageSize"-->
<!--        />-->
<!--      </div>-->
<!--    </div>-->
<!--    <MainTabBar />-->
<!--  </div>-->
<!--</template>-->

<!--<script>-->
<!--import SensorRequest from '@/utils/SensorRequest'-->
<!--import MainTabBar from '@/components/MainTabBar.vue'-->
<!--import BasePagination from '@/components/BasePagination.vue'-->
<!--import SearchBar from '@/components/SearchBar.vue'-->
<!--import { key_DingUserPhone} from "@/utils/Dingding";-->

<!--function getLocalUserInfo() {-->
<!--  const phone = localStorage.getItem(key_DingUserPhone);-->
<!--  return {-->
<!--    phone: phone || '',-->
<!--  };-->
<!--}-->

<!--export default {-->
<!--  name: 'CartFile',-->
<!--  components: {-->
<!--    MainTabBar,-->
<!--    BasePagination,-->
<!--    SearchBar-->
<!--  },-->
<!--  data() {-->
<!--    return {-->
<!--      currentPage: 1,-->
<!--      itemsPerPage: 4,-->
<!--      searchQuery: '',-->
<!--      cartList: [],-->
<!--      isSearchSubmitted: false,-->
<!--      searchResults: [],-->
<!--      sortOrder: 'desc'-->
<!--    }-->
<!--  },-->
<!--  mounted() {-->
<!--    console.log('📦 页面已挂载，开始请求接口...');-->
<!--    this.handleSearchSubmit('');-->
<!--  },-->
<!--  computed: {-->
<!--    filteredCartList() {-->
<!--      let list;-->
<!--      if (this.isSearchSubmitted) {-->
<!--        list = this.searchResults;-->
<!--      } else if (!this.searchQuery.trim()) {-->
<!--        list = this.cartList;-->
<!--      } else {-->
<!--        const query = this.searchQuery.toLowerCase();-->
<!--        list = this.cartList.filter(-->
<!--            item => item.title.toLowerCase().includes(query) || item.desc.toLowerCase().includes(query)-->
<!--        );-->
<!--      }-->

<!--      return [...list].sort((a, b) => {-->
<!--        const dateA = this.extractDateFromDesc(a.desc);-->
<!--        const dateB = this.extractDateFromDesc(b.desc);-->
<!--        return this.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;-->
<!--      });-->
<!--    },-->
<!--    paginatedCartList() {-->
<!--      const start = (this.currentPage - 1) * this.itemsPerPage;-->
<!--      return this.filteredCartList.slice(start, start + this.itemsPerPage);-->
<!--    }-->
<!--  },-->
<!--  methods: {-->
<!--    // 跳转到记录页-->
<!--    goToRecord(item) {-->
<!--      this.$router.push({-->
<!--        path: '/task-record',-->
<!--        query: { title: item.title }-->
<!--      });-->
<!--    },-->

<!--    // 请求真实数据-->
<!--    async fetchRealData() {-->
<!--      return new Promise((resolve, reject) => {-->

<!--        // 从缓存中获取用户信息-->
<!--        const userInfo = getLocalUserInfo();-->
<!--        // 创建请求参数对象并转换为 JSON 字符串-->
<!--        const requestParams = JSON.stringify({-->
<!--            Person_Phone: userInfo.phone,-->
<!--        });-->
<!--        console.log('📤 正在调用 GetSharedFileWithMeFun 接口，参数:', requestParams);-->
<!--        SensorRequest.GetSharedFileWithMeFun(requestParams, respData => {-->
<!--          if (respData && respData.result === 1) {-->
<!--            try {-->
<!--              console.log('📥 接收到原始响应:', respData);-->

<!--              // ✅ 直接使用 respData.respData，它已经是字符串形式的 JSON 数据-->
<!--              const rawData = JSON.parse(respData.respData); // ✅ 只需要一次 parse-->

<!--              if (!Array.isArray(rawData)) {-->
<!--                throw new Error('接口返回的 respData 不是一个数组');-->
<!--              }-->

<!--              // ✅ 调整映射逻辑以适配新接口数据结构-->
<!--              const formattedData = rawData.map((item, index) => {-->
<!--                const file = item.Share_Files?.[0] || {};-->
<!--                const fileName = file.File_Name || '未知文件';-->
<!--                const uploadTime = file.Upload_Time-->
<!--                    ? new Date(file.Upload_Time).toLocaleDateString()-->
<!--                    : '无时间';-->

<!--                return {-->
<!--                  id: index + 1,-->
<!--                  title: fileName,-->
<!--                  desc: `📌 任务截止时间：${uploadTime}`,-->
<!--                  tags: ['未查看']-->
<!--                };-->
<!--              });-->

<!--              console.log('📦 格式化后用于渲染的数据:', formattedData);-->

<!--              resolve(formattedData);-->
<!--            } catch (e) {-->
<!--              console.error('💥 解析 respData 失败:', e);-->
<!--              alert('数据解析失败');-->
<!--              reject(e);-->
<!--            }-->
<!--          } else {-->
<!--            console.warn('⚠️ 接口返回错误:', respData);-->
<!--            alert('接口请求失败');-->
<!--            reject(new Error('接口返回错误'));-->
<!--          }-->
<!--        }, err => {-->
<!--          console.error('🚫 网络请求异常:', err);-->
<!--          alert('网络请求异常');-->
<!--          reject(err);-->
<!--        });-->
<!--      });-->
<!--    },-->


<!--    // 提交搜索-->
<!--    async handleSearchSubmit(keyword) {-->
<!--      const finalKeyword = keyword?.trim() || '';-->

<!--      console.log('📡 正在发送请求，关键词:', finalKeyword);-->

<!--      try {-->
<!--        const results = await this.fetchRealData(finalKeyword);-->
<!--        console.log('✅ 请求成功，返回数据:', results);-->

<!--        this.searchResults = results;-->
<!--        this.currentPage = 1;-->
<!--        this.isSearchSubmitted = true;-->

<!--        console.log('🔍 当前搜索状态:', {-->
<!--          isSearchSubmitted: this.isSearchSubmitted,-->
<!--          searchResultsCount: this.searchResults.length-->
<!--        });-->
<!--      } catch (error) {-->
<!--        console.error('❌ 请求失败:', error.message);-->
<!--        alert('数据加载失败，请检查网络或重试');-->
<!--      }-->
<!--    },-->

<!--    // 重置搜索-->
<!--    resetSearch() {-->
<!--      this.searchQuery = '';-->
<!--      this.currentPage = 1;-->
<!--      this.isSearchSubmitted = false;-->
<!--      this.searchResults = [];-->
<!--    },-->

<!--    // 切换排序方式-->
<!--    toggleSortOrder() {-->
<!--      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';-->
<!--    },-->

<!--    // 解析日期-->
<!--    extractDateFromDesc(desc) {-->
<!--      const match = desc.match(/(\d{4}-\d{2}-\d{2})/);-->
<!--      return match ? new Date(match[1]).getTime() : 0;-->
<!--    },-->

<!--    // 查看详情-->
<!--    goToDetail(item) {-->
<!--      if (!item || !item.title) {-->
<!--        alert('数据异常，无法获取文件信息');-->
<!--        return;-->
<!--      }-->
<!--      const fileName = item.title;-->
<!--      const suffixMatch = /\.([a-zA-Z0-9]+)$/.exec(fileName);-->

<!--      if (!suffixMatch) {-->
<!--        alert('无法识别文件类型');-->
<!--        return;-->
<!--      }-->
<!--      const suffix = suffixMatch[1].toLowerCase();-->

<!--      let baseUrl = '';-->
<!--      switch (suffix) {-->
<!--        case 'docx':-->
<!--          baseUrl = 'https://api-v2.sensor-smart.cn:29028/sensorclouddisk3/static/tmp/FileFolder/2.docx';-->
<!--          break;-->
<!--        case 'xlsx':-->
<!--        case 'xls':-->
<!--          baseUrl = 'https://api-v2.sensor-smart.cn:29028/sensorclouddisk3/static/tmp/FileFolder/2.xlsx';-->
<!--          break;-->
<!--        case 'pdf':-->
<!--          baseUrl = 'https://api-v2.sensor-smart.cn:29028/sensorclouddisk3/static/tmp/FileFolder/2.pdf';-->
<!--          break;-->
<!--        case 'pptx':-->
<!--          baseUrl = 'https://api-v2.sensor-smart.cn:29028/sensorclouddisk3/static/tmp/FileFolder/1.pptx';-->
<!--          break;-->
<!--        case 'png':-->
<!--          baseUrl = 'https://api-v2.sensor-smart.cn:29028/sensorclouddisk3/static/tmp/FileFolder/1.png';-->
<!--          break;-->
<!--        case 'txt':-->
<!--          baseUrl = 'https://api-v2.sensor-smart.cn:29028/sensorclouddisk3/static/tmp/FileFolder/1.txt';-->
<!--          break;-->
<!--        default:-->
<!--          alert('暂不支持该文件类型预览');-->
<!--          return;-->
<!--      }-->

<!--      const encodedUrl = encodeURIComponent(baseUrl);-->
<!--      this.$router.push(`/preview?url=${encodedUrl}`);-->
<!--    },-->

<!--    // 分页方法-->
<!--    handlePageChange(page) {-->
<!--      this.currentPage = page;-->
<!--    },-->
<!--    updatePageSize(size) {-->
<!--      this.itemsPerPage = size;-->
<!--      this.currentPage = 1;-->
<!--    }-->
<!--  }-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--.page-container {-->
<!--  padding: 2px;-->
<!--}-->

<!--.content-wrapper {-->
<!--  margin-top: 16px;-->
<!--}-->

<!--.card-row {-->
<!--  margin-bottom: -16px;-->
<!--}-->

<!--.card-col {-->
<!--  padding-bottom: 16px;-->
<!--}-->

<!--.custom-card {-->
<!--  width: 100%;-->
<!--  height: auto;-->
<!--  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);-->
<!--  border-radius: 10px;-->
<!--  overflow: hidden;-->
<!--  transition: transform 0.2s ease-in-out;-->
<!--}-->

<!--.custom-card:hover {-->
<!--  transform: translateY(-2px);-->
<!--}-->

<!--.custom-card .van-card__title {-->
<!--  font-size: 13px;-->
<!--  line-height: 1.4;-->
<!--  font-weight: 500;-->
<!--}-->

<!--.custom-card .van-card__desc {-->
<!--  font-size: 12px;-->
<!--  color: #555;-->
<!--}-->

<!--.pagination-wrapper {-->
<!--  display: flex;-->
<!--  justify-content: center;-->
<!--  margin-top: 24px;-->
<!--}-->

<!--.van-card__footer .action-btn {-->
<!--  margin: 0 4px;-->
<!--  font-size: 11px;-->
<!--  padding: 0 10px;-->
<!--}-->

<!--.van-card__footer {-->
<!--  display: flex;-->
<!--  justify-content: space-between;-->
<!--}-->
<!--</style>-->






<!--&lt;!&ndash;<template>&ndash;&gt;-->
<!--&lt;!&ndash;  <div class="page-container">&ndash;&gt;-->
<!--&lt;!&ndash;    <van-nav-bar&ndash;&gt;-->
<!--&lt;!&ndash;        title="文件分享"&ndash;&gt;-->
<!--&lt;!&ndash;        left-icon="link-o"&ndash;&gt;-->
<!--&lt;!&ndash;        :right-text="''"&ndash;&gt;-->
<!--&lt;!&ndash;        @click-left="handleTitleClick"&ndash;&gt;-->
<!--&lt;!&ndash;    >&ndash;&gt;-->
<!--&lt;!&ndash;      &lt;!&ndash; 右侧可选按钮（示例） &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;      <template #right>&ndash;&gt;-->
<!--&lt;!&ndash;        <van-icon name="search" size="18" @click="handleSearchIconClick" />&ndash;&gt;-->
<!--&lt;!&ndash;      </template>&ndash;&gt;-->
<!--&lt;!&ndash;    </van-nav-bar>&ndash;&gt;-->

<!--&lt;!&ndash;    &lt;!&ndash; 内容区域 &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;    <div class="content-wrapper">&ndash;&gt;-->
<!--&lt;!&ndash;      &lt;!&ndash; 使用搜索组件 &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;      <search-bar&ndash;&gt;-->
<!--&lt;!&ndash;          v-model="searchQuery"&ndash;&gt;-->
<!--&lt;!&ndash;          :sort-order="sortOrder"&ndash;&gt;-->
<!--&lt;!&ndash;          @submit="handleSearchSubmit"&ndash;&gt;-->
<!--&lt;!&ndash;          @reset="resetSearch"&ndash;&gt;-->
<!--&lt;!&ndash;          @update:sort-order="sortOrder = $event"&ndash;&gt;-->
<!--&lt;!&ndash;      />&ndash;&gt;-->

<!--&lt;!&ndash;      &lt;!&ndash; 使用 van-row 和 van-col 布局卡片 &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;      <van-row gutter="12" class="card-row">&ndash;&gt;-->
<!--&lt;!&ndash;        <van-col&ndash;&gt;-->
<!--&lt;!&ndash;            v-for="item in paginatedCartList"&ndash;&gt;-->
<!--&lt;!&ndash;            :key="item.id"&ndash;&gt;-->
<!--&lt;!&ndash;            span="12"&ndash;&gt;-->
<!--&lt;!&ndash;            class="card-col"&ndash;&gt;-->
<!--&lt;!&ndash;        >&ndash;&gt;-->
<!--&lt;!&ndash;          <van-card&ndash;&gt;-->
<!--&lt;!&ndash;              :num="item.num"&ndash;&gt;-->
<!--&lt;!&ndash;              :price="item.price"&ndash;&gt;-->
<!--&lt;!&ndash;              :desc="item.desc"&ndash;&gt;-->
<!--&lt;!&ndash;              :title="item.title"&ndash;&gt;-->
<!--&lt;!&ndash;              :thumb="item.thumb"&ndash;&gt;-->
<!--&lt;!&ndash;              class="custom-card"&ndash;&gt;-->
<!--&lt;!&ndash;          >&ndash;&gt;-->
<!--&lt;!&ndash;            &lt;!&ndash; 标签区域 &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;            <template #tags>&ndash;&gt;-->
<!--&lt;!&ndash;              <van-tag plain type="danger" v-for="(tag, index) in item.tags" :key="index">{{ tag }}</van-tag>&ndash;&gt;-->
<!--&lt;!&ndash;            </template>&ndash;&gt;-->

<!--&lt;!&ndash;            &lt;!&ndash; 按钮区域 &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;            <template #footer>&ndash;&gt;-->
<!--&lt;!&ndash;              <van-button&ndash;&gt;-->
<!--&lt;!&ndash;                  icon="guide-o"&ndash;&gt;-->
<!--&lt;!&ndash;                  round&ndash;&gt;-->
<!--&lt;!&ndash;                  plain&ndash;&gt;-->
<!--&lt;!&ndash;                  size="small"&ndash;&gt;-->
<!--&lt;!&ndash;                  type="primary"&ndash;&gt;-->
<!--&lt;!&ndash;                  @click="goToDetail(item)"&ndash;&gt;-->
<!--&lt;!&ndash;                  class="action-btn view-btn"&ndash;&gt;-->
<!--&lt;!&ndash;              >&ndash;&gt;-->
<!--&lt;!&ndash;                查看&ndash;&gt;-->
<!--&lt;!&ndash;              </van-button>&ndash;&gt;-->
<!--&lt;!&ndash;              <van-button&ndash;&gt;-->
<!--&lt;!&ndash;                  icon="edit"&ndash;&gt;-->
<!--&lt;!&ndash;                  round&ndash;&gt;-->
<!--&lt;!&ndash;                  plain&ndash;&gt;-->
<!--&lt;!&ndash;                  size="small"&ndash;&gt;-->
<!--&lt;!&ndash;                  type="info"&ndash;&gt;-->
<!--&lt;!&ndash;                  class="action-btn record-btn"&ndash;&gt;-->
<!--&lt;!&ndash;                  @click="goToRecord(item)"&ndash;&gt;-->
<!--&lt;!&ndash;              >&ndash;&gt;-->
<!--&lt;!&ndash;                记录&ndash;&gt;-->
<!--&lt;!&ndash;              </van-button>&ndash;&gt;-->
<!--&lt;!&ndash;            </template>&ndash;&gt;-->
<!--&lt;!&ndash;          </van-card>&ndash;&gt;-->
<!--&lt;!&ndash;        </van-col>&ndash;&gt;-->
<!--&lt;!&ndash;      </van-row>&ndash;&gt;-->

<!--&lt;!&ndash;      &lt;!&ndash; 分页组件 &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;      <div class="pagination-wrapper">&ndash;&gt;-->
<!--&lt;!&ndash;        <base-pagination&ndash;&gt;-->
<!--&lt;!&ndash;            v-model="currentPage"&ndash;&gt;-->
<!--&lt;!&ndash;            :total-items="filteredCartList.length"&ndash;&gt;-->
<!--&lt;!&ndash;            :page-size="itemsPerPage"&ndash;&gt;-->
<!--&lt;!&ndash;            @page-change="handlePageChange"&ndash;&gt;-->
<!--&lt;!&ndash;            @update:page-size="updatePageSize"&ndash;&gt;-->
<!--&lt;!&ndash;        />&ndash;&gt;-->
<!--&lt;!&ndash;      </div>&ndash;&gt;-->
<!--&lt;!&ndash;    </div>&ndash;&gt;-->
<!--&lt;!&ndash;    <MainTabBar />&ndash;&gt;-->
<!--&lt;!&ndash;  </div>&ndash;&gt;-->
<!--&lt;!&ndash;</template>&ndash;&gt;-->

<!--&lt;!&ndash;<script>&ndash;&gt;-->
<!--&lt;!&ndash;import {&ndash;&gt;-->
<!--&lt;!&ndash;  Card,&ndash;&gt;-->
<!--&lt;!&ndash;  Tag,&ndash;&gt;-->
<!--&lt;!&ndash;  Button,&ndash;&gt;-->
<!--&lt;!&ndash;  Row,&ndash;&gt;-->
<!--&lt;!&ndash;  Col, NavBar&ndash;&gt;-->
<!--&lt;!&ndash;} from 'vant'&ndash;&gt;-->
<!--&lt;!&ndash;import MainTabBar from '@/components/MainTabBar.vue'&ndash;&gt;-->
<!--&lt;!&ndash;import BasePagination from '@/components/BasePagination.vue'&ndash;&gt;-->
<!--&lt;!&ndash;import SearchBar from '@/components/SearchBar.vue' // 引入新组件&ndash;&gt;-->

<!--&lt;!&ndash;export default {&ndash;&gt;-->
<!--&lt;!&ndash;  name: 'CartFile',&ndash;&gt;-->
<!--&lt;!&ndash;  components: {&ndash;&gt;-->
<!--&lt;!&ndash;    VanCard: Card,&ndash;&gt;-->
<!--&lt;!&ndash;    VanTag: Tag,&ndash;&gt;-->
<!--&lt;!&ndash;    VanButton: Button,&ndash;&gt;-->
<!--&lt;!&ndash;    VanRow: Row,&ndash;&gt;-->
<!--&lt;!&ndash;    VanCol: Col,&ndash;&gt;-->
<!--&lt;!&ndash;    MainTabBar,&ndash;&gt;-->
<!--&lt;!&ndash;    BasePagination,&ndash;&gt;-->
<!--&lt;!&ndash;    SearchBar ,&ndash;&gt;-->
<!--&lt;!&ndash;    VanNavBar: NavBar,&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  data() {&ndash;&gt;-->
<!--&lt;!&ndash;    return {&ndash;&gt;-->
<!--&lt;!&ndash;      // 分页配置&ndash;&gt;-->
<!--&lt;!&ndash;      currentPage: 1,&ndash;&gt;-->
<!--&lt;!&ndash;      itemsPerPage: 4,&ndash;&gt;-->

<!--&lt;!&ndash;      // 搜索相关&ndash;&gt;-->
<!--&lt;!&ndash;      searchQuery: '',&ndash;&gt;-->

<!--&lt;!&ndash;      // 原始数据&ndash;&gt;-->
<!--&lt;!&ndash;      cartList: [&ndash;&gt;-->
<!--&lt;!&ndash;        {&ndash;&gt;-->
<!--&lt;!&ndash;          id: 1,&ndash;&gt;-->
<!--&lt;!&ndash;          desc: '📌 任务截止时间： 2025-04-05 ',&ndash;&gt;-->
<!--&lt;!&ndash;          title: '多路输出项目新需求.docx',&ndash;&gt;-->
<!--&lt;!&ndash;          tags: ['已完成']&ndash;&gt;-->
<!--&lt;!&ndash;        },&ndash;&gt;-->
<!--&lt;!&ndash;        {&ndash;&gt;-->
<!--&lt;!&ndash;          id: 2,&ndash;&gt;-->
<!--&lt;!&ndash;          desc: '📌 任务截止时间： 2025-06-05 ',&ndash;&gt;-->
<!--&lt;!&ndash;          title: 'AGV小车软件更新维护.pdf',&ndash;&gt;-->
<!--&lt;!&ndash;          tags: ['延期']&ndash;&gt;-->
<!--&lt;!&ndash;        },&ndash;&gt;-->
<!--&lt;!&ndash;        {&ndash;&gt;-->
<!--&lt;!&ndash;          id: 3,&ndash;&gt;-->
<!--&lt;!&ndash;          desc: '📌 任务截止时间： 2025-08-05 ',&ndash;&gt;-->
<!--&lt;!&ndash;          title: 'P型电源售后机箱维修.png',&ndash;&gt;-->
<!--&lt;!&ndash;          tags: ['未查看']&ndash;&gt;-->
<!--&lt;!&ndash;        },&ndash;&gt;-->
<!--&lt;!&ndash;        {&ndash;&gt;-->
<!--&lt;!&ndash;          id: 4,&ndash;&gt;-->
<!--&lt;!&ndash;          desc: '📌 任务截止时间： 2025-08-14 ',&ndash;&gt;-->
<!--&lt;!&ndash;          title: '屏蔽电源触摸屏软件调试.txt',&ndash;&gt;-->
<!--&lt;!&ndash;          tags: ['已完成']&ndash;&gt;-->
<!--&lt;!&ndash;        },&ndash;&gt;-->
<!--&lt;!&ndash;        {&ndash;&gt;-->
<!--&lt;!&ndash;          id: 5,&ndash;&gt;-->
<!--&lt;!&ndash;          desc: '📌 任务截止时间： 2025-07-05 ',&ndash;&gt;-->
<!--&lt;!&ndash;          title: '工作助手小程序前端页面开发.xlsx',&ndash;&gt;-->
<!--&lt;!&ndash;          tags: ['正在进行中']&ndash;&gt;-->
<!--&lt;!&ndash;        },&ndash;&gt;-->
<!--&lt;!&ndash;        {&ndash;&gt;-->
<!--&lt;!&ndash;          id: 6,&ndash;&gt;-->
<!--&lt;!&ndash;          desc: '📌 任务截止时间： 2025-09-05 ',&ndash;&gt;-->
<!--&lt;!&ndash;          title: '工作助手小程序后端开发.pptx',&ndash;&gt;-->
<!--&lt;!&ndash;          tags: ['正在进行中']&ndash;&gt;-->
<!--&lt;!&ndash;        },&ndash;&gt;-->
<!--&lt;!&ndash;        {&ndash;&gt;-->
<!--&lt;!&ndash;          id: 7,&ndash;&gt;-->
<!--&lt;!&ndash;          desc: '📌 任务截止时间： 2025-06-05 ',&ndash;&gt;-->
<!--&lt;!&ndash;          title: 'AGV小车软件更新维护.pdf',&ndash;&gt;-->
<!--&lt;!&ndash;          tags: ['延期']&ndash;&gt;-->
<!--&lt;!&ndash;        },&ndash;&gt;-->
<!--&lt;!&ndash;        {&ndash;&gt;-->
<!--&lt;!&ndash;          id: 8,&ndash;&gt;-->
<!--&lt;!&ndash;          desc: '📌 任务截止时间： 2025-08-05 ',&ndash;&gt;-->
<!--&lt;!&ndash;          title: 'P型电源售后机箱维修.png',&ndash;&gt;-->
<!--&lt;!&ndash;          tags: ['未查看']&ndash;&gt;-->
<!--&lt;!&ndash;        },&ndash;&gt;-->
<!--&lt;!&ndash;        {&ndash;&gt;-->
<!--&lt;!&ndash;          id: 9,&ndash;&gt;-->
<!--&lt;!&ndash;          desc: '📌 任务截止时间： 2025-08-14 ',&ndash;&gt;-->
<!--&lt;!&ndash;          title: '屏蔽电源触摸屏软件调试.txt',&ndash;&gt;-->
<!--&lt;!&ndash;          tags: ['已完成']&ndash;&gt;-->
<!--&lt;!&ndash;        },&ndash;&gt;-->
<!--&lt;!&ndash;        {&ndash;&gt;-->
<!--&lt;!&ndash;          id: 10,&ndash;&gt;-->
<!--&lt;!&ndash;          desc: '📌 任务截止时间： 2025-07-05 ',&ndash;&gt;-->
<!--&lt;!&ndash;          title: '工作助手小程序前端页面开发.xlsx',&ndash;&gt;-->
<!--&lt;!&ndash;          tags: ['正在进行中']&ndash;&gt;-->
<!--&lt;!&ndash;        },&ndash;&gt;-->
<!--&lt;!&ndash;        {&ndash;&gt;-->
<!--&lt;!&ndash;          id: 11,&ndash;&gt;-->
<!--&lt;!&ndash;          desc: '📌 任务截止时间： 2025-09-05 ',&ndash;&gt;-->
<!--&lt;!&ndash;          title: '工作助手小程序后端开发.pptx',&ndash;&gt;-->
<!--&lt;!&ndash;          tags: ['正在进行中']&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->
<!--&lt;!&ndash;      ],&ndash;&gt;-->

<!--&lt;!&ndash;      // 新增字段&ndash;&gt;-->
<!--&lt;!&ndash;      isSearchSubmitted: false, // 是否已提交搜索&ndash;&gt;-->
<!--&lt;!&ndash;      searchResults: [], // 存储接口返回的数据&ndash;&gt;-->
<!--&lt;!&ndash;      sortOrder: 'desc' // 排序方式，默认为降序&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  computed: {&ndash;&gt;-->
<!--&lt;!&ndash;    filteredCartList() {&ndash;&gt;-->
<!--&lt;!&ndash;      let list&ndash;&gt;-->
<!--&lt;!&ndash;      if (this.isSearchSubmitted) {&ndash;&gt;-->
<!--&lt;!&ndash;        list = this.searchResults&ndash;&gt;-->
<!--&lt;!&ndash;      } else if (!this.searchQuery.trim()) {&ndash;&gt;-->
<!--&lt;!&ndash;        list = this.cartList&ndash;&gt;-->
<!--&lt;!&ndash;      } else {&ndash;&gt;-->
<!--&lt;!&ndash;        const query = this.searchQuery.toLowerCase()&ndash;&gt;-->
<!--&lt;!&ndash;        list = this.cartList.filter(&ndash;&gt;-->
<!--&lt;!&ndash;            item => item.title.toLowerCase().includes(query) || item.desc.toLowerCase().includes(query)&ndash;&gt;-->
<!--&lt;!&ndash;        )&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->

<!--&lt;!&ndash;      // 如果启用了排序，则返回已排序列表&ndash;&gt;-->
<!--&lt;!&ndash;      return [...list].sort((a, b) => {&ndash;&gt;-->
<!--&lt;!&ndash;        const dateA = this.extractDateFromDesc(a.desc)&ndash;&gt;-->
<!--&lt;!&ndash;        const dateB = this.extractDateFromDesc(b.desc)&ndash;&gt;-->
<!--&lt;!&ndash;        return this.sortOrder === 'asc' ? dateA - dateB : dateB - dateA&ndash;&gt;-->
<!--&lt;!&ndash;      })&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    paginatedCartList() {&ndash;&gt;-->
<!--&lt;!&ndash;      const start = (this.currentPage - 1) * this.itemsPerPage&ndash;&gt;-->
<!--&lt;!&ndash;      return this.filteredCartList.slice(start, start + this.itemsPerPage)&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  methods: {&ndash;&gt;-->
<!--&lt;!&ndash;    goToRecord(item) {&ndash;&gt;-->
<!--&lt;!&ndash;      this.$router.push({&ndash;&gt;-->
<!--&lt;!&ndash;        path: '/Debug/task-record',&ndash;&gt;-->
<!--&lt;!&ndash;        query: { title: item.title } // 可以把文件名传过去作为默认值&ndash;&gt;-->
<!--&lt;!&ndash;      })&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    // 模拟假接口&ndash;&gt;-->
<!--&lt;!&ndash;    mockApiRequest(keyword) {&ndash;&gt;-->
<!--&lt;!&ndash;      return new Promise(resolve => {&ndash;&gt;-->
<!--&lt;!&ndash;        setTimeout(() => {&ndash;&gt;-->
<!--&lt;!&ndash;          const fakeData = [&ndash;&gt;-->
<!--&lt;!&ndash;            {&ndash;&gt;-->
<!--&lt;!&ndash;              id: 99,&ndash;&gt;-->
<!--&lt;!&ndash;              title: `${keyword}相关文档.pdf`,&ndash;&gt;-->
<!--&lt;!&ndash;              desc: '📌 任务截止时间：2025-07-05',&ndash;&gt;-->
<!--&lt;!&ndash;              tags: ['已完成']&ndash;&gt;-->
<!--&lt;!&ndash;            },&ndash;&gt;-->
<!--&lt;!&ndash;            {&ndash;&gt;-->
<!--&lt;!&ndash;              id: 100,&ndash;&gt;-->
<!--&lt;!&ndash;              title: `${keyword}测试报告.xlsx`,&ndash;&gt;-->
<!--&lt;!&ndash;              desc: '📌 任务截止时间：2025-08-05',&ndash;&gt;-->
<!--&lt;!&ndash;              tags: ['未查看']&ndash;&gt;-->
<!--&lt;!&ndash;            }&ndash;&gt;-->
<!--&lt;!&ndash;          ]&ndash;&gt;-->
<!--&lt;!&ndash;          resolve(fakeData)&ndash;&gt;-->
<!--&lt;!&ndash;        }, 500)&ndash;&gt;-->
<!--&lt;!&ndash;      })&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->

<!--&lt;!&ndash;    // 输入框变化&ndash;&gt;-->
<!--&lt;!&ndash;    handleSearchInput(value) {&ndash;&gt;-->
<!--&lt;!&ndash;      this.searchQuery = value&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->

<!--&lt;!&ndash;    // 提交搜索&ndash;&gt;-->
<!--&lt;!&ndash;    async handleSearchSubmit(keyword) {&ndash;&gt;-->
<!--&lt;!&ndash;      if (!keyword.trim()) {&ndash;&gt;-->
<!--&lt;!&ndash;        alert('请输入查询关键词')&ndash;&gt;-->
<!--&lt;!&ndash;        return&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->

<!--&lt;!&ndash;      const results = await this.mockApiRequest(keyword)&ndash;&gt;-->
<!--&lt;!&ndash;      this.searchResults = results&ndash;&gt;-->
<!--&lt;!&ndash;      this.currentPage = 1&ndash;&gt;-->
<!--&lt;!&ndash;      this.isSearchSubmitted = true&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->

<!--&lt;!&ndash;    // 重置搜索&ndash;&gt;-->
<!--&lt;!&ndash;    resetSearch() {&ndash;&gt;-->
<!--&lt;!&ndash;      this.searchQuery = ''&ndash;&gt;-->
<!--&lt;!&ndash;      this.currentPage = 1&ndash;&gt;-->
<!--&lt;!&ndash;      this.isSearchSubmitted = false&ndash;&gt;-->
<!--&lt;!&ndash;      this.searchResults = []&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->

<!--&lt;!&ndash;    // 切换排序方式&ndash;&gt;-->
<!--&lt;!&ndash;    toggleSortOrder() {&ndash;&gt;-->
<!--&lt;!&ndash;      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->

<!--&lt;!&ndash;    // 解析描述中的日期&ndash;&gt;-->
<!--&lt;!&ndash;    extractDateFromDesc(desc) {&ndash;&gt;-->
<!--&lt;!&ndash;      const match = desc.match(/(\d{4}-\d{2}-\d{2})/)&ndash;&gt;-->
<!--&lt;!&ndash;      return match ? new Date(match[1]).getTime() : 0&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->

<!--&lt;!&ndash;    // 点击查看跳转预览&ndash;&gt;-->
<!--&lt;!&ndash;    goToDetail(item) {&ndash;&gt;-->
<!--&lt;!&ndash;      if (!item || !item.title) {&ndash;&gt;-->
<!--&lt;!&ndash;        alert('数据异常，无法获取文件信息')&ndash;&gt;-->
<!--&lt;!&ndash;        return&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;      const fileName = item.title&ndash;&gt;-->
<!--&lt;!&ndash;      const suffixMatch = /\.([a-zA-Z0-9]+)$/.exec(fileName)&ndash;&gt;-->

<!--&lt;!&ndash;      if (!suffixMatch) {&ndash;&gt;-->
<!--&lt;!&ndash;        alert('无法识别文件类型')&ndash;&gt;-->
<!--&lt;!&ndash;        return&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;      const suffix = suffixMatch[1].toLowerCase()&ndash;&gt;-->

<!--&lt;!&ndash;      let baseUrl = ''&ndash;&gt;-->
<!--&lt;!&ndash;      switch (suffix) {&ndash;&gt;-->
<!--&lt;!&ndash;        case 'docx':&ndash;&gt;-->
<!--&lt;!&ndash;          baseUrl = 'https://api-v2.sensor-smart.cn:29028/sensorclouddisk3/static/tmp/FileFolder/2.docx'&ndash;&gt;-->
<!--&lt;!&ndash;          break&ndash;&gt;-->
<!--&lt;!&ndash;        case 'xlsx':&ndash;&gt;-->
<!--&lt;!&ndash;        case 'xls':&ndash;&gt;-->
<!--&lt;!&ndash;          baseUrl = 'https://api-v2.sensor-smart.cn:29028/sensorclouddisk3/static/tmp/FileFolder/2.xlsx'&ndash;&gt;-->
<!--&lt;!&ndash;          break&ndash;&gt;-->
<!--&lt;!&ndash;        case 'pdf':&ndash;&gt;-->
<!--&lt;!&ndash;          baseUrl = 'https://api-v2.sensor-smart.cn:29028/sensorclouddisk3/static/tmp/FileFolder/2.pdf'&ndash;&gt;-->
<!--&lt;!&ndash;          break&ndash;&gt;-->
<!--&lt;!&ndash;        case 'pptx':&ndash;&gt;-->
<!--&lt;!&ndash;          baseUrl = 'https://api-v2.sensor-smart.cn:29028/sensorclouddisk3/static/tmp/FileFolder/1.pptx'&ndash;&gt;-->
<!--&lt;!&ndash;          break&ndash;&gt;-->
<!--&lt;!&ndash;        case 'png':&ndash;&gt;-->
<!--&lt;!&ndash;          baseUrl = 'https://api-v2.sensor-smart.cn:29028/sensorclouddisk3/static/tmp/FileFolder/1.png'&ndash;&gt;-->
<!--&lt;!&ndash;          break&ndash;&gt;-->
<!--&lt;!&ndash;        case 'txt':&ndash;&gt;-->
<!--&lt;!&ndash;          baseUrl = 'https://api-v2.sensor-smart.cn:29028/sensorclouddisk3/static/tmp/FileFolder/1.txt'&ndash;&gt;-->
<!--&lt;!&ndash;          break&ndash;&gt;-->
<!--&lt;!&ndash;        default:&ndash;&gt;-->
<!--&lt;!&ndash;          alert('暂不支持该文件类型预览')&ndash;&gt;-->
<!--&lt;!&ndash;          return&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->

<!--&lt;!&ndash;      const encodedUrl = encodeURIComponent(baseUrl)&ndash;&gt;-->
<!--&lt;!&ndash;      this.$router.push(`/preview?url=${encodedUrl}`)&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->

<!--&lt;!&ndash;    // 分页方法&ndash;&gt;-->
<!--&lt;!&ndash;    handlePageChange(page) {&ndash;&gt;-->
<!--&lt;!&ndash;      this.currentPage = page&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    updatePageSize(size) {&ndash;&gt;-->
<!--&lt;!&ndash;      this.itemsPerPage = size&ndash;&gt;-->
<!--&lt;!&ndash;      this.currentPage = 1&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->
<!--&lt;!&ndash;  }&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->
<!--&lt;!&ndash;</script>&ndash;&gt;-->


<!--&lt;!&ndash;<style scoped>&ndash;&gt;-->
<!--&lt;!&ndash;.page-container {&ndash;&gt;-->
<!--&lt;!&ndash;  padding: 20px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.content-wrapper {&ndash;&gt;-->
<!--&lt;!&ndash;  margin-top: 16px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;/* 按钮操作区 */&ndash;&gt;-->
<!--&lt;!&ndash;.search-actions {&ndash;&gt;-->
<!--&lt;!&ndash;  display: flex;&ndash;&gt;-->
<!--&lt;!&ndash;  align-items: center;&ndash;&gt;-->
<!--&lt;!&ndash;  gap: 12px;&ndash;&gt;-->
<!--&lt;!&ndash;  margin-bottom: 16px;&ndash;&gt;-->
<!--&lt;!&ndash;  flex-wrap: wrap;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.card-row {&ndash;&gt;-->
<!--&lt;!&ndash;  margin-bottom: -16px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.card-col {&ndash;&gt;-->
<!--&lt;!&ndash;  padding-bottom: 16px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;/* 自定义卡片样式 */&ndash;&gt;-->
<!--&lt;!&ndash;.custom-card {&ndash;&gt;-->
<!--&lt;!&ndash;  width: 100%;&ndash;&gt;-->
<!--&lt;!&ndash;  height: auto;&ndash;&gt;-->
<!--&lt;!&ndash;  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);&ndash;&gt;-->
<!--&lt;!&ndash;  border-radius: 10px;&ndash;&gt;-->
<!--&lt;!&ndash;  overflow: hidden;&ndash;&gt;-->
<!--&lt;!&ndash;  transition: transform 0.2s ease-in-out;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;/* 鼠标悬停放大效果 */&ndash;&gt;-->
<!--&lt;!&ndash;.custom-card:hover {&ndash;&gt;-->
<!--&lt;!&ndash;  transform: translateY(-2px);&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;/* 卡片内文字样式 */&ndash;&gt;-->
<!--&lt;!&ndash;.custom-card .van-card__title {&ndash;&gt;-->
<!--&lt;!&ndash;  font-size: 13px;&ndash;&gt;-->
<!--&lt;!&ndash;  line-height: 1.4;&ndash;&gt;-->
<!--&lt;!&ndash;  font-weight: 500;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.custom-card .van-card__desc {&ndash;&gt;-->
<!--&lt;!&ndash;  font-size: 12px;&ndash;&gt;-->
<!--&lt;!&ndash;  color: #555;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;/* 分页居中 */&ndash;&gt;-->
<!--&lt;!&ndash;.pagination-wrapper {&ndash;&gt;-->
<!--&lt;!&ndash;  display: flex;&ndash;&gt;-->
<!--&lt;!&ndash;  justify-content: center;&ndash;&gt;-->
<!--&lt;!&ndash;  margin-top: 24px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;/* 卡片按钮样式 */&ndash;&gt;-->
<!--&lt;!&ndash;.van-card__footer .action-btn {&ndash;&gt;-->
<!--&lt;!&ndash;  margin: 0 4px;&ndash;&gt;-->
<!--&lt;!&ndash;  font-size: 11px;&ndash;&gt;-->
<!--&lt;!&ndash;  padding: 0 10px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.van-card__footer {&ndash;&gt;-->
<!--&lt;!&ndash;  display: flex;&ndash;&gt;-->
<!--&lt;!&ndash;  justify-content: space-between;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->
<!--&lt;!&ndash;</style>&ndash;&gt;-->
