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
      <div class="main-content">
          <router-view/>
      </div>
      <!-- 底部导航 -->
      <MainTabBar v-if="showTabBar" />
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
        'post-detail', 'createGroup', 'DingtalkFilePreview','inventoryExtendInfoAdd',
        'InventoryExtendInfoView','InventoryExtendInfoEdit','vat-calculator',
        'excelUpload','InventoryInfoEdit','advanced-search','download','allTagsPage',
        'all-applications','project-manage','task-manage','statistical-report',
        'inventory-scan-results','config','codeList','AddStored','batch_scan_results']
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
<!--

.main-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

这段CSS代码定义了.main-content元素的样式，具体含义如下：
1. flex: 1
将元素设置为弹性布局的可伸缩项目
占据容器中剩余的所有可用空间
确保内容区域能够自动填充页面高度
2. overflow-y: auto
当内容超出容器高度时，自动显示垂直滚动条
只在需要时显示滚动条，避免不必要的滚动条出现
保证内容可滚动访问
3. -webkit-overflow-scrolling: touch
启用原生滚动性能优化
在iOS设备上提供流畅的触摸滚动体验
使滚动更加平滑自然

这个样式设置创建了一个可滚动的内容区域，它会自动占据页面剩余空间，并在内容超出时提供流畅的滚动体验，配合底部的MainTabBar组件实现完整的页面布局。

TabBar 为什么不能固定在页面底部？（特别重要！！！）

不同业务项目中的布局逻辑是不一样的，TabBar 本身是不含定位和外层布局相关的逻辑的，需要业务项目中配合 Popup 实现，或者自行用 CSS 实现。

-->
<style>


#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* 底部标签栏使用固定定位 */
/* MainTabBar 组件会自动处理固定定位 */


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

</style>
