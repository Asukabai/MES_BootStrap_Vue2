<template>
  <div class="chat-detail">
    <!-- 调试信息 -->
    <div class="debug-info" style="background: yellow; padding: 10px; font-size: 12px;">
      <div><strong>房间ID:</strong> {{ currentContact.roomIndex }}</div>
      <div><strong>消息数量:</strong> {{ roomMessages.length }}</div>
      <div><strong>用户列表长度:</strong> {{ userList.length }}</div>
      <div><strong>当前用户ID:</strong> {{ (currentUser && currentUser.userId) || '' }}</div>
      <div><strong>MQTT状态:</strong> {{ mqttStatus }}</div>
      <div><strong>当前Vuex消息:</strong> {{ getVuexMessagesCount }}</div>
      <button @click="forceRefresh" style="padding: 5px; margin-top: 5px;">强制刷新</button>
    </div>

    <!-- MQTT连接状态提示 -->
    <div v-if="mqttStatus !== 'connected'" class="mqtt-warning">
      <van-notice-bar
        :text="mqttStatusText"
        :background="mqttStatusBackground"
        :color="mqttStatusColor"
        left-icon="info-o"
      />
    </div>

    <!-- 消息区域 -->
    <div class="message-container" ref="messageContainer">
      <!-- 加载提示 -->
      <div v-if="loadingHistory" class="loading-history">
        <van-loading type="spinner" size="24px">加载消息中...</van-loading>
      </div>

      <!-- 空状态 -->
      <div v-else-if="roomMessages.length === 0" class="empty-message">
        <van-empty
          description="暂无聊天记录"
          image="https://img.yzcdn.cn/vant/empty-image-search.png"
        >
          <van-button type="primary" size="small" @click="loadRoomHistory">
            重新加载消息
          </van-button>
        </van-empty>
      </div>

      <!-- 消息列表 -->
      <div v-else>
        <div style="padding: 10px; background: #e0f7fa; margin-bottom: 10px;">
          共 {{ roomMessages.length }} 条消息
        </div>

        <div
          v-for="(message, index) in roomMessages"
          :key="message.id || index"
          :class="['message-item', message.isMe ? 'message-mine' : 'message-other']"
        >
          <!-- 调试每条消息 -->
          <div v-if="debugMode" class="message-debug" style="font-size: 10px; color: #666;">
            消息{{ index + 1 }}: ID={{ message.id }}, 类型={{ message.type }},
            发送者={{ message.senderName }}, 内容={{ message.content ? message.content.substring(0, 30) + '...' : '空' }}
          </div>

          <!-- 消息内容 -->
          <div class="message-bubble-wrapper">
            <!-- 对方消息 -->
            <div v-if="!message.isMe" class="message-other">
              <van-image
                :src="contactAvatar"
                round
                width="36px"
                height="36px"
                class="message-avatar"
              />
              <div class="message-content-wrapper">
                <div v-if="message.senderName" class="sender-name">
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
                  />
                  <div v-else style="color: red;">
                    未知消息类型: {{ message.type }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 我的消息 -->
            <div v-else class="message-mine">
              <div class="message-content-wrapper">
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
                  />
                  <div v-else style="color: red;">
                    未知消息类型: {{ message.type }}
                  </div>
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
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-container">
        <van-field
          v-model="messageText"
          rows="1"
          autosize
          type="textarea"
          maxlength="500"
          placeholder="请输入消息..."
          class="message-input"
          @keyup.enter.prevent="sendMessage"
        >
          <template #extra>
            <van-button
              type="primary"
              size="small"
              class="send-button"
              :disabled="!canSend"
              @click="sendMessage"
            >
              发送
            </van-button>
          </template>
        </van-field>
      </div>
    </div>
  </div>
</template>

<script>
import { Toast } from 'vant'
import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'ChatDetail',

  data() {
    return {
      messageText: '',
      loadingHistory: false,
      debugMode: true, // 开启调试模式
      currentContact: {
        roomIndex: null,
        name: '聊天对象',
        avatar: 'https://img.yzcdn.cn/vant/cat.jpeg'
      },
      forceUpdateKey: 0 // 用于强制刷新
    }
  },

  computed: {
    // 从Vuex映射状态
    ...mapState('chat', ['mqttStatus', 'userList', 'currentUser', 'messagesByRoom']),
    ...mapGetters('chat', ['getRoomMessages']),

    // 获取Vuex中的消息数量（用于调试）
    getVuexMessagesCount() {
      if (!this.currentContact.roomIndex) return '无房间ID'
      const messages = this.messagesByRoom[this.currentContact.roomIndex]
      return messages ? `${messages.length}条` : '0条'
    },

    // 当前房间的消息 - 强制响应式更新
    roomMessages() {
      // 使用forceUpdateKey来强制更新
      console.log('计算属性 roomMessages 被调用', this.forceUpdateKey)

      if (!this.currentContact.roomIndex) {
        console.log('roomMessages: 没有房间ID')
        return []
      }

      // 直接访问Vuex state，不使用getter（测试用）
      const directMessages = this.messagesByRoom[this.currentContact.roomIndex]
      console.log('直接访问Vuex消息:', directMessages)

      // 使用getter
      const getterMessages = this.getRoomMessages(this.currentContact.roomIndex)
      console.log('通过getter访问消息:', getterMessages)

      const messages = getterMessages || directMessages || []

      console.log(`最终消息数组: ${messages.length}条`, messages.slice(0, 3)) // 只显示前3条

      if (!Array.isArray(messages)) {
        console.error('消息不是数组:', messages)
        return []
      }

      // 确保按时间排序
      const sortedMessages = messages.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime()
        const timeB = new Date(b.timestamp).getTime()
        return timeA - timeB
      })

      console.log('排序后的消息:', sortedMessages.length)

      return sortedMessages
    },

    contactAvatar() {
      return this.currentContact.avatar || 'https://img.yzcdn.cn/vant/cat.jpeg'
    },

    userAvatar() {
      return 'https://img.yzcdn.cn/vant/cat.jpeg'
    },

    canSend() {
      return this.messageText.trim().length > 0
    },

    mqttStatusText() {
      const statusMap = {
        'connected': '消息服务已连接',
        'disconnected': '消息服务已断开，请检查网络',
        'error': '消息服务连接错误',
        'connecting': '消息服务连接中...'
      }
      return statusMap[this.mqttStatus] || '消息服务状态未知'
    },

    mqttStatusBackground() {
      const statusMap = {
        'connected': '#f0f9eb',
        'disconnected': '#fdf6ec',
        'error': '#fef0f0',
        'connecting': '#ecf5ff'
      }
      return statusMap[this.mqttStatus] || '#f0f9eb'
    },

    mqttStatusColor() {
      const statusMap = {
        'connected': '#67c23a',
        'disconnected': '#e6a23c',
        'error': '#f56c6c',
        'connecting': '#409eff'
      }
      return statusMap[this.mqttStatus] || '#67c23a'
    }
  },

  async mounted() {
    console.log('ChatDetail mounted')

    // 检查Vuex状态
    console.log('初始Vuex状态:', this.$store.state.chat)

    // 初始化Vuex用户数据
    await this.initUserData()
    console.log('用户数据初始化完成:', this.currentUser)

    // 解析URL参数获取房间ID
    await this.parseRoomIdFromURL()

    // 设置当前活跃房间
    if (this.currentContact.roomIndex) {
      console.log('设置活跃房间:', this.currentContact.roomIndex)
      this.setActiveRoom(this.currentContact.roomIndex)
    }

    // 加载当前房间的历史消息
    await this.loadRoomHistory()

    // 1秒后再次检查
    setTimeout(() => {
      this.checkMessages()
    }, 1000)
  },

  methods: {
    // 从Vuex映射actions
    ...mapActions('chat', [
      'initUserData',
      'sendTextMessage',
      'loadRoomMessages',
      'setActiveRoom'
    ]),

    // 从URL参数解析房间ID
    async parseRoomIdFromURL() {
      const queryString = window.location.search
      const params = new URLSearchParams(queryString)
      const contactStr = params.get('contact')
      const roomId = params.get('roomId')

      console.log('URL参数:', { queryString, contactStr, roomId })

      if (roomId) {
        this.currentContact.roomIndex = roomId
        console.log('从roomId参数设置房间:', roomId)
      } else if (contactStr) {
        try {
          const parsedContact = JSON.parse(contactStr)
          this.currentContact = {
            ...this.currentContact,
            ...parsedContact,
            roomIndex: parsedContact.roomIndex || parsedContact.id
          }
          console.log('从contact参数设置房间:', this.currentContact.roomIndex)
        } catch (e) {
          console.error('解析 contact 失败:', e)
          Toast.fail('解析聊天信息失败')
        }
      } else {
        // 如果没有参数，尝试从路由参数获取
        const routeRoomId = this.$route.params.roomId
        if (routeRoomId) {
          this.currentContact.roomIndex = routeRoomId
          console.log('从路由参数设置房间:', routeRoomId)
        } else {
          console.error('没有找到房间ID')
          Toast.fail('未找到聊天房间')
        }
      }
    },

    // 加载房间历史消息
    async loadRoomHistory() {
      if (!this.currentContact.roomIndex) {
        console.error('无法加载消息：缺少房间编号')
        Toast.fail('缺少房间编号')
        return
      }

      this.loadingHistory = true
      console.log('开始加载房间消息，房间ID:', this.currentContact.roomIndex)

      try {
        // 直接调用Vuex action
        const messages = await this.loadRoomMessages(this.currentContact.roomIndex)
        console.log('加载消息成功，返回的messages:', messages)
        console.log('消息数量:', messages ? messages.length : 0)

        if (messages && Array.isArray(messages)) {
          console.log('前3条消息详情:', messages.slice(0, 3))
        }

        // 检查Vuex状态是否更新
        console.log('加载后Vuex状态:', this.$store.state.chat.messagesByRoom)

        if (messages && messages.length > 0) {
          Toast.success(`加载了 ${messages.length} 条消息`)
          // 强制刷新视图
          this.forceRefresh()
        } else {
          Toast('暂无聊天记录')
        }
      } catch (error) {
        console.error('加载消息失败:', error)
        Toast.fail('加载聊天记录失败')
      } finally {
        this.loadingHistory = false
      }
    },

    // 检查消息
    checkMessages() {
      console.log('=== 检查消息状态 ===')
      console.log('房间ID:', this.currentContact.roomIndex)
      console.log('Vuex messagesByRoom:', this.$store.state.chat.messagesByRoom)

      if (this.currentContact.roomIndex) {
        const roomMessages = this.$store.state.chat.messagesByRoom[this.currentContact.roomIndex]
        console.log(`房间 ${this.currentContact.roomIndex} 的消息:`, roomMessages)
        if (roomMessages) {
          console.log(`消息数量: ${roomMessages.length}`)
          if (roomMessages.length > 0) {
            console.log('第一条消息:', roomMessages[0])
            console.log('消息类型检查:', roomMessages.map(m => ({
              id: m.id,
              type: m.type,
              content: m.content ? m.content.substring(0, 50) : '空',
              isMe: m.isMe
            })))
          }
        }
      }
    },

    // 强制刷新
    forceRefresh() {
      console.log('强制刷新')
      this.forceUpdateKey++
      this.$forceUpdate()
    },

    // 发送消息
    async sendMessage() {
      if (!this.canSend || !this.currentContact.roomIndex) {
        Toast('无法发送消息')
        return
      }

      const content = this.messageText.trim()

      try {
        await this.sendTextMessage({
          roomId: this.currentContact.roomIndex,
          content: content
        })

        // 清空输入框
        this.messageText = ''
        Toast.success('消息发送成功')

      } catch (error) {
        console.error('发送消息失败:', error)
        Toast.fail('消息发送失败')
      }
    },

    // 滚动到底部
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messageContainer
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    }
  },

  // 添加观察器，监视Vuex状态变化
  watch: {
    messagesByRoom: {
      handler(newVal) {
        console.log('Vuex messagesByRoom 变化:', newVal)
        if (this.currentContact.roomIndex && newVal[this.currentContact.roomIndex]) {
          console.log(`房间 ${this.currentContact.roomIndex} 消息更新:`, newVal[this.currentContact.roomIndex].length)
        }
      },
      deep: true
    }
  }
}
</script>

<style scoped>
/* 调试信息样式 */
.debug-info {
  background-color: #f0f0f0;
  padding: 8px;
  font-size: 12px;
  color: #666;
  border-bottom: 1px solid #ddd;
}

/* 加载中样式 */
.loading-history {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

/* 空状态样式 */
.empty-message {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

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
}

.message-item {
  margin-bottom: 16px;
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
}

.message-content-wrapper {
  max-width: 70%;
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
}

.message-other .message-content {
  background-color: #fff;
  border-bottom-left-radius: 4px;
}

.message-mine .message-content {
  background: linear-gradient(135deg, #95ec69 0%, #6dd400 100%);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.input-area {
  background-color: #fff;
  border-top: 1px solid #e8e8e8;
  padding: 8px 12px;
}

.input-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-input {
  flex: 1;
  background-color: #f7f8fa;
  border-radius: 18px;
  padding: 8px 16px;
}

.send-button {
  min-width: 64px;
  height: 32px;
  border-radius: 16px;
}
</style>
