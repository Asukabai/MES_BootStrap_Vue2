// src/services/MqttService.js
import mqtt from 'mqtt'
import { Toast } from 'vant'

class MqttService {
  constructor() {
    this.client = null
    this.connected = false
    this.userId = null
    this.messageCallbacks = new Map() // 存储各个页面的回调函数
    this.globalCallbacks = [] // 全局回调（用于通知等）
    this.reconnectTimer = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
  }

  /**
   * 初始化MQTT连接
   */
  async init(userId, token) {
    if (!userId || !token) {
      console.error('MQTT初始化失败: 缺少用户ID或token')
      return false
    }

    this.userId = userId

    // 防止重复连接
    if (this.client && this.connected) {
      console.log('MQTT已连接，无需重新连接')
      return true
    }

    console.log('=== MQTT全局初始化开始 ===')
    console.log('用户ID:', userId)

    const options = {
      username: userId,
      password: token,
    }

    try {
      this.client = mqtt.connect('wss://api-v2.sensor-smart.cn:29028/mqtt6', options)
      this.setupEventListeners()

      // 返回连接Promise
      return new Promise((resolve, reject) => {
        // 设置连接超时
        const timeout = setTimeout(() => {
          console.error('MQTT连接超时')
          reject(new Error('MQTT连接超时'))
        }, 15000)

        // 监听首次连接成功
        const onConnect = () => {
          clearTimeout(timeout)
          console.log('✅ MQTT全局连接成功')
          this.connected = true
          resolve(true)
        }

        // 监听连接错误
        const onError = (error) => {
          clearTimeout(timeout)
          console.error('MQTT连接错误:', error)
          reject(error)
        }

        // 临时监听连接事件
        this.client.once('connect', onConnect)
        this.client.once('error', onError)
      })
    } catch (error) {
      console.error('MQTT连接异常:', error)
      return false
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (!this.client) return

    // 连接成功
    this.client.on('connect', () => {
      console.log('✅ MQTT全局连接成功')
      this.connected = true
      this.reconnectAttempts = 0

      if (this.userId) {
        // 订阅个人消息主题
        const topic = `SensorRTU/talk/msg1/${this.userId}`
        this.client.subscribe(topic, { qos: 1 }, (err) => {
          if (err) {
            console.error('❌ 订阅主题失败:', err)
          } else {
            console.log('✅ 成功订阅全局主题:', topic)
          }
        })
      }

      // 通知所有页面连接成功
      this.notifyGlobal({ type: 'connected', data: { userId: this.userId } })

      // 显示连接成功提示
      Toast.success('消息服务已连接')
    })

    // 接收消息
    this.client.on('message', (topic, message) => {
      console.log('📩 收到全局MQTT消息:', {
        topic,
        message: message.toString(),
        timestamp: new Date().toISOString()
      })

      try {
        const parsedMessage = JSON.parse(message.toString())
        this.handleMessage(parsedMessage)
      } catch (error) {
        console.error('❌ 消息解析失败:', error)
      }
    })

    // 错误处理
    this.client.on('error', (error) => {
      console.error('❌ MQTT连接错误:', error)
      this.connected = false
      this.notifyGlobal({ type: 'error', data: error })
      Toast.fail('消息服务连接失败')
      this.attemptReconnect()
    })

    // 连接关闭
    this.client.on('close', () => {
      console.log('🔌 MQTT连接关闭')
      this.connected = false
      this.notifyGlobal({ type: 'disconnected' })
      Toast('消息服务已断开')
      this.attemptReconnect()
    })

    // 重连事件
    this.client.on('reconnect', () => {
      console.log('🔄 MQTT正在重新连接...')
      this.notifyGlobal({ type: 'reconnecting' })
    })

    // 离线事件
    this.client.on('offline', () => {
      console.log('📴 MQTT已离线')
      this.connected = false
      this.notifyGlobal({ type: 'offline' })
    })
  }

  /**
   * 处理收到的消息
   */
  handleMessage(message) {
    if (!message || typeof message !== 'object') {
      console.warn('⚠️ 收到无效消息格式:', message)
      return
    }

    console.log('🔍 处理MQTT消息:', {
      消息ID: message.id || message.msgId,
      房间号: message.toFromIndex,
      发送者: message.userIndex,
      消息类型: message.msgType,
      内容: (message.extra1 && message.extra1.substring(0, 50)) + '...'
    })

    // 1. 发送给特定页面的回调（按房间号）
    if (message.toFromIndex) {
      this.notifyPageCallbacks(message)
    }

    // 2. 发送给全局回调
    this.notifyGlobalCallbacks(message)

    // 3. 显示全局通知（如果是别人发的消息且不是当前房间）
    if (message.userIndex && message.userIndex !== this.userId) {
      this.showNotification(message)
    }
  }

  /**
   * 通知页面特定的回调
   */
  notifyPageCallbacks(message) {
    const roomIndex = message.toFromIndex
    if (roomIndex && this.messageCallbacks.has(roomIndex)) {
      const callback = this.messageCallbacks.get(roomIndex)
      if (typeof callback === 'function') {
        try {
          callback(message)
        } catch (error) {
          console.error('❌ 页面回调执行失败:', error)
        }
      }
    }
  }

  /**
   * 通知全局回调
   */
  notifyGlobalCallbacks(message) {
    this.globalCallbacks.forEach((callback, index) => {
      if (typeof callback === 'function') {
        try {
          callback(message)
        } catch (error) {
          console.error(`❌ 全局回调 ${index} 执行失败:`, error)
        }
      }
    })
  }

  /**
   * 显示全局通知
   */
  showNotification(message) {
    // 检查是否是当前用户自己发的消息
    if (message.userIndex === this.userId) {
      return // 自己发的消息不显示通知
    }

    // 这里可以调用浏览器的Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      const senderName = this.getSenderName(message.userIndex) || '新消息'
      const notification = new Notification(senderName, {
        body: (message.extra1 && message.extra1.substring(0, 50)) || '您收到一条新消息',
        icon: '/favicon.ico',
        tag: `message_${message.toFromIndex}_${message.id}`
      })

      notification.onclick = () => {
        // 点击通知时触发的事件，可以在App.vue中处理
        this.notifyGlobal({
          type: 'notification_click',
          data: {
            roomIndex: message.toFromIndex,
            message: message
          }
        })
      }
    }
  }

