<!--创建了一个新的可复用组件 FloatingActionButton.vue，它包含以下特性：
可拖拽的悬浮按钮
可自定义初始位置
点击事件通过 $emit('click') 传递给父组件
完整的触摸交互逻辑
防止拖拽时误触发点击事件

这样，其他页面也可以通过引入 FloatingActionButton 组件来使用这个悬浮按钮功能，
只需传递初始位置和监听点击事件即可。
-->
<template>
  <div
    class="floating-action-button"
    :style="{ bottom: position.bottom + 'px', right: position.right + 'px' }"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @click="handleClick"
  >
    <van-icon name="plus" size="20px" color="#fff" />
  </div>
</template>

<script>
import { Icon } from 'vant';

export default {
  name: 'FloatingActionButton',
  components: {
    VanIcon: Icon
  },
  props: {
    // 初始位置
    initialPosition: {
      type: Object,
      default: () => ({
        bottom: 100,
        right: 20
      })
    }
  },
  data() {
    return {
      position: { ...this.initialPosition },
      // 触摸状态
      touchState: {
        startX: 0,
        startY: 0,
        initialBottom: 0,
        initialRight: 0,
        isDragging: false,
        startTime: 0
      },
      // 屏幕尺寸
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      isMouseDown: false
    }
  },
  mounted() {
    // 监听窗口大小变化，动态更新屏幕尺寸
    window.addEventListener('resize', this.updateScreenSize)
  },
  beforeDestroy() {
    // 移除监听器
    window.removeEventListener('resize', this.updateScreenSize)
  },
  methods: {
    handleClick(event) {
      // 阻止事件冒泡
      event.stopPropagation();
      // 只有在非拖拽状态下才触发点击事件
      if (!this.touchState.isDragging) {
        this.$emit('click');
      }
    },

    // 触摸事件处理
    onTouchStart(event) {
      const touch = event.touches[0];
      this.touchState.startX = touch.clientX;
      this.touchState.startY = touch.clientY;
      this.touchState.initialBottom = this.position.bottom;
      this.touchState.initialRight = this.position.right;
      this.touchState.isDragging = false;
      this.touchState.startTime = Date.now();
    },

    onTouchMove(event) {
      const touch = event.touches[0];
      const deltaX = touch.clientX - this.touchState.startX;
      const deltaY = touch.clientY - this.touchState.startY;

      // 判断是否为拖拽操作（移动距离超过5px或时间超过150ms）
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5 || (Date.now() - this.touchState.startTime) > 150) {
        this.touchState.isDragging = true;

        // 计算新的按钮位置
        let newBottom = this.touchState.initialBottom - deltaY;
        let newRight = this.touchState.initialRight - deltaX;

        // 限制按钮的活动范围
        const buttonRadius = 32;
        newBottom = Math.max(buttonRadius, Math.min(newBottom, this.screenSize.height - buttonRadius));
        newRight = Math.max(buttonRadius, Math.min(newRight, this.screenSize.width - buttonRadius));

        // 更新按钮位置
        this.position.bottom = newBottom;
        this.position.right = newRight;
      }
    },

    onTouchEnd(event) {
      // 延迟重置拖拽状态
      setTimeout(() => {
        this.touchState.isDragging = false;
      }, 50);
    },

    // 鼠标事件处理（用于PC端）
    onMouseDown(event) {
      this.isMouseDown = true;
      this.touchState.startX = event.clientX;
      this.touchState.startY = event.clientY;
      this.touchState.initialBottom = this.position.bottom;
      this.touchState.initialRight = this.position.right;
      this.touchState.isDragging = false;
      this.touchState.startTime = Date.now();
    },

    onMouseMove(event) {
      if (!this.isMouseDown) return;

      const deltaX = event.clientX - this.touchState.startX;
      const deltaY = event.clientY - this.touchState.startY;

      // 判断是否为拖拽操作
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5 || (Date.now() - this.touchState.startTime) > 150) {
        this.touchState.isDragging = true;

        // 计算新的按钮位置
        let newBottom = this.touchState.initialBottom - deltaY;
        let newRight = this.touchState.initialRight - deltaX;

        // 限制按钮的活动范围
        const buttonRadius = 32;
        newBottom = Math.max(buttonRadius, Math.min(newBottom, this.screenSize.height - buttonRadius));
        newRight = Math.max(buttonRadius, Math.min(newRight, this.screenSize.width - buttonRadius));

        // 更新按钮位置
        this.position.bottom = newBottom;
        this.position.right = newRight;
      }
    },

    onMouseUp(event) {
      this.isMouseDown = false;
      // 延迟重置拖拽状态
      setTimeout(() => {
        this.touchState.isDragging = false;
      }, 50);
    }
  }
}
</script>

<style scoped>

/* 悬浮按钮样式 */
.floating-action-button{
  position: fixed;
  width: 55px; /* 缩小按钮宽度 */
  height: 55px; /* 缩小按钮高度 */
  background-color: #3f83f8;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  user-select: none; /* 防止拖动时选中文字 */
  touch-action: none; /* 禁用默认触摸行为 */
  z-index: 999;
  /* 添加以下样式解决移动端点击问题 */
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}
</style>
