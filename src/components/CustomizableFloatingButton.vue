<template>
  <div
    class="customizable-floating-button"
    :style="{
      bottom: position.bottom + 'px',
      right: position.right + 'px',
      width: backgroundSize + 'px',
      height: backgroundSize + 'px'
    }"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @click="handleClick"
  >
    <img
      :src="iconSrc"
      :style="{
        width: iconSize + 'px',
        height: iconSize + 'px'
      }"
      alt="Floating Button Icon"
      class="icon-img"
    />
  </div>
</template>

<script>
export default {
  name: 'CustomizableFloatingButton',
  props: {
    // 初始位置
    initialPosition: {
      type: Object,
      default: () => ({
        bottom: 100,
        right: 20
      })
    },
    // 图标源路径
    iconSrc: {
      type: String,
      required: true
    },
    // 背景大小（默认55px）
    backgroundSize: {
      type: Number,
      default: 55
    },
    // 图标大小（默认为背景大小的75%）
    iconSize: {
      type: Number,
      default: function() {
        return this.backgroundSize * 0.65; // 默认图标大小是背景的65%
      }
    },
    // 点击事件处理函数
    onClick: {
      type: Function,
      default: null
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
    // 更新屏幕尺寸
    updateScreenSize() {
      this.screenSize = {
        width: window.innerWidth,
        height: window.innerHeight
      };
    },

    handleClick(event) {
      // 阻止事件冒泡
      event.stopPropagation();
      // 只有在非拖拽状态下才触发点击事件
      if (!this.touchState.isDragging && this.onClick) {
        this.onClick();
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
        const buttonRadius = this.backgroundSize / 2;
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
        const buttonRadius = this.backgroundSize / 2;
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
.customizable-floating-button {
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white; /* 白色圆形背景 */
  border-radius: 50%; /* 圆形背景 */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  user-select: none; /* 防止拖动时选中文字 */
  touch-action: none; /* 禁用默认触摸行为 */
  z-index: 999;
  /* 添加以下样式解决移动端点击问题 */
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

/* 图标样式 */
.icon-img {
  object-fit: contain; /* 保持图片比例并完整显示 */
  transition: opacity 0.2s ease; /* 添加过渡效果使交互更平滑 */
}

/* 鼠标悬停效果 */
.customizable-floating-button:hover {
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
  transform: scale(1.05); /* 轻微放大效果 */
}
</style>
