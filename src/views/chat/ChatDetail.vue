<template>
  <div class="chat-detail">

    <!-- 消息区域 -->
    <div class="message-container" ref="messageContainer">
      <!-- 日期分隔线 -->
      <div class="date-divider" v-if="showDateDivider">
        <span>今天</span>
      </div>

      <!-- 消息列表 -->
      <div
        v-for="(message, index) in messages"
        :key="message.id"
        :class="['message-item', message.isMe ? 'message-mine' : 'message-other']"
      >
        <!-- 时间显示 -->
        <div
          v-if="shouldShowTime(message, index)"
          class="message-time"
        >
          {{ formatMessageTime(message.timestamp) }}
        </div>

        <div class="message-bubble-wrapper">
          <!-- 对方消息 -->
          <div v-if="!message.isMe" class="message-other">
            <van-image
              :src="contactAvatar"
              round
              width="36px"
              height="36px"
              class="message-avatar"
              @click="showUserInfo(currentContact)"
            />
            <div class="message-content-wrapper">
              <div
                v-if="message.senderName"
                class="sender-name"
              >
                {{ message.senderName }}
              </div>
              <div
                class="message-content"
                :class="{ 'message-loading': message.status === 'sending' }"
              >
                <template v-if="message.type === 'text'">
                  {{ message.content }}
                </template>
                <van-image
                  v-else-if="message.type === 'image'"
                  :src="message.content"
                  width="200px"
                  height="150px"
                  fit="cover"
                  radius="8px"
                  @click="previewImage(message.content)"
                />
              </div>
              <div class="message-status">
                <van-icon
                  v-if="message.status === 'sending'"
                  name="clock-o"
                  size="12"
                  color="#ccc"
                />
                <van-icon
                  v-else-if="message.status === 'error'"
                  name="warning-o"
                  size="12"
                  color="#ff4444"
                />
              </div>
            </div>
          </div>

          <!-- 我的消息 -->
          <div v-else class="message-mine">
            <div class="message-content-wrapper">
              <div class="message-status">
                <van-icon
                  v-if="message.status === 'sending'"
                  name="clock-o"
                  size="12"
                  color="#ccc"
                />
                <van-icon
                  v-else-if="message.status === 'error'"
                  name="warning-o"
                  size="12"
                  color="#ff4444"
                />
                <van-icon
                  v-else-if="message.status === 'sent'"
                  name="passed"
                  size="12"
                  color="#ccc"
                />
                <van-icon
                  v-else-if="message.status === 'read'"
                  name="eye-o"
                  size="12"
                  color="#07c160"
                />
              </div>
              <div
                class="message-content"
                :class="{ 'message-loading': message.status === 'sending' }"
              >
                <template v-if="message.type === 'text'">
                  {{ message.content }}
                </template>
                <van-image
                  v-else-if="message.type === 'image'"
                  :src="message.content"
                  width="200px"
                  height="150px"
                  fit="cover"
                  radius="8px"
                  @click="previewImage(message.content)"
                />
              </div>
            </div>
            <van-image
              src="https://img.yzcdn.cn/vant/cat.jpeg"
              round
              width="36px"
              height="36px"
              class="message-avatar"
            />
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div class="load-more" v-if="hasMoreMessages">
        <van-button
          size="small"
          type="primary"
          plain
          @click="loadMoreMessages"
          :loading="loadingMore"
        >
          加载更多消息
        </van-button>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-tools">
        <van-icon
          name="smile-o"
          size="22"
          @click="toggleEmoji"
        />
        <van-icon
          name="photo-o"
          size="22"
          @click="chooseImage"
        />
        <van-icon
          name="camera-o"
          size="22"
          @click="takePhoto"
        />
        <van-icon
          name="plus"
          size="22"
          @click="showMoreTools"
        />
      </div>

      <div class="input-container">
        <van-field
          v-model="messageText"
          rows="1"
          autosize
          type="textarea"
          maxlength="500"
          placeholder="请输入消息..."
          class="message-input"
          @keyup.enter="sendMessage"
          @focus="scrollToBottom"
          ref="messageInput"
        >
          <template #extra>
            <div class="input-extra">
              <span class="text-count">{{ messageText.length }}/500</span>
              <van-button
                type="primary"
                size="small"
                class="send-button"
                :disabled="!canSend"
                @click="sendMessage"
              >
                发送
              </van-button>
            </div>
          </template>
        </van-field>
      </div>
    </div>

    <!-- 动作面板 -->
    <van-action-sheet
      v-model="showActionSheet"
      :actions="actionActions"
      @select="onActionSelect"
      close-on-click-action
    />

    <!-- 图片预览 -->
    <van-image-preview
      v-model="showImagePreview"
      :images="previewImages"
    />
  </div>
</template>

<script>
import { Toast, ImagePreview } from 'vant';

