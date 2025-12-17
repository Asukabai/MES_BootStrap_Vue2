<template>
  <div id="app">
    <div class="app-content">
      <div class="main-content">
        <router-view />
      </div>
      <div
        v-if="!$route.path.includes('login')
        && !$route.path.includes('inventory')
        && !$route.path.includes('weeklyReport')
        && !$route.path.includes('chatDetail')
        && !$route.path.includes('chat_category')
        && !$route.path.includes('post-detail')
        && !$route.path.includes('createGroup')
"
        class="tabbar-content"
        :class="{ 'ios-tabbar': isIOS, 'android-tabbar': !isIOS && !isHarmonyOS, 'harmony-tabbar': isHarmonyOS }"
      >
        <MainTabBar/>
      </div>
    </div>

    <!-- 全局通知 -->
    <van-notify v-if="showGlobalNotification" type="success" :message="notificationMessage"/>
  </div>
</template>

<script>
import {GetDingUserToken, key_DingName, key_DingUserIndex, key_DingUserPhone} from './utils/Dingding'
import MainTabBar from "./components/MainTabBar.vue"
import MqttService from './services/MqttService'
import {Toast, Notify} from 'vant'

export default {
  name: 'App',
  components: {
    MainTabBar
  },
  data() {
    return {
      isIOS: false,
      isHarmonyOS: false,
      mqttInitialized: false,
      showGlobalNotification: false,
      notificationMessage: '',
      notificationTimer: null,
      currentUserId: null
    }
  },
  mounted() {
    this.detectOS();
    this.checkUserToken();
    this.setupGlobalMQTT();

    // 监听路由变化，在离开聊天页面时处理通知
    this.$router.afterEach((to, from) => {
      // 如果是从聊天页面离开，清除通知
      if (from.name === 'ChatDetail') {
        this.clearNotifications();
      }
    });
  },
  watch: {
    // 监听路由变化，在每次路由切换时检查 token
    '$route'(to, from) {
      // 避免在登录页面重复检查
      if (!to.path.includes('login')) {
        console.log('监听路由变化，在每次路由切换时检查 token, [App] 检查用户token，部门:', this.$route.params.department);
        this.checkUserToken();
      }
    }
  },
  beforeDestroy() {
    // 在应用关闭时断开MQTT连接
    MqttService.disconnect();

    // 清理定时器
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
    }
  },
  methods: {
    detectOS() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      this.isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
      this.isHarmonyOS = /HarmonyOS|OpenHarmony/i.test(userAgent);
    },

    checkUserToken() {
      console.log('调用 checkUserToken 方法，从当前路由获取部门信息');
      // 从当前路由获取部门信息
      const department = this.$route.params.department;
      if (department) {
        console.log('[App] 检查用户token，部门:', department);
        GetDingUserToken(department,
          (token) => {
            console.log('[App] Token有效或已更新 :', token);
          },
          (error) => {
            console.error('[App] 获取token失败 :', error);
          }
        );
      } else {
        console.log('[App] 未检测到部门信息，跳过token检查');
      }
    },

    /**
     * 设置全局MQTT连接
     */
    async setupGlobalMQTT() {
      // 获取当前用户ID
      const userId = localStorage.getItem(key_DingUserIndex);
      this.currentUserId = userId;

      if (!userId) {
        console.log('未获取到用户ID，延迟初始化MQTT');
        // 监听用户登录事件，登录后初始化
        window.addEventListener('user-login', this.handleUserLogin);
        return;
      }

      if (this.mqttInitialized) {
        console.log('MQTT已初始化');
        return;
      }

      // 监听路由变化，在需要token时获取
      const department = this.$route.params.department;
      if (!department) {
        console.log('未获取到部门信息，延迟初始化MQTT');
        return;
      }

      console.log('开始全局MQTT初始化...');

      GetDingUserToken(department,
        async (token) => {
          if (token) {
            try {
              const success = await MqttService.init(userId, token);
              if (success) {
                this.mqttInitialized = true;
                console.log('全局MQTT初始化成功');

                // 注册全局回调，用于显示通知和处理消息
                this.setupGlobalCallbacks();

                // 监听token刷新事件
                this.setupTokenRefreshListener(department);
              } else {
                console.error('全局MQTT初始化失败');
                Toast.fail('消息服务连接失败');
              }
            } catch (error) {
              console.error('MQTT初始化异常:', error);
              Toast.fail('消息服务连接异常');
            }
          } else {
            console.error('获取token为空，无法连接MQTT');
          }
        },
        (error) => {
          console.error('获取token失败:', error);
          Toast.fail('获取消息服务凭证失败');
        }
      );
    },

    /**
     * 设置全局回调
     */
    setupGlobalCallbacks() {
      // 注册全局消息回调
      this.unregisterGlobalCallback = MqttService.registerGlobalCallback((data) => {
        if (data.type === 'notification_click') {
          // 处理通知点击事件
          this.handleNotificationClick(data.data);
        } else if (data.type === 'connected') {
          console.log('MQTT连接成功，用户ID:', data.data.userId);
          this.showGlobalToast('消息服务已连接', 'success');
        } else if (data.type === 'error') {
          console.error('MQTT连接错误:', data.data);
          this.showGlobalToast('消息服务连接错误', 'danger');
        } else if (data.type === 'disconnected') {
          this.showGlobalToast('消息服务已断开', 'warning');
        }
      });

      // 监听页面可见性变化，优化重连
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    },

    /**
     * 处理用户登录事件
     */
    handleUserLogin(event) {
      if (event.detail && event.detail.userId) {
        this.currentUserId = event.detail.userId;
        this.setupGlobalMQTT();
      }
    },

    /**
     * 设置token刷新监听
     */
    setupTokenRefreshListener(department) {
      // 每30分钟刷新一次token
      setInterval(() => {
        GetDingUserToken(department,
          (newToken) => {
            if (newToken && this.currentUserId) {
              console.log('刷新MQTT token...');
              // 这里可以重新初始化连接，如果token过期
              // MqttService.reinitialize(this.currentUserId, newToken);
            }
          },
          (error) => {
            console.error('刷新token失败:', error);
          }
        );
      }, 30 * 60 * 1000); // 30分钟
    },

    /**
     * 处理页面可见性变化
     */
    handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        // 页面变为可见时，检查MQTT连接状态
        if (!MqttService.isConnected() && this.currentUserId) {
          console.log('页面恢复可见，检查MQTT连接...');
          // 可以尝试重新连接
        }
      }
    },

    /**
     * 处理通知点击
     */
    handleNotificationClick(data) {
      const {roomIndex, message} = data;

      // 跳转到对应的聊天页面
      if (roomIndex) {
        // 检查是否已经在聊天页面
        const currentRoute = this.$route;
        const isInSameRoom = currentRoute.name === 'ChatDetail' &&
          currentRoute.params.roomId === roomIndex;

        if (!isInSameRoom) {
          // 跳转到聊天页面
          this.$router.push({
            name: 'ChatDetail',
            params: {
              roomId: roomIndex,
              contact: JSON.stringify({
                roomIndex: roomIndex,
                name: message.senderName || '聊天'
              })
            }
          });
        }
      }
    },

    /**
     * 显示全局Toast
     */
    showGlobalToast(message, type = 'info') {
      this.notificationMessage = message;
      this.showGlobalNotification = true;

      // 3秒后自动隐藏
      if (this.notificationTimer) {
        clearTimeout(this.notificationTimer);
      }

      this.notificationTimer = setTimeout(() => {
        this.showGlobalNotification = false;
      }, 3000);
    },

    /**
     * 清除所有通知
     */
    clearNotifications() {
      if ('Notification' in window) {
        // 关闭所有通知
        if (Notification && typeof Notification.close === 'function') {
          Notification.close();
        }
      }
    }
  }
}
</script>

<style>
/* 全局样式修复键盘推顶问题 */
html, body {
  position: fixed;
  width: 100%;
  height: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.app-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.tabbar-content {
  height: 50px;
  flex-shrink: 0;
  background-color: #fff; /* 确保背景色覆盖 */
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1); /* 可选：添加阴影提升视觉效果 */
}

.tabbar-content.ios-tabbar {
  height: 50px;
}

.tabbar-content.android-tabbar {
  height: 50px;
}

.tabbar-content.harmony-tabbar {
  height: 60px;
}

* {
  box-sizing: border-box;
}

/* 防止移动端长按菜单 */
input, textarea, select {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

/* 优化滚动条 */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 全局通知样式 */
.van-notify {
  position: fixed;
  top: 50px;
  z-index: 9999;
}
</style>
