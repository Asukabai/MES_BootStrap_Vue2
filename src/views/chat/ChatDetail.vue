<template>
  <div class="chat-detail">
    <!-- 消息区域 -->
    <div class="message-container" ref="messageContainer">
      <!-- 消息列表 -->
      <div
        v-for="(message, index) in sortedMessages"
        :key="message.id"
        :class="['message-item', message.isMe ? 'message-mine' : 'message-other']"
      >
        <!-- 日期分隔线 -->
        <div
          v-if="index > 0 && shouldShowDateSeparator(message, index)"
          class="date-divider"
        >
          <span>{{ formatDateForDisplay(message.timestamp) }}</span>
        </div>

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
              :src="userAvatar"
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
      :closeable="true"
      close-icon="close"
      close-icon-position="top-right"
      :zoom.sync="zoom"
      @scale="onScale"
      @close="onPreviewClose"
    />
  </div>
</template>

<script>
// 移除原来的MqttClient导入
import MqttService from '../../services/MqttService'
import { Toast, ImagePreview } from 'vant'
import SensorRequest from '../../utils/SensorRequest'
import { GetDingUserToken, key_DingName, key_DingUserIndex, key_DingUserPhone } from '../../utils/Dingding.js'

export default {
  name: 'ChatDetail',
  props: {
    contact: {
      type: Object,
      default: null
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
      zoom: 1,
      showDateDivider: true,
      currentContact: {
        id: null,
        name: '聊天对象',
        avatar: 'https://img.yzcdn.cn/vant/cat.jpeg',
        userId: null,
        roomIndex: null
      },
      currentUser: {
        name: '',
        userId: null,
        avatar: 'https://img.yzcdn.cn/vant/cat.jpeg'
      },
      actionActions: [
        { name: '用户信息', icon: 'user-o' },
        { name: '清空聊天记录', icon: 'delete-o', color: '#ff4444' },
        { name: '举报', icon: 'warning-o' },
        { name: '取消', icon: 'close' }
      ],
      messages: [],
      userList: [], // 新增：存储所有用户信息
      unregisterCallback: null, // 用于注销回调的函数
      mqttStatus: 'disconnected', // MQTT连接状态
      isSendingImage: false // 防止重复发送图片
    };
  },
  computed: {
    sortedMessages() {
      // 按照时间戳从小到大排序（旧的时间在前，新的时间在后）
      return [...this.messages].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
    },
    contactAvatar() {
      return this.currentContact ? this.currentContact.avatar || 'https://img.yzcdn.cn/vant/cat.jpeg' : 'https://img.yzcdn.cn/vant/cat.jpeg';
    },
    userAvatar() {
      return this.currentUser.avatar || 'https://img.yzcdn.cn/vant/cat.jpeg';
    },
    canSend() {
      return this.messageText.trim().length > 0 && !this.isSendingImage;
    }
  },

  mounted() {
    // 解析URL参数获取联系人信息
    const queryString = window.location.search;
    const params = new URLSearchParams(queryString);
    const contactStr = params.get('contact');
    if (contactStr) {
      try {
        const parsedContact = JSON.parse(contactStr);
        this.currentContact = {
          ...parsedContact,
          id: parsedContact.roomIndex || parsedContact.id,
          userId: parsedContact.userId,
          roomIndex: parsedContact.roomIndex || parsedContact.id
        };

        // 注册当前聊天室的消息回调
        this.registerMQTTCallback();

      } catch (e) {
        console.error('解析 contact 失败:', e);
      }
    }

    // 从缓存中获取当前用户信息
    this.loadCurrentUser();
    // 新增：先加载用户列表，再加载消息
    this.loadUserList().then(() => {
      this.loadMessages();
    });
    this.scrollToBottom();
    setTimeout(() => {
      if (this.$refs.messageInput) {
        this.$refs.messageInput.focus();
      }
    }, 300);

    // 监听MQTT连接状态
    this.setupMQTTStatusListener();
  },

  updated() {
    this.scrollToBottom();
  },

  beforeDestroy() {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
    }

    console.log('=== ChatDetail beforeDestroy 开始 ===');

    // 注销当前聊天室的消息回调
    if (this.unregisterCallback) {
      this.unregisterCallback();
      console.log('✅ 已注销MQTT回调');
    }

    // 获取MQTT状态
    const status = MqttService.getStatus();
    console.log('离开聊天室时MQTT状态:', status);

    console.log('=== ChatDetail beforeDestroy 结束 ===');
  },

  watch: {
    // 监听当前联系人变化，重新注册回调
    'currentContact.roomIndex'(newRoomIndex, oldRoomIndex) {
      if (newRoomIndex && newRoomIndex !== oldRoomIndex) {
        // 注销旧的，注册新的
        if (this.unregisterCallback) {
          this.unregisterCallback();
        }
        this.registerMQTTCallback();
      }
    }
  },

  methods: {
    /**
     * 注册MQTT回调
     */
    registerMQTTCallback() {
      if (!this.currentContact.roomIndex) {
        console.error('❌ 无法注册MQTT回调：缺少房间ID');
        return;
      }

      console.log(`📞 注册房间 ${this.currentContact.roomIndex} 的MQTT回调`);

      // 注册回调，并保存注销函数
      MqttService.registerCallback(
        this.currentContact.roomIndex,
        this.handleIncomingMessage
      );

      // 设置注销函数
      this.unregisterCallback = () => {
        MqttService.unregisterCallback(this.currentContact.roomIndex);
      };

      // 检查MQTT连接状态
      const status = MqttService.getStatus();
      this.mqttStatus = status.connected ? 'connected' : 'disconnected';

      if (!status.connected) {
        console.warn('⚠️ MQTT未连接，消息可能无法实时接收');
      }
    },

    /**
     * 设置MQTT状态监听
     */
    setupMQTTStatusListener() {
      // 监听全局MQTT状态变化
      this.unregisterGlobalCallback = MqttService.registerGlobalCallback((data) => {
        if (data.type === 'connected') {
          this.mqttStatus = 'connected';
          console.log('✅ MQTT已连接');
        } else if (data.type === 'disconnected' || data.type === 'error') {
          this.mqttStatus = 'disconnected';
          console.warn('⚠️ MQTT连接已断开');
        }
      });
    },

    /**
     * 处理接收到的 MQTT 消息
     */
// 在 methods 中修改 handleIncomingMessage 方法
    handleIncomingMessage(message) {
      if (!message || typeof message !== 'object') {
        console.error('❌ 收到的消息不是有效对象:', message);
        return;
      }

      console.log('🔄 handleIncomingMessage 被调用，收到MQTT消息:', {
        消息ID: message.id || message.msgId || '无ID',
        房间号: message.toFromIndex,
        当前房间: this.currentContact.roomIndex,
        消息内容: message.extra1 || message.content || '无内容',
        消息类型: message.msgType,
        时间: message.dtSend || message.timestamp || '无时间',
        发送者: message.userIndex,
        消息来源: 'MQTT全局服务'
      });

      // 检查消息是否属于当前聊天室
      if (message.toFromIndex === this.currentContact.roomIndex) {
        console.log('✅ 消息属于当前聊天室，开始处理');

        const currentUserIndex = this.getUserIndexByName(this.currentUser.name);
        const currentUserId = localStorage.getItem(key_DingUserIndex);
        const isMe = message.userIndex == currentUserIndex || message.userIndex == currentUserId;

        if (isMe) {
          console.log('⏭️ 跳过自己发送的MQTT消息，避免重复显示');
          return;
        }

        let senderName = '未知用户';
        if (message.userIndex) {
          senderName = this.getUserNameByIndex(message.userIndex);
        }

        let content = '';
        let type = 'text';

        // 根据 msgType 判断消息类型
        if (message.msgType === 10) {
          // 文本消息
          content = message.extra1 || '暂无内容';
          type = 'text';
        } else if (message.msgType === 30) {
          // 图片消息：使用 extra3 中的 Base64 数据
          content = message.extra3; // data:image/png;base64,...
          type = 'image';
        } else {
          console.warn(`⚠️ 不支持的消息类型: ${message.msgType}`);
          content = message.extra1 || '未知消息';
          type = 'text';
        }

        const newMessage = {
          id: message.id || Date.now(),
          content: content,
          type: type,
          isMe: false,
          senderName: senderName,
          timestamp: message.dtSend || new Date().toISOString(),
          status: 'read'
        };

        console.log('📝 创建新消息对象:', newMessage);

        this.messages.push(newMessage);

        this.$nextTick(() => {
          this.scrollToBottom();
        });

        this.playMessageSound();
      } else {
        console.log('⏭️ 消息不属于当前聊天室，已忽略', {
          消息房间: message.toFromIndex,
          当前房间: this.currentContact.roomIndex
        });
      }
    },

    /**
     * 播放消息提示音
     */
    playMessageSound() {
      // 检查是否允许播放声音
      const allowSound = localStorage.getItem('chat_sound_notification') !== 'false';
      if (!allowSound) return;

      try {
        // 创建一个简短的提示音
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        console.log('播放提示音失败:', error);
      }
    },

    // 从缓存中加载当前用户信息
    loadCurrentUser() {
      const name = localStorage.getItem(key_DingName);
      const phone = localStorage.getItem(key_DingUserPhone);
      const userId = localStorage.getItem(key_DingUserIndex);

      this.currentUser = {
        name: name || '未知用户',
        userId: userId || null,
        phone: phone || '',
        avatar: 'https://img.yzcdn.cn/vant/cat.jpeg'
      };
    },

    // 生成UUID
    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    // 获取当前时间戳（秒）
    getCurrentTimestampInSeconds() {
      return Math.floor(Date.now() / 1000);
    },

    // 格式化当前时间为指定格式
    getCurrentFormattedTime() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    },

    // 新增：加载所有用户信息
    loadUserList() {
      return new Promise((resolve) => {
        SensorRequest.Talk_GetUserList(
          '', // 空参数获取所有用户
          (response) => {
            try {
              const respData = JSON.parse(response);
              console.log("📂 获取到的用户列表数据:", respData);

              if (Array.isArray(respData)) {
                this.userList = respData.map(user => ({
                  userIndex: user.userIndex,
                  name: user.name
                }));
                console.log("📊 用户列表数量:", this.userList.length);

                // 保存到localStorage，供全局使用
                localStorage.setItem('user_list', JSON.stringify(this.userList));
              } else {
                console.warn('用户列表数据格式不符合预期:', respData);
                this.userList = [];
              }
              resolve();
            } catch (error) {
              console.error('处理用户列表数据失败:', error);
              Toast.fail('加载用户信息失败');
              this.userList = [];
              resolve();
            }
          },
          (error) => {
            console.error('获取用户列表失败:', error);
            Toast.fail('获取用户列表失败');
            this.userList = [];
            resolve();
          }
        );
      });
    },

    // 根据userIndex获取用户名
    getUserNameByIndex(userIndex) {
      const user = this.userList.find(u => u.userIndex === userIndex);
      return user ? user.name : '未知用户';
    },

    // 根据用户名获取userIndex
    getUserIndexByName(name) {
      const user = this.userList.find(u => u.name === name);
      return user ? user.userIndex : null;
    },

    // 修改 loadMessages 方法，处理历史消息中的图片消息
    loadMessages() {
      if (!this.currentContact.roomIndex) {
        console.error('无法加载消息：缺少房间编号');
        return;
      }

      const param = {
        roomIndex: this.currentContact.roomIndex,
        lastMsgID: 0,
        msgLimit: 100,
        msgDir: 1
      };

      SensorRequest.Talk_GetRoomHistoryMsg(
        JSON.stringify(param),
        (response) => {
          try {
            const respData = JSON.parse(response);
            console.log("📂 获取到的聊天历史数据:", respData);

            if (Array.isArray(respData)) {
              this.messages = respData.map(item => {
                const timestamp = item.dtSend || item.timestamp || new Date().toISOString();

                const senderName = this.getUserNameByIndex(item.userIndex);

                const currentUserIndex = this.getUserIndexByName(this.currentUser.name);
                const currentUserId = localStorage.getItem(key_DingUserIndex);
                const isMe = item.userIndex == currentUserIndex || item.userIndex == currentUserId;

                let content = '';
                let type = 'text';

                if (item.msgType === 10) {
                  content = item.extra1 || '暂无内容';
                  type = 'text';
                } else if (item.msgType === 30) {
                  content = item.extra3; // Base64 图片数据
                  type = 'image';
                } else {
                  content = item.extra1 || '未知消息';
                  type = 'text';
                }

                return {
                  id: item.id || Date.now() + Math.random(),
                  content: content,
                  type: type,
                  isMe: isMe,
                  senderName: senderName,
                  timestamp: timestamp,
                  status: 'read'
                };
              });

              console.log("📊 加载历史消息数量:", this.messages.length);
              this.$nextTick(() => {
                this.scrollToBottom();
              });
            } else {
              console.warn('返回数据格式不符合预期:', respData);
              this.messages = [];
            }
          } catch (error) {
            console.error('处理历史消息数据失败:', error);
            Toast.fail('加载聊天记录失败');
            this.messages = [];
          }
        },
        (error) => {
          console.error('获取聊天历史失败:', error);
          Toast.fail('获取聊天记录失败');
          this.messages = [];
        }
      );
    },

    formatMessageTime(timestamp) {
      // 确保 timestamp 是有效的日期
      let date;
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else {
        return '未知时间';
      }

      if (isNaN(date.getTime())) return '未知时间';

      const now = new Date();
      const diff = now - date;

      if (diff < 3600000) { // 1小时内
        const minutes = Math.floor(diff / 60000);
        return minutes < 1 ? '刚刚' : `${minutes}分钟前`;
      } else if (diff < 86400000) { // 24小时内
        return date.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (diff < 604800000) { // 7天内
        const days = Math.floor(diff / 86400000);
        return `${days}天前`;
      } else {
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    },

    shouldShowTime(message, index) {
      if (index === 0) return true;

      const prevMessage = this.sortedMessages[index - 1];
      const currentTime = new Date(message.timestamp).getTime();
      const prevTime = new Date(prevMessage.timestamp).getTime();

      // 确保时间比较使用有效的时间戳
      if (isNaN(currentTime) || isNaN(prevTime)) {
        return true;
      }

      return (currentTime - prevTime) > 300000; // 5分钟以上才显示时间
    },

    shouldShowDateSeparator(message, index) {
      if (index === 0) return false;

      const prevMessage = this.sortedMessages[index - 1];
      const messageDate = new Date(message.timestamp);
      const prevDate = new Date(prevMessage.timestamp);

      if (isNaN(messageDate.getTime()) || isNaN(prevDate.getTime())) {
        return false;
      }

      return messageDate.toDateString() !== prevDate.toDateString();
    },

    formatDateForDisplay(timestamp) {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '未知日期';

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return '今天';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return '昨天';
      } else {
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    },

    async sendMessage() {
      if (!this.canSend) return;

      const content = this.messageText.trim();
      const tempId = Date.now();

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

      this.$nextTick(() => {
        this.scrollToBottom();
      });

      // 构造发送消息的参数
      const sendMsgParam = {
        msgId: this.generateUUID(),
        dingId: "",
        msgCaption: `${this.currentUser.name}: ${content.substring(0, 10)}`,
        userIndex: 0,
        toFromIndex: this.currentContact.id,
        isRevoked: 0,
        isDeleted: 0,
        extra1: content,
        extra2: "",
        extra3: "",
        quote: "",
        dtSend: this.getCurrentFormattedTime(),
        dtCreate: "",
        dtUpdate: "",
        id: 0,
        sequence: this.getCurrentTimestampInSeconds(),
        msgType: 10
      };

      // 调用发送消息接口
      SensorRequest.Talk_SendMsg(
        JSON.stringify(sendMsgParam),
        (response) => {
          try {
            const respData = JSON.parse(response);
            console.log("消息发送成功:", respData);

            // 更新消息状态为已发送
            const messageIndex = this.messages.findIndex(msg => msg.id === tempId);
            if (messageIndex !== -1) {
              this.messages.splice(messageIndex, 1, {
                ...this.messages[messageIndex],
                id: respData.id || Date.now() + 1,
                status: 'sent'
              });
            }
          } catch (error) {
            console.error('处理发送消息响应失败:', error);
            // 更新消息状态为发送失败
            const messageIndex = this.messages.findIndex(msg => msg.id === tempId);
            if (messageIndex !== -1) {
              this.messages.splice(messageIndex, 1, {
                ...this.messages[messageIndex],
                status: 'error'
              });
            }
            Toast.fail('消息发送失败');
          }
        },
        (error) => {
          console.error('发送消息失败:', error);
          // 更新消息状态为发送失败
          const messageIndex = this.messages.findIndex(msg => msg.id === tempId);
          if (messageIndex !== -1) {
            this.messages.splice(messageIndex, 1, {
              ...this.messages[messageIndex],
              status: 'error'
            });
          }
          Toast.fail('消息发送失败');
        }
      );
    },

    /**
     * 提取Base64编码数据，去除data:image/xxx;base64,前缀
     */
    extractBase64Data(base64String) {
      if (!base64String) return '';

      // 使用正则表达式匹配并移除前缀
      const match = base64String.match(/^data:[^;]+;base64,(.+)$/);
      if (match && match[1]) {
        return match[1];
      }

      // 如果没有前缀，直接返回原字符串
      return base64String;
    },

    // 生成缩略图的方法
    generateThumbnail(base64Image) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // 设置缩略图尺寸（例如最大边长为300px）
          const maxSize = 300;
          let { width, height } = img;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);

          // 导出为较低质量的JPEG以减小文件大小
          const thumbnail = canvas.toDataURL('image/png', 0.7);
          resolve(thumbnail);
        };
        img.src = base64Image;
      });
    },

    // 发送图片消息
    async sendImageMessage(base64Image, fileName, fileType, fileSize) {
      // 防止重复发送
      if (this.isSendingImage) {
        return;
      }

      this.isSendingImage = true;
      const tempId = Date.now() + Math.floor(Math.random() * 1000);

      // 添加临时图片消息到聊天界面
      const tempMessage = {
        id: tempId,
        content: base64Image,
        type: 'image',
        isMe: true,
        timestamp: new Date().toISOString(),
        status: 'sending'
      };
      this.messages.push(tempMessage);
      this.$nextTick(() => {
        this.scrollToBottom();
      });

      try {
        // 生成缩略图
        const thumbnail = await this.generateThumbnail(base64Image);
        // 构造发送图片消息的参数
        const sendMsgParam = {
          msgId: this.generateUUID(),
          dingId: "",
          msgCaption: `${this.currentUser.name}发了一个图片`,
          userIndex: 0,
          toFromIndex: this.currentContact.id,
          isRevoked: 0,
          isDeleted: 0,
          extra1: fileName, // 实际文件名称
          extra2: "image/png", // 实际文件类型
          extra3: thumbnail, // 缩略图base64
          extra4: "",
          extra5: this.extractBase64Data(base64Image), // 只保留Base64编码部分
          extra6: fileSize.toString(), // 实际文件大小
          extra7: "",
          extra8: "",
          quote: "",
          dtSend: this.getCurrentFormattedTime(),
          dtCreate: "",
          dtUpdate: "",
          id: 0,
          sequence: this.getCurrentTimestampInSeconds(),
          msgType: 30 // 图片消息类型
        };
        // 调用发送消息接口
        SensorRequest.Talk_SendMsg(
          JSON.stringify(sendMsgParam),
          (response) => {
            try {
              const respData = JSON.parse(response);
              console.log("图片消息发送成功:", respData);

              // 更新消息状态为已发送
              const messageIndex = this.messages.findIndex(msg => msg.id === tempId);
              if (messageIndex !== -1) {
                this.messages.splice(messageIndex, 1, {
                  ...this.messages[messageIndex],
                  id: respData.id || Date.now() + 1,
                  status: 'sent'
                });
              }
            } catch (error) {
              console.error('处理发送图片消息响应失败:', error);
              // 更新消息状态为发送失败
              const messageIndex = this.messages.findIndex(msg => msg.id === tempId);
              if (messageIndex !== -1) {
                this.messages.splice(messageIndex, 1, {
                  ...this.messages[messageIndex],
                  status: 'error'
                });
              }
              Toast.fail('图片发送失败');
            } finally {
              this.isSendingImage = false;
            }
          },
          (error) => {
            console.error('发送图片消息失败:', error);
            // 更新消息状态为发送失败
            const messageIndex = this.messages.findIndex(msg => msg.id === tempId);
            if (messageIndex !== -1) {
              this.messages.splice(messageIndex, 1, {
                ...this.messages[messageIndex],
                status: 'error'
              });
            }
            Toast.fail('图片发送失败');
            this.isSendingImage = false;
          }
        );
      } catch (error) {
        console.error('生成缩略图失败:', error);
        Toast.fail('图片处理失败');
        this.isSendingImage = false;

        // 更新消息状态为发送失败
        const messageIndex = this.messages.findIndex(msg => msg.id === tempId);
        if (messageIndex !== -1) {
          this.messages.splice(messageIndex, 1, {
            ...this.messages[messageIndex],
            status: 'error'
          });
        }
      }
    },

    // 选择图片
    chooseImage() {
      // 创建文件选择器
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';

      // 移动端优化
      if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        fileInput.capture = 'environment'; // 移动端优先使用摄像头
      }

      fileInput.style.display = 'none';

      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          // 检查文件大小（限制为20MB）
          if (file.size > 20 * 1024 * 1024) {
            Toast.fail('图片大小不能超过20MB');
            return;
          }

          // 显示加载提示
          Toast.loading({
            message: '正在处理图片...',
            forbidClick: true,
            duration: 0
          });

          const reader = new FileReader();
          reader.onload = (event) => {
            const base64Image = event.target.result;
            Toast.clear();
            // 传递文件信息给 sendImageMessage 方法
            this.sendImageMessage(base64Image, file.name, file.type, file.size);
          };
          reader.onerror = () => {
            Toast.clear();
            Toast.fail('图片读取失败');
          };
          reader.readAsDataURL(file);
        }
      };

      document.body.appendChild(fileInput);
      fileInput.click();
      document.body.removeChild(fileInput);
    },

    // 拍照
    takePhoto() {
      // 创建文件选择器
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.capture = 'environment'; // 使用摄像头
      fileInput.style.display = 'none';

      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          // 检查文件大小（限制为20MB）
          if (file.size > 20 * 1024 * 1024) {
            Toast.fail('图片大小不能超过20MB');
            return;
          }

          // 显示加载提示
          Toast.loading({
            message: '正在处理图片...',
            forbidClick: true,
            duration: 0
          });

          const reader = new FileReader();
          reader.onload = (event) => {
            const base64Image = event.target.result;
            Toast.clear();
            // 传递文件信息给 sendImageMessage 方法
            this.sendImageMessage(base64Image, file.name, file.type, file.size);
          };
          reader.onerror = () => {
            Toast.clear();
            Toast.fail('图片读取失败');
          };
          reader.readAsDataURL(file);
        }
      };

      document.body.appendChild(fileInput);
      fileInput.click();
      document.body.removeChild(fileInput);
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

      // 模拟从服务器获取历史消息（实际项目中应调用接口）
      setTimeout(() => {
        // 假设后端返回空数组表示无更多消息
        const respData = []; // 模拟返回空数据

        if (Array.isArray(respData) && respData.length === 0) {
          // 无更多消息，提示用户
          Toast('已全部加载完成');
          this.hasMoreMessages = false;
        } else {
          // 有新消息，插入到顶部
          const newMessages = respData.map(item => ({
            id: item.id ,
            content: item.extra1 ,
            type: item.msgType === 10 ? 'text' : 'image',
            isMe: item.userIndex === this.getUserIndexByName(this.currentUser.name),
            senderName: this.getUserNameByIndex(item.userIndex),
            timestamp: item.dtSend,
            status: 'read'
          })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

          this.messages = [...newMessages, ...this.messages];
        }

        this.loadingMore = false;
      }, 1000);
    },

    previewImage(imageUrl) {
      this.previewImages = [imageUrl];
      this.showImagePreview = true;
      this.zoom = 1; // 重置缩放比例

      // 添加键盘事件监听，支持ESC键关闭
      const handleEsc = (event) => {
        if (event.key === 'Escape') {
          this.showImagePreview = false;
          document.removeEventListener('keydown', handleEsc);
        }
      };
      document.addEventListener('keydown', handleEsc);
    },

    /**
     * 处理图片缩放事件
     */
    onScale({ scale }) {
      console.log('当前缩放比例:', scale);
      this.zoom = scale;
    },

    /**
     * 处理预览关闭事件
     */
    onPreviewClose() {
      this.showImagePreview = false;
      this.previewImages = [];
      this.zoom = 1;
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
  max-width: 85%;
  display: flex;
  flex-direction: column;
}

