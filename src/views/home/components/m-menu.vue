<template>
  <div class="menu-container">
    <!-- 添加卡片容器 -->
    <div class="menu-card">
      <div class="row menu-grid">
        <div
          v-for="(item, index) in menuList"
          :key="item.title"
          class="col-xs-3 col-sm-3 col-md-2 menu-item"
          @click="handleGridClick(item)"
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
import weeklyReport from '@/assets/周报管理.png'
import inventoryIcon from '@/assets/库存-库存单据.png'
import scanConfigIcon from '@/assets/流程汇总日志.png'
import {
  key_DingScannedInventoryQRCodeResult,
  updateCachedInventoryProductId,
} from "../../../utils/Dingding";
import * as dd from 'dingtalk-jsapi'

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
          title: '知识库',
          path: '',
        },
        // {
        //   icon: progressTrackIcon,
        //   title: '进度跟踪',
        //   path: '',
        // },
        {
          icon: inventoryIcon,
          title: '库存管理',
          path: '',
        },
        {
          icon: scanConfigIcon,
          title: '库存扫码',
          path: '',
        },
        {
          icon: inventoryIcon,
          title: '库存管理V1.0',
          path: '',
        },
        // {
        //   icon: allIcon,
        //   title: '查看全部',
        //   path: '',
        // },
        {
          icon: weeklyReport,
          title: '周报管理',
          path: '',
        },
      ]
    };
  },
  methods: {
    isValidQRCode(content) {
      // 检查是否为网址
      const urlPattern = /^(https?:\/\/|www\.)/i;
      // 检查是否为邮箱
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // 检查是否为纯数字（可能为无效编码）
      const pureNumberPattern = /^\d+$/;

      // 如果匹配以上模式，则认为是无效的库存位置二维码
      if (urlPattern.test(content) ||
        emailPattern.test(content) ||
        pureNumberPattern.test(content)) {
        return false;
      }

      // 检查内容长度，过短的内容可能无效
      if (content.length < 3) {
        return false;
      }

      return true;
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
    handleGridClick(item) {
      if (item.title === '项目编码') {
        this.navigateTo('/project-code');
      }
      if (item.title === '扫码记录') {
        this.navigateTo('/code/codeList');
      }
      if (item.title === '知识库') {
        // this.$toast.success('感谢您的反馈');
        this.navigateTo('/chat_category');
      }
      if (item.title === '文件统计') {
        this.navigateTo('/statistical-report');
      }
      if (item.title === '进度跟踪') {
        this.navigateTo('/progress-tracking');
      }
      if (item.title === '项目列表') {
        this.navigateTo('/project-manage');
      }
      if (item.title === '任务日历') {
        this.navigateTo('/task-manage');
      }
      if (item.title === '单板扫码') {
        this.$toast.success('正在开发中 ！');
      }
      if (item.title === '批量扫码') {
        this.$toast.success('正在开发中 ！');
      }
      if (item.title === '联系人') {
        this.$toast.success('正在开发中 ！');
      }
      if (item.title === '扫码配置') {
        this.navigateTo('/code/config');
      }
      if (item.title === '扫码看板') {
        this.$toast.success('正在开发中 ！');
      }
      if (item.title === '查看全部') {
        this.$toast.success('已展示全部 ！');
      }
      if (item.title === '周报管理') {
        this.navigateTo('/weeklyReportManagement');
      }
      if (item.title === '库存管理') {
        this.navigateTo('/inventory');
        // this.$toast.success('正在开发中 ！');
      }
      if (item.title === '库存管理V1.0') {
        this.navigateTo('/inventoryV1');
        // this.$toast.success('正在开发中 ！');
      }
      if (item.title === '库存扫码') {
        this.scanInventoryQRCode();
      }
    },
    // 库存扫码逻辑...
    scanInventoryQRCode() {
      // 判断是否为PC端（非钉钉环境或钉钉PC端）
      if (typeof dd === 'undefined' || !dd.env || dd.env.platform === 'pc') {
        this.$toast.fail('PC端暂不支持扫码功能，请在钉钉移动端使用');
        return;
      }
      console.log("开始扫码");
      // alert("开始扫码")
      dd.ready(() => {
        dd.biz.util.scan({
          type: 'qrCode',
          onSuccess: (data) => {
            const result = data.text; // 获取扫描结果
            if (this.isValidQRCode(result)) {
              // 存储扫码结果
              sessionStorage.setItem(key_DingScannedInventoryQRCodeResult, result);
              // 更新全局变量
              updateCachedInventoryProductId(result);
              this.navigateTo('/inventoryDetail');
            } else {
              alert("扫描的二维码不符合要求，请重新扫描！");
            }
          },
          onFail: (err) => {
            if (err.errorCode !== 300001) {
              // alert("未扫描到二维码！");
              let errorMessage = '未扫描到二维码 ！';
              this.$toast.fail(errorMessage);
            }
          }
        });
      });
    },
    testScanInventoryQRCode() {
            const result = "1号货架一层01"; // 获取扫描结果
            if (result) {
              // 存储扫码结果
              sessionStorage.setItem(key_DingScannedInventoryQRCodeResult, result);
              // 更新全局变量
              updateCachedInventoryProductId(result);
              this.navigateTo('/inventoryDetail');}}

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

