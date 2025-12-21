<template>
  <div class="chat-detail">
    <!-- 调试信息 -->
    <div class="debug-info" v-if="debugMode" style="background: yellow; padding: 10px; font-size: 12px;">
      <div><strong>房间ID:</strong> {{ currentContact.roomIndex }} (类型: {{ typeof currentContact.roomIndex }})</div>
      <div><strong>消息数量:</strong> {{ roomMessages.length }}</div>
      <div><strong>消息详情:</strong> {{ JSON.stringify(roomMessages) }}</div>
      <div><strong>Vuex messagesByRoom所有键:</strong> {{ Object.keys(messagesByRoom) }}</div>
      <div><strong>当前用户ID:</strong> {{ (currentUser && currentUser.userId) || '' }}</div>
      <div><strong>用户列表长度:</strong> {{ userList.length }}</div>
      <div><strong>MQTT状态:</strong> {{ mqttStatus }}</div>
      <div><strong>分页状态:</strong> lastMsgID={{ lastMsgID }}, hasMore={{ hasMoreMessages }}</div>
      <div><strong>加载状态:</strong> loadingHistory={{ loadingHistory }}, loadingMore={{ loadingMore }}</div>
      <div><strong>消息isMe状态:</strong> {{ roomMessages.map(m => m.isMe).join(', ') }}</div>
      <button @click="forceRefresh" style="padding: 5px; margin-top: 5px;">强制刷新</button>
      <button @click="reloadMessages" style="padding: 5px; margin-top: 5px; margin-left: 5px;">重新加载消息</button>
      <button @click="debugMode = !debugMode" style="padding: 5px; margin-top: 5px; margin-left: 5px;">切换调试</button>
      <button @click="checkVuexState" style="padding: 5px; margin-top: 5px; margin-left: 5px;">检查Vuex状态</button>
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
    <div class="message-container" ref="messageContainer" @scroll="handleScroll">
      <!-- 加载提示 -->
      <div v-if="loadingHistory" class="loading-history">
        <van-loading type="spinner" size="24px">加载消息中...</van-loading>
      </div>

      <!-- 加载更多提示 -->
      <div v-if="loadingMore" class="loading-more">
        <van-loading type="spinner" size="20px">加载更多...</van-loading>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loadingHistory && roomMessages.length === 0" class="empty-message">
        <van-empty
          description="暂无聊天记录"
          image="https://img.yzcdn.cn/vant/empty-image-search.png"
        >
          <van-button type="primary" size="small" @click="loadRoomHistory(true)">
            重新加载消息
          </van-button>
        </van-empty>
      </div>

      <!-- 消息列表 -->
      <div v-else-if="roomMessages.length > 0">
        <div style="padding: 10px; background: #e0f7fa; margin-bottom: 10px; text-align: center;">
          共 {{ roomMessages.length }} 条消息
          <span v-if="hasMoreMessages"> | 还有更多消息</span>
        </div>

        <!-- 修改这里：使用统一的message-item类，但根据isMe动态添加子类 -->
        <div
          v-for="(message, index) in roomMessages"
          :key="message.id"
          class="message-item"
          :class="message.isMe ? 'is-mine' : 'is-other'"
        >
          <!-- 消息内容 -->
          <div class="message-bubble-wrapper">
            <!-- 对方消息 -->
            <div v-if="!message.isMe" class="message-content-wrapper">
              <van-image
                :src="contactAvatar"
                round
                width="36px"
                height="36px"
                class="message-avatar"
              />
              <div class="message-content-container">
                <div v-if="message.senderName" class="sender-name">
                  {{ message.senderName }}
                </div>
                <div
                  class="message-content"
                  :class="{
                    'message-loading': message.status === 'sending',
                    'image-message-content': message.type === 'image'
                  }"
                  @click="message.type === 'image' ? previewImage(message) : null"
                >
                  <template v-if="message.type === 'text'">
                    {{ message.content }}
                  </template>
                  <div v-else-if="message.type === 'image'" class="image-message">
                    <van-image
                      :src="message.content"
                      class="chat-image"
                      fit="cover"
                      @load="handleImageLoad"
                    />
                    <div class="image-meta">
                      <span class="image-size" v-if="message.fileSize">
                        {{ formatFileSize(message.fileSize) }}
                      </span>
                      <van-button
                        v-if="message.content && message.type === 'image'"
                        size="mini"
                        type="primary"
                        class="view-original-btn"
                        @click.stop="viewOriginalImage(message.content)"
                      >
                        查看原图
                      </van-button>
                    </div>
                  </div>
                  <div v-else style="color: red;">
                    未知消息类型: {{ message.type }}
                  </div>
                </div>
                <!-- 消息时间 -->
                <div class="message-time">
                  {{ formatMessageTime(message) }}
                </div>
              </div>
            </div>

            <!-- 我的消息 -->
            <div v-else class="message-content-wrapper mine-wrapper">
              <div class="message-content-container">
                <div
                  class="message-content mine-content"
                  :class="{
                    'message-loading': message.status === 'sending',
                    'image-message-content': message.type === 'image'
                  }"
                  @click="message.type === 'image' ? previewImage(message) : null"
                >
                  <template v-if="message.type === 'text'">
                    {{ message.content }}
                  </template>
                  <div v-else-if="message.type === 'image'" class="image-message">
                    <van-image
                      :src="message.content"
                      class="chat-image"
                      fit="cover"
                      @load="handleImageLoad"
                    />
                    <div class="image-meta">
                      <span class="image-size" v-if="message.fileSize">
                        {{ formatFileSize(message.fileSize) }}
                      </span>
                      <van-button
                        v-if="message.content && message.type === 'image'"
                        size="mini"
                        type="primary"
                        class="view-original-btn"
                        @click.stop="viewOriginalImage(message.content)"
                      >
                        查看原图
                      </van-button>
                    </div>
                  </div>
                  <div v-else style="color: red;">
                    未知消息类型: {{ message.type }}
                  </div>
                </div>
                <!-- 消息时间 -->
                <div class="message-time mine-time">
                  {{ formatMessageTime(message) }}
                  <span v-if="message.status === 'sending'" class="sending-indicator">
                    · 发送中
                  </span>
                  <span v-else-if="message.status === 'failed'" class="failed-indicator">
                    · 发送失败
                  </span>
                </div>
              </div>
              <van-image
                :src="userAvatar"
                round
                width="36px"
                height="36px"
                class="message-avatar mine-avatar"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-container">
        <!-- 图片预览区域 -->
        <div v-if="imagePreviewUrl" class="image-preview">
          <van-image
            :src="imagePreviewUrl"
            width="80px"
            height="80px"
            fit="cover"
            radius="8px"
          />
          <van-icon name="close" class="remove-image" @click="clearImagePreview" />
        </div>

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
            <div class="input-actions">
              <input
                ref="imageInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleImageSelect"
              />
              <van-button
                icon="photograph"
                size="small"
                class="image-button"
                @click="$refs.imageInput.click()"
              />
              <van-button
                type="primary"
                size="small"
                class="send-button"
                :disabled="(!canSend && !imagePreviewUrl) || isSending"
                @click="sendMessage"
              >
                {{ isSending ? '发送中...' : '发送' }}
              </van-button>
            </div>
          </template>
        </van-field>
      </div>
    </div>

  </div>
