<template>
  <div id="app">
    <!-- 简单通知 -->
    <div v-if="notifications.length > 0" class="simple-notification">
      <div
        v-for="note in notifications"
        :key="note.id"
        class="notification-item"
        @click="goToChat(note.roomId)"
      >
        <div class="notification-title">{{ note.title }}</div>
        <div class="notification-message">{{ note.message }}</div>
        <div class="notification-time">{{ formatTime(note.timestamp) }}</div>
        <span class="notification-close" @click.stop="removeNote(note.id)">×</span>
      </div>
    </div>

    <div class="app-content">
      <div class="main-content">
        <router-view />
      </div>
      <!-- 底部导航 -->
      <div
        v-if="showTabBar"
        class="tabbar-content"
      >
        <MainTabBar/>
      </div>
    </div>
  </div>
</template>

<script>
import MainTabBar from "./components/MainTabBar.vue"
import MqttService from './services/MqttService'
import { GetDingUserToken, key_DingUserIndex } from './utils/Dingding'
import { Toast } from 'vant'

export default {
  name: 'App',
  components: {
    MainTabBar
  },
  data() {
    return {
      // 不需要本地状态，全部用Vuex
    }
  },
  computed: {
    showTabBar() {
      const hiddenPaths = ['login', 'inventory', 'weeklyReport', 'chatDetail', 'chat_category', 'post-detail', 'createGroup']
      return !hiddenPaths.some(path => this.$route.path.includes(path))
    },

    // 直接从Vuex获取通知
    notifications() {
      return this.$store.state.chat.notifications
    }
  },
  mounted() {
    this.initMqtt()
  },
  beforeDestroy() {
    MqttService.disconnect()
  },
  methods: {
    async initMqtt() {
      const userId = localStorage.getItem(key_DingUserIndex)
      const department = this.$route.params.department

      if (!userId || !department) {
        setTimeout(() => this.initMqtt(), 5000)
        return
      }

      GetDingUserToken(department, async (token) => {
        if (token) {
          try {
            await MqttService.init(userId, token)
            console.log('MQTT连接成功')
          } catch (error) {
            console.error('MQTT连接失败:', error)
            Toast.fail('消息服务连接失败')
          }
        }
      })
    },

    // 跳转到聊天
    goToChat(roomId) {
      this.$router.push({
        name: 'ChatDetail',
        query: {
          roomId: roomId
        }
      })
    },

    // 移除通知
    removeNote(id) {
      this.$store.commit('chat/REMOVE_NOTIFICATION', id)
    },

    // 格式化时间
    formatTime(timestamp) {
      const diff = Date.now() - timestamp
      if (diff < 60000) return '刚刚'
      if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
      const date = new Date(timestamp)
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
    }
  }
}
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
}

#app {
  display: flex;
  flex-direction: column;
}

.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* iOS平滑滚动 */
}

/* 底部导航栏固定定位 */
.tabbar-content {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background-color: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);

  /* 适配iOS安全区域 */
  padding-bottom: env(safe-area-inset-bottom);
  padding-bottom: constant(safe-area-inset-bottom); /* 兼容旧版本iOS */
}

/* 安卓和鸿蒙系统适配 */
@supports not (padding-bottom: env(safe-area-inset-bottom)) {
  .tabbar-content {
    padding-bottom: 0;
  }
}

/* 简单通知 */
.simple-notification {
  position: fixed;
  top: 10px;
  right: 10px;
  max-width: 300px;
  z-index: 9999;
}

.notification-item {
  background: white;
  border-radius: 8px;
  padding: 12px 15px;
  margin-bottom: 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  border-left: 4px solid #07c160;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s;
}

.notification-item:hover {
  transform: translateY(-2px);
}

.notification-title {
  font-weight: bold;
  margin-bottom: 5px;
  color: #333;
}

.notification-message {
  color: #666;
  font-size: 14px;
  margin-bottom: 5px;
}

.notification-time {
  color: #999;
  font-size: 12px;
}

.notification-close {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  padding: 2px 6px;
}

.notification-close:hover {
  color: #ff4444;
}

/* 隐藏底部导航栏时调整内容区域 */
.app-content:has(.tabbar-content) .main-content {
  padding-bottom: 60px; /* 预留底部导航栏高度 */
}
</style>
