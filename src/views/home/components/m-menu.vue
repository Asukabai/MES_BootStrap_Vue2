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

    <!-- 秘钥弹窗 -->
    <van-popup
      v-model="showSecretKeyPopup"
      position="bottom"
      :style="{ height: '30%' }"
      round
    >
      <div class="secret-key-popup">
        <div class="popup-header">
          <h3>获取的秘钥</h3>
          <van-button
            type="default"
            size="small"
            @click="closeSecretKeyPopup"
            class="close-btn"
          >
            关闭
          </van-button>
        </div>

        <div class="secret-content">
          <div
            class="secret-value"
            @click="copySecretKey"
            @dblclick="copySecretKey"
          >
            {{ secretKeyValue || '正在获取...' }}
          </div>

          <div v-if="countdownVisible" class="countdown-info">
            有效期: <span class="countdown-timer">{{ countdownTime }}s</span>
          </div>
        </div>

        <div class="popup-actions">
          <van-button
            type="primary"
            block
            @click="copySecretKey"
            :disabled="!secretKeyValue"
          >
            复制验证码
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import taskCalendarIcon from '@/assets/日历图标.png'
import projectListIcon from '@/assets/在建项目.png'
import fileStatIcon from '@/assets/项目类型统计.png'
import feedbackIcon from '@/assets/评论列表-高亮.png'
import progressTrackIcon from '@/assets/进度跟踪.png'
import weeklyReport from '@/assets/周报管理.png'
import allIcon from '@/assets/I导航主页.png'
import inventoryIcon from '@/assets/库存-库存单据.png'
import inventoryIconNew from '@/assets/库存业务.png'
import scanConfigIcon from '@/assets/scan_icon.png'
import uploadIcon from '@/assets/跨公司调拨.png'
import {
  key_DingScannedInventoryQRCodeResult,
  updateCachedInventoryProductId,
  key_DingTokenJWT,
  getLoginCodeByDepartment
} from "../../../utils/Dingding";
import * as dd from 'dingtalk-jsapi'
import ExpandableFloatingButton from "../../../components/ExpandableFloatingButton.vue";
import SensorRequest from '../../../utils/SensorRequest.js';
import SensorRequestPage from "../../../utils/SensorRequestPage";

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
          path: '/task-calendar',
        },
        {
          icon: projectListIcon,
          title: '项目列表',
          path: '/project-list',
        },
        {
          icon: fileStatIcon,
          title: '文件统计',
          path: '/file-statistics',
        },
        {
          icon: feedbackIcon,
          title: '知识库',
          path: '/knowledge-base',
        },
        // {
        //   icon: progressTrackIcon,
        //   title: '进度跟踪',
        //   path: '/progress-tracking',
        // },
        // {
        //   icon: inventoryIcon,
        //   title: '库存管理',
        //   path: '/inventory',
        // },
        {
          icon: scanConfigIcon,
          title: '库存扫码',
          path: '/inventory-scan',
        },
        {
          icon: inventoryIconNew,
          title: '新库存管理',
          path: '/new-inventory',
        },
        {
          icon: weeklyReport,
          title: '周报管理',
          path: '/weekly-report',
        },
        {
          icon: allIcon,
          title: '查看全部',
          path: '/all-applications', // 新增路径
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

      // 弹窗相关数据
      showSecretKeyPopup: false, // 控制秘钥弹窗显示
      secretKeyValue: '', // 存储秘钥值
      countdownTime: 0, // 倒计时时间
      countdownVisible: false, // 是否显示倒计时
      countdownInterval: null, // 倒计时定时器
      isFetchingSecret: false, // 防止重复请求
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
          handler: this.handleGetSecretKey,
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
    // 获取秘钥方法
    async handleGetSecretKey() {
      // 防止短时间内重复请求
      if (this.isFetchingSecret) {
        this.$toast('正在获取秘钥，请稍候...');
        return;
      }

      this.isFetchingSecret = true;

      try {
        // 获取当前部门
        const department = this.$route.params.department;

        // 获取钉钉token
        const token = localStorage.getItem(key_DingTokenJWT);

        // 获取对应部门的登录方法
        const loginMethod = getLoginCodeByDepartment(department);

        // 请求后端获取秘钥
        const response = await this.fetchSecretKeyFromBackend(loginMethod, token);

        if (response && typeof response === 'string') {
          this.secretKeyValue = response.trim(); // 去除首尾空格
          this.showSecretKeyPopup = true; // 显示弹窗
          this.startCountdown(); // 开始倒计时
        } else {
          this.$toast.fail('获取秘钥失败');
        }
      } catch (error) {
        console.error('获取秘钥出错:', error);
        this.$toast.fail('获取秘钥失败');
      } finally {
        this.isFetchingSecret = false;
      }
    },

    // 后端请求方法
    fetchSecretKeyFromBackend(loginMethod, token) {
      return new Promise((resolve, reject) => {
        SensorRequest.GetDDingCode(
          loginMethod,
          token,
          (response) => {
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        );
      });
    },

    // 开始倒计时
    startCountdown() {
      // 清除之前的定时器
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
      }

      this.countdownTime = 30; // 30秒倒计时
      this.countdownVisible = true;

      this.countdownInterval = setInterval(() => {
        this.countdownTime--;
        if (this.countdownTime <= 0) {
          this.countdownVisible = false;
          clearInterval(this.countdownInterval);
          this.showSecretKeyPopup = false; // 自动关闭弹窗
          this.secretKeyValue = ''; // 清空秘钥
        }
      }, 1000);
    },

    // 复制秘钥
    copySecretKey() {
      if (!this.secretKeyValue) {
        this.$toast('没有可复制的秘钥');
        return;
      }

      // 使用现代Clipboard API或传统方法复制
      const cleanCode = this.secretKeyValue.trim();
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(cleanCode)
          .then(() => {
            this.$toast.success('秘钥已复制到剪贴板');
          })
          .catch(err => {
            console.error('复制失败:', err);
            this.$toast.fail('复制失败');
          });
      } else {
        // 降级处理
        try {
          const textArea = document.createElement('textarea');
          textArea.value = cleanCode;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          this.$toast.success('秘钥已复制到剪贴板');
        } catch (err) {
          console.error('复制失败:', err);
          this.$toast.fail('复制失败');
        }
      }
    },

    // 关闭弹窗
    closeSecretKeyPopup() {
      this.showSecretKeyPopup = false;
      this.secretKeyValue = '';

      // 清除倒计时
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
    },

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
        this.navigateTo('/all-applications'); // 修改跳转路径
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
      dd.ready(() => {
        dd.biz.util.scan({
          type: 'qrCode',
          onSuccess: (data) => {
            const result = data.text; // 获取扫描结果
            console.log('原始扫描结果:', result);

            // 手动解析非标准 JSON 格式
            const parsedResult = this.parseCustomJSON(result);
            console.log('解析后的对象:', parsedResult);

            const requiredFields = ['on', 'pc', 'pm', 'qty', 'cc', 'pdi'];
            const optionalFields = ['mc', 'hp'];

            // 检查是否包含所有必需字段
            if (parsedResult && typeof parsedResult === 'object' &&
              requiredFields.every(field => field in parsedResult)) {
              console.log('扫描结果为嘉立创商城物品结构体');
              this.$toast.success('现在扫描的是嘉立创商城物品，将自动跳转新增页面');
              // 将解析后的扫码内容作为参数传递
              this.$router.push({
                name: 'InventoryAddV1',
                params: {
                  department: this.$route.params.department
                },
                query: {
                  scanData: JSON.stringify(parsedResult) // 将解析后的对象序列化为字符串
                }
              });
              return; // 提前返回，不执行后续逻辑
            }
            // JSON解析失败或不符合条件，继续执行原有逻辑
            console.log('不是嘉立创商城物品，继续原有流程');
            if (this.isValidQRCode(result)) {
              this.validateScanResult(result);
            } else {
              alert("扫描的二维码不符合要求，请重新扫描！");
            }
          },
          onFail: (err) => {
            if (err.errorCode !== 300001) {
              let errorMessage = '未扫描到二维码 ！';
              this.$toast.fail(errorMessage);
            }
          }
        });
      });
    },

    // 手动解析非标准 JSON 格式
    parseCustomJSON(str) {
      try {
        const regex = /(\w+):([^,}]+)/g;
        const obj = {};
        let match;
        while ((match = regex.exec(str)) !== null) {
          const key = match[1];
          const value = match[2].trim();
          obj[key] = value === '' || value === 'null' ? null : value;
        }
        return obj;
      } catch (e) {
        console.error('手动解析失败:', e);
        return null;
      }
    },

    // 新增验证扫描结果的方法
    validateScanResult(result) {
      // 调用后端接口验证扫描结果
      const params = {
        Shelf_Location: result
      };

      SensorRequestPage.InventoryItemGetFun(
        JSON.stringify(params),
        (respData) => {
          try {
            // 解析响应数据
            const responseJson = JSON.parse(respData);

            // 从 Data 数组中获取库存项
            if (responseJson.Data && Array.isArray(responseJson.Data)) {
              // 如果只有一个物品，存储扫码结果并跳转到详情页
              sessionStorage.setItem(key_DingScannedInventoryQRCodeResult, result);
              updateCachedInventoryProductId(result);
              if (responseJson.Data.length === 1) {
                this.navigateTo('/inventoryDetailV1');
              } else if (responseJson.Data.length > 1) {
                // 如果有多个物品，跳转到结果列表页
                this.navigateTo('/inventory-scan-results', {
                  scanResult: result,
                  inventoryItems: responseJson.Data
                });
              } else {
                // 如果没有找到物品，提示用户
                this.$toast.fail('未找到相关库存物品');
                this.navigateTo('/inventoryDetailV1');
              }
            } else {
              this.$toast.fail('数据格式错误');
            }
          } catch (parseError) {
            console.error('解析库存信息响应失败:', parseError);
            this.$toast.fail('数据解析失败');
          }
        },
        (error) => {
          console.error('获取库存信息失败:', error);
          this.$toast.fail('获取库存信息失败');
        }
      );
    },
    testScanInventoryQRCode() {
      const result = "1号货架一层01"; // 获取扫描结果
      if (result) {
        // 存储扫码结果
        sessionStorage.setItem(key_DingScannedInventoryQRCodeResult, result);
        // 更新全局变量
        updateCachedInventoryProductId(result);
        this.navigateTo('/inventoryDetail');}}
  },
  beforeDestroy() {
    // 清除定时器
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
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

/* 秘钥弹窗样式 */
.secret-key-popup {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.close-btn {
  flex-shrink: 0;
}

.secret-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.secret-value {
  font-size: 16px;
  font-weight: bold;
  word-break: break-all;
  cursor: pointer;
  padding: 10px;
  border: 1px dashed #ccc;
  border-radius: 4px;
  user-select: text;
  max-width: 100%;
}

.countdown-info {
  margin-top: 15px;
  font-size: 14px;
  color: #999;
}

.countdown-timer {
  color: #ff6b6b;
  font-weight: bold;
}

.popup-actions {
  margin-top: 20px;
}
</style>
