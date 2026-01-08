<template>
  <div class="expandable-floating-button">
    <!-- 主按钮 -->
    <div
      class="main-button"
      :style="{
        bottom: position.bottom + 'px',
        right: position.right + 'px',
      }"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @click="toggleSubButtons"
    >
      <!-- 本地图片使用div背景图方式 -->
      <div
        v-if="isLocalImage(mainIcon)"
        class="icon-bg"
        :style="{ backgroundImage: `url(${mainIcon})` }"
      ></div>
      <van-icon v-else :name="mainIcon" size="28px" color="#333" />
    </div>

    <!-- 子按钮容器 -->
    <div
      v-if="showSubButtons"
      class="sub-buttons-container"
      :style="{ bottom: (position.bottom) + 'px', right: (position.right + 70) + 'px' }"
    >
      <div
        v-for="(button, index) in subButtons"
        :key="index"
        class="sub-button-wrapper"
        :style="getCircularPosition(index)"
      >
        <div
          class="sub-button"
          @click="handleSubButtonClick(button)"
        >
          <div
            v-if="isLocalImage(button.icon)"
            class="icon-bg"
            :style="{ backgroundImage: `url(${button.icon})` }"
          ></div>
          <van-icon v-else :name="button.icon" size="22px" color="#333" />
        </div>
        <div
          v-if="button.label"
          class="sub-button-label"
        >
          {{ button.label }}
        </div>
      </div>
    </div>
  </div>
</template>



<script>
import { Icon as VanIcon } from 'vant';

export default {
  name: 'ExpandableFloatingButton',
  components: {
    VanIcon
  },
  props: {
    // 初始位置
    initialPosition: {
      type: Object,
      default: () => ({
        bottom: 100,
        right: 20
      })
    },
    // 主按钮图标（支持本地图片路径或Vant图标名）
    mainIcon: {
      type: String,
      default: 'add'
    },
    // 子按钮配置
    subButtons: {
      type: Array,
      default: () => []
    },
    // 展开方向 ('vertical', 'horizontal', 'circular')
    expandDirection: {
      type: String,
      default: 'circular'
    },
    // 圆形展开半径
    circularRadius: {
      type: Number,
      default: 80
    }
  },
  data() {
    return {
      position: { ...this.initialPosition },
      showSubButtons: false,
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
    window.addEventListener('resize', this.updateScreenSize);
    // 监听点击事件，用于关闭子按钮
    document.addEventListener('click', this.closeSubButtons);
  },
  beforeDestroy() {
    // 移除监听器
    window.removeEventListener('resize', this.updateScreenSize);
    document.removeEventListener('click', this.closeSubButtons);
  },
  methods: {
    // 判断是否为本地图片路径
    isLocalImage(icon) {
      if (!icon) return false;

      // 检查是否是URL或base64
      if (icon.startsWith('http') || icon.startsWith('data:')) {
        return true;
      }

      // 检查是否是相对路径或绝对路径
      if (icon.includes('.') && (icon.includes('/') || icon.includes('\\'))) {
        return true;
      }

      // 检查是否是Vue项目中的assets路径
      if (icon.startsWith('@/') || icon.includes('assets/')) {
        return true;
      }

      return false;
    },

    // 更新屏幕尺寸
    updateScreenSize() {
      this.screenSize = {
        width: window.innerWidth,
        height: window.innerHeight
      };
    },

    // 计算圆形位置
// 计算圆形位置
    getCircularPosition(index) {
      if (this.expandDirection !== 'circular' || !this.subButtons || this.subButtons.length === 0) {
        return {};
      }

      const totalButtons = this.subButtons.length;
      // 计算角度，从顶部开始，顺时针分布
      const angle = (Math.PI / 2) - (index * (2 * Math.PI / totalButtons));
      const x = -Math.cos(angle) * this.circularRadius;
      const y = -Math.sin(angle) * this.circularRadius;

      // 计算标签位置（在按钮下方）
      const labelOffset = 40; // 按钮高度的一半加上标签高度的一半
      const labelX = x;
      const labelY = y + labelOffset;

      return {
        '--button-x': `${x}px`,
        '--button-y': `${y}px`,
        '--label-x': `${labelX}px`,
        '--label-y': `${labelY}px`
      };
    },

    // 切换子按钮显示状态
    toggleSubButtons(event) {
      event.stopPropagation();
      // 只有在非拖拽状态下才切换子按钮
      if (!this.touchState.isDragging) {
        this.showSubButtons = !this.showSubButtons;
      }
    },

    // 关闭子按钮
    closeSubButtons() {
      this.showSubButtons = false;
    },

    // 处理子按钮点击
    handleSubButtonClick(button) {
      this.showSubButtons = false; // 点击后关闭子按钮
      if (button.handler) {
        // 如果有自定义处理函数，执行它
        button.handler();
      } else if (button.path) {
        // 如果有路径，跳转到指定页面
        this.$router.push(button.path);
      } else if (button.eventName) {
        // 如果有事件名，触发自定义事件
        this.$emit(button.eventName, button);
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
.expandable-floating-button {
  position: relative;
  z-index: 9999;
}

.main-button {
  position: fixed;
  width: 50px;  /* 增大主按钮尺寸 */
  height: 50px; /* 增大主按钮尺寸 */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  user-select: none;
  touch-action: none;
  z-index: 9999;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

.main-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}

.sub-buttons-container {
  position: fixed;
  z-index: 9998;
  transition: all 0.3s ease;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sub-button {
  position: absolute;
  width: 60px;  /* 增大子按钮尺寸 */
  height: 60px; /* 增大子按钮尺寸 */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  user-select: none;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  transition: all 0.3s ease;
  overflow: hidden;
}

.sub-button:hover {
  transform: scale(1.1);
}

/* 图标背景图样式 - 关键改进 */
.icon-bg {
  width: 100%;
  height: 100%;
  background-size: contain; /* 确保图片完整显示 */
  background-position: center;
  background-repeat: no-repeat;
  background-origin: content-box;
}

/* 主按钮中的图标 */
.main-button .icon-bg {
  background-size: 100% 100%; /* 让图片填满整个区域 */
}

/* 子按钮中的图标 */
.sub-button .icon-bg {
  padding: 8px; /* 子按钮图标内边距稍小 */
  background-size: 100% 100%; /* 让图片填满整个区域 */
}

/* 确保Vant图标也有适当的大小 */
.main-button .van-icon {
  font-size: 32px;
}

/* 子按钮包装器 */
.sub-button-wrapper {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  transform: translate(var(--button-x), var(--button-y));
}

.sub-button {
  position: relative;
  width: 60px;  /* 增大子按钮尺寸 */
  height: 60px; /* 增大子按钮尺寸 */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  user-select: none;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  transition: all 0.3s ease;
  overflow: hidden;
  z-index: 10000; /* 确保按钮在标签上方 */
}

.sub-button:hover {
  transform: scale(1.1);
}

.sub-button-label {
  position: relative;
  margin-top: 8px;
  font-size: 12px;
  color: #333;
  text-align: center;
  white-space: nowrap;
  padding: 4px 8px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 9999; /* 确保标签在按钮下方但可见 */
}




</style>
