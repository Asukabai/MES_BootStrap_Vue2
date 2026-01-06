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

// 引入 MQTT 服务
Vue.config.productionTip = false

// 引入 VueMeta
import VueMeta from 'vue-meta'
Vue.use(VueMeta, {
  refreshOnceOnNavigation: true
})
Vue.use(Vant, {
  // 全局配置字段，解决键盘推顶问题
  field: {
    adjustPosition: false
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
  }
}).$mount('#app')
