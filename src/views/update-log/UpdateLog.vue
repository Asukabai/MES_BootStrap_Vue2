<template>
  <div class="update-log-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">🚀 系统更新日志</h1>
      <p class="page-subtitle">记录每一次进步与改进</p>
    </div>

    <!-- 更新日志列表 -->
    <div class="logs-wrapper">
      <div
        v-for="(log, version) in sortedUpdateLogs"
        :key="version"
        class="log-card"
        :class="{ 'latest-version': isLatestVersion(version) }"
      >
        <!-- 版本标签 -->
        <div class="version-tag">
          <span class="version-number">v{{ version }}</span>
          <span v-if="isLatestVersion(version)" class="latest-badge">最新</span>
        </div>

        <!-- 更新内容 -->
        <div class="log-content">
          <p class="log-text">{{ log }}</p>
        </div>

        <!-- 时间线指示器 -->
        <div class="timeline-indicator"></div>
      </div>
    </div>
    <CustomizableFloatingButton
      :initial-position="{ bottom: 90, right: 20 }"
      :icon-src="require('@/assets/返回.png')"
      :background-size="49"
      :icon-size="49"
      :on-click="goBack"
    />
  </div>
</template>

<script>
import CustomizableFloatingButton from "../../components/CustomizableFloatingButton.vue";

export default {
  name: 'UpdateLog',
  components: {CustomizableFloatingButton},
  data() {
    return {
      updateLogs: {
        '1.1.29': 'MES系统更新V1.1.29_库存管理（适配嘉立创物品快速录入-第三版，接入嘉立创开放API）；',
        '1.1.28': 'MES系统更新V1.1.28_库存管理（优化移动端界面适配情况，新增编辑界面支持修改关联项目）；',
        '1.1.27': 'MES系统更新V1.1.27_库存管理（适配嘉立创物品快速录入-第二版，优化日志记录页面）；',
        '1.1.26': 'MES系统更新V1.1.26_库存管理（修改用户交互操作逻辑Bug，增加日志记录详情）；',
        '1.1.25': 'MES系统更新V1.1.25_库存管理（修改山西大钧库存批量导入Bug）；',
        '1.1.24': 'MES系统更新V1.1.24_库存管理（适配嘉立创物品快速录入-第一版）；',
        '1.1.23': 'MES系统更新V1.1.23_新版本库存管理操作交互优化；',
        '1.1.22': 'MES系统更新V1.1.22_新版本库存管理操作交互优化以及修改相关Bug；',
        '1.1.21': 'MES系统更新V1.1.21_新版本存管理完善批量出入库功能样式以及修改导入上一篇等功能Bug；',
        '1.1.20': 'MES系统更新V1.1.20_新版本存管理完善批量导入功能以及修改测试Bug；',
        '1.1.19': 'MES系统更新V1.1.19_新版本存管理完善导入上一篇功能以及修改测试Bug；',
        '1.1.18': 'MES系统更新V1.1.18_新版本存管理完善操作记录日志接口；',
        '1.1.17': 'MES系统更新V1.1.17_新版本存管理整合资产流转部分逻辑；',
        '1.1.16': 'MES系统更新V1.1.16_新版本存管理修复测试Bug-2；',
        '1.1.15': 'MES系统更新V1.1.15_新版本存管理修复测试Bug-1；',
        '1.1.14': 'MES系统更新V1.1.14_新版本存管理-2（支持储物箱管理）修复测试Bug若干；',
        '1.1.13': 'MES系统更新V1.1.13_新版本存管理-1(页面样式调整)；',
        '1.1.12': 'MES系统更新V1.1.12_升级库存管理页面样式以及修复部分Bug；',
        '1.1.11': 'MES系统更新V1.1.11_修改库存管理页面图片预览样式以及修复部分Bug；',
        '1.1.10': 'MES系统更新V1.1.10_新增修改库存管理接口和页面样式以及修复部分Bug；',
        '1.1.09': 'MES系统更新V1.1.09_新增修改部分聊天接口和页面样式；',
        '1.1.08': 'MES系统更新V1.1.08_新增聊天页面-修改上一版本使用Bug；',
        '1.1.07': 'MES系统更新V1.1.07_新增聊天页面-修改上一版本使用Bug；',
        '1.1.06': 'MES系统更新V1.1.06_新增库存页面-修改上一版本使用Bug；',
        '1.1.05': 'MES系统更新V1.1.05_修改任务页面（文件预览和下载链接地址）；',
        '1.1.04': 'MES系统更新V1.1.04_调整首页组件页面样式；',
        '1.1.03': 'MES系统更新V1.1.03_修改请求路径(相对路径-/ss-proxyp35001)；',
        '1.1.02': 'MES系统更新V1.1.02_更改页面路由跳转逻辑；',
        '1.1.01': 'MES系统更新V1.1.01_系统组件升级（页面样式重构）；',
        '1.0.11': 'MES系统更新V1.0.11_开发任务模块页面并测试；',
        '1.0.10': 'MES系统更新V1.0.10_开发文件分享模块并测试；',
        '1.0.09': 'MES系统更新V1.0.09_开发项目列表模块并测试；',
        '1.0.08': 'MES系统更新V1.0.08_开发项目日历模块并测试；',
        '1.0.07': 'MES系统更新V1.0.07_开发知识库模块并测试；',
        '1.0.06': 'MES系统更新V1.0.06_开发文件列表模块并测试；',
        '1.0.05': 'MES系统更新V1.0.05_开发后台使用统计模块并测试；',
        '1.0.04': 'MES系统更新V1.0.04_开发进度跟踪模块并测试；',
        '1.0.03': 'MES系统更新V1.0.04_开发进度跟踪模块并测试；',
        '1.0.02': 'MES系统更新V1.0.04_开发进度跟踪模块并测试；',
        '1.0.01': 'MES系统更新V1.0.04_系统框架搭建完成；',
      }
    };
  },
  computed: {
    // 按版本号降序排列
    sortedUpdateLogs() {
      const entries = Object.entries(this.updateLogs);
      return Object.fromEntries(
        entries.sort(([a], [b]) => {
          // 将版本号转换为数字进行比较
          const versionA = parseFloat(a.replace('.', ''));
          const versionB = parseFloat(b.replace('.', ''));
          return versionB - versionA;
        })
      );
    }
  },
  methods: {
    goBack() {
      // this.$router.go(-1);
      this.navigateTo('/user');
    },
    navigateTo(path) {
      const department = this.$route.params.department;
      if (department) {
        this.$router.push(`/${department}${path}`);
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
    },
    // 判断是否为最新版本
    isLatestVersion(version) {
      const versions = Object.keys(this.updateLogs);
      const latestVersion = versions.sort((a, b) => {
        const versionA = parseFloat(a.replace('.', ''));
        const versionB = parseFloat(b.replace('.', ''));
        return versionB - versionA;
      })[0];
      return version === latestVersion;
    }
  }
};
</script>

<style scoped>
.update-log-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
  color: white;
  animation: fadeInDown 0.8s ease-out;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.page-subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
  font-weight: 300;
}

