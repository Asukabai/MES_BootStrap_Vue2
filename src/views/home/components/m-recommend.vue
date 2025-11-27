<template>
  <div class="recommend-container">
    <div class="header clearfix">
      <div class="pull-left">
        <h2 class="page-title">今日主推</h2>
      </div>
      <div class="pull-right more-link" @click="goMore">
        <span>更多</span>
        <span class="glyphicon glyphicon-menu-right"></span>
      </div>
    </div>

    <div class="list-wrapper">
      <div class="row">
        <div
          v-for="item in contentList"
          :key="item.id"
          class="col-xs-6 col-sm-4 col-md-3"
        >
          <div class="item">
            <div class="banner-wrapper">
              <img class="banner img-responsive" :src="item.banner" :alt="item.title">
            </div>
            <div class="item-title text-center">{{ item.title }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
import BgDemo1 from '@/assets/bg-demo1.jpg';
import BgDemo2 from '@/assets/bg-demo2.jpg';
import BgDemo3 from '@/assets/bg-demo3.jpg';

export default {
  name: 'MRecommend',
  data() {
    return {
      contentList: [
        {
          id: 1,
          title: '文章标题',
          banner: BgDemo1,
        },
        {
          id: 2,
          title: '文章标题',
          banner: BgDemo2,
        },
        {
          id: 3,
          title: '文章标题',
          banner: BgDemo3,
        },
        {
          id: 4,
          title: '文章标题',
          banner: BgDemo2,
        },
      ]
    };
  },
  methods: {
    goMore() {
      // 跳转到更多页面
      console.log('跳转到更多页面');
    }
  }
};
</script>

<style scoped>
/* 页面主标题样式 */
.page-title {
  margin: 0;
  font-weight: bold;
  color: #01050c;
}

/* 列表项标题样式 */
.item-title {
  margin: 0;
  font-weight: normal;
  color: #01050c;
}

/* 页面主标题响应式字体大小 */
@media (max-width: 767px) {
  .page-title {
    font-size: 1.5rem;
  }
}

@media (min-width: 768px) {
  .page-title {
    font-size: 1.5rem;
  }
}

@media (min-width: 992px) {
  .page-title {
    font-size: 1.8rem;
  }
}

/* 列表项标题响应式字体大小 */
@media (max-width: 767px) {
  .item-title {
    font-size: 1.1rem;
  }
}

@media (min-width: 768px) {
  .item-title {
    font-size: 1.1rem;
  }
}

@media (min-width: 992px) {
  .item-title {
    font-size: 1.3rem;
  }
}

/* 其他原有样式保持不变 */
.recommend-container {
  padding: 15px;
  background: white;
  margin-bottom: 15px;
}

.header {
  margin-bottom: 20px;
}

.more-link {
  cursor: pointer;
  color: #01050c;
  font-size: 12px;
  line-height: 14px;
}

.more-link .glyphicon {
  margin-left: 5px;
  font-size: 12px;
}

.list-wrapper {
  margin: 0 -10px;
}

.list-wrapper {
  margin: 0 -5px; /* 减小负边距 */
}

.item {
  padding: 0 5px;
  margin-bottom: 15px;
}

/* 移动端进一步优化 */
@media (max-width: 767px) {
  .list-wrapper {
    margin: 0 -3px;
  }

  .item {
    padding: 0 3px;
  }
}


.banner-wrapper {
  font-size: 0;
  margin-bottom: 10px;
}

.banner {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 4px;
}
</style>

