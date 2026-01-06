<template>
  <van-tabbar
    v-model="active"
    :safe-area-inset-bottom="true"
    :fixed="true"
    :placeholder="true"
    @change="onTabChange"
    class="main-tabbar"
  >
    <van-tabbar-item
      v-for="(item, index) in tabbars"
      :key="index"
      :name="item.path"
      :badge="item.badge"
    >
      <template #icon="props">
        <img
          :src="props.active ? item.iconActive : item.iconInactive"
          :alt="item.title"
          class="tabbar-icon"
        />
      </template>
      <span class="tabbar-text">{{ item.title }}</span>
    </van-tabbar-item>
  </van-tabbar>
</template>

<script>
export default {
  name: 'MainTabBar',
  data() {
    return {
      active: 0,
      icons: {
        message: {
          active: require('@/assets/icons/message-active.png'),
          inactive: require('@/assets/icons/message-inactive.png')
        },
        task: {
          active: require('@/assets/icons/task-active.png'),
          inactive: require('@/assets/icons/task-inactive.png')
        },
        home: {
          active: require('@/assets/icons/home-active.png'),
          inactive: require('@/assets/icons/home-inactive.png')
        },
        share: {
          active: require('@/assets/icons/share-active.png'),
          inactive: require('@/assets/icons/share-inactive.png')
        },
        user: {
          active: require('@/assets/icons/user-active.png'),
          inactive: require('@/assets/icons/user-inactive.png')
        }
      }
    }
  },
  computed: {
    tabbars() {
      const base = this.$route.params.department || ''
      return [
        {
          title: '消息',
          path: `/${base}/chat`,
          iconActive: this.icons.message.active,
          iconInactive: this.icons.message.inactive,
          badge: this.getUnreadCount('chat')
        },
        {
          title: '任务',
          path: `/${base}/taskList`,
          iconActive: this.icons.task.active,
          iconInactive: this.icons.task.inactive,
          badge: this.getUnreadCount('task')
        },
        {
          title: '工作台',
          path: `/${base}/index`,
          iconActive: this.icons.home.active,
          iconInactive: this.icons.home.inactive
        },
        {
          title: '分享',
          path: `/${base}/cartList`,
          iconActive: this.icons.share.active,
          iconInactive: this.icons.share.inactive
        },
        {
          title: '我的',
          path: `/${base}/user`,
          iconActive: this.icons.user.active,
          iconInactive: this.icons.user.inactive
        }
      ]
    }
  },
  watch: {
    '$route': {
      handler(newRoute) {
        this.updateActiveTab(newRoute)
      },
      immediate: true
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.updateActiveTab(this.$route)
    })
  },
  methods: {
    onTabChange(name) {
      if (this.$route.path !== name) {
        this.$router.push(name)
      }
    },

    updateActiveTab(route) {
      const fullPath = route.path
      const tab = this.tabbars.find(tab => tab.path === fullPath)
      if (tab) {
        const index = this.tabbars.indexOf(tab)
        this.active = index
      } else {
        const base = this.$route.params.department || ''
        if (fullPath.includes(`/${base}/chat`) || fullPath.includes('chat_category')) {
          this.active = 0
        } else if (fullPath.includes(`/${base}/taskList`)) {
          this.active = 1
        } else if (fullPath.includes(`/${base}/index`)) {
          this.active = 2
        } else if (fullPath.includes(`/${base}/cartList`)) {
          this.active = 3
        } else if (fullPath.includes(`/${base}/user`)) {
          this.active = 4
        }
      }
    },

    getUnreadCount(type) {
      // 使用逻辑运算符替代可选链操作符
      const count = (this.$store.state.chat.unreadCounts &&
        this.$store.state.chat.unreadCounts[type]) || 0
      return count > 0 ? count : ''
    }
  }
}
</script>

<style scoped>
/* 覆盖Vant Tabbar的默认样式，确保安全区域适配 */
.main-tabbar {
  z-index: 1000;
}

/* 重要：确保Tabbar在iOS上正确处理安全区域 */
::v-deep .van-tabbar {
  padding-bottom: env(safe-area-inset-bottom) !important;
}

::v-deep .van-tabbar-item {
  padding: 4px 0;
}

.tabbar-icon {
  width: 22px;
  height: 22px;
  margin-bottom: 4px;
}

.tabbar-text {
  font-size: 11px;
  line-height: 1.2;
}

/* 激活状态样式 */
::v-deep .van-tabbar-item--active {
  color: #1989fa;
}

::v-deep .van-tabbar-item--active .tabbar-text {
  color: #1989fa;
  font-weight: 500;
}

/* 适配不同屏幕尺寸 */
@media (min-width: 375px) {
  .tabbar-icon {
    width: 24px;
    height: 24px;
  }

  .tabbar-text {
    font-size: 12px;
  }
}

@media (min-width: 414px) {
  .tabbar-icon {
    width: 26px;
    height: 26px;
  }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  ::v-deep .van-tabbar {
    background-color: #1a1a1a;
    border-top: 1px solid #333;
  }

  ::v-deep .van-tabbar-item {
    color: #999;
  }

  ::v-deep .van-tabbar-item--active {
    color: #1989fa;
  }
}
</style>
