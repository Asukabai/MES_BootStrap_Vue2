<template>
  <div class="container-fluid home-container">
    <div
      class="mobile-content"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- 刷新提示 -->
      <div v-if="isRefreshing" class="refresh-indicator">
        刷新中...
      </div>

      <m-banner />
      <div class="wrapper">
        <m-menu />
        <TaskProgressBoard :key="taskBoardKey" />
      </div>
    </div>
  </div>
</template>

<script>
import MBanner from './components/m-banner.vue';
import MMenu from './components/m-menu.vue';
import TaskProgressBoard from '@/components/TaskProgressBoard.vue';
import {GetDingUserToken} from "../../utils/Dingding";

export default {
  name: 'HomePage',
  components: {
    MBanner,
    MMenu,
    TaskProgressBoard
  },
  data() {
    return {
      isPC: false,
      isRefreshing: false,
      startY: 0,
      taskBoardKey: 0
    };
  },
  mounted() {
    const department = this.$route.params.department
    GetDingUserToken(department,(token) => {},(token) => {})
    this.checkDeviceType();
  },
  methods: {
    checkDeviceType() {
      const userAgent = navigator.userAgent;
      this.isPC = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent));
    },

    handleTouchStart(e) {
      this.startY = e.touches[0].pageY;
    },

    handleTouchMove(e) {
      const currentY = e.touches[0].pageY;
      const diff = currentY - this.startY;

      // 简单的下拉检测
      if (window.scrollY === 0 && diff > 50) {
        this.isRefreshing = true;
      }
    },

    handleTouchEnd() {
      if (this.isRefreshing) {
        // 刷新组件
        this.taskBoardKey += 1;
        this.isRefreshing = false;
      }
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
  overflow-x: hidden;
}

.pc-placeholder {
  min-height: 100vh;
  background: white;
}

.mobile-content {
  width: 100%;
  overflow-x: hidden;
  position: relative;
}

.refresh-indicator {
  text-align: center;
  padding: 10px;
  background: #f5f5f5;
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
