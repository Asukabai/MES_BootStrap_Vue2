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
          <!-- 只在PC端显示库存导入按钮 -->
          <div v-if="!item.hiddenOnMobile || isPC" class="menu-item-content">
            <div class="icon-wrapper">
              <img class="icon img-responsive center-block" :src="item.icon" :alt="item.title">
            </div>
            <div class="title text-center">{{ item.title }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 可展开悬浮按钮 -->
    <ExpandableFloatingButton
      :initial-position="{ bottom: 100, right: 20 }"
      :main-icon="mainIcon"
      :sub-buttons="actionButtons"
    />
  </div>
</template>

<script>
import taskCalendarIcon from '@/assets/日历图标.png'
import projectListIcon from '@/assets/在建项目.png'
import fileStatIcon from '@/assets/项目类型统计.png'
import feedbackIcon from '@/assets/评论列表-高亮.png'
import progressTrackIcon from '@/assets/进度跟踪.png'
import weeklyReport from '@/assets/周报管理.png'
import allIcon from '@/assets/省略号.png'
import inventoryIcon from '@/assets/库存-库存单据.png'
import inventoryIconNew from '@/assets/库存业务.png'
import scanConfigIcon from '@/assets/scan_icon.png'
import uploadIcon from '@/assets/跨公司调拨.png'
import {
  key_DingScannedInventoryQRCodeResult,
  updateCachedInventoryProductId,
} from "../../../utils/Dingding";
import * as dd from 'dingtalk-jsapi'
import ExpandableFloatingButton from "../../../components/ExpandableFloatingButton.vue";

export default {
  name: 'MMenu',
  components: {
    ExpandableFloatingButton // 注册组件
  },
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
          icon: inventoryIconNew,
          title: '新库存管理',
          path: '',
        },
        // {
        //   icon: allIcon,
        //   title: '查看全部',
        //   path: '',
        // }
        {
          icon: weeklyReport,
          title: '周报管理',
          path: '',
        },
        {
          icon: uploadIcon,
          title: '库存导入',
          path: '/excel-upload', // 新增路径
          hiddenOnMobile: true // 仅在PC端显示
        },
      ],
      // 悬浮按钮图标
      mainIcon: require('@/assets/企业头像.png'), // 主按钮图标
    };
  },
  computed: {
    // 检测是否为PC端
    isPC() {
      const userAgent = navigator.userAgent;
      const mobileKeywords = ['Android', 'iPhone', 'iPad', 'Mobile', 'Mobile Web', 'Windows Phone'];
      return !mobileKeywords.some(keyword => userAgent.includes(keyword));
    },
    // 悬浮按钮配置
    actionButtons() {
      return [
        {
          icon: require('@/assets/秘钥1.png'), // 子按钮图标
          label: '获取秘钥',
          handler: this.handleEdit,
          position: { x: 15, y: 60 }  // 自定义位置
        },
        {
          icon: require('@/assets/计算器.png'), // 子按钮图标
          label: '增值税计算器',
          handler: this.handleVatCalculator,
          position: { x: -70, y: 10 }  // 自定义位置
        },
      ];
    }
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
      if (item.title === '新库存管理') {
        this.navigateTo('/inventoryV1');
        // this.$toast.success('正在开发中 ！');
      }
      if (item.title === '库存扫码') {
        this.scanInventoryQRCode();
      }
      if (item.title === '库存导入') {
        // 仅在PC端允许跳转
        if (this.isPC) {
          this.navigateTo('/excelUpload');
        } else {
          this.$toast.fail('此功能仅在PC端可用');
        }
      }
    },
    // 处理编辑按钮点击
    handleEdit() {
      this.$toast('点击了编辑');
      // 这里可以添加编辑功能的具体实现
    },
    // 处理增值税计算器点击
    handleVatCalculator() {
      this.navigateTo('/vat-calculator');
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
              this.navigateTo('/inventoryDetailV1');
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
  position: relative; /* 为悬浮按钮定位做准备 */
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