</template>

<script>
import { Toast, ImagePreview } from 'vant'
import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'ChatDetail',

  data() {
    return {
      messageText: '',
      loadingHistory: false,
      loadingMore: false,
      debugMode: false, // 默认关闭调试模式
      currentContact: {
        roomIndex: null,
        name: '聊天对象',
        avatar: 'https://img.yzcdn.cn/vant/cat.jpeg'
      },
      selectedImage: null,
      imagePreviewUrl: '',
      isSending: false,
      // 分页相关状态
      lastMsgID: 0,
      hasMoreMessages: true,
      // 滚动相关
      scrollDebounceTimer: null,
      isScrolling: false,
      // 防抖加载
      loadMoreDebounce: null,
      // 图片预览实例
      imagePreviewInstance: null
    }
  },

  computed: {
    ...mapState('chat', ['mqttStatus', 'userList', 'currentUser', 'messagesByRoom']),
    ...mapGetters('chat', ['getRoomMessages']),

    roomMessages() {

      console.log('🚀 [计算属性] roomMessages 被调用 - 开始')

      if (!this.currentContact.roomIndex) {
        console.log('❌ [计算属性] 没有房间ID，返回空数组')
        return []
      }

      // 确保房间ID是数字类型
      const roomId = Number(this.currentContact.roomIndex)
      console.log('📊 [计算属性] 房间ID:', roomId, '类型:', typeof roomId)

      // 直接从state获取
      const fromState = this.messagesByRoom[roomId] || []
      console.log('📊 [计算属性] 从state获取的消息:', fromState)
      console.log('📊 [计算属性] messagesByRoom所有键:', Object.keys(this.messagesByRoom))

      // 从getter获取
      const fromGetter = this.getRoomMessages(roomId)
      console.log('📊 [计算属性] 从getter获取的消息:', fromGetter)

      // 返回非空数组
      const result = fromGetter.length > 0 ? fromGetter : fromState
      console.log('📊 [计算属性] 返回的消息数量:', result.length)
      console.log('📊 [计算属性] 返回的消息详情:', result)
      console.log('🚀 [计算属性] roomMessages 被调用 - 结束')

      return result
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

  created() {
    console.log('🏗️ [生命周期] ChatDetail created')
  },

  async mounted() {
    console.log('🚀 [生命周期] ChatDetail mounted 开始')
    console.log('📋 [生命周期] 当前路由参数:', this.$route.params)
    console.log('📋 [生命周期] 当前查询参数:', window.location.search)
    console.log('📋 [生命周期] 当前用户:', this.currentUser)
    console.log('📋 [生命周期] 用户ID类型:', typeof this.currentUser.userId)
    console.log('📋 [生命周期] 用户ID值:', this.currentUser.userId)
    // 先解析房间ID
    await this.parseRoomIdFromURL()

    console.log('📋 [生命周期] 解析后的房间ID:', this.currentContact.roomIndex, '类型:', typeof this.currentContact.roomIndex)

    if (!this.currentContact.roomIndex) {
      console.error('❌ [生命周期] 未找到聊天房间')
      Toast.fail('未找到聊天房间')
      return
    }

    // 确保房间ID是数字
    this.currentContact.roomIndex = Number(this.currentContact.roomIndex)
    console.log('📋 [生命周期] 转换后的房间ID:', this.currentContact.roomIndex, '类型:', typeof this.currentContact.roomIndex)

    // 设置活跃房间
    this.setActiveRoom(this.currentContact.roomIndex)

    try {
      console.log('📋 [生命周期] 开始初始化用户数据')
      await this.initUserData().catch(err => {
        console.warn('⚠️ [生命周期] 用户数据初始化失败:', err)
      })

      console.log('📋 [生命周期] 用户数据初始化完成')
      console.log('📋 [生命周期] 当前用户:', this.currentUser)

      // 加载历史消息
      console.log('📋 [生命周期] 开始加载历史消息')
      await this.loadRoomHistory(true)
      console.log('📋 [生命周期] 历史消息加载完成')

    } catch (error) {
      console.error('❌ [生命周期] 初始化过程出错:', error)
      Toast.fail('初始化失败')
    }

    console.log('🚀 [生命周期] ChatDetail mounted 结束')
  },

  beforeDestroy() {
    // 清理定时器
    if (this.scrollDebounceTimer) {
      clearTimeout(this.scrollDebounceTimer)
    }
    if (this.loadMoreDebounce) {
      clearTimeout(this.loadMoreDebounce)
    }

    // 关闭图片预览
    if (this.imagePreviewInstance) {
      this.imagePreviewInstance.close()
    }
  },

  methods: {
    // 格式化消息时间
    formatMessageTime(message) {
      if (!message.timestamp) return ''

      const date = new Date(message.timestamp)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // 如果消息是今天的，显示时间
      if (date >= today) {
        return this.formatTime(date)
      }
      // 如果消息是昨天的，显示"昨天 时间"
      else if (date >= yesterday) {
        return `昨天 ${this.formatTime(date)}`
      }
      // 如果是更早的消息，显示日期和时间
      else {
        const month = date.getMonth() + 1
        const day = date.getDate()
        return `${month}/${day} ${this.formatTime(date)}`
      }
    },

    // 格式化时间 (HH:MM)
    formatTime(date) {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    },

    // 格式化文件大小
    formatFileSize(bytes) {
      if (!bytes) return ''
      if (bytes < 1024) return bytes + 'B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
      return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
    },

    // 预览图片
    previewImage(message) {
      if (message.type !== 'image' || !message.content) return

      // 关闭之前的预览实例
      if (this.imagePreviewInstance) {
        this.imagePreviewInstance.close()
      }

      this.imagePreviewInstance = ImagePreview({
        images: [message.content],
        showIndex: false,
        closeable: true,
        closeOnPopstate: true,
        // 添加查看原图按钮
        onClose: () => {
          this.imagePreviewInstance = null
        }
      })
    },

    // 查看原图
    viewOriginalImage(imageUrl) {
      if (!imageUrl) {
        Toast('暂无原图信息')
        return
      }

      try {
        // 使用 ImagePreview 查看原图
        ImagePreview({
          images: [imageUrl],
          showIndex: false,
          closeable: true,
          closeOnPopstate: true,
          startPosition: 0,
          maxZoom: 3,
          minZoom: 0.5,
          onClose: () => {
            // 可以在这里处理关闭后的逻辑
          }
        })
      } catch (error) {
        console.error('查看原图失败:', error)
        Toast('查看原图失败')
      }
    },

    ...mapActions('chat', [
      'initUserData',
      'sendTextMessage',
      'sendImageMessage',
      'loadRoomMessages',
      'setActiveRoom'
    ]),

    async parseRoomIdFromURL() {
      console.log('🔗 [方法] parseRoomIdFromURL 开始')

      // 优先从路由参数获取
      const routeRoomId = this.$route.params.roomId
      console.log('🔗 [方法] 路由参数中的roomId:', routeRoomId)

      if (routeRoomId) {
        this.currentContact.roomIndex = Number(routeRoomId)
        console.log('🔗 [方法] 使用路由参数中的roomId:', routeRoomId, '转换为:', this.currentContact.roomIndex)
        return
      }

      // 其次从URL查询参数获取
      const queryString = window.location.search
      console.log('🔗 [方法] URL查询字符串:', queryString)

      const params = new URLSearchParams(queryString)
      const contactStr = params.get('contact')
      const roomId = params.get('roomId')

      console.log('🔗 [方法] URL中的contact参数:', contactStr)
      console.log('🔗 [方法] URL中的roomId参数:', roomId)

      if (roomId) {
        this.currentContact.roomIndex = Number(roomId)
        console.log('🔗 [方法] 使用URL中的roomId参数:', roomId, '转换为:', this.currentContact.roomIndex)
      } else if (contactStr) {
        try {
          const parsedContact = JSON.parse(contactStr)
          console.log('🔗 [方法] 解析contact字符串:', parsedContact)

          this.currentContact = {
            ...this.currentContact,
            ...parsedContact,
            roomIndex: Number(parsedContact.roomIndex || parsedContact.id)
          }

          console.log('🔗 [方法] 使用contact中的roomIndex:', this.currentContact.roomIndex)
        } catch (e) {
          console.error('❌ [方法] 解析 contact 失败:', e)
          Toast.fail('解析聊天信息失败')
        }
      } else {
        console.error('❌ [方法] 没有找到房间ID')
      }

      console.log('🔗 [方法] parseRoomIdFromURL 结束, roomIndex:', this.currentContact.roomIndex, '类型:', typeof this.currentContact.roomIndex)
    },

    // 加载房间历史消息
    async loadRoomHistory(isInitialLoad = false) {
      console.log(`🔄 [方法] loadRoomHistory 开始, isInitialLoad: ${isInitialLoad}`)

      if (!this.currentContact.roomIndex) {
        console.error('❌ [方法] 无法加载消息：缺少房间编号')
        return
      }

      const roomId = Number(this.currentContact.roomIndex)
      console.log(`🔄 [方法] 使用的房间ID: ${roomId} (类型: ${typeof roomId})`)

      if (isInitialLoad) {
        this.loadingHistory = true
        this.lastMsgID = 0
        this.hasMoreMessages = true
        console.log('🔄 [方法] 初始加载，重置分页状态')
      } else {
        if (this.loadingMore || !this.hasMoreMessages) {
          console.log('⏸️ [方法] 正在加载或没有更多消息，跳过')
          return
        }
        this.loadingMore = true
        console.log('🔄 [方法] 加载更多消息')
      }

      try {
        const msgLimit = 20
        console.log(`📡 [方法] 调用loadRoomMessages: roomId=${roomId}, lastMsgID=${this.lastMsgID}, limit=${msgLimit}`)

        const messages = await this.loadRoomMessages({
          roomId: roomId,
          lastMsgID: this.lastMsgID,
          msgLimit: msgLimit
        })

        console.log(`✅ [方法] loadRoomMessages返回 ${messages.length} 条消息`)
        console.log('✅ [方法] 返回的消息详情:', messages)

        if (messages && messages.length > 0) {
          // 找到最新的消息ID
          let maxId = -Infinity
          for (const msg of messages) {
            const msgId = msg.originalId !== undefined ? msg.originalId : msg.id
            if (msgId && msgId > maxId) {
              maxId = msgId
            }
          }

          // 更新lastMsgID为最新消息的ID
          if (maxId !== -Infinity) {
            this.lastMsgID = maxId
            console.log(`📋 [方法] 找到最大ID: ${maxId}, 更新lastMsgID为: ${this.lastMsgID}`)
          }

          this.hasMoreMessages = messages.length >= msgLimit
          console.log(`📋 [方法] 是否有更多消息: ${this.hasMoreMessages}`)

          if (isInitialLoad) {
            Toast.success(`加载了 ${messages.length} 条消息`)
            console.log('✅ [方法] 初始加载完成，准备滚动到底部')

            // 等待Vuex状态更新和DOM更新
            await this.$nextTick()
            console.log('✅ [方法] $nextTick完成，开始滚动')
            this.scrollToBottom()
          } else {
            // 如果是加载更多，保持滚动位置
            Toast.success(`加载了 ${messages.length} 条历史消息`)
          }
        } else {
          this.hasMoreMessages = false
          console.log('📋 [方法] 没有加载到消息或消息为空')

          if (!isInitialLoad) {
            Toast('没有更多历史消息了')
          }
        }
      } catch (error) {
        console.error('❌ [方法] 加载消息失败:', error)
        if (isInitialLoad) {
          Toast.fail('加载聊天记录失败')
        } else {
          Toast.fail('加载更多消息失败')
        }
      } finally {
        if (isInitialLoad) {
          this.loadingHistory = false
          console.log('🔄 [方法] loadingHistory设为false')
        } else {
          this.loadingMore = false
          console.log('🔄 [方法] loadingMore设为false')
        }
      }

      console.log(`🔄 [方法] loadRoomHistory 结束`)
    },

    // 修改滚动检测逻辑，确保能够正确触发
    handleScroll(event) {
      const container = event.target

      // 防抖处理
      if (this.scrollDebounceTimer) {
        clearTimeout(this.scrollDebounceTimer)
      }

      this.scrollDebounceTimer = setTimeout(() => {
        // 更精确地检测是否滚动到顶部
        const scrollTop = container.scrollTop
        const isAtTop = scrollTop <= 10 // 几乎在顶部时就触发

        console.log('📊 [滚动] scrollTop:', scrollTop, '是否在顶部:', isAtTop,
          '可加载更多:', this.hasMoreMessages, '加载中:', this.loadingMore || this.loadingHistory)

        // 改进触发条件
        if (isAtTop && this.hasMoreMessages && !this.loadingMore && !this.loadingHistory) {
          console.log('🔄 [滚动] 滚动到顶部，触发加载更多')
          this.loadMoreMessages()
        }
      }, 150)
    },

    // 加载更多消息
    async loadMoreMessages() {
      console.log('🔄 [方法] loadMoreMessages 被调用')

      if (this.loadMoreDebounce) {
        clearTimeout(this.loadMoreDebounce)
      }

      this.loadMoreDebounce = setTimeout(async () => {
        console.log('🔄 [方法] 执行loadMoreMessages逻辑')
        await this.loadRoomHistory(false)
      }, 300)
    },

    handleImageSelect(event) {
      const file = event.target.files[0]
      if (!file) return

      if (!file.type.startsWith('image/')) {
        Toast.fail('请选择图片文件')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        Toast.fail('图片大小不能超过5MB')
        return
      }

      this.selectedImage = file
      this.imagePreviewUrl = URL.createObjectURL(file)
    },

    clearImagePreview() {
      this.selectedImage = null
      this.imagePreviewUrl = ''
      if (this.$refs.imageInput) {
        this.$refs.imageInput.value = ''
      }
    },

    async sendMessage() {
      if ((!this.canSend && !this.imagePreviewUrl) || !this.currentContact.roomIndex || this.isSending) {
        return
      }

      try {
        this.isSending = true

        if (this.selectedImage) {
          const reader = new FileReader()
          reader.onload = async (e) => {
            const base64Image = e.target.result

            try {
              await this.sendImageMessage({
                roomId: this.currentContact.roomIndex,
                base64Image: base64Image,
                fileName: this.selectedImage.name,
                fileType: this.selectedImage.type,
                fileSize: this.selectedImage.size,
                thumbnail: base64Image
              })

              this.messageText = ''
              this.clearImagePreview()
              Toast.success('图片发送成功')

              // 发送成功后滚动到底部
              this.$nextTick(() => {
                this.scrollToBottom()
              })
            } catch (error) {
              console.error('发送图片消息失败:', error)
              Toast.fail('图片发送失败')
            } finally {
              this.isSending = false
            }
          }
          reader.readAsDataURL(this.selectedImage)
        } else if (this.canSend) {
          const content = this.messageText.trim()

          try {
            await this.sendTextMessage({
              roomId: this.currentContact.roomIndex,
              content: content
            })

            this.messageText = ''
            Toast.success('消息发送成功')

            // 发送成功后滚动到底部
            this.$nextTick(() => {
              this.scrollToBottom()
            })
          } catch (error) {
            console.error('发送文本消息失败:', error)
            Toast.fail('消息发送失败')
          } finally {
            this.isSending = false
          }
        } else {
          this.isSending = false
        }
      } catch (error) {
        console.error('发送消息失败:', error)
        Toast.fail('消息发送失败')
        this.isSending = false
      }
    },

    scrollToBottom() {
      console.log('🔄 [方法] scrollToBottom 被调用')

      const container = this.$refs.messageContainer
      if (container) {
        console.log('📋 [方法] 找到消息容器，准备滚动')
        console.log('📋 [方法] 容器scrollHeight:', container.scrollHeight)
        console.log('📋 [方法] 容器clientHeight:', container.clientHeight)

        this.$nextTick(() => {
          console.log('✅ [方法] $nextTick回调，设置scrollTop:', container.scrollHeight)
          container.scrollTop = container.scrollHeight
        })
      } else {
        console.error('❌ [方法] 找不到消息容器')
      }
    },

    handleImageLoad() {
      // 图片加载完成后，如果是最新消息附近，滚动到底部
      if (this.roomMessages.length > 0) {
        const lastMessage = this.roomMessages[this.roomMessages.length - 1]
        if (lastMessage.type === 'image' && lastMessage.status !== 'sending') {
          this.scrollToBottom()
        }
      }
    },

    forceRefresh() {
      console.log('🔄 [方法] forceRefresh 被调用')
      this.$forceUpdate()
    },

    reloadMessages() {
      console.log('🔄 [方法] reloadMessages 被调用')
      this.lastMsgID = 0
      this.hasMoreMessages = true
      this.loadRoomHistory(true)
    },

    checkVuexState() {
      console.log('🔍 [调试] 检查Vuex状态')
      console.log('🔍 [调试] 当前store中的messagesByRoom:', this.$store.state.chat.messagesByRoom)
      console.log('🔍 [调试] 当前房间ID:', this.currentContact.roomIndex)
      const roomIdNum = Number(this.currentContact.roomIndex)
      console.log('🔍 [调试] 当前房间的消息:', this.$store.state.chat.messagesByRoom[roomIdNum])
      console.log('🔍 [调试] 使用getter获取:', this.getRoomMessages(roomIdNum))
    }
  },

  watch: {
    // 监听当前房间ID变化
    'currentContact.roomIndex': {
      handler(newRoomId) {
        console.log('👀 [watch] currentContact.roomIndex 变化:', newRoomId)
        if (newRoomId) {
          // 重置分页状态
          this.lastMsgID = 0
          this.hasMoreMessages = true
          console.log('👀 [watch] 重置分页状态')
        }
      }
    },

    // 监听消息变化，如果有新消息且是当前房间，滚动到底部
    roomMessages: {
      handler(newMessages, oldMessages) {
        console.log('👀 [watch] roomMessages 变化')
        console.log('👀 [watch] 旧消息数量:', oldMessages ? oldMessages.length : 0)
        console.log('👀 [watch] 新消息数量:', newMessages.length)

        if (newMessages.length > (oldMessages ? oldMessages.length : 0)) {
          const newMsg = newMessages[newMessages.length - 1]
          console.log('👀 [watch] 最后一条新消息:', newMsg)

          // 如果是自己发送的消息或者是当前房间的最新消息，滚动到底部
          if (newMsg.isMe || this.mqttStatus === 'connected') {
            console.log('👀 [watch] 触发滚动到底部')
            this.$nextTick(() => {
              this.scrollToBottom()
            })
          }
        }
      },
      deep: false
    },

    // 监听Vuex中的messagesByRoom变化
    messagesByRoom: {
      handler(newVal) {
        console.log('👀 [watch] messagesByRoom 变化')
        console.log('👀 [watch] 所有房间:', Object.keys(newVal))
        const roomIdNum = Number(this.currentContact.roomIndex)
        console.log('👀 [watch] 当前房间的消息:', newVal[roomIdNum] || [])
      },
      deep: true
    }
  }
}
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
  overflow-x: hidden;
  padding: 12px;
  background: linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%);
}

