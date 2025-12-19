// src/store/modules/chat.js
import SensorRequest from '../../utils/SensorRequest'
import { key_DingName, key_DingUserIndex, key_DingUserPhone } from '../../utils/Dingding.js'
import { Toast } from 'vant'

const chat = {
  namespaced: true,  // 添加这一行

  state: {
    // 全局消息存储，按房间号分组
    messagesByRoom: {},
    // 用户列表
    userList: [],
    // 当前用户信息
    currentUser: null,
    // 新消息通知
    notifications: [],
    // MQTT连接状态
    mqttStatus: 'disconnected',
    // 当前活跃的房间（用于实时消息分发）
    activeRoomId: null
  },

  mutations: {
    // 添加消息到指定房间
    ADD_MESSAGE(state, { roomId, message }) {
      if (!state.messagesByRoom[roomId]) {
        state.messagesByRoom[roomId] = []
      }

      // 防止重复消息（基于id或timestamp）
      const existingIndex = state.messagesByRoom[roomId].findIndex(
        msg => msg.id === message.id ||
          (msg.timestamp === message.timestamp && msg.senderId === message.senderId)
      )

      if (existingIndex === -1) {
        state.messagesByRoom[roomId].push(message)

        // 保持消息按时间排序
        state.messagesByRoom[roomId].sort((a, b) => {
          return new Date(a.timestamp) - new Date(b.timestamp)
        })
      }
    },

    // 批量添加消息
    SET_ROOM_MESSAGES(state, { roomId, messages }) {
      state.messagesByRoom[roomId] = messages.sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp)
      })
    },

    // 更新消息状态（如发送成功、失败等）
    UPDATE_MESSAGE_STATUS(state, { roomId, messageId, status }) {
      if (state.messagesByRoom[roomId]) {
        const messageIndex = state.messagesByRoom[roomId].findIndex(
          msg => msg.id === messageId
        )
        if (messageIndex !== -1) {
          state.messagesByRoom[roomId][messageIndex].status = status
        }
      }
    },

    // 设置用户列表
    SET_USER_LIST(state, userList) {
      state.userList = userList

      // 缓存到localStorage
      try {
        localStorage.setItem('user_list', JSON.stringify(userList))
      } catch (error) {
        console.error('缓存用户列表失败:', error)
      }
    },

    // 设置当前用户
    SET_CURRENT_USER(state, user) {
      state.currentUser = user
    },

    // 添加通知
    ADD_NOTIFICATION(state, notification) {
      state.notifications.push(notification)
      // 最多保留10条通知
      if (state.notifications.length > 10) {
        state.notifications.shift()
      }
    },

    // 移除通知
    REMOVE_NOTIFICATION(state, notificationId) {
      state.notifications = state.notifications.filter(n => n.id !== notificationId)
    },

    // 设置MQTT状态
    SET_MQTT_STATUS(state, status) {
      state.mqttStatus = status
    },

    // 设置当前活跃房间
    SET_ACTIVE_ROOM(state, roomId) {
      state.activeRoomId = roomId
    },

    // 清空房间消息
    CLEAR_ROOM_MESSAGES(state, roomId) {
      if (state.messagesByRoom[roomId]) {
        state.messagesByRoom[roomId] = []
      }
    }
  },

  actions: {
    // 初始化用户数据
    async initUserData({ commit, dispatch }) {
      try {
        // 从localStorage加载当前用户
        const name = localStorage.getItem(key_DingName)
        const userId = localStorage.getItem(key_DingUserIndex)
        const phone = localStorage.getItem(key_DingUserPhone)

        commit('SET_CURRENT_USER', {
          name: name || '未知用户',
          userId: userId,
          phone: phone || '',
          avatar: 'https://img.yzcdn.cn/vant/cat.jpeg'
        })

        // 加载用户列表
        await dispatch('loadUserList')
      } catch (error) {
        console.error('初始化用户数据失败:', error)
      }
    },

    // 加载用户列表
    loadUserList({ commit, state }) {
      return new Promise((resolve) => {
        // 如果有缓存的用户列表，直接使用
        const cachedList = localStorage.getItem('user_list')
        if (cachedList) {
          try {
            const userList = JSON.parse(cachedList)
            commit('SET_USER_LIST', userList)
            resolve(userList)
            return
          } catch (e) {
            console.warn('读取缓存用户列表失败:', e)
          }
        }

        SensorRequest.Talk_GetUserList(
          '', // 空参数获取所有用户
          (response) => {
            try {
              const respData = JSON.parse(response)
              console.log("📂 获取到的用户列表数据:", respData)

              if (Array.isArray(respData)) {
                const userList = respData.map(user => ({
                  userIndex: user.userIndex,
                  name: user.name
                }))
                commit('SET_USER_LIST', userList)
                console.log("📊 用户列表数量:", userList.length)
                resolve(userList)
              } else {
                console.warn('用户列表数据格式不符合预期:', respData)
                commit('SET_USER_LIST', [])
                resolve([])
              }
            } catch (error) {
              console.error('处理用户列表数据失败:', error)
              Toast.fail('加载用户信息失败')
              commit('SET_USER_LIST', [])
              resolve([])
            }
          },
          (error) => {
            console.error('获取用户列表失败:', error)
            Toast.fail('获取用户列表失败')
            commit('SET_USER_LIST', [])
            resolve([])
          }
        )
      })
    },

    // 处理MQTT消息
    handleMqttMessage({ commit, state, dispatch }, message) {
      console.log('📩 Vuex处理MQTT消息:', message)
      const currentUserId = state.currentUser && state.currentUser.userId ? state.currentUser.userId : localStorage.getItem(key_DingUserIndex)
      const roomId = message.toFromIndex
      if (!roomId) {
        console.warn('消息没有roomId，无法处理')
        return
      }

      // 构建消息对象
      const msgData = {
        id: message.id || `mqtt-${Date.now()}-${Math.random()}`,
        content: message.extra1 || '',
        type: message.msgType === 10 ? 'text' : (message.msgType === 30 ? 'image' : 'text'),
        isMe: message.userIndex === currentUserId,
        senderName: '未知用户',
        senderId: message.userIndex,
        timestamp: message.dtSend || new Date().toISOString(),
        status: 'read'
      }

      // 获取发送者姓名
      if (message.userIndex) {
        const user = state.userList.find(u => u.userIndex === message.userIndex)
        if (user) {
          msgData.senderName = user.name
        } else {
          // 如果用户列表中不存在，尝试重新加载用户列表
          dispatch('loadUserList').then(() => {
            // 重新获取用户名
            const updatedUser = state.userList.find(u => u.userIndex === message.userIndex)
            if (updatedUser) {
              msgData.senderName = updatedUser.name
              // 更新消息中的发送者姓名
              commit('ADD_MESSAGE', { roomId, message: msgData })
            }
          })
        }
      }

      // 图片消息处理
      if (message.msgType === 30 && message.extra3) {
        msgData.content = message.extra3
      }

      // 添加到对应房间
      commit('ADD_MESSAGE', { roomId, message: msgData })

      // 如果不是当前聊天室且不是自己发送的消息，显示通知
      const isCurrentRoom = state.activeRoomId === roomId
      const isSelfMessage = message.userIndex === currentUserId

      // if (!isCurrentRoom && !isSelfMessage) {
      //   dispatch('showNotification', {
      //     id: Date.now() + Math.random(),
      //     title: msgData.senderName,
      //     message: msgData.type === 'text'
      //       ? (msgData.content.substring(0, 30) + (msgData.content.length > 30 ? '...' : ''))
      //       : '[图片]',
      //     roomId: roomId,
      //     timestamp: Date.now()
      //   })
      // }
      if (!isCurrentRoom ) {
        dispatch('showNotification', {
          id: Date.now() + Math.random(),
          title: msgData.senderName,
          message: msgData.type === 'text'
            ? (msgData.content.substring(0, 30) + (msgData.content.length > 30 ? '...' : ''))
            : '[图片]',
          roomId: roomId,
          timestamp: Date.now()
        })
      }
    },

    // 发送文本消息
    async sendTextMessage({ commit, state }, { roomId, content }) {
      const currentUser = state.currentUser
      if (!currentUser || !content.trim()) {
        throw new Error('用户信息或消息内容为空')
      }

      const tempId = Date.now()
      const tempMessage = {
        id: tempId,
        content: content.trim(),
        type: 'text',
        isMe: true,
        senderName: currentUser.name,
        senderId: currentUser.userId,
        timestamp: new Date().toISOString(),
        status: 'sending'
      }

      // 立即添加到本地
      commit('ADD_MESSAGE', { roomId, message: tempMessage })

      // 生成UUID
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0
          const v = c == 'x' ? r : (r & 0x3 | 0x8)
          return v.toString(16)
        })
      }

      // 格式化当前时间
      const getCurrentFormattedTime = () => {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const seconds = String(now.getSeconds()).padStart(2, '0')
        return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
      }

      // 构造发送消息的参数
      const sendMsgParam = {
        msgId: generateUUID(),
        dingId: "",
        msgCaption: `${currentUser.name}: ${content.trim().substring(0, 10)}`,
        userIndex: 0,
        toFromIndex: roomId,
        isRevoked: 0,
        isDeleted: 0,
        extra1: content.trim(),
        extra2: "",
        extra3: "",
        quote: "",
        dtSend: getCurrentFormattedTime(),
        dtCreate: "",
        dtUpdate: "",
        id: 0,
        sequence: Math.floor(Date.now() / 1000),
        msgType: 10
      }

      // 调用发送消息接口
      return new Promise((resolve, reject) => {
        SensorRequest.Talk_SendMsg(
          JSON.stringify(sendMsgParam),
          (response) => {
            try {
              const respData = JSON.parse(response)
              console.log("消息发送成功:", respData)

              // 更新消息状态为已发送
              commit('UPDATE_MESSAGE_STATUS', {
                roomId,
                messageId: tempId,
                status: 'sent'
              })
              resolve(respData)
            } catch (error) {
              console.error('处理发送消息响应失败:', error)
              // 更新消息状态为发送失败
              commit('UPDATE_MESSAGE_STATUS', {
                roomId,
                messageId: tempId,
                status: 'error'
              })
              reject(error)
            }
          },
          (error) => {
            console.error('发送消息失败:', error)
            // 更新消息状态为发送失败
            commit('UPDATE_MESSAGE_STATUS', {
              roomId,
              messageId: tempId,
              status: 'error'
            })
            reject(error)
          }
        )
      })
    },

    // 发送图片消息
    async sendImageMessage({ commit, state }, { roomId, base64Image, fileName, fileType, fileSize, thumbnail }) {
      const currentUser = state.currentUser
      if (!currentUser) {
        throw new Error('用户信息为空')
      }

      const tempId = Date.now() + Math.random()
      const tempMessage = {
        id: tempId,
        content: base64Image,
        type: 'image',
        isMe: true,
        senderName: currentUser.name,
        senderId: currentUser.userId,
        timestamp: new Date().toISOString(),
        status: 'sending'
      }

      // 立即添加到本地
      commit('ADD_MESSAGE', { roomId, message: tempMessage })

      // 提取Base64编码数据，去除data:image/xxx;base64,前缀
      const extractBase64Data = (base64String) => {
        if (!base64String) return ''
        const match = base64String.match(/^data:[^;]+;base64,(.+)$/)
        if (match && match[1]) {
          return match[1]
        }
        return base64String
      }

      // 生成UUID
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0
          const v = c == 'x' ? r : (r & 0x3 | 0x8)
          return v.toString(16)
        })
      }

      // 格式化当前时间
      const getCurrentFormattedTime = () => {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const seconds = String(now.getSeconds()).padStart(2, '0')
        return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
      }

      // 构造发送图片消息的参数
      const sendMsgParam = {
        msgId: generateUUID(),
        dingId: "",
        msgCaption: `${currentUser.name}发了一个图片`,
        userIndex: 0,
        toFromIndex: roomId,
        isRevoked: 0,
        isDeleted: 0,
        extra1: fileName, // 实际文件名称
        extra2: fileType || "image/png", // 实际文件类型
        extra3: thumbnail || base64Image, // 缩略图base64
        extra4: "",
        extra5: extractBase64Data(base64Image), // 只保留Base64编码部分
        extra6: fileSize ? fileSize.toString() : "0", // 实际文件大小
        extra7: "",
        extra8: "",
        quote: "",
        dtSend: getCurrentFormattedTime(),
        dtCreate: "",
        dtUpdate: "",
        id: 0,
        sequence: Math.floor(Date.now() / 1000),
        msgType: 30 // 图片消息类型
      }

      // 调用发送消息接口
      return new Promise((resolve, reject) => {
        SensorRequest.Talk_SendMsg(
          JSON.stringify(sendMsgParam),
          (response) => {
            try {
              const respData = JSON.parse(response)
              console.log("图片消息发送成功:", respData)

              // 更新消息状态为已发送
              commit('UPDATE_MESSAGE_STATUS', {
                roomId,
                messageId: tempId,
                status: 'sent'
              })
              resolve(respData)
            } catch (error) {
              console.error('处理发送图片消息响应失败:', error)
              // 更新消息状态为发送失败
              commit('UPDATE_MESSAGE_STATUS', {
                roomId,
                messageId: tempId,
                status: 'error'
              })
              reject(error)
            }
          },
          (error) => {
            console.error('发送图片消息失败:', error)
            // 更新消息状态为发送失败
            commit('UPDATE_MESSAGE_STATUS', {
              roomId,
              messageId: tempId,
              status: 'error'
            })
            reject(error)
          }
        )
      })
    },

    // 加载房间历史消息
    async loadRoomMessages({ commit, state }, roomId) {
      return new Promise((resolve) => {
        const param = {
          roomIndex: roomId,
          lastMsgID: 0,
          msgLimit: 100,
          msgDir: 1
        }

        SensorRequest.Talk_GetRoomHistoryMsg(
          JSON.stringify(param),
          (response) => {
            try {
              const respData = JSON.parse(response)
              console.log("📂 获取到的聊天历史数据:", respData)

              if (Array.isArray(respData)) {
                const currentUserId = (state.currentUser && state.currentUser.userId) || localStorage.getItem(key_DingUserIndex)

                const messages = respData.map(item => {
                  const isMe = item.userIndex === currentUserId

                  let content = ''
                  let type = 'text'

                  if (item.msgType === 10) {
                    content = item.extra1 || '暂无内容'
                    type = 'text'
                  } else if (item.msgType === 30) {
                    content = item.extra3 || ''
                    type = 'image'
                  }

                  // 获取发送者姓名
                  let senderName = '未知用户'
                  if (item.userIndex) {
                    const user = state.userList.find(u => u.userIndex === item.userIndex)
                    if (user) {
                      senderName = user.name
                    }
                  }

                  return {
                    id: item.id || `history-${Date.now()}-${Math.random()}`,
                    content: content,
                    type: type,
                    isMe: isMe,
                    senderName: senderName,
                    senderId: item.userIndex,
                    timestamp: item.dtSend || new Date().toISOString(),
                    status: 'read'
                  }
                })

                commit('SET_ROOM_MESSAGES', { roomId, messages })
                console.log("📊 加载历史消息数量:", messages.length)
                resolve(messages)
              } else {
                console.warn('返回数据格式不符合预期:', respData)
                commit('SET_ROOM_MESSAGES', { roomId, messages: [] })
                resolve([])
              }
            } catch (error) {
              console.error('处理历史消息数据失败:', error)
              Toast.fail('加载聊天记录失败')
              commit('SET_ROOM_MESSAGES', { roomId, messages: [] })
              resolve([])
            }
          },
          (error) => {
            console.error('获取聊天历史失败:', error)
            Toast.fail('获取聊天记录失败')
            commit('SET_ROOM_MESSAGES', { roomId, messages: [] })
            resolve([])
          }
        )
      })
    },

    // 显示通知
    showNotification({ commit }, notification) {
      commit('ADD_NOTIFICATION', notification)

      // 5秒后自动移除通知
      setTimeout(() => {
        commit('REMOVE_NOTIFICATION', notification.id)
      }, 5000)
    },

    // 清除房间消息
    clearRoomMessages({ commit }, roomId) {
      commit('CLEAR_ROOM_MESSAGES', roomId)
    },

    // 更新消息中的发送者姓名
    updateSenderNames({ commit, state }) {
      // 遍历所有房间的消息，更新发送者姓名
      Object.keys(state.messagesByRoom).forEach(roomId => {
        const updatedMessages = state.messagesByRoom[roomId].map(msg => {
          if (msg.senderId && msg.senderName === '未知用户') {
            const user = state.userList.find(u => u.userIndex === msg.senderId)
            if (user) {
              return { ...msg, senderName: user.name }
            }
          }
          return msg
        })
        commit('SET_ROOM_MESSAGES', { roomId, messages: updatedMessages })
      })
    },

    // 设置活跃房间
    setActiveRoom({ commit }, roomId) {
      commit('SET_ACTIVE_ROOM', roomId)
    },

    // 设置MQTT状态
    setMqttStatus({ commit }, status) {
      commit('SET_MQTT_STATUS', status)
    }
  },

  getters: {
    // 获取指定房间的消息（已排序）
    getRoomMessages: (state) => (roomId) => {
      const messages = state.messagesByRoom[roomId] || []
      return messages.sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp)
      })
    },

    // 获取指定房间的最后一条消息
    getLastMessage: (state) => (roomId) => {
      const messages = state.messagesByRoom[roomId]
      if (!messages || messages.length === 0) return null
      return messages[messages.length - 1]
    },

    // 获取用户名
    getUserName: (state) => (userId) => {
      const user = state.userList.find(u => u.userIndex === userId)
      return user ? user.name : '未知用户'
    },

    // 获取未读通知数量
    unreadNotifications: (state) => {
      return state.notifications.length
    },

    // 获取MQTT状态
    mqttStatus: (state) => {
      return state.mqttStatus
    },

    // 获取当前活跃房间
    activeRoomId: (state) => {
      return state.activeRoomId
    }
  }
}

export default chat
