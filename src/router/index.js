import Vue from 'vue'
import Router from 'vue-router'
Vue.use(Router)

export default new Router({
  mode: 'history',
  base: '/sswebsite/',
  routes: [
 {
          path: '/',
          redirect: '/test_home'
        }, {
          path: '/test_home',
          name: 'test_home',
          component: resolve => require(['@/view/test_home/Home'], resolve),
          meta: {
            title: 'test-首页'
          }
    },
  ],
  scrollBehavior (to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return { selector: to.hash }
    } else {
      return { x: 0, y: 0 }
    }
  }
})
