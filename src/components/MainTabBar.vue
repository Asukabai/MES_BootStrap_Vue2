<template>
  <van-tabbar
    v-model="active"
    class="fixed-tabbar"
    :safe-area-inset-bottom="true"
    @change="onTabChange"
  >
    <van-tabbar-item
      v-for="(item, index) in tabbars"
      :key="index"
      :badge="item.badge"
    >
      <!-- 自定义图标 -->
      <template #icon>
        <img
          :src="active === index ? item.iconActive : item.iconInactive"
          :alt="item.title"
          style="width: 20px; height: 20px;"
        />
      </template>

      <!-- 文字标题 -->
      <span>{{ item.title }}</span>
    </van-tabbar-item>
  </van-tabbar>
</template>

<script>
export default {
  props: {
    showRouterView: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      active: 0,
      isIOS: false,

      // 图标资源路径（可以统一管理或按需加载）
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
    };
  },
  computed: {
    tabbars() {
      const base = this.$route.params.department || 'default';
      return [
        {
          title: '消息',
          path: `/${base}/chat`,
          iconActive: this.icons.message.active,
          iconInactive: this.icons.message.inactive
        },
        {
          title: '任务',
          path: `/${base}/taskList`,
          iconActive: this.icons.task.active,
          iconInactive: this.icons.task.inactive
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
      ];
    }
  },
  watch: {
    '$route': {
      handler(newRoute) {
        this.updateActiveTab(newRoute);
      },
      immediate: true
    }
  },

  methods: {
    onTabChange(index) {
      const targetPath = this.tabbars[index].path;
      if (this.$route.path !== targetPath) {
        this.$router.push(targetPath);
      }
    },

    updateActiveTab(route) {
      const fullPath = route.path;
      const department = route.params.department;

      // 精确匹配路径
      for (let i = 0; i < this.tabbars.length; i++) {
        const tabPath = this.tabbars[i].path;
        if (fullPath === tabPath) {
          this.active = i;
          return;
        }
      }

      // 模糊匹配（处理带参数的情况）
      if (department) {
        if (fullPath.includes(`/${department}/chat_category`)) {
          this.active = 0;
        } else if (fullPath.includes(`/${department}/taskList`)) {
          this.active = 1;
        } else if (fullPath.includes(`/${department}/index`)) {
          this.active = 2;
        } else if (fullPath.includes(`/${department}/cartList`)) {
          this.active = 3;
        } else if (fullPath.includes(`/${department}/user`)) {
          this.active = 4;
        }
      }
    },

    detectIOS() {
      // 检测是否为iOS设备
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      this.isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    }
  },

  mounted() {
    this.detectIOS();
  }
};
</script>

<style scoped>
.fixed-tabbar {
  position: relative;
  height: 50px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  border-top: 1px solid #f0f0f0;
  padding-bottom: env(safe-area-inset-bottom);
}

/* 可选：添加图标过渡效果 */
.van-tabbar-item__icon img {
  transition: all 0.2s ease-in-out;
}

/* 调整标签栏项的内边距 */
::v-deep .van-tabbar-item {
  padding: 4px 0;
  font-size: 12px;
}

/* 调整图标大小 */
::v-deep .van-tabbar-item__icon img {
  width: 20px;
  height: 20px;
}

/* 调整文字样式 */
::v-deep .van-tabbar-item__text {
  font-size: 12px;
  line-height: 1.2;
}
</style>