.message-other .message-content-wrapper {
  max-width: 75%;
}

.message-mine .message-content-wrapper {
  max-width: 75%;
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
  white-space: normal;
  word-wrap: break-word;
  max-width: 100%;
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
  color: #996;
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
  .message-other .message-content-wrapper,
  .message-mine .message-content-wrapper {
    max-width: 80%;
  }

  .message-content {
    max-width: 100%;
    font-size: 15px;
    padding: 10px 14px;
  }
  .message-avatar {
    width: 32px;
    height: 32px;
  }

  .input-tools {
    gap: 12px;
  }

  .input-tools .van-icon {
    font-size: 20px;
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

/* MQTT连接状态指示器 */
.mqtt-status-indicator {
  position: fixed;
  top: 10px;
  right: 10px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  z-index: 1000;
}

.mqtt-status-connected {
  background-color: #07c160;
  box-shadow: 0 0 10px #07c160;
}

.mqtt-status-disconnected {
  background-color: #ff4444;
  box-shadow: 0 0 10px #ff4444;
}

/* 图片预览增强样式 */
.van-image-preview {
  z-index: 2000;
}

.van-image-preview__image {
  cursor: zoom-in;
}

.van-image-preview__image--zooming {
  cursor: grab;
}

.van-image-preview__close-icon {
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  color: white;
}
</style>
