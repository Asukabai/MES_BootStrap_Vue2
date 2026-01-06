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
      <MainTabBar v-if="showTabBar" />
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
      const hiddenPaths = ['login', 'inventory', 'weeklyReport', 'chatDetail', 'chat_category',
        'post-detail', 'createGroup', 'DingtalkFilePreview','inventoryExtendInfoAdd','InventoryExtendInfoView','InventoryExtendInfoEdit']
      return !hiddenPaths.some(path => this.$route.path.includes(path))
    },
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
            Toast.fail('MQTT消息服务连接成功')
          } catch (error) {
            console.error('MQTT连接失败:', error)
            Toast.fail('MQTT消息服务连接失败')
          }
        }
      })
    },
    goToChat(roomId) {
      this.$router.push({
        name: 'ChatDetail',
        query: {
          roomId: roomId
        }
      })
    },
    removeNote(id) {
      this.$store.commit('chat/REMOVE_NOTIFICATION', id)
    },
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
  /* 修复iOS滚动性能 */
  -webkit-overflow-scrolling: touch;
}

html, body {
  height: 100%;
  overflow: hidden;
}

#app {
  display: flex;
  flex-direction: column;
  position: relative;
  /* 使用现代视口单位解决iOS问题 */
  min-height: 100vh;
}

.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  height: 100%;
  /* 防止iOS弹性滚动导致的空白 */
  overscroll-behavior: contain;
  /* 为TabBar预留空间，但让Vant的placeholder处理 */
}

/* 简单通知 */
.simple-notification {
  position: fixed;
  top: max(10px, env(safe-area-inset-top, 10px));
  right: max(10px, env(safe-area-inset-right, 10px));
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

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .notification-item {
    background: rgba(30, 30, 30, 0.95);
  }

  .notification-title {
    color: #fff;
  }

  .notification-message {
    color: #ccc;
  }
}

/* ============= iOS特殊修复 ============= */
@supports (-webkit-touch-callout: none) {
  /* iOS设备 */
  #app {
    /* 修复iOS 100vh问题 - 使用现代方法 */
    min-height: 100vh;
  }

  .main-content {
    /* 修复iOS滚动回弹 */
    -webkit-overflow-scrolling: touch;
  }

  /* 确保Tabbar正确显示 - 简化样式 */
  .van-tabbar {
    /* 强制覆盖任何可能影响安全区域的样式 */
    padding-bottom: env(safe-area-inset-bottom) !important;
  }
}

/* 支持现代视口单位 */
@supports (height: 100dvh) {
  #app {
    height: 100dvh;
  }
}

/* 修复Android/HarmonyOS可能的兼容性问题 */
@supports not (-webkit-touch-callout: none) {
  .van-tabbar {
    /* 非iOS设备不需要额外padding */
    padding-bottom: 0 !important;
  }
}

/* 添加这个样式确保内容不会被TabBar遮挡 */
.van-tabbar--placeholder {
  height: auto !important;
}
</style>
