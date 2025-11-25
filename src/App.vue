<template>
  <div id="app">
    <responsive-tab-bar @tab-change="handleTabChange" />
    <div class="content-wrapper">
      <router-view/>
    </div>
  </div>
</template>

<script>
import ResponsiveTabBar from './components/ResponsiveTabBar.vue';

export default {
  name: 'App',
  components: {
    ResponsiveTabBar
  },
  methods: {
    handleTabChange(tab) {
      this.$router.push(tab.path);
    }
  }
}
</script>

<style>
.content-wrapper {
  /* PC端需要为侧边栏留出空间 */
  margin-left: 80px;
}

/* 移动端不需要留出空间 */
@media (max-width: 768px) {
  .content-wrapper {
    margin-left: 0;
    margin-bottom: 50px; /* 为底部标签栏留出空间 */
  }
}
</style>
