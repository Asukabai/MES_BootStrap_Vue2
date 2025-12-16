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
    />
  </div>
</template>

<script>
import MqttClient from '../../utils/MqttClient'; // 在具体页面导入
import { Toast, ImagePreview } from 'vant';
import SensorRequest from '../../utils/SensorRequest';
import {GetDingUserToken, key_DingName, key_DingUserIndex, key_DingUserPhone} from '../../utils/Dingding.js';

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
      showDateDivider: true,
      currentContact: {
        id: null,
        name: '聊天对象',
        avatar: 'https://img.yzcdn.cn/vant/cat.jpeg',
        userId: null
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
      userList: [] // 新增：存储所有用户信息
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
      return this.messageText.trim().length > 0;
    }
  },

  mounted() {
    // 在聊天页面初始化 MQTT 连接
    const department = this.$route.params.department
    const userId = localStorage.getItem(key_DingUserIndex);

    if (userId) {
      GetDingUserToken(department, (token) => {
        if (token) {
          // 添加连接状态检查
          console.log('初始化前连接状态:', MqttClient.getConnectStatus());
          console.log('🔗 准备连接MQTT...');
          console.log('用户ID:', userId, 'Token:', token.substring(0, 20) + '...');

          // 确保只建立一次连接
          if (!MqttClient.connected) {
            // 1. 先设置消息回调
            console.log('📞 设置消息回调...');
            MqttClient.onMessage((message) => {
              console.log('📨 MQTT消息回调被调用，收到消息:', message);
              this.handleIncomingMessage(message);
            });

            // 2. 建立连接
            MqttClient.connect(userId, token);
            Toast(' MQTT 连接成功 ');

            this.mqttConnected = true;

            // 3. 添加连接状态检查
            const connectCheckInterval = setInterval(() => {
              if (MqttClient.connected) {
                clearInterval(connectCheckInterval);
                console.log('✅ MQTT连接已确认建立');
                // 测试MQTT功能
                this.testMQTTFunctionality();
              }
            }, 100);

            // 设置超时检查
            setTimeout(() => {
              clearInterval(connectCheckInterval);
              if (!MqttClient.connected) {
                console.warn('⚠️ MQTT连接超时');
                Toast.fail('MQTT连接超时');
              }
            }, 5000);
          }
        }
      }, (error) => {
        console.error('聊天页面 [App] 获取token失败 :', error);
      });
    }
    const queryString = window.location.search;
    const params = new URLSearchParams(queryString);
    const contactStr = params.get('contact');
    if (contactStr) {
      try {
        const parsedContact = JSON.parse(contactStr);
        this.currentContact = {
          ...parsedContact,
          id: parsedContact.roomIndex || parsedContact.id,
          userId: parsedContact.userId
        };
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
  },
  updated() {
    this.scrollToBottom();
  },
  beforeDestroy() {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
    }
    console.log('=== ChatDetail beforeDestroy 开始 ===');
    console.log('当前mqttConnected状态:', this.mqttConnected);
    console.log('MqttClient连接状态:', MqttClient.connected);
    console.log('MqttClient客户端实例:', MqttClient.client);
    console.log('销毁前连接状态:', MqttClient.getConnectStatus());

    // 添加防抖：确保只断开一次
    if (!this._disconnecting && MqttClient.connected) {
      this._disconnecting = true;
      console.log('正在断开MQTT连接...');
      MqttClient.disconnect();
      this.mqttConnected = false;
      console.log('断开连接后状态:', MqttClient.connected);
    } else {
      console.log('连接已在断开过程中或已断开，跳过重复断开');
    }
    console.log('=== ChatDetail beforeDestroy 结束 ===');
    Toast(' 离开房间，MQTT 连接断开 ');
  },
  methods: {
    // 测试MQTT功能
    testMQTTFunctionality() {
      console.log('🧪 开始测试MQTT功能...');

      // 检查连接状态
      const status = MqttClient.getConnectStatus();
      console.log('📊 MQTT连接状态检查:', {
        连接状态: status.connected ? '✅ 已连接' : '❌ 未连接',
        客户端实例: status.client ? '✅ 存在' : '❌ 不存在',
        当前时间: new Date().toISOString()
      });

      // 发送测试消息
      const testMessage = {
        type: 'test',
        roomIndex: this.currentContact.roomIndex,
        content: 'MQTT连接测试消息',
        timestamp: new Date().toISOString(),
        testId: 'test_' + Date.now(),
        from: 'ChatDetail测试'
      };


      const userId = localStorage.getItem(key_DingUserIndex);
      const testTopic = `SensorRTU/talk/msg1/${userId}`;

      console.log('📤 发送测试消息到主题:', testTopic);

      // 稍等一下再发送测试消息，确保连接稳定
      setTimeout(() => {
        if (MqttClient.connected) {
          MqttClient.publish(testTopic, testMessage);

          // 检查是否收到自己的测试消息
          setTimeout(() => {
            console.log('🔍 测试完成，MQTT功能状态:', {
              发送测试消息: '✅ 完成',
              等待接收: '⏳ 进行中',
              连接保持: MqttClient.connected ? '✅ 保持' : '❌ 断开'
            });
          }, 2000);
        } else {
          console.error('❌ 连接已断开，无法发送测试消息');
        }
      }, 2000);
    },

    // 处理接收到的 MQTT 消息（增加详细日志）
    handleIncomingMessage(message) {
      console.log('🔄 handleIncomingMessage 被调用，消息详情:', {
        消息ID: message.id || message.msgId,
        房间号: message.roomIndex,
        当前房间: this.currentContact.roomIndex,
        消息内容: message.extra1 || message.content,
        消息类型: message.msgType,
        时间: message.dtSend || message.timestamp,
        发送者: message.userIndex
      });

      // 检查消息是否属于当前聊天室
      if (message.roomIndex === this.currentContact.roomIndex) {
        console.log('✅ 消息属于当前聊天室，开始处理');

        const newMessage = {
          id: message.id || Date.now(),
          content: message.extra1 || '暂无内容',
          type: message.msgType === 10 ? 'text' : 'image',
          isMe: message.userIndex === this.getUserIndexByName(this.currentUser.name),
          senderName: this.getUserNameByIndex(message.userIndex),
          timestamp: message.dtSend || new Date().toISOString(),
          status: 'read'
        };

        console.log('📝 创建新消息对象:', newMessage);

        this.messages.push(newMessage);

        // 滚动到底部
        this.$nextTick(() => {
          this.scrollToBottom();
        });

        console.log('✅ 消息处理完成，当前消息总数:', this.messages.length);
      } else {
        console.log('⏭️ 消息不属于当前聊天室，已忽略', {
          消息房间: message.roomIndex,
          当前房间: this.currentContact.roomIndex
        });
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
        avatar: 'https://img.yzcdn.cn/vant/cat.jpeg' // 可以替换为真实头像URL
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

    loadMessages() {
      console.log("📂 获取聊天历史数据参数的房间编号:", this.currentContact.roomIndex);
      const param = {
        roomIndex: this.currentContact.roomIndex,
        lastMsgID: 0,
        msgLimit: 50,
        msgDir: 1 // 1 表示从新到旧
      };

      SensorRequest.Talk_GetRoomHistoryMsg(
        JSON.stringify(param),
        (response) => {
          try {
            const respData = JSON.parse(response);
            console.log("📂 获取到的聊天历史数据:", respData);

            if (Array.isArray(respData)) {
              // 确保每个消息都有时间戳，并按时间顺序（旧到新）排列
              this.messages = respData.map(item => {
                // 确保 timestamp 字段存在，使用 dtSend 作为时间戳
                const timestamp = item.dtSend || item.timestamp || new Date().toISOString();

                // 使用真实用户名替换senderName
                const senderName = this.getUserNameByIndex(item.userIndex);

                // 判断消息是否为自己发送的
                const isMe = item.userIndex === this.getUserIndexByName(this.currentUser.name);

                // 从extra1字段获取消息内容
                const content = item.extra1 || '暂无内容';

                return {
                  id: item.id || Date.now() + Math.random(),
                  content: content,
                  type: item.msgType === 10 ? 'text' : 'image',
                  isMe: isMe,
                  senderName: senderName,
                  timestamp: timestamp, // 确保时间戳字段
                  status: 'read'
                };
              });

              // 移除之前的排序，让 computed 属性处理排序
              console.log("📊 原始消息数量:", this.messages.length);
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
        timestamp: new Date().toISOString(), // 添加时间戳
        status: 'sending'
      };

      this.messages.push(tempMessage);
      this.messageText = '';

      this.$nextTick(() => {
        this.scrollToBottom();
      });

      // 构造发送消息的参数
      const sendMsgParam = {
        msgId: this.generateUUID(), // 生成UUID
        dingId: "",
        msgCaption: `${this.currentUser.name}: ${content.substring(0, 10)}`, // 使用用户名和消息前10个字符
        userIndex: 0, // 根据要求设置为0
        toFromIndex: this.currentContact.id, // 房间Index
        isRevoked: 0,
        isDeleted: 0,
        extra1: content, // 使用extra1字段传递消息内容
        extra2: "",
        extra3: "",
        quote: "",
        dtSend: this.getCurrentFormattedTime(), // 当前时间
        dtCreate: "",
        dtUpdate: "",
        id: 0,
        sequence: this.getCurrentTimestampInSeconds(), // 当前时间戳（秒）
        msgType: 10 // 普通消息类型
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
            id: item.id || Date.now() + Math.random(),
            content: item.extra1 || '暂无内容', // 从extra1字段获取内容
            type: item.msgType === 10 ? 'text' : 'image',
            isMe: item.userIndex === this.getUserIndexByName(this.currentUser.name),
            senderName: this.getUserNameByIndex(item.userIndex), // 使用真实用户名
            timestamp: item.dtSend,
            status: 'read'
          })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

          this.messages = [...newMessages, ...this.messages];
        }

        this.loadingMore = false;
      }, 1000);
    },
    chooseImage() {
      Toast('选择图片功能暂未实现');
    },
    takePhoto() {
      Toast('拍照功能暂未实现');
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
