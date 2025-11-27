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
// import Banner from '@/assets/backgroundL.png';
//import Banner from '@/assets/backgroundPC.png';
import Banner from '@/assets/background9261.png';

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
/* 默认隐藏轮播图 */
.swiper-container {
  display: none;
}

/* 在移动端（≤ 991px）显示轮播图 */
@media (max-width: 991px) {
  .swiper-container {
    display: block;
  }

  /* 移动端图片高度限制 */
  .carousel-image {
    max-height: 200px;
  }
}

/* 平板设备（768px - 991px） */
@media (min-width: 768px) and (max-width: 991px) {
  .carousel-image {
    max-height: 250px;
  }
}

/* 桌面端（≥ 992px）隐藏轮播图 */
@media (min-width: 992px) {
  .carousel-image {
    max-height: 180px;
  }
}
</style>
