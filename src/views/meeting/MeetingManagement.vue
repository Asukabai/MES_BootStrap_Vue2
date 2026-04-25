<template>
  <div class="meeting-page">
    <!-- 页面顶部搜索区域 -->
    <div class="search-section search-top">
      <div class="search-container">
        <!-- 搜索输入框 -->
        <van-field
          v-model="searchValue"
          placeholder="请输入会议名称关键词"
          class="search-input"
          inputmode="search"
          enterkeyhint="search"
        />
        <!-- 搜索按钮 -->
        <van-button
          type="info"
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
            v-model="filter.meetingType"
            :options="meetingTypeOptions"
            @change="onFilterChange"
          />
          <van-dropdown-item
            v-model="filter.dateRange"
            :options="dateRangeOptions"
            @change="onFilterChange"
          />
        </van-dropdown-menu>
      </div>
    </div>

    <!-- 结果列表 -->
    <div class="results-section">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model="loading"
          :finished="finished"
          :finished-text="`共有 ${total} 条会议记录，没有更多了`"
          @load="onLoadMore"
        >
          <van-cell
            v-for="(item, index) in list"
            :key="item.Id"
            class="meeting-cell"
            @click="toggleExpand(index)"
          >
            <div class="cell-content">
              <!-- 卡片头部 - 主要信息 -->
              <div class="cell-header">
                <div class="item-title">{{ item.Meeting_Name }}</div>
                <div class="item-type">会议类型：{{ item.Meeting_Type }}</div>
                <div class="item-time">会议时间：{{ formatDate(item.Meeting_Date) }}</div>
                <div class="item-address">会议地点：{{ item.Meeting_Address || '线上' }}</div>
                <div class="item-initiator">发起人：{{ item.Meeting_Initiator.Person_Name }}（{{ item.Meeting_Initiator.Person_Department }}）</div>

                <!-- 展开/收起按钮和视频会议按钮 -->
                <div class="expand-btn-wrapper">
                  <div class="expand-btn" @click.stop="toggleExpand(index)">
                    {{ expandedIndex === index ? '收起详情' : '展开详情' }}
                    <van-icon :name="expandedIndex === index ? 'up' : 'down'" />
                  </div>
                  <div class="video-btn" @click.stop="joinVideoMeeting(item)">
                    视频会议
                    <van-icon name="photograph" />
                  </div>
                </div>
              </div>

              <!-- 展开后的详细信息 -->
              <div v-if="expandedIndex === index" class="detail-section">
                <van-divider>会议描述</van-divider>
                <div class="description-content">{{ item.Meeting_Description || '无' }}</div>

                <van-divider v-if="item.Meeting_Link">会议链接</van-divider>
                <div v-if="item.Meeting_Link" class="link-content" @click.stop="copyMeetingLink(item.Meeting_Link)">
                  <van-icon name="link" />
                  <span>{{ item.Meeting_Link }}</span>
                  <van-icon name="copy" style="margin-left: auto;" />
                </div>

                <van-divider>参会人员（{{ item.Meeting_Participant ? item.Meeting_Participant.length : 0 }}人）</van-divider>
                <div class="participant-list">
                  <van-tag
                    v-for="participant in item.Meeting_Participant"
                    :key="participant.Person_DingID"
                    type="primary"
                    plain
                    class="participant-tag"
                  >
                    {{ participant.Person_Name }}（{{ participant.Person_Department }}）
                  </van-tag>
                </div>

                <van-divider>会议元信息</van-divider>
                <div class="meta-info">
                  <div class="meta-row">创建时间：{{ formatTimestamp(item.Ts_create) }}</div>
                  <div class="meta-row">最后编辑：{{ formatTimestamp(item.Ts_edit) }}</div>
                  <div class="meta-row">会议 ID：{{ item.Id }}</div>
                  <div class="meta-row">周次显示：{{ item.Week_Display }}</div>
                </div>
              </div>
            </div>
          </van-cell>
        </van-list>

        <!-- 空状态 -->
        <div v-if="hasSearched && list.length === 0 && !loading" class="empty-state">
          <van-empty description="暂无相关会议信息" />
        </div>
      </van-pull-refresh>
    </div>

    <CustomizableFloatingButton
      :initial-position="{ bottom: 100, right: 20 }"
      :icon-src="require('@/assets/返回.png')"
      :background-size="49"
      :icon-size="49"
      :on-click="goBack"
    />

    <!--    <CustomizableFloatingButton-->
    <!--      :initial-position="{ bottom: 70, right: 20 }"-->
    <!--      :icon-src="require('@/assets/新增图标.png')"-->
    <!--      :background-size="49"-->
    <!--      :icon-size="49"-->
    <!--      :on-click="onFloatingButtonClick"-->
    <!--    />-->
  </div>
