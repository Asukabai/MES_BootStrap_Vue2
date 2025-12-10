<template>
  <div class="page-container">
    <!-- 标签页固定在顶部 -->
    <van-tabs v-model="activeTab" animated swipeable class="share-tabs" sticky @change="onTabChange">
      <!-- 库存操作日志 -->
      <van-tab title="库存操作日志">
        <template #title>
          <span>库存操作</span>
        </template>
        <!-- 下拉刷新组件 -->
        <van-pull-refresh v-model="inventoryRefreshing" @refresh="onInventoryRefresh">
          <!-- 使用分段控件 -->
          <div class="filter-segment-container">
            <van-grid :column-num="4" :border="false">
              <van-grid-item>
                <div
                  :class="['filter-item', inventoryFilterTab === 'desc' ? 'active' : '']"
                  @click="() => onInventoryFilterChange('desc')"
                >
                  <van-icon name="arrow-down" />
                  <div>倒序</div>
                </div>
              </van-grid-item>
              <van-grid-item>
                <div
                  :class="['filter-item', inventoryFilterTab === 'asc' ? 'active' : '']"
                  @click="() => onInventoryFilterChange('asc')"
                >
                  <van-icon name="arrow-up" />
                  <div>正序</div>
                </div>
              </van-grid-item>

              <van-grid-item>
                <div
                  :class="['filter-item', inventoryFilterTab === 'inbound' ? 'active' : '']"
                  @click="() => onInventoryFilterChange('inbound')"
                >
                  <van-icon name="passed" />
                  <div>入库</div>
                </div>
              </van-grid-item>
              <van-grid-item>
                <div
                  :class="['filter-item', inventoryFilterTab === 'outbound' ? 'active' : '']"
                  @click="() => onInventoryFilterChange('outbound')"
                >
                  <van-icon name="underway" />
                  <div>出库</div>
                </div>
              </van-grid-item>
            </van-grid>
          </div>

          <div class="cards-container">
            <van-list
              :loading="inventoryLoading"
              :finished="inventoryFinished"
              finished-text="没有更多了"
              @load="loadInventoryData"
            >
              <van-card
                v-for="item in inventoryList"
                :key="item.Id"
                :title="`操作类型：${item.Transaction_Type || '未知'}`"
                :desc="formatInventoryDesc(item)"
                class="share-card"
              >
                <template #tags>
                  <van-tag plain type="primary" style="margin-right: 8px; margin-bottom: 8px;">
                    数量变化：{{ formatQuantityChange(item) }}
                  </van-tag>
                  <van-tag plain type="success" style="margin-right: 8px; margin-bottom: 8px;">操作后库存：{{ item.Current_Quantity }}</van-tag>
                </template>

                <template #footer>
                  <van-button
                    icon="clock-o"
                    round
                    size="small"
                    type="info"
                  >{{ formatDate(item.Ts_create) }}</van-button>
                </template>
              </van-card>
            </van-list>
          </div>
        </van-pull-refresh>
      </van-tab>

      <!-- 个人操作日志 -->
      <van-tab title="个人操作日志">
        <template #title>
          <span>个人操作</span>
        </template>
        <!-- 下拉刷新组件 -->
        <van-pull-refresh v-model="personRefreshing" @refresh="onPersonRefresh">
          <!-- 标签栏 -->
