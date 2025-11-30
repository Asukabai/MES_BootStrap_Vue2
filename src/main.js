import Vue from 'vue'
import App from './App'

/* 路由 */
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
Vue.use(Vant)

new Vue({
  el: '#app',
  router,
  components: { App },
  template: '<App/>'
})