export default {
  name: 'ChatDetail',
  props: {
    contactId: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      messageText: '',
      loadingMore: false,
      hasMoreMessages: true,
      showActionSheet: false,
      showImagePreview: false,
      previewImages: [],
      showDateDivider: true,
      currentContact: {
        id: this.contactId,
        name: '聊天对象',
        avatar: 'https://img.yzcdn.cn/vant/cat.jpeg'
      },
      actionActions: [
        { name: '用户信息', icon: 'user-o' },
        { name: '清空聊天记录', icon: 'delete-o', color: '#ff4444' },
        { name: '举报', icon: 'warning-o' },
        { name: '取消', icon: 'close' }
      ],
      messages: []
    };
  },
  computed: {
    currentContactName() {
      return this.currentContact ? this.currentContact.name : '聊天';
    },
    contactAvatar() {
      return this.currentContact ? this.currentContact.avatar || 'https://img.yzcdn.cn/vant/cat.jpeg' : 'https://img.yzcdn.cn/vant/cat.jpeg';
    },
    canSend() {
      return this.messageText.trim().length > 0;
    }
  },
  mounted() {
    this.loadMessages();
    this.scrollToBottom();

    // 开始模拟接收消息
    this.messageInterval = this.simulateNewMessage();

    // 自动聚焦输入框
    setTimeout(() => {
      if (this.$refs.messageInput) {
        this.$refs.messageInput.focus();
      }
    }, 300);
  },
  updated() {
    this.scrollToBottom();
  },
  beforeDestroy() {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
    }
  },
  methods: {
    loadMessages() {
      const mockMessages = [
        {
          id: 1,
          content: '你好，在吗？',
          type: 'text',
          isMe: false,
          senderName: '张三',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'read'
        },
        {
          id: 2,
          content: '在的，有什么事吗？',
          type: 'text',
          isMe: true,
          timestamp: new Date(Date.now() - 3500000).toISOString(),
          status: 'read'
        },
        {
          id: 3,
          content: '想问一下项目的进度怎么样了？',
          type: 'text',
          isMe: false,
          senderName: '张三',
          timestamp: new Date(Date.now() - 3400000).toISOString(),
          status: 'read'
        },
        {
          id: 4,
          content: '基本完成了，就等测试了。',
          type: 'text',
          isMe: true,
          timestamp: new Date(Date.now() - 3300000).toISOString(),
          status: 'read'
        },
        {
          id: 5,
          content: '太好了！这是设计稿的截图。',
          type: 'text',
          isMe: false,
          senderName: '张三',
          timestamp: new Date(Date.now() - 3200000).toISOString(),
          status: 'read'
        },
        {
          id: 6,
          content: 'https://img.yzcdn.cn/vant/cat.jpeg',
          type: 'image',
          isMe: false,
          senderName: '张三',
          timestamp: new Date(Date.now() - 3100000).toISOString(),
          status: 'read'
        }
      ];

      this.messages = mockMessages;
    },
    formatMessageTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    shouldShowTime(message, index) {
      if (index === 0) return true;

      const prevMessage = this.messages[index - 1];
      const currentTime = new Date(message.timestamp);
      const prevTime = new Date(prevMessage.timestamp);

      // 如果两条消息间隔超过5分钟，显示时间
      return (currentTime - prevTime) > 300000;
    },
    async sendMessage() {
      if (!this.canSend) return;

      const content = this.messageText.trim();
      const tempId = Date.now();

      // 创建临时消息（显示发送中状态）
      const tempMessage = {
        id: tempId,
        content: content,
        type: 'text',
        isMe: true,
        timestamp: new Date().toISOString(),
        status: 'sending'
      };

      this.messages.push(tempMessage);
      this.messageText = '';

      // 滚动到底部
      this.$nextTick(() => {
        this.scrollToBottom();
      });

      // 模拟发送到服务器
      setTimeout(() => {
        const messageIndex = this.messages.findIndex(msg => msg.id === tempId);
        if (messageIndex !== -1) {
          // 更新消息状态为已发送
          this.messages.splice(messageIndex, 1, {
            ...this.messages[messageIndex],
            id: Date.now() + 1,
            status: 'sent'
          });
        }

        // 模拟对方回复（仅测试用）
        setTimeout(() => {
          const replyMessage = {
            id: Date.now(),
            content: '收到消息了！',
            type: 'text',
            isMe: false,
            senderName: this.currentContact.name,
            timestamp: new Date().toISOString(),
            status: 'read'
          };
          this.messages.push(replyMessage);
          this.scrollToBottom();
        }, 1000);
      }, 500);
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messageContainer;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    },
    loadMoreMessages() {
      this.loadingMore = true;

      setTimeout(() => {
        const newMessages = [
          {
            id: this.messages.length + 1,
            content: '这是更早的消息1',
            type: 'text',
            isMe: false,
            senderName: this.currentContact.name,
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            status: 'read'
          },
          {
            id: this.messages.length + 2,
            content: '这是更早的消息2',
            type: 'text',
            isMe: true,
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            status: 'read'
          }
        ];

        this.messages = [...newMessages, ...this.messages];
        this.loadingMore = false;
        this.hasMoreMessages = false;
      }, 1000);
    },
    chooseImage() {
      Toast('选择图片功能需要调用原生API');
    },
    takePhoto() {
      Toast('拍照功能需要调用原生API');
    },
    previewImage(imageUrl) {
      this.previewImages = [imageUrl];
      this.showImagePreview = true;
    },
    toggleEmoji() {
      Toast('表情功能暂未实现');
    },
    showMoreTools() {
      Toast('更多工具暂未实现');
    },
    onActionSelect(action) {
      switch (action.name) {
        case '用户信息':
          Toast('显示用户信息');
          break;
        case '清空聊天记录':
          if (confirm('确定要清空聊天记录吗？')) {
            this.messages = [];
            Toast('聊天记录已清空');
          }
          break;
        case '举报':
          Toast('已提交举报');
          break;
      }
      this.showActionSheet = false;
    },
    showUserInfo(user) {
      Toast(`查看 ${user.name} 的信息`);
    },
    simulateNewMessage() {
      // 每30秒接收一条模拟消息
      return setInterval(() => {
        if (Math.random() > 0.7) { // 30%概率接收消息
          const newMessage = {
            id: Date.now(),
            content: '这是自动回复的消息',
            type: 'text',
            isMe: false,
            senderName: this.currentContact.name,
            timestamp: new Date().toISOString(),
            status: 'read'
          };
          this.messages.push(newMessage);
          this.scrollToBottom();
        }
      }, 30000);
    },
    goBack() {
      this.$router.go(-1);
    }
  }
};
</script>