<!--          <div class="filter-tags-container">-->
<!--            <van-tabs v-model="personFilterTab" animated @change="onPersonFilterChange">-->
<!--              <van-tab title="时间正序" name="asc"></van-tab>-->
<!--              <van-tab title="时间倒序" name="desc"></van-tab>-->
<!--              <van-tab title="入库操作" name="inbound"></van-tab>-->
<!--              <van-tab title="出库操作" name="outbound"></van-tab>-->
<!--            </van-tabs>-->
<!--          </div>-->
          <!-- 个人操作日志部分的过滤控件 -->
          <div class="filter-segment-container">
            <van-grid :column-num="4" :border="false">
              <van-grid-item>
                <div
                  :class="['filter-item', personFilterTab === 'desc' ? 'active' : '']"
                  @click="() => onPersonFilterChange('desc')"
                >
                  <van-icon name="arrow-down" />
                  <div>倒序</div>
                </div>
              </van-grid-item>
              <van-grid-item>
                <div
                  :class="['filter-item', personFilterTab === 'asc' ? 'active' : '']"
                  @click="() => onPersonFilterChange('asc')"
                >
                  <van-icon name="arrow-up" />
                  <div>正序</div>
                </div>
              </van-grid-item>

              <van-grid-item>
                <div
                  :class="['filter-item', personFilterTab === 'inbound' ? 'active' : '']"
                  @click="() => onPersonFilterChange('inbound')"
                >
                  <van-icon name="passed" />
                  <div>入库</div>
                </div>
              </van-grid-item>
              <van-grid-item>
                <div
                  :class="['filter-item', personFilterTab === 'outbound' ? 'active' : '']"
                  @click="() => onPersonFilterChange('outbound')"
                >
                  <van-icon name="underway" />
                  <div>出库</div>
                </div>
              </van-grid-item>
            </van-grid>
          </div>
          <div class="cards-container">
            <van-empty description="" v-if="personList.length === 0 && !personLoading && personFinished" />
            <van-list
              :loading="personLoading"
              :finished="personFinished"
              finished-text="没有更多了"
              @load="loadPersonData"
            >
              <van-card
                v-for="item in personList"
                :key="item.Id"
                :title="`操作类型：${item.Transaction_Type || '未知'}`"
                class="share-card"
              >
                <template #desc>
                  <div class="card-desc">
                    <div>库存ID: {{ item.Inventory_ID }}</div>
                    <div>操作人: {{ item.Report_Person.Person_Name || '无' }}</div>
                    <div>备注: {{ item.Remark || '无' }}</div>
                  </div>
                </template>
                <template #tags>
                  <van-tag plain type="primary" style="margin-right: 8px; margin-bottom: 8px;">
                    数量变化：{{ formatQuantityChange(item) }}
                  </van-tag>
                  <van-tag plain type="success" style="margin-right: 8px; margin-bottom: 8px;">操作后库存：{{ item.Current_Quantity }}</van-tag>
                </template>

                <template #footer>
                  <van-button
                    icon="clock-o"
                    round
                    size="small"
                    type="info"
                  >{{ formatDate(item.Ts_create) }}</van-button>
                </template>
              </van-card>
            </van-list>
          </div>
        </van-pull-refresh>
      </van-tab>
    </van-tabs>
  </div>
</template>

<script>
import SensorRequest from '../../utils/SensorRequest';
import {key_DingName, key_DingUserIndex, key_DingUserPhone} from '../../utils/Dingding';
import { GetDingUserToken } from "../../utils/Dingding";

function getLocalUserInfo() {
  const name = localStorage.getItem(key_DingName);
  const phone = localStorage.getItem(key_DingUserPhone);
  const dingID = localStorage.getItem(key_DingUserIndex); // 使用 key_DingUserIndex 作为 DingID

  return {
    name: name || '',
    phone: phone || '',
    dingID: dingID || ''
  };
}