.logs-wrapper {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

/* 时间线 */
.logs-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(to bottom, #fff, #e0e0e0);
  left: 30px;
  border-radius: 2px;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

.log-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 25px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: all 0.3s ease;
  border-left: 4px solid #667eea;
  animation: slideInLeft 0.5s ease-out;
  animation-fill-mode: backwards;
  margin-left: 50px;
}

.log-card:nth-child(odd) {
  animation-delay: 0.1s;
}

.log-card:nth-child(even) {
  animation-delay: 0.2s;
}

.log-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);
}

.latest-version {
  border-left-color: #ff6b6b;
  background: linear-gradient(135deg, #fff 0%, #f8f9ff 100%);
}

.version-tag {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  gap: 10px;
  flex-wrap: wrap;
}

.version-number {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 1.1rem;
  box-shadow: 0 4px 10px rgba(102, 126, 234, 0.3);
  white-space: nowrap;
}

.latest-badge {
  background: #ff6b6b;
  color: white;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 600;
  animation: pulse 2s infinite;
  white-space: nowrap;
}

.log-content {
  padding-left: 10px;
}

.log-text {
  color: #333;
  line-height: 1.6;
  font-size: 1rem;
  margin: 0;
  word-break: break-word;
}

.timeline-indicator {
  position: absolute;
  width: 20px;
  height: 20px;
  background: #667eea;
  border-radius: 50%;
  left: -54px;
  top: 35px;
  border: 4px solid white;
  box-shadow: 0 0 0 4px #667eea;
}

.latest-version .timeline-indicator {
  background: #ff6b6b;
  box-shadow: 0 0 0 4px #ff6b6b;
  animation: bounce 2s infinite;
}

/* 动画效果 */
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .update-log-container {
    padding: 15px;
  }

  .page-title {
    font-size: 2rem;
  }

  .page-subtitle {
    font-size: 1rem;
  }

  .logs-wrapper::before {
    left: 20px;
    width: 3px;
  }

  .log-card {
    padding: 20px;
    margin-left: 40px;
    margin-bottom: 20px;
  }

  .timeline-indicator {
    left: -44px;
    top: 25px;
    width: 18px;
    height: 18px;
  }

  .version-number {
    font-size: 1rem;
    padding: 6px 12px;
  }

  .log-text {
    font-size: 0.95rem;
    line-height: 1.5;
  }
}

@media (max-width: 480px) {
  .update-log-container {
    padding: 10px;
  }

  .page-header {
    margin-bottom: 30px;
  }

  .page-title {
    font-size: 1.8rem;
  }

  .page-subtitle {
    font-size: 0.9rem;
  }

  .logs-wrapper::before {
    left: 15px;
  }

  .log-card {
    padding: 15px;
    margin-left: 35px;
    margin-bottom: 15px;
    border-radius: 10px;
  }

  .timeline-indicator {
    left: -39px;
    width: 16px;
    height: 16px;
    top: 20px;
  }

  .version-tag {
    gap: 8px;
  }

  .version-number {
    font-size: 0.9rem;
    padding: 5px 10px;
  }

  .latest-badge {
    font-size: 0.7rem;
    padding: 3px 8px;
  }

  .log-text {
    font-size: 0.9rem;
    line-height: 1.4;
    padding-left: 5px;
  }
}

@media (max-width: 320px) {
  .update-log-container {
    padding: 8px;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .logs-wrapper::before {
    left: 12px;
  }

  .log-card {
    padding: 12px;
    margin-left: 30px;
    margin-bottom: 12px;
  }

  .timeline-indicator {
    left: -34px;
    width: 14px;
    height: 14px;
    top: 18px;
  }

  .version-number {
    font-size: 0.8rem;
    padding: 4px 8px;
  }

  .log-text {
    font-size: 0.85rem;
  }
}
</style>
