<template>
  <div>
    <!-- PC端侧边栏 -->
    <div v-if="!isMobile" class="sidebar-container">
      <div class="sidebar">
        <div
          v-for="(item, index) in tabList"
          :key="index"
          :class="['sidebar-item', { active: activeTab === item.name }]"
          @click="handleTabClick(item)"
        >
          <i :class="['glyphicon', item.icon]"></i>
          <span class="item-text">{{ item.title }}</span>
        </div>
      </div>
    </div>

    <!-- 移动端底部标签栏 -->
    <div v-else class="tabbar-container">
      <div class="tabbar">
        <div
          v-for="(item, index) in tabList"
          :key="index"
          :class="['tab-item', { active: activeTab === item.name }]"
          @click="handleTabClick(item)"
        >
          <i :class="['glyphicon', item.icon]"></i>
          <span class="item-text">{{ item.title }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ResponsiveTabBar',
  data() {
    return {
      isMobile: false,
      activeTab: 'home',
      tabList: [
        {
          name: 'home',
          title: '首页',
          icon: 'glyphicon-home',
          path: '/'
        },
        {
          name: 'project',
          title: '项目',
          icon: 'glyphicon-folder-open',
          path: '/projects'
        },
        {
          name: 'calendar',
          title: '日历',
          icon: 'glyphicon-calendar',
          path: '/calendar'
        },
        {
          name: 'profile',
          title: '我的',
          icon: 'glyphicon-user',
          path: '/profile'
        }
      ]
    };
  },
  mounted() {
    this.checkDeviceType();
    window.addEventListener('resize', this.checkDeviceType);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.checkDeviceType);
  },
  methods: {
    checkDeviceType() {
      const userAgent = navigator.userAgent;
      this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
        window.innerWidth <= 768;
    },
    handleTabClick(tab) {
      this.activeTab = tab.name;
      // 触发路由跳转事件
      this.$emit('tab-change', tab);
    }
  }
};
</script>

<style scoped>
/* PC端侧边栏样式 */
.sidebar-container {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 80px;
  background: #ffffff;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.sidebar {
  padding-top: 20px;
}

.sidebar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 10px;
  cursor: pointer;
  transition: all 0.3s;
  color: #666;
}

.sidebar-item:hover {
  background: #f5f5f5;
}

.sidebar-item.active {
  color: #1890ff;
  background: #e6f7ff;
  border-right: 3px solid #1890ff;
}

.sidebar-item .glyphicon {
  font-size: 20px;
  margin-bottom: 5px;
}

.sidebar-item .item-text {
  font-size: 12px;
}

/* 移动端底部标签栏样式 */
.tabbar-container {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  /* 添加安全区域支持 */
  padding-bottom: env(safe-area-inset-bottom);
  height: calc(50px + env(safe-area-inset-bottom));
  background: #ffffff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.tabbar {
  display: flex;
  height: 100%;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: #666;
  font-size: 12px;
}

.tab-item.active {
  color: #1890ff;
}

.tab-item .glyphicon {
  font-size: 18px;
  margin-bottom: 3px;
}

/* 响应式处理 */
@media (max-width: 768px) {
  .sidebar-container {
    display: none;
  }
}

@media (min-width: 769px) {
  .tabbar-container {
    display: none;
  }
}
</style>
