<template>
  <div class="chat-page">
    <!-- 联系人列表 -->
    <div class="contact-list-container">
      <van-pull-refresh
        v-model="refreshing"
        @refresh="onRefresh"
        success-text="刷新成功"
      >
        <van-list
          v-model="loading"
          :finished="finished"
          :finished-text="contacts.length ? '没有更多了' : ''"
          @load="loadContacts"
          class="contact-list"
        >
          <van-skeleton
            v-if="skeletonLoading && contacts.length === 0"
            title
            :row="5"
            avatar
            avatar-size="40px"
            avatar-shape="round"
          />

          <template v-else>
            <van-cell
              v-for="contact in filteredContacts"
              :key="contact.id"
              @click="enterChat(contact)"
              :class="{ 'unread-item': contact.unread > 0 }"
            >
              <template #title>
                <div class="contact-item">
                  <van-image
                    :src="contact.avatar"
                    round
                    width="50px"
                    height="50px"
                    class="contact-avatar"
                    :show-loading="true"
                    loading-icon="user-circle-o"
                  />
                  <div class="contact-info">
                    <div class="contact-header">
                      <div class="contact-name">{{ contact.name }}</div>
                      <div class="contact-time">{{ formatTime(contact.time) }}</div>
                    </div>
                    <div class="contact-footer">
                      <div class="contact-last-message">
                        <van-icon
                          v-if="contact.lastMessageType === 'image'"
                          name="photo-o"
                          size="14"
                        />
                        <span v-else>{{ contact.lastMessage }}</span>
                      </div>
                      <div class="contact-meta">
                        <van-badge
                          v-if="contact.unread > 0"
                          :content="contact.unread > 99 ? '99+' : contact.unread"
                          max="99"
                          :show-zero="false"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </van-cell>
          </template>
        </van-list>
      </van-pull-refresh>
    </div>

    <!-- 空状态 -->
    <van-empty
      v-if="!loading && contacts.length === 0 && !skeletonLoading"
      description="暂无群聊，请点击 + 创建群聊"
    >
    </van-empty>
    <!-- 添加悬浮按钮 -->
    <FloatingActionButton
      @click="navigateToCreateGroup"
      :initial-position="{ bottom: 80, right: 20 }"
    />
  </div>
</template>

<script>
import { Toast } from 'vant';
import SensorRequest from '../../utils/SensorRequest';
import FloatingActionButton from "../../components/FloatingActionButton.vue";

