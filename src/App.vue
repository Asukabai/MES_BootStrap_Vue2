<template>
  <div id="app">
    <div class="app-content">
      <div class="main-content">
        <router-view />
      </div>
      <div
        v-if="!$route.path.includes('login') && !$route.path.includes('inventory')"
        class="tabbar-content"
        :class="{ 'ios-tabbar': isIOS, 'android-tabbar': !isIOS && !isHarmonyOS, 'harmony-tabbar': isHarmonyOS }"
      >
        <MainTabBar />
      </div>
    </div>
  </div>
</template>

<script>
import MainTabBar from '@/components/MainTabBar.vue'
import { GetDingUserToken } from '@/utils/Dingding'

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
body {
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100vh;
  overflow: hidden;
}

.app-content {
  display: flex;
  flex-direction: column;
  height: 100vh;
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
}

.tabbar-content.ios-tabbar {
  height: 80px;
}

.tabbar-content.android-tabbar {
  height: 50px;
}

.tabbar-content.harmony-tabbar {
  height: 60px;
}

html, body {
  height: 100%;
  overflow: hidden;
  -webkit-overflow-scrolling: touch;
}

* {
  box-sizing: border-box;
}
</style>