export default {
  name: 'InventoryLog',
  data() {
    return {
      activeTab: 0, // 当前选中的 tab index
      inventory_ID: "",// 固定的库存ID

      // 排序状态
      inventorySortOrder: 'desc', // 'asc' 或 'desc'
      personSortOrder: 'desc',    // 'asc' 或 'desc'

      // 过滤标签状态
      inventoryFilterTab: 'desc',  // 库存操作日志的过滤选项
      personFilterTab: 'desc',     // 个人操作日志的过滤选项

      // 原始数据（用于筛选）
      originalInventoryList: [],
      originalPersonList: [],

      // 库存操作日志数据
      inventoryList: [],
      inventoryLoading: false,
      inventoryFinished: false,

      // 个人操作日志数据
      personList: [],
      personLoading: false,
      personFinished: false,

      // 下拉刷新状态
      inventoryRefreshing: false,
      personRefreshing: false,
    };
  },

  mounted() {

    // 从路由参数中获取 inventory_ID
    const routeItem = this.$route.query.item;
    if (routeItem) {
      try {
        const parsedItem = JSON.parse(routeItem);
        this.inventory_ID = parsedItem.Id || parsedItem.id || "";
      } catch (e) {
        console.error('解析路由参数失败:', e);
      }
    }
    // const department = this.$route.params.department
    // GetDingUserToken(department,(token) => {},(token) => {})

    // 根据默认选中的标签加载对应数据
    if (this.activeTab === 0) {
      this.loadInventoryData();
    } else {
      this.loadPersonData();
    }
  },

  methods: {
    // 格式化数量变化显示
    formatQuantityChange(item) {
      const quantity = item.Quantity_Change || 0;
      // alert( "quantity:"+quantity)
      // 如果操作类型包含"入库"，显示为正数并加上"+"号
      if (item.Transaction_Type && item.Transaction_Type.includes('入库')) {
        return `+${quantity}`;
      }
      // 其他情况显示为负数并加上"-"号
      return `-${quantity}`;
    },
    // 库存操作日志过滤变更
    onInventoryFilterChange(name) {
      this.inventoryFilterTab = name;
      this.applyInventoryFilter();
    },

    // 个人操作日志过滤变更
    onPersonFilterChange(name) {
      this.personFilterTab = name;
      this.applyPersonFilter();
    },

    // 应用库存操作日志过滤
    applyInventoryFilter() {
      // 根据 this.inventoryFilterTab 的值进行相应处理
      switch(this.inventoryFilterTab) {
        case 'asc':
          // 时间正序排序
          this.inventoryList = [...this.originalInventoryList];
          this.sortInventoryListAsc();
          break;
        case 'desc':
          // 时间倒序排序
          this.inventoryList = [...this.originalInventoryList];
          this.sortInventoryListDesc();
          break;
        case 'inbound':
          // 入库操作筛选
          this.filterInventoryListByType('inbound');
          break;
        case 'outbound':
          // 出库操作筛选
          this.filterInventoryListByType('outbound');
          break;
      }
    },

    // 应用个人操作日志过滤
    applyPersonFilter() {
      // 根据 this.personFilterTab 的值进行相应处理
      switch(this.personFilterTab) {
        case 'asc':
          // 时间正序排序
          this.personList = [...this.originalPersonList];
          this.sortPersonListAsc();
          break;
        case 'desc':
          // 时间倒序排序
          this.personList = [...this.originalPersonList];
          this.sortPersonListDesc();
          break;
        case 'inbound':
          // 入库操作筛选
          this.filterPersonListByType('inbound');
          break;
        case 'outbound':
          // 出库操作筛选
          this.filterPersonListByType('outbound');
          break;
      }
    },

    // 正序排序库存列表
    sortInventoryListAsc() {
      if (this.inventoryList.length > 0) {
        this.inventoryList.sort((a, b) => {
          const timeA = new Date(a.Ts_create).getTime();
          const timeB = new Date(b.Ts_create).getTime();
          return timeA - timeB;
        });
      }
    },

    // 倒序排序库存列表
    sortInventoryListDesc() {
      if (this.inventoryList.length > 0) {
        this.inventoryList.sort((a, b) => {
          const timeA = new Date(a.Ts_create).getTime();
          const timeB = new Date(b.Ts_create).getTime();
          return timeB - timeA;
        });
      }
    },

    // 正序排序个人列表
    sortPersonListAsc() {
      if (this.personList.length > 0) {
        this.personList.sort((a, b) => {
          const timeA = new Date(a.Ts_create).getTime();
          const timeB = new Date(b.Ts_create).getTime();
          return timeA - timeB;
        });
      }
    },

    // 倒序排序个人列表
    sortPersonListDesc() {
      if (this.personList.length > 0) {
        this.personList.sort((a, b) => {
          const timeA = new Date(a.Ts_create).getTime();
          const timeB = new Date(b.Ts_create).getTime();
          return timeB - timeA;
        });
      }
    },

    // 根据操作类型筛选库存列表
    filterInventoryListByType(type) {
      if (type === 'inbound') {
        // 筛选包含"入库"的操作类型
        this.inventoryList = this.originalInventoryList.filter(item =>
          item.Transaction_Type && item.Transaction_Type.includes('入库')
        );
      } else if (type === 'outbound') {
        // 筛选包含"领用"或"出库"的操作类型
        this.inventoryList = this.originalInventoryList.filter(item =>
          item.Transaction_Type &&
          (item.Transaction_Type.includes('领用') || item.Transaction_Type.includes('出库'))
        );
      }
    },

    // 根据操作类型筛选个人列表
    filterPersonListByType(type) {
      if (type === 'inbound') {
        // 筛选包含"入库"的操作类型
        this.personList = this.originalPersonList.filter(item =>
          item.Transaction_Type && item.Transaction_Type.includes('入库')
        );
      } else if (type === 'outbound') {
        // 筛选包含"领用"或"出库"的操作类型
        this.personList = this.originalPersonList.filter(item =>
          item.Transaction_Type &&
          (item.Transaction_Type.includes('领用') || item.Transaction_Type.includes('出库'))
        );
      }
    },

    // 切换库存操作日志排序
    toggleInventorySort() {
      this.inventorySortOrder = this.inventorySortOrder === 'asc' ? 'desc' : 'asc';
      this.sortInventoryList();
    },

    // 切换个人操作日志排序
    togglePersonSort() {
      this.personSortOrder = this.personSortOrder === 'asc' ? 'desc' : 'asc';
      this.sortPersonList();
    },

    // 对库存操作日志进行排序
    sortInventoryList() {
      if (this.inventoryList.length > 0) {
        this.inventoryList.sort((a, b) => {
          const timeA = new Date(a.Ts_create).getTime();
          const timeB = new Date(b.Ts_create).getTime();
          return this.inventorySortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        });
      }
    },
    // 对个人操作日志进行排序
    sortPersonList() {
      if (this.personList.length > 0) {
        this.personList.sort((a, b) => {
          const timeA = new Date(a.Ts_create).getTime();
          const timeB = new Date(b.Ts_create).getTime();
          return this.personSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        });
      }
    },
    // 标签页切换事件
    onTabChange(index) {
      if (index === 0 && this.inventoryList.length === 0) {
        this.loadInventoryData();
      } else if (index === 1 && this.personList.length === 0) {
        this.loadPersonData();
      }
    },

    // 加载库存操作日志数据
    loadInventoryData() {
      this.inventoryLoading = true;

      const param = {
        Inventory_ID: this.inventory_ID,
        Transaction_Type: "",
        Report_Person: {
          Person_Name: ""
        }
      };

      SensorRequest.InventoryTransactionsGetFun(
        JSON.stringify(param),
        (respData) => {
          let JSON_Data = JSON.parse(respData)
          console.log("加载库存操作日志数据 JSON_Data : "+respData)
          // 成功回调
          this.originalInventoryList = JSON_Data || [];
          this.inventoryList = [...this.originalInventoryList];

          // 根据当前过滤选项处理数据
          this.applyInventoryFilter();

          this.inventoryLoading = false;
          this.inventoryFinished = true;
          this.inventoryRefreshing = false;
        },
        (error) => {
          // 失败回调
          console.error('获取库存操作日志失败:', error);
          this.inventoryLoading = false;
          this.inventoryFinished = true;
          this.inventoryRefreshing = false;
        }
      );
    },

    // 加载个人操作日志数据
    loadPersonData() {
      this.personLoading = true;
      const userInfo = getLocalUserInfo();
      // alert("缓存姓名："+userInfo.name)
      const param = {
        Inventory_ID: "",
        Transaction_Type: "",
        Report_Person: {
          Person_Name: userInfo.name
        }
      };

      SensorRequest.InventoryTransactionsGetFun(
        JSON.stringify(param),
        (respData) => {
          let JSON_Data = JSON.parse(respData)
          console.log("加载个人操作日志数据 JSON_Data : "+respData)
          // 成功回调
          this.originalPersonList = JSON_Data || [];
          this.personList = [...this.originalPersonList];

          // 根据当前过滤选项处理数据
          this.applyPersonFilter();

          this.personLoading = false;
          this.personFinished = true;
          this.personRefreshing = false;
        },
        (error) => {
          // 失败回调
          console.error('获取个人操作日志失败:', error);
          this.personLoading = false;
          this.personFinished = true;
          this.personRefreshing = false;
        }
      );
    },

    // 下拉刷新 - 库存操作日志
    onInventoryRefresh() {
      this.inventoryRefreshing = true;
      this.loadInventoryData();
    },

    // 下拉刷新 - 个人操作日志
    onPersonRefresh() {
      this.personRefreshing = true;
      this.loadPersonData();
    },

    formatInventoryDesc(item) {
      // 修改前
      // return `操作人: ${item.Report_Person?.Person_Name || '未知'} - 库存ID: ${item.Inventory_ID}`;
      // 修改后
      return `操作人: ${(item.Report_Person && item.Report_Person.Person_Name) || '未知'} - 库存ID: ${item.Inventory_ID}`;
    },

    formatPersonDesc(item) {
      const inventoryId = `库存ID: ${item.Inventory_ID}`;
      const remark = `备注: ${item.Remark || '无'}`;
      return `${inventoryId}\n${remark}`;
    },


    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
  }
};
</script>