  /**
   * 获取发送者名称（需要实际实现）
   */
  getSenderName(userIndex) {
    // 这里可以从localStorage或全局状态获取用户列表
    try {
      const userListStr = localStorage.getItem('user_list')
      if (userListStr) {
        const userList = JSON.parse(userListStr)
        const user = userList.find(u => u.userIndex === userIndex)
        return user ? user.name : `用户${userIndex}`
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
    }
    return `用户${userIndex}`
  }

  /**
   * 尝试重新连接
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('已达到最大重连次数')
      Toast.fail('消息服务重连失败，请检查网络')
      return
    }

    clearTimeout(this.reconnectTimer)
    this.reconnectAttempts++

    console.log(`🔄 尝试重新连接... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    this.reconnectTimer = setTimeout(() => {
      if (this.client) {
        // MQTT客户端会自动重连，这里只是日志记录
        console.log('触发自动重连机制...')
      }
    }, 3000 * this.reconnectAttempts) // 指数退避
  }

  /**
   * 注册页面消息回调
   * @param {string} roomIndex 房间ID
   * @param {Function} callback 回调函数
   */
  registerCallback(roomIndex, callback) {
    if (roomIndex && typeof callback === 'function') {
      this.messageCallbacks.set(roomIndex, callback)
      console.log(`✅ 注册房间 ${roomIndex} 的消息回调，当前回调数量: ${this.messageCallbacks.size}`)
    }
  }

  /**
   * 注销页面消息回调
   * @param {string} roomIndex 房间ID
   */
  unregisterCallback(roomIndex) {
    if (this.messageCallbacks.has(roomIndex)) {
      this.messageCallbacks.delete(roomIndex)
      console.log(`✅ 注销房间 ${roomIndex} 的消息回调，剩余回调数量: ${this.messageCallbacks.size}`)
    }
  }

  /**
   * 注册全局回调
   * @param {Function} callback 回调函数
   * @returns {Function} 注销函数
   */
  registerGlobalCallback(callback) {
    if (typeof callback === 'function') {
      this.globalCallbacks.push(callback)
      console.log(`✅ 注册全局回调，当前全局回调数量: ${this.globalCallbacks.length}`)

      // 返回注销函数
      return () => {
        const index = this.globalCallbacks.indexOf(callback)
        if (index > -1) {
          this.globalCallbacks.splice(index, 1)
          console.log('✅ 通过返回函数注销全局回调')
        }
      }
    }
  }

  /**
   * 注销全局回调
   * @param {Function} callback 回调函数
   */
  unregisterGlobalCallback(callback) {
    const index = this.globalCallbacks.indexOf(callback)
    if (index > -1) {
      this.globalCallbacks.splice(index, 1)
      console.log(`✅ 注销全局回调，剩余全局回调数量: ${this.globalCallbacks.length}`)
    }
  }

  /**
   * 通知全局状态变化
   */
  notifyGlobal(data) {
    this.globalCallbacks.forEach(callback => {
      if (typeof callback === 'function') {
        try {
          callback(data)
        } catch (error) {
          console.error('全局回调执行失败:', error)
        }
      }
    })
  }

  /**
   * 发送消息
   */
  publish(topic, message) {
    if (!this.connected || !this.client) {
      console.error('❌ MQTT未连接，无法发送消息')
      return false
    }

    return new Promise((resolve, reject) => {
      this.client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
        if (err) {
          console.error('❌ 发布消息失败:', err)
          reject(err)
        } else {
          console.log('✅ 消息发布成功:', topic)
          resolve(true)
        }
      })
    })
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.client) {
      console.log('正在断开全局MQTT连接...')

      clearTimeout(this.reconnectTimer)
      this.reconnectAttempts = 0

      try {
        this.client.end(true)
        this.client.removeAllListeners()
      } catch (error) {
        // 忽略断开时的错误
        console.log('断开连接时的小错误:', error.message)
      }

      this.client = null
      this.connected = false
      this.messageCallbacks.clear()
      this.globalCallbacks = []

      console.log('✅ MQTT连接已断开')
    }
  }

  /**
   * 获取连接状态
   */
  getStatus() {
    return {
      connected: this.connected,
      userId: this.userId,
      reconnectAttempts: this.reconnectAttempts,
      client: this.client,
      callbacksCount: this.messageCallbacks.size,
      globalCallbacksCount: this.globalCallbacks.length
    }
  }

  /**
   * 检查连接状态
   */
  isConnected() {
    return this.connected && this.client
  }

  /**
   * 重新初始化连接
   */
  async reinitialize(userId, token) {
    console.log('🔄 重新初始化MQTT连接...')
    this.disconnect()
    return await this.init(userId, token)
  }
}

// 导出单例
export default new MqttService()
