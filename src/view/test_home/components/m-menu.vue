<template>
  <div class="menu-container">
    <!-- 添加卡片容器 -->
    <div class="menu-card">
      <div class="row menu-grid">
        <div
          v-for="(item, index) in menuList"
          :key="item.title"
          class="col-xs-3 col-sm-3 col-md-2 menu-item"
          @click="onClick(item)"
        >
          <div class="menu-item-content">
            <div class="icon-wrapper">
              <img class="icon img-responsive center-block" :src="item.icon" :alt="item.title">
            </div>
            <div class="title text-center">{{ item.title }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
import taskCalendarIcon from '@/assets/项目编码 (2).png'
import projectListIcon from '@/assets/项目管理.png'
import fileStatIcon from '@/assets/项目类型统计.png'
import feedbackIcon from '@/assets/评论列表-高亮.png'
import progressTrackIcon from '@/assets/进度跟踪.png'
import contactIcon from '@/assets/联系人123.png'
import allIcon from '@/assets/省略号.png'
import scanConfigIcon from '@/assets/流程汇总日志.png'

export default {
  name: 'MMenu',
  data() {
    return {
      menuList: [
        {
          icon: taskCalendarIcon,
          title: '任务日历',
          path: '',
        },
        {
          icon: projectListIcon,
          title: '项目列表',
          path: '',
        },
        {
          icon: fileStatIcon,
          title: '文件统计',
          path: '',
        },
        {
          icon: feedbackIcon,
          title: '问题反馈',
          path: '',
        },
        {
          icon: progressTrackIcon,
          title: '进度跟踪',
          path: '',
        },
        {
          icon: contactIcon,
          title: '联系人',
          path: '',
        },
        {
          icon: scanConfigIcon,
          title: '单板扫码',
          path: '',
        },
        {
          icon: allIcon,
          title: '查看全部',
          path: '',
        },
      ]
    };
  },
  methods: {
    onClick(item) {
      // 处理菜单项点击事件
      console.log('点击了:', item.title);
    }
  }
};
</script>

<style scoped>
.menu-container {
  padding: 15px;
  background: transparent; /* 背景设为透明 */
}

/* 新增卡片样式 */
.menu-card {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  /* 加重阴影立体感 */
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 10px;
  backdrop-filter: blur(10px);
}

.menu-grid {
  margin: 0 -5px;
}

.menu-item {
  padding: 0 5px;
  margin-bottom: 15px;
}

.menu-item-content {
  padding: 10px 5px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.menu-item-content:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.icon-wrapper {
  text-align: center;
  margin-bottom: 8px;
}

.icon {
  /* 默认图标大小 */
  width: 40px;
  height: 40px;
}

.title {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 超小屏幕设备 (小于768px) */
@media (max-width: 767px) {
  .icon {
    width: 30px;
    height: 30px;
  }
  .title {
    font-size: 12px;
  }
}

/* 小屏幕设备 (768px及以上) */
@media (min-width: 768px) and (max-width: 991px) {
  .icon {
    width: 35px;
    height: 35px;
  }
  .title {
    font-size: 13px;
  }
}

/* 中等及以上屏幕设备 (992px及以上) */
@media (min-width: 992px) {
  .icon {
    width: 40px;
    height: 40px;
  }
  .title {
    font-size: 14px;
  }
}
</style>

