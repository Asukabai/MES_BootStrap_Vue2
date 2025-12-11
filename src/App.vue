<template>
  <div id="app">
    <div class="app-content">
      <div class="main-content">
        <router-view />
      </div>
      <div
        v-if="!$route.path.includes('login') && !$route.path.includes('inventory') && !$route.path.includes('weeklyReport')"
        class="tabbar-content"
        :class="{ 'ios-tabbar': isIOS, 'android-tabbar': !isIOS && !isHarmonyOS, 'harmony-tabbar': isHarmonyOS }"
      >
        <MainTabBar />
      </div>
    </div>
  </div>
</template>

<script>
import {GetDingUserToken} from './utils/Dingding'
import MainTabBar from "./components/MainTabBar.vue";

export default {
  name: 'App',
  components: {
    MainTabBar
  },
  data() {
    return {
      isIOS: false,
      isHarmonyOS: false
    }
  },
  mounted() {
    this.detectOS();
    this.checkUserToken();
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
  methods: {
    detectOS() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      this.isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
      this.isHarmonyOS = /HarmonyOS|OpenHarmony/i.test(userAgent);
    },

    checkUserToken() {
      // alert('检查用户token')
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
</style>