export default {
  name: 'ChatPage',
  components: {FloatingActionButton},
  props: {
    department: {
      type: String,
      default: '部门'
    }
  },
  data() {
    return {
      searchValue: '',
      userSearch: '',
      showCreateRoom: false,
      loading: false,
      finished: false,
      refreshing: false,
      skeletonLoading: true,
      selectedUserIds: [],
      selectedUsers: [],
      contacts: [],
      allUsers: []
    };
  },
  computed: {
    filteredContacts() {
      if (!this.searchValue) {
        return this.contacts;
      }
      return this.contacts.filter(contact =>
        contact.name.toLowerCase().includes(this.searchValue.toLowerCase())
      );
    },
  },
  mounted() {
    this.loadContacts();
    this.loadAllUsers();
  },
  methods: {
    navigateToCreateGroup() {
      this.$router.push(`/${this.$route.params.department}/chat/createGroup`);
    },
    formatTime(timeString) {
      const time = new Date(timeString);
      const now = new Date();
      const diff = now - time;

      if (diff < 3600000) { // 1小时内
        const minutes = Math.floor(diff / 60000);
        return minutes < 1 ? '刚刚' : `${minutes}分钟前`;
      } else if (diff < 86400000) { // 24小时内
        return time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      } else if (diff < 604800000) { // 7天内
        const days = Math.floor(diff / 86400000);
        return `${days}天前`;
      } else {
        return time.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      }
    },
    loadContacts() {
      this.loading = true;

      // 调用后端接口获取聊天列表数据
      SensorRequest.Talk_GetUserRoom(
        JSON.stringify({}), // 请求参数，可根据实际接口要求调整
        (response) => {
          // 成功回调
          try {
            const respData = JSON.parse(response) || {}
            console.log("📂 解析出的聊天页面返回数据 respData:", respData)

            // 根据实际返回的数据结构调整映射逻辑
            if (Array.isArray(respData)) {
              this.contacts = respData.map(item => ({
                id: item.roomIndex ,
                name: item.roomCaption || item.roomNickname || '未知聊天室',
                avatar: item.roomPng || require('@/assets/群聊.png'),
                lastMessage: item.lastMsgCaption || '暂无消息',
                lastMessageType: 'text',
                time: item.dtLastMsg || new Date().toISOString(),
                roomIndex: item.roomIndex, // ✅ 显式添加 roomIndex 字段
                unread: item.waitMsgCnt || 0
              }));
            } else {
              console.warn('返回数据格式不符合预期:', respData);
              this.contacts = [];
            }
          } catch (error) {
            console.error('处理聊天列表数据时出错:', error);
            this.contacts = [];
          }

          this.loading = false;
          this.finished = true;
          this.skeletonLoading = false;
          this.refreshing = false;
        },
        (error) => {
          // 失败回调
          console.error('获取聊天列表失败:', error);
          Toast.fail('获取聊天列表失败');
          this.contacts = [];
          this.loading = false;
          this.finished = true;
          this.skeletonLoading = false;
          this.refreshing = false;
        }
      );
    },
    loadAllUsers() {
      // 这里可以根据实际需求调用获取所有用户的接口
      // 示例数据，实际应从接口获取
      this.allUsers = [
        { id: 1, name: '张三', avatar: 'https://img.yzcdn.cn/vant/cat.jpeg', department: '技术部' },
        { id: 2, name: '李四', avatar: 'https://img.yzcdn.cn/vant/dog.jpeg', department: '产品部' },
        { id: 3, name: '王五', avatar: 'https://img.yzcdn.cn/vant/cat.jpeg', department: '设计部' },
        { id: 4, name: '赵六', avatar: 'https://img.yzcdn.cn/vant/dog.jpeg', department: '运营部' },
        { id: 5, name: '钱七', avatar: 'https://img.yzcdn.cn/vant/cat.jpeg', department: '技术部' },
        { id: 6, name: '孙八', avatar: 'https://img.yzcdn.cn/vant/dog.jpeg', department: '市场部' }
      ];
    },
    onRefresh() {
      this.refreshing = true;
      this.finished = false;
      this.loadContacts();
    },
    enterChat(contact) {
      // 进入聊天时清除未读
      contact.unread = 0;
      this.$router.push({
        path: `/${this.$route.params.department}/chatDetail/${contact.id}`,
        query: { contact: JSON.stringify(contact) } // 将 contact 对象作为 query 参数传递
      });
    },
    goBack() {
      this.$router.go(-1);
    }
  }
};
</script>

<style scoped>
.chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f7f8fa;
}

.search-container {
  padding: 8px 12px;
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.contact-list-container {
  flex: 1;
  overflow: hidden;
}

.contact-list {
  min-height: 100%;
}

.unread-item {
  background-color: #f9f9f9;
}

.contact-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
}

.contact-avatar {
  margin-right: 12px;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.contact-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.contact-time {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.contact-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.contact-last-message {
  font-size: 14px;
  color: #666;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.contact-last-message .van-icon {
  vertical-align: middle;
  margin-right: 4px;
}

.empty-button {
  width: 160px;
  margin-top: 20px;
}

.create-room-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.user-search {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.selected-users {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background-color: #fafafa;
}

.selected-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.user-tag {
  border-radius: 16px;
}

.user-list {
  flex: 1;
  overflow-y: auto;
}

.user-item {
  display: flex;
  align-items: center;
}

.user-avatar {
  margin-right: 12px;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.user-department {
  font-size: 12px;
  color: #999;
}

.popup-footer {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