</template>

<script>
import { Toast } from 'vant';
import SensorRequestPage from '../../utils/SensorRequestPage.js';
import CustomizableFloatingButton from "../../components/CustomizableFloatingButton.vue";
import {GetDingUserToken} from "../../utils/Dingding";
import MqttService from "../../services/MqttService";

export default {
  name: 'MeetingManagement',
  components: {
    CustomizableFloatingButton
  },
  data() {
    return {
      isNavigating: false,
      searchValue: '',
      hasSearched: false,
      expandedIndex: null,
      filter: {
        meetingType: '',
        dateRange: ''
      },
      meetingTypeOptions: [
        { text: '全部类型', value: '' },
        { text: '周例会', value: '周例会' },
        { text: '评审会', value: '评审会' },
        { text: '内部讨论', value: '内部讨论' },
        { text: '评审会议', value: '评审会议' }
      ],
      dateRangeOptions: [
        { text: '全部时间', value: '' },
        { text: '本周', value: 'week' },
        { text: '本月', value: 'month' },
        { text: '最近三月', value: 'threeMonths' }
      ],
      list: [],
      loading: false,
      refreshing: false,
      finished: false,
      allData: [],
      currentPage: 1,
      pageSize: 10,
      total: 0
    };
  },
  created() {
    this.onLoad();
  },
  methods: {
    goBack() {
      this.navigateTo('/index');
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
      this.navigateTo('/meetingAdd');
      setTimeout(() => {
        this.isNavigating = false;
      }, 10);
    },

    onLoad() {
      this.fetchMeetingList();
    },

    fetchMeetingList() {
      return new Promise((resolve) => {
        this.loading = true;
        const param = {
          PageIndex: this.currentPage - 1,
          PageSize: this.pageSize
        };
        SensorRequestPage.MeetingInfoGetFunPage(
          JSON.stringify(param),
          (respData) => {
            try {
              const response = JSON.parse(respData);
              if (response.Data && Array.isArray(response.Data)) {
                const newData = response.Data;
                
                if (this.currentPage === 1) {
                  this.list = newData;
                  this.allData = newData;
                } else {
                  // 防止重复添加相同 ID 的项目
                  const newItems = newData.filter(newItem =>
                    !this.list.some(existingItem => existingItem.Id === newItem.Id)
                  );
                  this.list = [...this.list, ...newItems];
                  this.allData = [...this.allData, ...newItems];
                }
                
                // 根据返回的数据判断是否还有更多数据
                this.finished = newData.length < this.pageSize;
                this.currentPage++;
                
                // 更新总记录数
                if (response.TotalCount !== undefined) {
                  this.total = response.TotalCount;
                }
                
                this.hasSearched = true;
              } else {
                if (this.currentPage === 1) {
                  this.list = [];
                  this.allData = [];
                }
                this.finished = true;
                if (this.currentPage === 1) {
                  this.$toast.fail('数据格式错误');
                }
              }
            } catch (parseError) {
              console.error('解析会议信息响应失败:', parseError);
              this.$toast.fail('数据解析失败');
              if (this.currentPage === 1) {
                this.list = [];
                this.allData = [];
              }
            } finally {
              this.loading = false;
              this.refreshing = false;
              resolve();
            }
          },
          (error) => {
            console.error('获取会议信息失败:', error);
            this.$toast.fail('获取会议信息失败');
            this.loading = false;
            this.refreshing = false;
            this.finished = true;
            resolve();
          }
        );
      });
    },
    toggleExpand(index) {
      if (this.expandedIndex === index) {
        this.expandedIndex = null;
      } else {
        this.expandedIndex = index;
      }
    },

    joinVideoMeeting(item) {
      // ✅ 第一步：获取一次性密钥
      SensorRequestPage.Ding_GetOnceToken("",
        (onceToken) => {
          try {
            console.log('获取到钉钉一次性密钥:', onceToken);
            if (!onceToken || typeof onceToken !== 'string') {
              this.$toast.fail('获取一次性密钥失败');
              return;
            }
            // ✅ 第二步：构建会议参数
            const param = {
              Meeting_Name: item.Meeting_Name,
              Meeting_Description: item.Meeting_Description,
              Meeting_Type: item.Meeting_Type,
              Meeting_Address: item.Meeting_Address,
              Meeting_Link: item.Meeting_Link,
              Meeting_Date: item.Meeting_Date,
              Week_Display: item.Week_Display,
              Meeting_Initiator: item.Meeting_Initiator,
              Meeting_Participant: item.Meeting_Participant,
              Id: item.Id,
              Uuid: item.Uuid,
              Ts_create: item.Ts_create,
              Ts_edit: item.Ts_edit,
              Logic_del: item.Logic_del
            };

            console.log('请求视频会议 Token，参数:', param);

            // ✅ 第三步：获取视频会议链接
            SensorRequestPage.Ding_GetMeetingToken(
              JSON.stringify(param),
              (respData) => {
                try {
                  console.log('获取视频会议 Token 成功，响应:', respData);
                  const meetingUrl = respData;

                  if (meetingUrl && typeof meetingUrl === 'string') {
                    console.log('从 URL 中提取的 data 内容:', meetingUrl);

                    // ✅ 第四步：跳转页面时携带一次性密钥和发起人（会议主持人）信息
                    const initiatorParam = encodeURIComponent(JSON.stringify(item.Meeting_Initiator));
                    
                    // 检测设备类型，根据设备类型跳转到不同的视频会议组件
                    // 检测是否为PC端（Windows、Macintosh、Linux）
                    const isPC = /Windows|Macintosh|Linux/i.test(navigator.userAgent);
                    const routePath = isPC ? '/videoMeeting' : '/videoMeetingMobile';
                    
                    this.navigateTo(`${routePath}?data=${encodeURIComponent(meetingUrl)}&onceToken=${encodeURIComponent(onceToken)}&initiator=${initiatorParam}`);

                    console.log('跳转至视频会议页面1，参数:', meetingUrl);
                    console.log('跳转至视频会议页面2，参数:', item.Meeting_Name);
                    console.log('跳转至视频会议页面3，参数拼接规则:', `${routePath}?data=${encodeURIComponent(meetingUrl)}&onceToken=${encodeURIComponent(onceToken)}&initiator=${initiatorParam}`);
                    console.log('跳转至视频会议页面4，发起人信息:', item.Meeting_Initiator);
                    console.log('设备类型:', isPC ? 'PC端' : '移动端');
                    console.log('跳转路径:', routePath);
                  } else {
                    this.$toast.fail('获取会议链接失败');
                  }
                } catch (parseError) {
                  console.error('解析视频会议响应失败:', parseError);
                  this.$toast.fail('数据解析失败');
                }
              },
              (error) => {
                console.error('获取视频会议 Token 失败:', error);
                this.$toast.fail('获取会议链接失败');
              }
            );
          } catch (error) {
            console.error('处理一次性密钥失败:', error);
            this.$toast.fail('获取会议信息失败');
          }
        },
        (error) => {
          console.error('获取一次性密钥失败:', error);
          this.$toast.fail('获取一次性密钥结果失败 ：'+ error);
        }
      );
    },

    copyMeetingLink(link) {
      if (!link) return;

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(link)
          .then(() => {
            this.$toast.success('会议链接已复制');
          })
          .catch(() => {
            this.$toast.fail('复制失败');
          });
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.$toast.success('会议链接已复制');
      }
    },

    onSearch() {
      if (this.searchValue || this.filter.meetingType || this.filter.dateRange) {
        this.hasSearched = true;
        this.currentPage = 1;
        this.list = [];
        this.finished = false;
        this.filterData();
      } else {
        Toast('请输入搜索关键词或选择筛选条件');
      }
    },

    onFilterChange() {
      this.hasSearched = true;
      this.currentPage = 1;
      this.list = [];
      this.finished = false;
      this.filterData();
    },

    onReset() {
      this.searchValue = '';
      this.filter = {
        meetingType: '',
        dateRange: ''
      };
      this.hasSearched = false;
      this.expandedIndex = null;
      this.currentPage = 1;
      this.list = [];
      this.finished = false;
      this.fetchMeetingList();
    },

    filterData() {
      let filtered = this.allData;

      if (this.searchValue) {
        filtered = filtered.filter(item =>
          item.Meeting_Name && item.Meeting_Name.includes(this.searchValue)
        );
      }

      if (this.filter.meetingType) {
        filtered = filtered.filter(item =>
          item.Meeting_Type === this.filter.meetingType
        );
      }

      if (this.filter.dateRange) {
        const now = new Date();
        let startDate;

        switch (this.filter.dateRange) {
          case 'week':
            startDate = new Date();
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate = new Date();
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'threeMonths':
            startDate = new Date();
            startDate.setMonth(now.getMonth() - 3);
            break;
          default:
            startDate = null;
        }

        if (startDate) {
          filtered = filtered.filter(item => {
            const meetingDate = new Date(item.Meeting_Date);
            return meetingDate >= startDate;
          });
        }
      }

      this.list = filtered;
      this.expandedIndex = null;
    },

    onRefresh() {
      this.currentPage = 1;
      this.list = [];
      this.finished = false;
      this.fetchMeetingList().then(() => {
        this.refreshing = false;
      });
    },

    onLoadMore() {
      if (this.finished) return;
      this.fetchMeetingList();
    },

    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },

    formatTimestamp(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  }
};
</script>

