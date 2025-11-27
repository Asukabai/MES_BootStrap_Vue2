<template>
  <div class="container-fluid home-container">
    <div class="mobile-content">
      <m-banner />
      <div class="wrapper">
        <m-menu />
<!--        <m-recommend />-->
        <TaskProgressBoard />
      </div>
    </div>
  </div>
</template>

<script>
import MBanner from './components/m-banner.vue';
import MMenu from './components/m-menu.vue';
import TaskProgressBoard from '@/components/TaskProgressBoard.vue';

export default {
  name: 'HomePage',
  components: {
    MBanner,
    MMenu,
    TaskProgressBoard
  },
  data() {
    return {
      isPC: false
    };
  },
  mounted() {
    this.checkDeviceType();
  },
  methods: {
    checkDeviceType() {
      const userAgent = navigator.userAgent;
      this.isPC = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent));
    }
  }
};
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: white;
  padding: 0;
  margin: 0;
  width: 100%;
  overflow-x: hidden; /* 防止横向滚动 */
}

.pc-placeholder {
  min-height: 100vh;
  background: white;
}

.mobile-content {
  width: 100%;
  overflow-x: hidden;
}

.mobile-content .wrapper {
  border-radius: 25px 25px 0 0;
  min-height: 200px;
  background: white;
  position: relative;
  margin: 0;
  padding: 0;
  width: 100%;
}
</style>
