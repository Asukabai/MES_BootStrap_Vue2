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
/* bootstarp
 * Bootstrap v3.3.7 (http://getbootstrap.com)
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 *
 * 中文组件官网：
 *
 * https://v3.bootcss.com/components/
 *
 */
import './assets/css/bootstrap.min.css'
import './assets/js/bootstrap.min'
/* animate.css */
import 'animate.css'

// 引入 Vant 及其样式
import Vant from 'vant'
import 'vant/lib/index.css'

// 引入 MQTT 插件
import MqttPlugin from './plugins/mqtt'

Vue.config.productionTip = false

// 引入 VueMeta
import VueMeta from 'vue-meta'
Vue.use(VueMeta, {
  refreshOnceOnNavigation: true
})

// 全局配置 Vant，禁用 Field 组件的自动调整位置功能
Vue.use(Vant, {
  // 全局配置字段，解决键盘推顶问题
  field: {
    adjustPosition: false
  },
  // 其他全局配置（可选）
  toast: {
    duration: 2000,
    position: 'bottom'
  },
  dialog: {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }
})

// 使用 MQTT 插件（在 Vant 之后，确保 Toast 等组件可用）
Vue.use(MqttPlugin, {
  // 可以在这里传递配置选项
  autoCleanup: true, // 自动清理回调
  debug: process.env.NODE_ENV !== 'production' // 开发环境启用调试
})

// 解析 URL 查询参数
function getURLParams() {
  const search = window.location.search || window.location.hash.split('?')[1] || ''
  const params = new URLSearchParams(search)
  return {
    param1: params.get('param1'),
    param2: params.get('param2'),
    param3: params.get('param3')
  }
}

const urlParams = getURLParams()
// 将参数保存到 Vuex 中
if (urlParams.param1 || urlParams.param2 || urlParams.param3) {
  store.commit('SET_URL_PARAMS', urlParams)
}

// 创建 Vue 实例
const app = new Vue({
  router,
  store,
  render: h => h(App),

  // 应用级别的生命周期钩子
  created() {
    // 应用启动时，可以在这里进行一些全局初始化
    console.log('🚀 应用启动，初始化全局组件...')

    // 如果需要，可以在这里监听 MQTT 全局事件
    this.$mqtt.registerGlobalCallback((data) => {
      if (data.type === 'connected') {
        console.log('✅ MQTT 全局连接已建立')
      } else if (data.type === 'disconnected') {
        console.warn('⚠️ MQTT 连接已断开')
      } else if (data.type === 'error') {
        console.error('❌ MQTT 连接错误:', data.data)
      }
    })

    // 监听页面可见性变化，优化 MQTT 连接
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  },

  beforeDestroy() {
    // 清理事件监听器
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  },

  methods: {
    // 处理页面可见性变化
    handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        // 页面隐藏时，可以降低 MQTT 的活跃度
        console.log('📱 页面隐藏')
      } else if (document.visibilityState === 'visible') {
        // 页面显示时，确保 MQTT 连接正常
        console.log('📱 页面显示')
        // 可以在这里触发 MQTT 状态检查
        if (!this.$mqtt.isConnected()) {
          console.log('🔄 页面恢复，检查 MQTT 连接...')
          // 这里可以调用重连逻辑，如果需要的话
        }
      }
    }
  }
}).$mount('#app')

// 将 app 实例挂载到 window 上，方便调试（仅限开发环境）
if (process.env.NODE_ENV !== 'production') {
  window.app = app
}

// 可选：用于调试插件是否正确挂载
Vue.mixin({
  created() {
    if (this.$downloadManager) {
      console.log('✅ $downloadManager 已挂载')
    } else {
      console.warn('❌ $downloadManager 未挂载')
    }

    // 检查 MQTT 插件是否正确挂载
    if (this.$mqtt) {
      console.log('✅ $mqtt 插件已正确挂载')
    } else {
      console.warn('❌ $mqtt 插件未挂载')
    }
  }
})

// 导出 app 实例，如果需要的话
export default app