<style scoped>
.meeting-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

.search-section {
  background: #fff;
  padding: 15px;
  margin-bottom: 10px;
}

.search-container {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.search-input {
  flex: 1;
}

.search-btn {
  width: 80px;
}

.reset-btn {
  width: 80px;
}

.filter-container {
  margin-top: 10px;
}

.results-section {
  padding: 0 10px;
  height: calc(100vh - 200px);
  overflow-y: auto;
}

.meeting-cell {
  margin-bottom: 10px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.meeting-cell:active {
  background: #f8f8f8;
}

.cell-content {
  padding: 16px;
}

.cell-header {
  margin-bottom: 12px;
}

.item-title {
  font-size: 17px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  line-height: 1.4;
}

.item-type,
.item-time,
.item-address,
.item-initiator {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
  line-height: 1.5;
}

.expand-btn-wrapper {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.expand-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: #3f83f8;
  color: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: bold;
  transition: all 0.3s ease;
  cursor: pointer;
}

.expand-btn:active {
  transform: scale(0.98);
  opacity: 0.9;
}

.video-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: #3f83f8;
  color: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: bold;
  transition: all 0.3s ease;
  cursor: pointer;
}

.video-btn:active {
  transform: scale(0.98);
  opacity: 0.9;
}

.detail-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px dashed #e8e8e8;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.description-content {
  white-space: pre-wrap;
  line-height: 1.8;
  color: #555;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  font-size: 14px;
}

.link-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #e6f7ff;
  border-radius: 8px;
  color: #1890ff;
  font-size: 13px;
  word-break: break-all;
  cursor: pointer;
  transition: all 0.2s ease;
}

.link-content:active {
  background: #bae7ff;
}

.participant-list {
  padding: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.participant-tag {
  font-size: 12px;
  padding: 4px 10px;
}

.meta-info {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  font-size: 12px;
  color: #999;
}

.meta-row {
  margin-bottom: 6px;
  line-height: 1.6;
}

.meta-row:last-child {
  margin-bottom: 0;
}

.empty-state {
  padding: 60px 0;
}

.finished-text {
  text-align: center;
  padding: 16px;
  color: #999;
  font-size: 14px;
}
</style>
