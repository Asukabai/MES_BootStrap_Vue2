// src/services/MqttService.js - 简化版
import mqtt from 'mqtt'
import { Toast } from 'vant'
import store from '../store' // 引入store

class MqttService {
  constructor() {
    this.client = null
    this.connected = false
    this.userId = null
  }

  // 初始化连接
  async init(userId, token) {
    if (!userId || !token) return false

    this.userId = userId

    // 清理旧连接
    if (this.client) {
      this.client.end()
    }

    const options = {
      username: userId,
      password: token,
    }

    try {
      this.client = mqtt.connect('wss://api-v2.sensor-smart.cn:29028/mqtt6', options)

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('连接超时'))
        }, 10000)

        this.client.once('connect', () => {
          clearTimeout(timeout)
          this.connected = true
          console.log('✅ MQTT连接成功')
          // 同步连接状态到Vuex
          store.dispatch('chat/setMqttStatus', 'connected')

          // 订阅主题
          const topic = `SensorRTU/talk/msg1/${userId}`
          this.client.subscribe(topic, { qos: 1 })

          // 设置消息监听
          this.client.on('message', (topic, message) => {
            try {
              const msg = JSON.parse(message.toString())
              console.log('📩 收到消息:', msg)

              // 直接调用Vuex action处理消息
              store.dispatch('chat/handleMqttMessage', msg)

            } catch (error) {
              console.error('消息处理错误:', error)
            }
          })

          resolve(true)
        })

        this.client.once('error', (error) => {
          clearTimeout(timeout)
          this.connected = false
          // 同步错误状态到Vuex
          store.dispatch('chat/setMqttStatus', 'error')
          reject(error)
        })
      })
    } catch (error) {
      console.error('连接失败:', error)
      return false
    }
  }

  // 断开连接
  disconnect() {
    if (this.client) {
      this.client.end()
      this.client = null
    }
    this.connected = false
  }

  // 发送消息
  publish(topic, message) {
    if (!this.connected || !this.client) return false

    return new Promise((resolve, reject) => {
      this.client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
        if (err) reject(err)
        else resolve(true)
      })
    })
  }
}

export default new MqttService()
