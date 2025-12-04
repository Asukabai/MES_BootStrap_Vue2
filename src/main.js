import Vue from 'vue'
import App from './App'
import router from './router'
/* swiper */
import 'swiper/dist/css/swiper.min.css';
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

Vue.config.productionTip = false
import VueMeta from 'vue-meta'
Vue.use(VueMeta, {
  refreshOnceOnNavigation: true
})
// 引入 Vant 及其样式
import Vant from 'vant'
import 'vant/lib/index.css'
import store from "./store";
Vue.use(Vant)

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
new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app')

// 可选：用于调试插件是否正确挂载
Vue.mixin({
  created() {
    if (this.$downloadManager) {
      console.log('✅ $downloadManager 已挂载')
    } else {
      console.warn('❌ $downloadManager 未挂载')
    }
  }
})
