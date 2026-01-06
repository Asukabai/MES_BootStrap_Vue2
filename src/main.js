// src/main.js
import Vue from 'vue'
import App from './App'
import router from './router'
import store from './store'
/* swiper */
import 'swiper/dist/css/swiper.min.css'
/* 重置样式 */
import './assets/css/reset.min.css'
/* jquery */
import 'jquery'
import './assets/css/bootstrap.min.css'
import './assets/js/bootstrap.min'
/* animate.css */
import 'animate.css'
// 引入 Vant 及其样式
import Vant from 'vant'
import 'vant/lib/index.css'

// main.js 中添加（移动端全局适配样式）
import './assets/css/mobile-adapter.css'

// 引入 MQTT 服务
Vue.config.productionTip = false

// 引入 VueMeta
import VueMeta from 'vue-meta'
Vue.use(VueMeta, {
  refreshOnceOnNavigation: true
})

// 全局配置 Vant，重点配置Tabbar
Vue.use(Vant, {
  // 全局配置字段，解决键盘推顶问题
  field: {
    adjustPosition: false
  },

  // Tabbar配置
  tabbar: {
    route: false, // 开启路由模式
    safeAreaInsetBottom: true, // 开启安全区域适配
    placeholder: true, // 开启占位
    activeColor: '#1989fa',
    inactiveColor: '#7d7e80'
  },

  // 其他全局配置
  toast: {
    duration: 2000,
    position: 'bottom'
  },
  dialog: {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }
})

// 创建 Vue 实例
const app = new Vue({
  router,
  store,
  render: h => h(App),
  // 应用级别的生命周期钩子
  created() {
    console.log('🚀 应用启动，初始化全局组件...')
    // 初始化用户数据
    this.$store.dispatch('chat/initUserData')
    // 添加全局错误处理
    window.addEventListener('error', (event) => {
      console.error('全局错误:', event.error)
    })
    window.addEventListener('unhandledrejection', (event) => {
      console.error('未处理的Promise拒绝:', event.reason)
    })

    // 添加iOS Web App meta标签（改善iOS体验）
    if (/(iPhone|iPad|iPod)/i.test(navigator.userAgent)) {
      const viewportMeta = document.querySelector('meta[name="viewport"]')
      if (viewportMeta) {
        // 注意这里的 viewport-fit=cover 设置
        viewportMeta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
      }
    }
  }
}).$mount('#app')
