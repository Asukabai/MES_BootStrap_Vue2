// src/store/modules/chat.js
import SensorRequest from '../../utils/SensorRequest' // 引入传感器请求工具类，用于与后端通信
import { key_DingName, key_DingUserIndex, key_DingUserPhone } from '../../utils/Dingding.js' // 引入钉钉相关存储键值常量
import { Toast } from 'vant' // 引入 Vant UI 库中的 Toast 组件，用于显示提示信息
import Vue from 'vue' // 引入 Vue 实例，以便使用 Vue.set 方法保证响应式更新

// 定义 chat 模块对象，包含状态管理的所有内容
const chat = {
  namespaced: true, // 启用命名空间，避免与其他模块冲突

  // 定义模块的状态（state）
  state: {
    messagesByRoom: {}, // 存储每个房间的消息列表，以 roomId 为键
    userList: [], // 存储用户列表
    currentUser: null, // 当前登录用户信息
    notifications: [], // 通知列表
    mqttStatus: 'disconnected', // MQTT 连接状态，默认为断开连接
    activeRoomId: null, // 当前活跃的房间 ID
    paginationState: {} // 分页状态，记录每个房间的历史消息加载情况
  },

  // 定义修改状态的方法（mutations）
  mutations: {
    // 添加一条消息到指定房间
    ADD_MESSAGE(state, { roomId, message }) {
      console.log(`[Vuex Mutation] ADD_MESSAGE: roomId=${roomId}, messageId=${message.id}`)

      const roomIdNum = Number(roomId) // 将 roomId 转换为数字类型
      // 如果该房间尚未创建消息数组，则初始化
      if (!state.messagesByRoom[roomIdNum]) {
        Vue.set(state.messagesByRoom, roomIdNum, []) // 使用 Vue.set 确保响应式
        console.log(`[Vuex Mutation] 创建新房间 ${roomIdNum} 的消息数组`)
      }

      // 判断是否已经存在相同 ID 或时间戳+发送者的消息
      const existingIndex = state.messagesByRoom[roomIdNum].findIndex(
        msg => msg.id === message.id ||
          (msg.timestamp === message.timestamp && msg.senderId === message.senderId)
      )

      // 若不存在则添加并排序
      if (existingIndex === -1) {
        state.messagesByRoom[roomIdNum].push(message) // 添加消息
        state.messagesByRoom[roomIdNum].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) // 时间升序排列
        console.log(`[Vuex Mutation] 添加消息到房间 ${roomIdNum}，现在有 ${state.messagesByRoom[roomIdNum].length} 条消息`)
      } else {
        console.log(`[Vuex Mutation] 消息已存在，跳过添加`) // 已存在则不重复添加
      }
    },

    // 设置某个房间的所有消息
    SET_ROOM_MESSAGES(state, { roomId, messages }) {
      console.log(`[Vuex Mutation] SET_ROOM_MESSAGES: roomId=${roomId}, 消息数量=${messages.length}`)
      const roomIdNum = Number(roomId) // 房间号转数字
      const sortedMessages = messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) // 排序消息
      Vue.set(state.messagesByRoom, roomIdNum, sortedMessages) // 设置消息列表，并保持响应性
      console.log(`[Vuex Mutation] 设置完成，房间 ${roomIdNum} 现在有 ${sortedMessages.length} 条消息`)
    },

    // 向某个房间追加多条消息
    APPEND_ROOM_MESSAGES(state, { roomId, messages }) {
      console.log(`[Vuex Mutation] APPEND_ROOM_MESSAGES: roomId=${roomId}, 消息数量=${messages.length}`)
      const roomIdNum = Number(roomId) // 房间号转数字
      // 如果该房间尚无消息数组，则初始化为空数组
      if (!state.messagesByRoom[roomIdNum]) {
        Vue.set(state.messagesByRoom, roomIdNum, [])
      }

      // 提取消息 ID 集合防止重复插入
      const existingIds = new Set(state.messagesByRoom[roomIdNum].map(msg => msg.originalId || msg.id))
      // 过滤掉已有消息的新消息
      const newMessages = messages.filter(msg => !existingIds.has(msg.originalId || msg.id))

      // 如果有新的消息需要插入
      if (newMessages.length > 0) {
        // 新旧消息合并并按时间排序
        const updatedMessages = [...newMessages, ...state.messagesByRoom[roomIdNum]].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        Vue.set(state.messagesByRoom, roomIdNum, updatedMessages) // 更新消息列表
        console.log(`[Vuex Mutation] 追加完成，房间 ${roomIdNum} 现在有 ${updatedMessages.length} 条消息`)
      }
    },

    // 更新某条消息的状态（如发送中、已送达等）
    UPDATE_MESSAGE_STATUS(state, { roomId, messageId, status }) {
      console.log(`[Vuex Mutation] UPDATE_MESSAGE_STATUS: roomId=${roomId}, messageId=${messageId}, status=${status}`)
      const roomIdNum = Number(roomId) // 房间号转数字
      // 如果房间存在且有对应消息
      if (state.messagesByRoom[roomIdNum]) {
        const messageIndex = state.messagesByRoom[roomIdNum].findIndex(msg => msg.id === messageId) // 查找消息索引
        if (messageIndex !== -1) {
          // 替换原消息对象，保留其他属性只改状态
          Vue.set(state.messagesByRoom[roomIdNum], messageIndex, {
            ...state.messagesByRoom[roomIdNum][messageIndex],
            status
          })
          console.log(`[Vuex Mutation] 更新消息状态成功`)
        } else {
          console.warn(`[Vuex Mutation] 未找到消息ID: ${messageId}`) // 找不到消息提示警告
        }
      }
    },

    // 设置用户列表
    SET_USER_LIST(state, userList) {
      console.log(`[Vuex Mutation] SET_USER_LIST: 用户数量=${userList.length}`)
      state.userList = userList // 更新用户列表
      try {
        localStorage.setItem('user_list', JSON.stringify(userList)) // 缓存至本地存储
      } catch (error) {
        console.error('缓存用户列表失败:', error) // 出现错误输出日志
      }
    },

    // 设置当前用户信息
    SET_CURRENT_USER(state, user) {
      console.log(`[Vuex Mutation] SET_CURRENT_USER: userId=${user.userId}, name=${user.name}`)
      state.currentUser = user // 更新当前用户信息
    },

    // 添加一条通知
    ADD_NOTIFICATION(state, notification) {
      console.log(`[Vuex Mutation] ADD_NOTIFICATION: ${notification.title}`)
      state.notifications.push(notification) // 添加通知到队列
      if (state.notifications.length > 10) {
        state.notifications.shift() // 最多保留10条通知，超出则删除最早的一条
      }
    },

    // 删除一条通知
    REMOVE_NOTIFICATION(state, notificationId) {
      state.notifications = state.notifications.filter(n => n.id !== notificationId) // 移除匹配的通知项
    },

    // 设置 MQTT 状态
    SET_MQTT_STATUS(state, status) {
      console.log(`[Vuex 更新 MQTT 连接状态：] SET_MQTT_STATUS: ${status}`)
      state.mqttStatus = status // 更新 MQTT 连接状态
    },

    // 设置活跃房间 ID
    SET_ACTIVE_ROOM(state, roomId) {
      console.log(`[Vuex 转换为数字后设置：] SET_ACTIVE_ROOM: ${roomId}`)
      state.activeRoomId = Number(roomId) // 转换为数字后设置
    },

    // 清空某个房间的消息
    CLEAR_ROOM_MESSAGES(state, roomId) {
      console.log(`[Vuex // 清空该房间的消息列表：] CLEAR_ROOM_MESSAGES: ${roomId}`)
      const roomIdNum = Number(roomId) // 房间号转数字
      if (state.messagesByRoom[roomIdNum]) {
        Vue.set(state.messagesByRoom, roomIdNum, []) // 清空该房间的消息列表
      }
    },

    // 设置房间分页状态
    SET_PAGINATION_STATE(state, { roomId, lastMsgID, hasMore }) {
      console.log(`[Vuex Mutation] SET_PAGINATION_STATE: roomId=${roomId}, lastMsgID=${lastMsgID}, hasMore=${hasMore}`)
      const roomIdNum = Number(roomId) // 房间号转数字
      state.paginationState[roomIdNum] = { lastMsgID, hasMore } // 记录最后一条消息 ID 和是否有更多数据
    },

    // 重置房间分页状态
    RESET_PAGINATION_STATE(state, roomId) {
      console.log(`[Vuex Mutation] RESET_PAGINATION_STATE: ${roomId}`)
      const roomIdNum = Number(roomId) // 房间号转数字
      if (state.paginationState[roomIdNum]) {
        state.paginationState[roomIdNum] = { lastMsgID: 0, hasMore: true } // 初始化分页参数
      }
    },

    // 在 mutations 中添加新的更新消息ID的方法
    UPDATE_MESSAGE_ID(state, { roomId, tempId, realId }) {
      console.log(`[Vuex Mutation] UPDATE_MESSAGE_ID: roomId=${roomId}, tempId=${tempId}, realId=${realId}`);
      const roomIdNum = Number(roomId);

      if (state.messagesByRoom[roomIdNum]) {
        const messageIndex = state.messagesByRoom[roomIdNum].findIndex(msg => msg.id === tempId);
        if (messageIndex !== -1) {
          // 替换临时ID为真实ID
          const updatedMessage = {
            ...state.messagesByRoom[roomIdNum][messageIndex],
            id: realId,
            originalId: realId
          };
          Vue.set(state.messagesByRoom[roomIdNum], messageIndex, updatedMessage);
          console.log(`[Vuex Mutation] 更新消息ID成功`);
        } else {
          console.warn(`[Vuex Mutation] 未找到临时消息ID: ${tempId}`);
        }
      }
    }

  },

  // 定义异步操作方法（actions）
  actions: {
    // 初始化用户数据
    async initUserData({ commit, dispatch }) {
      console.log('[Vuex Action] initUserData 开始')
      try {
        const name = localStorage.getItem(key_DingName) // 获取用户名
        const userId = localStorage.getItem(key_DingUserIndex) // 获取用户 ID
        const phone = localStorage.getItem(key_DingUserPhone) // 获取手机号

        const normalizedUserId = String(userId || '') // 规范化用户 ID

        // 设置当前用户信息
        commit('SET_CURRENT_USER', {
          name: name || '未知用户',
          userId: normalizedUserId,
          phone: phone || '',
          avatar: 'https://img.yzcdn.cn/vant/cat.jpeg'
        })

        await dispatch('loadUserList') // 加载用户列表
        console.log('[Vuex Action] initUserData 完成')
      } catch (error) {
        console.error('初始化用户数据失败:', error) // 错误处理
      }
    },

    // 加载用户列表
    loadUserList({ commit }) {
      console.log('[Vuex Action] 加载用户列表 loadUserList 开始')
      return new Promise((resolve) => {
        const cachedList = localStorage.getItem('user_list') // 先尝试从缓存读取用户列表
        if (cachedList) {
          try {
            const userList = JSON.parse(cachedList) // 解析缓存数据
            console.log(`[Vuex Action] 从缓存加载用户列表: ${userList.length} 个用户`)
            // 如果缓存中的用户列表不为空，使用缓存数据
            if (userList && userList.length > 0) {
              commit('SET_USER_LIST', userList) // 提交更新用户列表
              resolve(userList) // 返回结果
              return
            } else {
              console.log('[Vuex Action] 缓存用户列表为空，跳过缓存，发起网络请求')
            }
          } catch (e) {
            console.warn('读取缓存用户列表失败:', e) // 解析失败警告
          }
        }
        // 如果缓存无效或为空，发起网络请求获取最新用户列表
        SensorRequest.Talk_GetUserList(
          '',
          (response) => {
            try {
              const respData = JSON.parse(response) // 解析返回的数据
              console.log("📂 获取到的用户列表数据:", respData)

              if (Array.isArray(respData)) {
                const userList = respData.map(user => ({
                  userIndex: user.userIndex,
                  name: user.name
                })) // 构造用户结构
                commit('SET_USER_LIST', userList) // 提交更新用户列表
                console.log("📊 用户列表数量:", userList.length)
                resolve(userList) // 返回结果
              } else {
                console.warn('用户列表数据格式不符合预期:', respData) // 数据格式异常警告
                commit('SET_USER_LIST', []) // 设置为空数组
                resolve([]) // 返回空数组
              }
            } catch (error) {
              console.error('处理用户列表数据失败:', error) // 错误处理
              Toast.fail('加载用户信息失败') // 显示错误提示
              commit('SET_USER_LIST', []) // 设置为空数组
              resolve([]) // 返回空数组
            }
          },
          (error) => {
            console.error('获取用户列表失败:', error) // 请求失败处理
            Toast.fail('获取用户列表失败') // 显示错误提示
            commit('SET_USER_LIST', []) // 设置为空数组
            resolve([]) // 返回空数组
          }
        )
      })
    },

    // 处理收到的 MQTT 消息
    handleMqttMessage({ commit, state, dispatch }, message) {
      console.log('📩 Vuex处理MQTT消息:', message)

      // 获取当前用户 ID
      const currentUserId = parseInt(
        (state.currentUser && state.currentUser.userId) ||
        localStorage.getItem(key_DingUserIndex)
      )

      const roomId = message.toFromIndex // 获取房间 ID
      if (!roomId) {
        console.warn('消息没有roomId，无法处理') // 没有房间 ID 直接返回
        return
      }

      // 构造消息结构体
      const msgData = {
        id: message.id || `mqtt-${Date.now()}-${Math.random()}`, // 生成唯一 ID
        content: message.extra1 || '', // 内容
        type: message.msgType === 10 ? 'text' : (message.msgType === 30 ? 'image' : 'text'), // 类型判断
        isMe: message.userIndex === currentUserId, // 是否为自己发出的消息
        senderName: '未知用户', // 默认发送人名称
        senderId: message.userIndex, // 发送人 ID
        timestamp: message.dtSend || new Date().toISOString(), // 时间戳
        status: 'read', // 默认状态为已读
        originalId: message.id // 原始 ID
      }

      // 根据发送人 ID 查询用户姓名
      if (message.userIndex) {
        const user = state.userList.find(u => u.userIndex === message.userIndex) // 在用户列表中查找
        if (user) {
          msgData.senderName = user.name // 设置发送人姓名
        } else {
          // 如果没找到，尝试重新加载用户列表
          dispatch('loadUserList').then(() => {
            const updatedUser = state.userList.find(u => u.userIndex === message.userIndex)
            if (updatedUser) {
              msgData.senderName = updatedUser.name // 找到后再次设置姓名
              commit('ADD_MESSAGE', { roomId, message: msgData }) // 添加消息
            }
          })
        }
      }

      // 图片消息特殊处理
      if (message.msgType === 30 && message.extra3) {
        msgData.content = message.extra3 // 图片地址赋值给 content 字段
      }

      // 显示通知提醒
      dispatch('showNotification', {
        id: Date.now() + Math.random(), // 生成唯一通知 ID
        title: msgData.senderName, // 标题即发送人名字
        message: msgData.type === 'text'
          ? (msgData.content.substring(0, 30) + (msgData.content.length > 30 ? '...' : '')) // 文本内容截断展示
          : '发送了[图片]', // 图片消息显示固定文案
        roomId,
        timestamp: Date.now()
      })
    },

    // 发送文本消息
    async sendTextMessage({ commit, state }, { roomId, content }) {
      console.log(`[Vuex Action] sendTextMessage: roomId=${roomId}, content=${content.substring(0, 20)}...`)
      const currentUser = state.currentUser // 获取当前用户信息
      if (!currentUser || !content.trim()) {
        throw new Error('用户信息或消息内容为空') // 参数校验失败抛出异常
      }

      // 使用更独特的临时ID格式
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tempMessage = {
        id: tempId,
        content: content.trim(), // 去除前后空白字符
        type: 'text', // 固定类型为文本
        isMe: true, // 自己发出的消息标记
        senderName: currentUser.name, // 发送人姓名
        senderId: currentUser.userId, // 发送人 ID
        timestamp: new Date().toISOString(), // 当前时间戳
        status: 'sending' // 初始状态为发送中
      }

      commit('ADD_MESSAGE', { roomId, message: tempMessage }) // 添加临时消息

      // UUID 生成函数
      const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })

      // 获取当前格式化的时间字符串
      const getCurrentFormattedTime = () => {
        const now = new Date()
        return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      }

      // 构造发送参数
      const sendMsgParam = {
        msgId: generateUUID(), // 生成唯一消息 ID
        dingId: "",
        msgCaption: `${currentUser.name}: ${content.trim().substring(0, 10)}`, // 消息摘要
        userIndex: 0,
        toFromIndex: roomId, // 房间 ID
        isRevoked: 0,
        isDeleted: 0,
        extra1: content.trim(), // 实际内容
        extra2: "",
        extra3: "",
        quote: "",
        dtSend: getCurrentFormattedTime(), // 发送时间
        dtCreate: "",
        dtUpdate: "",
        id: 0,
        sequence: Math.floor(Date.now() / 1000), // 时间序列号
        msgType: 10 // 消息类型：文本
      }

      // 发起实际请求
      return new Promise((resolve, reject) => {
        SensorRequest.Talk_SendMsg(
          JSON.stringify(sendMsgParam), // 序列化参数
          (response) => {
            try {
              const respData = JSON.parse(response) // 解析响应
              console.log("消息发送成功:", respData)

              // 关键修改：使用服务器返回的真实ID更新消息
              if (respData && respData.id) {
                // 先更新临时消息为真实ID
                commit('UPDATE_MESSAGE_ID', {
                  roomId,
                  tempId,
                  realId: respData.id
                });

                // 再更新状态
                commit('UPDATE_MESSAGE_STATUS', {
                  roomId,
                  messageId: respData.id,
                  status: 'sent'
                });
              } else {
                // 如果没有返回ID，仍然使用临时ID更新状态
                commit('UPDATE_MESSAGE_STATUS', {
                  roomId,
                  messageId: tempId,
                  status: 'sent'
                });
              }

              resolve(respData) // 成功返回解析后的数据
            } catch (error) {
              console.error('处理发送消息响应失败:', error)
              commit('UPDATE_MESSAGE_STATUS', { roomId, messageId: tempId, status: 'error' }) // 状态改为错误
              reject(error) // 抛出错误
            }
          },
          (error) => {
            console.error('发送消息失败:', error)
            commit('UPDATE_MESSAGE_STATUS', { roomId, messageId: tempId, status: 'error' }) // 状态改为错误
            reject(error) // 抛出错误
          }
        )
      })
    },

    // 发送图片消息
    async sendImageMessage({ commit, state }, { roomId, base64Image, fileName, fileType, fileSize, thumbnail }) {
      const currentUser = state.currentUser // 获取当前用户信息
      if (!currentUser) {
        throw new Error('用户信息为空') // 参数校验失败抛出异常
      }

      // 使用更独特的临时ID格式
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tempMessage = {
        id: tempId,
        content: base64Image, // 图片 base64 数据
        type: 'image', // 类型为图片
        isMe: true, // 自己发出的消息标记
        senderName: currentUser.name, // 发送人姓名
        senderId: currentUser.userId, // 发送人 ID
        timestamp: new Date().toISOString(), // 当前时间戳
        status: 'sending' // 初始状态为发送中
      }

      commit('ADD_MESSAGE', { roomId, message: tempMessage }) // 添加临时消息

      // 提取 base64 数据部分（去掉 data:image/jpeg;base64, 前缀）
      const extractBase64Data = (base64String) => {
        if (!base64String) return ''
        const match = base64String.match(/^data:[^;]+;base64,(.+)$/)
        return match ? match[1] : base64String
      }

      // UUID 生成函数
      const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })

      // 获取当前格式化的时间字符串
      const getCurrentFormattedTime = () => {
        const now = new Date()
        return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      }

      // 构造发送参数
      const sendMsgParam = {
        msgId: generateUUID(), // 生成唯一消息 ID
        dingId: "",
        msgCaption: `${currentUser.name}发了一个图片`, // 消息摘要
        userIndex: 0,
        toFromIndex: roomId, // 房间 ID
        isRevoked: 0,
        isDeleted: 0,
        extra1: fileName, // 文件名
        extra2: fileType || "image/png", // MIME 类型
        extra3: thumbnail, // 缩略图 URL
        extra4: "",
        extra5: extractBase64Data(base64Image), // 实际图片 base64 数据
        extra6: fileSize.toString() || "0", // 文件大小
        extra7: "",
        extra8: "",
        quote: "",
        dtSend: getCurrentFormattedTime(), // 发送时间
        dtCreate: "",
        dtUpdate: "",
        id: 0,
        sequence: Math.floor(Date.now() / 1000), // 时间序列号
        msgType: 30 // 消息类型：图片
      }

      // 发起实际请求
      return new Promise((resolve, reject) => {
        SensorRequest.Talk_SendMsg(
          JSON.stringify(sendMsgParam), // 序列化参数
          (response) => {
            try {
              const respData = JSON.parse(response) // 解析响应
              console.log("图片消息发送成功:", respData)

              // 关键修改：使用服务器返回的真实ID更新消息
              if (respData && respData.id) {
                // 先更新临时消息为真实ID
                commit('UPDATE_MESSAGE_ID', {
                  roomId,
                  tempId,
                  realId: respData.id
                });

                // 再更新状态
                commit('UPDATE_MESSAGE_STATUS', {
                  roomId,
                  messageId: respData.id,
                  status: 'sent'
                });
              } else {
                // 如果没有返回ID，仍然使用临时ID更新状态
                commit('UPDATE_MESSAGE_STATUS', {
                  roomId,
                  messageId: tempId,
                  status: 'sent'
                });
              }

              resolve(respData) // 成功返回解析后的数据
            } catch (error) {
              console.error('处理发送图片消息响应失败:', error)
              commit('UPDATE_MESSAGE_STATUS', { roomId, messageId: tempId, status: 'error' }) // 状态改为错误
              reject(error) // 抛出错误
            }
          },
          (error) => {
            console.error('发送图片消息失败:', error)
            commit('UPDATE_MESSAGE_STATUS', { roomId, messageId: tempId, status: 'error' }) // 状态改为错误
            reject(error) // 抛出错误
          }
        )
      })
    },

    // 加载房间历史消息