.message-item {
  margin-bottom: 16px;
  animation: fadeIn 0.3s ease;
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

.message-bubble-wrapper {
  display: flex;
  flex-direction: column;
}

/* 消息内容包装器 */
.message-content-wrapper {
  display: flex;
  align-items: flex-start;
  max-width: 100%;
}

/* 我的消息的包装器 - 确保头像在右侧 */
.mine-wrapper {
  flex-direction: row-reverse;
}

/* 消息内容容器 */
.message-content-container {
  max-width: 70%;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* 对方消息 */
.is-other .message-content-container {
  margin-left: 8px;
}

/* 我的消息 */
.is-mine .message-content-container {
  margin-right: 8px;
  align-items: flex-end;
}

.sender-name {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  margin-left: 8px;
}

/* 消息内容基础样式 */
.message-content {
  position: relative;
  padding: 12px 16px;
  border-radius: 18px;
  word-break: break-word;
  line-height: 1.5;
  font-size: 16px;
  animation: bubbleIn 0.3s ease;
  max-width: 100%;
  box-sizing: border-box;
}

@keyframes bubbleIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* 对方消息气泡 */
.is-other .message-content {
  background-color: #fff;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* 我的消息气泡 */
.is-mine .mine-content {
  background: linear-gradient(135deg, #95ec69 0%, #6dd400 100%);
  color: #fff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.message-avatar {
  flex-shrink: 0;
}

/* 对方头像 */
.is-other .message-avatar {
  margin-right: 0;
}

/* 我的头像 */
.is-mine .mine-avatar {
  margin-left: 0;
}

.message-time {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  padding: 0 8px;
}

/* 对方消息时间左对齐 */
.is-other .message-time {
  text-align: left;
}

/* 我的消息时间右对齐 */
.is-mine .mine-time {
  text-align: right;
}

.sending-indicator {
  color: #ff9900;
}

.failed-indicator {
  color: #ff4444;
}

.message-loading {
  opacity: 0.7;
}

/* 图片消息特殊处理 */
.image-message-content {
  padding: 0 !important;
  overflow: hidden;
}

.image-message {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 300px;
}

.chat-image {
  width: 100%;
  height: auto;
  max-height: 300px;
  object-fit: cover;
  display: block;
}

/* 对方图片圆角 */
.is-other .chat-image {
  border-radius: 18px 18px 18px 4px;
}

/* 我的图片圆角 */
.is-mine .chat-image {
  border-radius: 18px 18px 4px 18px;
}

/* 图片元数据 */
.image-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 12px;
  background: transparent;
}

/* 确保我的消息中图片元数据文字颜色正确 */
.is-mine .image-meta {
  color: #fff;
}

.is-mine .image-size {
  color: rgba(255, 255, 255, 0.8);
}

/* 查看原图按钮样式调整 */
.view-original-btn {
  font-size: 11px;
  padding: 2px 8px;
  height: 22px;
  line-height: 18px;
}

/* 对于我的消息中的查看原图按钮 */
.is-mine .view-original-btn {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.input-area {
  background-color: #fff;
  border-top: 1px solid #e8e8e8;
  padding: 8px 12px;
}

.input-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-input {
  flex: 1;
  background-color: #f7f8fa;
  border-radius: 18px;
  padding: 8px 16px;
  max-height: 120px;
  overflow-y: auto;
}

.send-button {
  min-width: 64px;
  height: 32px;
  border-radius: 16px;
  font-weight: 500;
}

.send-button:disabled {
  opacity: 0.5;
}

.image-preview {
  position: relative;
  margin-bottom: 10px;
  display: flex;
  justify-content: center;
}

.remove-image {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #fff;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  cursor: pointer;
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.image-button {
  min-width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: #f7f8fa;
  border: 1px solid #e8e8e8;
}

.loading-history,
.loading-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.loading-history {
  height: 200px;
}

.loading-more {
  height: 60px;
}

.empty-message {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

/* 响应式调整 */
@media (max-width: 375px) {
  .message-content-container {
    max-width: 65%;
  }

  .message-content {
    padding: 10px 14px;
    font-size: 15px;
  }

  .image-message {
    max-width: 200px;
  }
}
</style>


