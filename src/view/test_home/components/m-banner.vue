<template>
  <div class="swiper-container">
    <div id="myCarousel" class="carousel slide" data-ride="carousel">
      <!-- 轮播项目 -->
      <div class="carousel-inner" role="listbox">
        <div
          v-for="(item, index) in swiperList"
          :key="index"
          :class="['item', { active: index === 0 }]"
        >
          <img :src="item" alt="" class="img-responsive center-block carousel-image">
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Banner from '@/assets/backgroundL.png';
export default {
  name: 'MBanner',
  data() {
    return {
      swiperList: [Banner]
    };
  }
};
</script>

<style scoped>
.carousel {
  margin-bottom: 0;
}

.carousel-inner > .item > img {
  width: 100%;
  object-fit: cover;
}

/* 添加响应式轮播图样式 */
.carousel-image {
  width: 100%;
  height: auto;
  max-height: 300px; /* 设置最大高度限制 */
  object-fit: cover;
}

/* 针对不同屏幕尺寸的响应式处理 */
@media (max-width: 767px) {
  .carousel-image {
    max-height: 200px; /* 移动端较小高度 */
  }
}

@media (min-width: 768px) and (max-width: 991px) {
  .carousel-image {
    max-height: 250px; /* 平板设备适中高度 */
  }
}

@media (min-width: 992px) {
  .carousel-image {
    max-height: 300px; /* 桌面端较大高度 */
  }
}
</style>