// 异步加载房间历史消息的方法
    async loadRoomMessages({ commit, state, getters, dispatch }, { roomId, lastMsgID, msgLimit }) {
      // 输出日志，记录开始加载房间消息的操作及参数
      console.log(`[Vuex Action] loadRoomMessages 开始: roomId=${roomId}, lastMsgID=${lastMsgID}, msgLimit=${msgLimit}`)

      // 返回一个Promise，用于异步处理结果
      return new Promise((resolve) => {
        // 构建请求参数对象
        const param = {
          roomIndex: parseInt(roomId), // 将房间ID转换为整数类型
          lastMsgID: lastMsgID || 0, // 上次加载的最后一条消息ID，如果没有则设为0
          msgLimit: msgLimit || 20, // 每次加载的消息数量限制，默认为20条
          msgDir: 1 // 消息加载方向，1表示向上加载历史消息
        }

        // 调用SensorRequest的Talk_GetRoomHistoryMsg方法获取房间历史消息
        SensorRequest.Talk_GetRoomHistoryMsg(
          JSON.stringify(param), // 将参数对象序列化为JSON字符串
          // 成功回调函数
          async (response) => {
            try {
              // 解析服务器返回的响应数据
              const respData = JSON.parse(response)
              // 输出获取到的聊天历史数据日志
              console.log("📂 获取到的聊天历史数据:", respData)

              // 判断返回数据是否为数组格式
              if (Array.isArray(respData)) {
                let currentUserIndex = null // 初始化当前用户索引变量
                // 获取当前用户的ID，优先从state.currentUser.userId获取，否则从localStorage获取
                const currentUserName = localStorage.getItem(key_DingName)
                // 输出当前用户ID的日志
                console.log("获取当前用户 name, currentUserName:",currentUserName)

                // 如果当前用户ID存在
                if (currentUserName) {
                  // 在用户列表中查找当前用户信息
                  console.log("state.userList:", state.userList)

                  // 检查用户列表是否为空，如果为空则重新加载
                  if (!state.userList || state.userList.length === 0) {
                    console.log("用户列表为空，重新加载用户列表");
                    try {
                      // 等待用户列表加载完成
                      await dispatch('loadUserList');
                      // 确保用户列表已更新后再查找当前用户
                      const updatedUser = state.userList.find(u =>
                        String(u.name) === String(currentUserName)
                      );
                      if (updatedUser) {
                        currentUserIndex = updatedUser.userIndex;
                        console.log("currentUserIndex33333333333333:", currentUserIndex);
                      } else {
                        console.log("重新加载后仍未找到当前用户:", currentUserName);
                      }
                    } catch (e) {
                      console.warn('重新加载用户列表失败:', e);
                    }
                  } else {
                    // 用户列表不为空，直接查找当前用户
                    const currentUserInList = state.userList.find(u =>
                      String(u.name) === String(currentUserName)
                    );
                    console.log("在用户列表中查找当前用户信息 currentUserInList", currentUserInList);

                    // 如果找到了当前用户信息
                    if (currentUserInList) {
                      // 设置当前用户索引
                      currentUserIndex = currentUserInList.userIndex;
                      // 输出当前用户索引的日志
                      console.log("currentUserIndex22222222222222:", currentUserIndex);
                    } else {
                      // 如果未找到当前用户，尝试重新加载用户列表
                      try {
                        await dispatch('loadUserList'); // 异步调用加载用户列表action
                        // 重新在更新后的用户列表中查找当前用户
                        const updatedUser = state.userList.find(u =>
                          String(u.name) === String(currentUserName)
                        );
                        // 如果找到了更新后的用户信息
                        if (updatedUser) {
                          // 设置当前用户索引
                          currentUserIndex = updatedUser.userIndex;
                          // 输出当前用户索引的日志
                          console.log("currentUserIndex44444444444444:", currentUserIndex);
                        } else {
                          console.log("重新加载后仍未找到当前用户:", currentUserName);
                        }
                      } catch (e) {
                        // 处理重新加载用户列表失败的情况
                        console.warn('重新加载用户列表失败:', e);
                      }
                    }
                  }
                }

                // 输出当前用户索引的日志
                console.log("currentUserIndex", currentUserIndex)

                // 遍历返回的消息数据，构建消息对象数组
                const messages = respData.map(item => {
                  // 判断消息是否为自己发送的（根据userIndex匹配）
                  const isMe = item.userIndex === currentUserIndex
                  // 输出isMe判断结果的日志
                  console.log("isMe",isMe)
                  let content = '', type = 'text' // 初始化消息内容和类型

                  // 根据消息类型设置消息内容和类型
                  if (item.msgType === 10) {
                    // 文本消息类型
                    content = item.extra1 || '暂无内容' // 从extra1字段获取文本内容
                    type = 'text' // 设置类型为文本
                  } else if (item.msgType === 30) {
                    // 图片消息类型
                    content = item.extra3 || '' // 从extra3字段获取图片URL
                    type = 'image' // 设置类型为图片
                  }

                  // 在用户列表中查找发送者信息
                  const user = state.userList.find(u => u.userIndex === item.userIndex)
                  // 设置发送者名称，如果找不到则显示"未知用户"
                  const senderName = user ? user.name : '未知用户'

                  // 返回构建好的消息对象
                  return {
                    id: item.id || `history-${Date.now()}-${Math.random()}`, // 消息ID，如果没有则生成唯一ID
                    content, // 消息内容
                    type, // 消息类型
                    isMe, // 是否为自己发送的消息
                    senderName, // 发送者名称
                    senderId: item.userIndex, // 发送者ID
                    timestamp: item.dtSend || new Date().toISOString(), // 消息时间戳
                    status: 'read', // 消息状态设为已读
                    originalId: item.id // 原始消息ID
                  }
                })

                // 输出处理后的消息数量日志
                console.log(`📊 处理后的消息数量: ${messages.length}`)
                // 输出所有消息的isMe值日志
                console.log(`📊 isMe 值: ${messages.map(m => m.isMe).join(', ')}`)

                // 根据lastMsgID决定是覆盖还是追加消息
                if (lastMsgID === 0) {
                  // 如果是首次加载（lastMsgID为0），则覆盖房间消息
                  commit('SET_ROOM_MESSAGES', { roomId, messages })
                } else {
                  // 如果不是首次加载，则追加消息到现有消息列表
                  commit('APPEND_ROOM_MESSAGES', { roomId, messages })
                }

                // 如果有消息数据，更新分页状态
                if (messages.length > 0) {
                  // 找到最新的消息（ID最大的消息）
                  const latestMessage = messages.reduce((latest, current) => {
                    // 获取当前消息和最新消息的ID（优先使用originalId）
                    const currentId = current.originalId || current.id
                    const latestId = latest.originalId || latest.id
                    // 比较ID大小，返回ID更大的消息
                    return currentId > latestId ? current : latest
                  }, messages[0]) // 初始值设为第一条消息

                  // 判断是否还有更多消息可以加载
                  const hasMore = messages.length >= (msgLimit || 20)
                  // 提交分页状态更新
                  commit('SET_PAGINATION_STATE', {
                    roomId, // 房间ID
                    lastMsgID: latestMessage.originalId || latestMessage.id, // 最新消息ID
                    hasMore // 是否还有更多消息
                  })
                }

                // 解析Promise，返回处理后的消息数组
                resolve(messages)
              } else {
                // 如果返回数据不是数组格式，输出警告日志
                console.warn('返回数据格式不符合预期:', respData)
                // 如果是首次加载，设置房间消息为空数组
                if (lastMsgID === 0) {
                  commit('SET_ROOM_MESSAGES', { roomId, messages: [] })
                }
                // 设置分页状态为无更多消息
                commit('SET_PAGINATION_STATE', { roomId, lastMsgID, hasMore: false })
                // 解析Promise，返回空数组
                resolve([])
              }
            } catch (error) {
              // 处理解析历史消息数据时出现的错误
              console.error('处理历史消息数据失败:', error)
              // 显示加载聊天记录失败的提示
              Toast.fail('加载聊天记录失败')
              // 如果是首次加载，设置房间消息为空数组
              if (lastMsgID === 0) {
                commit('SET_ROOM_MESSAGES', { roomId, messages: [] })
              }
              // 解析Promise，返回空数组
              resolve([])
            }
          },
          // 失败回调函数
          (error) => {
            // 输出获取聊天历史失败的错误日志
            console.error('获取聊天历史失败:', error)
            // 显示获取聊天记录失败的提示
            Toast.fail('获取聊天记录失败')
            // 如果是首次加载，设置房间消息为空数组
            if (lastMsgID === 0) {
              commit('SET_ROOM_MESSAGES', { roomId, messages: [] })
            }
            // 解析Promise，返回空数组
            resolve([])
          }
        )
      })
    },

    // 获取房间分页状态
    getRoomPaginationState({ state }, roomId) {
      const roomIdNum = Number(roomId) // 房间号转数字
      return state.paginationState[roomIdNum] || { lastMsgID: 0, hasMore: true } // 返回分页状态
    },

    // 重置房间分页状态
    resetRoomPagination({ commit }, roomId) {
      commit('RESET_PAGINATION_STATE', roomId) // 提交重置动作
    },

    // 显示通知并在一段时间后自动移除
    showNotification({ commit }, notification) {
      commit('ADD_NOTIFICATION', notification) // 添加通知
      setTimeout(() => {
        commit('REMOVE_NOTIFICATION', notification.id) // 定时移除通知
      }, 5000) // 5秒后消失
    },

    // 清空房间消息
    clearRoomMessages({ commit }, roomId) {
      commit('CLEAR_ROOM_MESSAGES', roomId) // 提交清空动作
    },

    // 更新所有消息的发送人姓名
    updateSenderNames({ commit, state }) {
      Object.keys(state.messagesByRoom).forEach(roomId => {
        const updatedMessages = state.messagesByRoom[roomId].map(msg => {
          if (msg.senderId && msg.senderName === '未知用户') {
            const user = state.userList.find(u => u.userIndex === msg.senderId) // 查找用户姓名
            if (user) {
              return { ...msg, senderName: user.name } // 更新姓名
            }
          }
          return msg // 不变返回原消息
        })
        commit('SET_ROOM_MESSAGES', { roomId, messages: updatedMessages }) // 提交更新消息
      })
    },

    // 设置活跃房间
    setActiveRoom({ commit }, roomId) {
      console.log(`[Vuex Action] setActiveRoom: ${roomId}`)
      commit('SET_ACTIVE_ROOM', roomId) // 提交设置活跃房间的动作
    },

    // 设置 MQTT 状态
    setMqttStatus({ commit }, status) {
      console.log(`[Vuex Action] setMqttStatus: ${status}`)
      commit('SET_MQTT_STATUS', status) // 提交设置 MQTT 状态的动作
    }
  },

  // 定义计算属性（getters）
  getters: {
    // 获取指定房间的消息列表
    getRoomMessages: (state) => (roomId) => {
      const roomIdNum = Number(roomId) // 房间号转数字
      const messages = state.messagesByRoom[roomIdNum] || [] // 获取消息列表
      return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) // 排序返回
    },

    // 获取指定房间的最后一条消息
    getLastMessage: (state) => (roomId) => {
      const roomIdNum = Number(roomId) // 房间号转数字
      const messages = state.messagesByRoom[roomIdNum] // 获取消息列表
      return messages.length ? messages[messages.length - 1] : null // 返回最后一条消息或 null
    },

    // 根据用户 ID 获取用户名
    getUserName: (state) => (userId) => {
      const user = state.userList.find(u => u.userIndex === userId) // 查找用户
      return user ? user.name : '未知用户' // 返回姓名或默认值
    },

    // 获取未读通知数量
    unreadNotifications: (state) => state.notifications.length,

    // 获取 MQTT 状态
    mqttStatus: (state) => state.mqttStatus,

    // 获取活跃房间 ID
    activeRoomId: (state) => state.activeRoomId,

    // 获取房间分页状态
    getRoomPaginationState: (state) => (roomId) => {
      const roomIdNum = Number(roomId) // 房间号转数字
      return state.paginationState[roomIdNum] || { lastMsgID: 0, hasMore: true } // 返回分页状态
    }
  }
}

export default chat // 导出 chat 模块供其他地方使用