<style scoped>
.filter-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5px 15px;
  font-size: 12px;
  color: #666;
  border-radius: 10px;
}

.filter-item.active {
  background-color: #1989fa;
  color: white;
}

.filter-item van-icon {
  font-size: 16px;
  margin-bottom: 2px;
}

.filter-tags-container {
  background: white;
  margin-bottom: 10px;
}

.filter-tags-container ::v-deep .van-tabs__wrap {
  height: 40px;
}

.filter-tags-container ::v-deep .van-tab {
  font-size: 12px;
  padding: 0 8px;
}
.card-desc {
  margin-bottom: 8px;
}
.page-container {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.share-tabs {
  margin-top: 0;
}

.cards-container {
  padding: 10px 2.5%; /* 2.5%的左右padding实现95%宽度 */
}

.share-card {
  margin-bottom: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 16px; /* 更加圆润 */
  overflow: hidden;
  background: linear-gradient(135deg, #ffffff, #f8f9fa); /* 渐变背景 */
  transition: transform 0.3s ease, box-shadow 0.3s ease; /* 添加过渡效果 */
  box-shadow: 0 5px 10px rgba(69, 125, 222, 0.6); /* 改为淡蓝色阴影 */
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

.share-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.1); /* 半透明白色遮罩 */
  z-index: 1;
}

.share-card >>> .van-card__content {
  position: relative;
  z-index: 2;
}

.share-card >>> .van-card__header {
  position: relative;
  z-index: 2;
}

.share-card >>> .van-card__body {
  position: relative;
  z-index: 2;
}

.share-card >>> .van-card__footer {
  position: relative;
  z-index: 2;
}

.share-card >>> .van-card__title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.share-card >>> .van-card__desc {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.share-card:hover {
  transform: translateY(-2px); /* 悬停时轻微上移 */
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.van-card__thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 12px; /* 缩略图也更加圆润 */
}

.van-card__footer .van-button {
  font-size: 12px;
  padding: 0 12px;
  height: 30px;
  margin-left: 8px;
}

.van-tag {
  border-radius: 8px; /* 标签也更加圆润 */
}
</style>
