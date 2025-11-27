<template>
  <div class="ad-container text-center">
    <img class="bg img-responsive center-block" :src="BgAd" alt="广告图片">
  </div>
</template>

<script>
import BgAd from '@/assets/bg-ad.jpg';

export default {
  name: 'MAd',
  data() {
    return {
      BgAd
    };
  }
};
</script>

<style scoped>
.ad-container {
  padding: 15px;
  background: white;
}

.bg {
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  object-fit: cover;
}
</style>