<style scoped>
.chat-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f7f8fa;
}

.message-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%);
  position: relative;
}

.date-divider {
  text-align: center;
  margin: 20px 0;
}

.date-divider span {
  display: inline-block;
  padding: 4px 16px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  font-size: 12px;
  color: #666;
}

.message-item {
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.message-time {
  text-align: center;
  margin: 12px 0;
  font-size: 12px;
  color: #999;
}

.message-bubble-wrapper {
  display: flex;
  flex-direction: column;
}

.message-other {
  display: flex;
  align-items: flex-start;
}

.message-mine {
  display: flex;
  align-items: flex-start;
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
  margin: 0 8px;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.message-content-wrapper {
  max-width: 70%;
  display: flex;
  flex-direction: column;
}

.sender-name {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  margin-left: 8px;
}

.message-content {
  position: relative;
  padding: 12px 16px;
  border-radius: 18px;
  word-break: break-word;
  line-height: 1.5;
  font-size: 16px;
  animation: fadeIn 0.3s ease;
}

.message-other .message-content {
  background-color: #fff;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.message-mine .message-content {
  background: linear-gradient(135deg, #95ec69 0%, #6dd400 100%);
  color: #fff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 8px rgba(149, 236, 105, 0.3);
}

.message-loading {
  opacity: 0.7;
}

.message-status {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  min-height: 20px;
}

.message-other .message-status {
  justify-content: flex-start;
}

.message-mine .message-status {
  justify-content: flex-end;
}

.load-more {
  text-align: center;
  padding: 16px 0;
}

.input-area {
  background-color: #fff;
  border-top: 1px solid #e8e8e8;
  padding: 8px 12px;
}

.input-tools {
  display: flex;
  align-items: center;
  padding: 8px 0;
  gap: 16px;
}

.input-tools .van-icon {
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}

.input-tools .van-icon:hover {
  color: #1989fa;
}

.input-container {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.message-input {
  flex: 1;
  background-color: #f7f8fa;
  border-radius: 18px;
  padding: 8px 16px;
  min-height: 40px;
  max-height: 120px;
  overflow-y: auto;
}

.message-input >>> .van-field__control {
  font-size: 16px;
  line-height: 1.5;
}

.message-input >>> .van-field__control::-webkit-scrollbar {
  width: 4px;
}

.message-input >>> .van-field__control::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 2px;
}

.input-extra {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

.text-count {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.send-button {
  min-width: 64px;
  height: 32px;
  border-radius: 16px;
  font-weight: 500;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-content {
    max-width: 85%;
    font-size: 15px;
    padding: 10px 14px;
  }

  .message-avatar {
    width: 32px;
    height: 32px;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .chat-detail {
    background-color: #121212;
  }

  .message-container {
    background: linear-gradient(180deg, #1e1e1e 0%, #121212 100%);
  }

  .input-area {
    background-color: #1e1e1e;
    border-top-color: #333;
  }

  .message-other .message-content {
    background-color: #2d2d2d;
    color: #fff;
  }
}
</style>
