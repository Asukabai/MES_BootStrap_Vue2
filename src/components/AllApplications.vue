<template>
  <div class="all-applications-page">
    <!-- 搜索区域 -->
    <div class="search-container">
      <van-field
        v-model="searchKeyword"
        placeholder="请输入应用名称搜索"
        left-icon="search"
        class="search-input"
      />
      <van-button
        type="info"
        class="search-btn"
        @click="performSearch"
      >
        搜索
      </van-button>
      <van-button
        type="default"
        class="reset-btn"
        @click="resetSearch"
      >
        重置
      </van-button>
    </div>

    <!-- 应用列表区域 -->
    <div class="applications-container">
      <div
        v-for="(group, letter) in groupedApplications"
        :key="letter"
        class="application-group"
      >
        <h3 class="group-title">{{ letter }}</h3>
        <div class="group-content">
          <div
            v-for="app in group"
            :key="app.title"
            class="app-item"
            @click="navigateTo(app.path)"
          >
            <div class="app-icon">
              <img :src="app.icon" :alt="app.title" class="icon-img">
            </div>
            <div class="app-info">
              <div class="app-title">{{ app.title }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <CustomizableFloatingButton
      :initial-position="{ bottom: 60, right: 20 }"
      :icon-src="require('@/assets/返回.png')"
      :background-size="49"
      :icon-size="49"
      :on-click="goBack"
    />
  </div>
</template>

<script>
import { Toast } from 'vant';
import * as dd from 'dingtalk-jsapi';
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
import scansingle from '@/assets/单板扫码.png'
import scanMore from '@/assets/批量扫码.png'
import scanLog from '@/assets/日志详情.png'
import scanConfig from '@/assets/扫码配置.png'
import uploadIcon from '@/assets/跨公司调拨.png'
import {
  key_DingScannedInventoryQRCodeResult,
  updateCachedInventoryProductId
} from '@/utils/Dingding';
import CustomizableFloatingButton from "./CustomizableFloatingButton.vue";
import SensorRequest from "../utils/SensorRequest";
import {key_DingScannedResult, updateCachedProductId} from "../utils/Dingding";

export default {
  name: 'AllApplications',
  components: {CustomizableFloatingButton},
  data() {
    return {
      searchKeyword: '', // 搜索关键词
      originalApplications: [ // 原始应用列表
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
        {
          icon: progressTrackIcon,
          title: '进度跟踪',
          path: '/progress-tracking',
        },
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
          icon: uploadIcon,
          title: '库存导入',
          path: '/excel-upload',
        },
        {
          icon: scanConfig,
          title: '资产扫码配置',
          path: '/config',
        },
        {
          icon: scanLog,
          title: '资产扫码日志',
          path: '/codeList',
        },
        {
          icon: scansingle,
          title: '资产单次扫码',
          path: '/add-stored',
        },
        {
          icon: scanMore,
          title: '资产批量扫码',
          path: '/batch_scan_results',
        },
      ],
      applications: [] // 显示的应用列表
    };
  },
  computed: {
    // 按字母分组的应用程序列表
    groupedApplications() {
      const groups = {};
      this.applications.forEach(app => {
        // 获取标题的第一个字符，并转换为大写
        const firstChar = app.title.charAt(0).toUpperCase();
        // 如果该字母还没有分组，则创建一个新数组
        if (!groups[firstChar]) {
          groups[firstChar] = [];
        }
        // 将应用程序添加到对应字母的分组中
        groups[firstChar].push(app);
      });
      // 对每个字母组内的应用进行排序
      Object.keys(groups).forEach(letter => {
        groups[letter].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
      });
      // 按字母顺序排序分组
      return Object.keys(groups)
        .sort()
        .reduce((obj, key) => {
          obj[key] = groups[key];
          return obj;
        }, {});
    }
  },
  created() {
    // 初始化时显示所有应用
    this.applications = [...this.originalApplications];
  },
  methods: {
    goBack() {
      // this.$router.go(-1);
      this.navigateToV1('/index');
    },
    // 执行搜索
    performSearch() {
      if (!this.searchKeyword.trim()) {
        this.$toast('请输入搜索关键词');
        return;
      }

      // 过滤应用程序列表
      this.applications = this.originalApplications.filter(app =>
        app.title.toLowerCase().includes(this.searchKeyword.toLowerCase()) ||
        app.path.toLowerCase().includes(this.searchKeyword.toLowerCase())
      );

      if (this.applications.length === 0) {
        this.$toast('未找到匹配的应用');
      } else {
        this.$toast.success(`找到 ${this.applications.length} 个应用`);
      }
    },

    // 重置搜索
    resetSearch() {
      this.searchKeyword = '';
      this.applications = [...this.originalApplications];
      this.$toast.success('已重置搜索');
    },
    navigateToV1(path) {
      const department = this.$route.params.department;
      if (department) {
        this.$router.push(`/${department}${path}`);
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
    },

    // 跳转到指定路径 - 改进版
    navigateTo(path) {
      console.log('跳转到指定路径: navigateTo', path);
      const department = this.$route.params.department;

      if (!department) {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
        return;
      }

      // 根据应用标题映射到正确的路径
      let targetPath = path;
      switch (this.getApplicationByPath(path).title) {
        case '资产扫码配置':
          targetPath = '/config';
          break;
        case '资产扫码日志':
          targetPath = '/codeList';
          break;
        case '周报管理':
          targetPath = '/weeklyReportManagement';
          break;
        case '库存管理':
          targetPath = '/inventory';
          break;
        case '新库存管理':
          targetPath = '/inventoryV1';
          break;
        case '资产单次扫码':
          this.scanQRCode();
          return;
        case '资产批量扫码':
          this.scanQRCodeList();
          return;
        case '库存扫码':
          this.scanInventoryQRCode();
          return;
        case '库存导入':
          // 检测是否为PC端，如果不是则提示用户
          if (!this.isPC()) {
            this.$toast.fail('请在PC端钉钉打开此应用');
            return;
          }
          targetPath = '/excelUpload';
          break;
        case '任务日历':
          targetPath = '/task-manage';
          break;
        case '项目列表':
          targetPath = '/project-manage';
          break;
        case '知识库':
          targetPath = '/chat_category';
          break;
        case '文件统计':
          targetPath = '/statistical-report';
          break;
        case '进度跟踪':
          targetPath = '/progress-tracking';
          break;
        case '查看全部':
          targetPath = '/all-applications';
          break;
        default:
          // 对于标准路径，移除前面的斜杠以避免重复
          targetPath = path.startsWith('/') ? path.substring(1) : path;
          targetPath = `/${targetPath}`;
      }

      // 构造完整的路由路径
      const fullPath = `/${department}${targetPath}`;
      this.$router.push(fullPath);
    },

    // 根据路径获取应用对象的辅助方法
    getApplicationByPath(path) {
      return this.originalApplications.find(app => app.path === path);
    },

    // 检测是否为PC端的方法
    isPC() {
      const userAgent = navigator.userAgent;
      const mobileKeywords = ['Android', 'iPhone', 'iPad', 'Mobile', 'Mobile Web', 'Windows Phone'];
      return !mobileKeywords.some(keyword => userAgent.includes(keyword));
    },

    // 库存扫码逻辑
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
              let errorMessage = '未扫描到二维码 ！';
              this.$toast.fail(errorMessage);
            }
          }
        });
      });
    },

    // 验证二维码是否有效
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

    // 资产单次扫码逻辑
    scanQRCode() {
      // 判断是否为PC端（非钉钉环境或钉钉PC端）
      if (typeof dd === 'undefined' || !dd.env || dd.env.platform === 'pc') {
        this.$toast.fail('PC端暂不支持扫码功能，请在钉钉移动端使用');
        return;
      }
      console.log("开始资产扫码");

      dd.ready(() => {
        dd.biz.util.scan({
          type: 'qrCode',
          onSuccess: (data) => {
            const result = data.text; // 获取扫描结果
            console.log("扫描结果:", result);

            if (result) {
              const parts = result.split('_');
              if (parts.length < 3) {
                // 扫描结果中没有 '_'
                this.$toast({
                  message: '二维码的类型不符，请切换板卡重新扫描!',
                  type: 'fail',
                  duration: 2000
                });
                return;
              }

              // 先检查二维码是否存在于数据库中
              SensorRequest.GetAssetInfoByAssetCodeFun(
                JSON.stringify({ Asset_Code: result }),
                (response) => {
                  try {
                    const responseObject = JSON.parse(response);
                    const department = this.$route.params.department;

                    if (!department) {
                      this.$toast.fail('路由参数缺失');
                      return;
                    }

                    // 验证响应数据完整性
                    if (!responseObject || !responseObject.Module_Type || !responseObject.Module_Name) {
                      this.$toast.fail('资产信息不完整');
                      return;
                    }

                    // 根据项目信息决定跳转路径
                    if (!responseObject.Project_Code && !responseObject.Project_Name) {
                      // 无项目信息，跳转到新资产存储页面
                      this.$router.push({
                        path: `/${department}/AddStored`,
                        query: {
                          Module_Name: responseObject.Module_Name,
                          Module_Type: responseObject.Module_Type
                        }
                      });
                    } else {
                      // 有项目信息，跳转到历史记录页面
                      this.$router.push({
                        path: `/${department}/AddHistory`,
                        query: {
                          Module_Name: responseObject.Module_Name,
                          Module_Type: responseObject.Module_Type
                        }
                      });
                    }

                    // 存储扫码结果
                    sessionStorage.setItem(key_DingScannedResult, result);
                    // 更新全局变量
                    updateCachedProductId(result);

                  } catch (parseError) {
                    console.error('解析资产信息失败:', parseError);
                    this.$toast.fail('资产信息解析失败');
                  }
                },
                (searchError) => {
                  // 处理搜索错误 - 不跳转，仅提示用户
                  console.error('查询资产信息失败:', searchError);
                  this.$toast.fail('二维码未查询到，请联系管理员配置录入！');
                }
              );
            } else {
              this.$toast.fail("扫描的二维码不符合要求，请重新扫描！");
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
// 修改 scanQRCodeList 方法
    scanQRCodeList() {
      // 判断是否为PC端（非钉钉环境或钉钉PC端）
      if (typeof dd === 'undefined' || !dd.env || dd.env.platform === 'pc') {
        this.$toast.fail('PC端暂不支持扫码功能，请在钉钉移动端使用');
        return;
      }
      console.log("开始资产批量扫码");

      // 提示用户进入批量扫描模式
      this.$toast({
        message: '已进入批量扫码模式，请扫描相同类型资产！',
        type: 'info',
        duration: 2000
      });

      const scannedResults = []; // 用于存储扫码结果的列表
      let firstPrefix = null; // 存储第一次扫码内容的 _ 前部分

      // 定义递归扫描函数
      const startScan = () => {
        dd.ready(() => {
          dd.biz.util.scan({
            type: 'qrCode',
            onSuccess: (data) => {
              const result = data.text; // 获取扫描结果
              console.log("扫描结果:", result);
              if (result) {
                const parts = result.split('_');
                if (parts.length < 3) {
                  // 扫描结果中没有 _
                  this.$toast({
                    message: '二维码的类型不符，请切换板卡重新扫描!',
                    type: 'fail',
                    duration: 2000
                  });
                  // 继续扫描
                  setTimeout(startScan, 1000);
                  return;
                }
                let prefix = parts.slice(0, 2).join('_'); // 拼接第一个和第二个 _ 之间的部分

                // 检查是否重复扫码
                if (scannedResults.includes(result)) {
                  this.$toast({
                    message: '二维码重复扫描,此次记录不算，请重新扫码！',
                    type: 'fail',
                    duration: 2000
                  });
                  // 继续扫描
                  setTimeout(startScan, 1000);
                  return;
                }
                // 检查是否为同类型资产
                SensorRequest.GetAssetInfoByAssetCodeFun(
                  JSON.stringify({ Asset_Code: result }),
                  (response) => {
                    try {
                      if (scannedResults.length === 0) {
                        // 第一次扫码
                        firstPrefix = prefix;
                        scannedResults.push(result);
                        this.$toast.success('首次扫码成功');
                      } else {
                        // 从第二次扫码开始
                        if (prefix === firstPrefix) {
                          // 扫描的是相同类型的资产
                          scannedResults.push(result);
                          this.$toast.success(`已扫描 ${scannedResults.length} 个`);
                        } else {
                          // 扫描的是不同类型资产
                          this.$toast.fail("扫描了不同类型的资产，请重新扫描相同的资产类型！");
                          // 询问用户是否继续
                          this.$dialog.confirm({
                            title: '提示',
                            message: '扫描了不同类型的资产，是否继续扫描？',
                          }).then(() => {
                            // 继续扫描
                            setTimeout(startScan, 1000);
                          }).catch(() => {
                            // 停止扫描
                            this.stopScan(scannedResults);
                          });
                          return;
                        }
                      }
                      // 询问用户是否继续扫描
                      this.$dialog.confirm({
                        title: '继续扫描',
                        message: `扫码成功！内容是:${result} 是否继续扫描？`
                      }).then(() => {
                        // 用户选择继续扫描
                        setTimeout(startScan, 1000);
                      }).catch(() => {
                        // 用户选择停止扫描
                        this.stopScan(scannedResults);
                      });
                    } catch (error) {
                      console.error('处理响应时出错:', error);
                      this.$toast.fail('处理扫码结果时出错');
                      setTimeout(startScan, 1000);
                    }
                  },
                  (error) => {
                    this.$toast.fail('二维码未查询到，请联系管理员录入！');
                    // 继续扫描
                    setTimeout(startScan, 1000);
                  }
                );
              } else {
                this.$toast({
                  message: '扫描的二维码不符合要求，将自动重新扫描！',
                  type: 'fail',
                  duration: 2000
                });
                // 继续扫描
                setTimeout(startScan, 1000);
              }
            },
            onFail: (err) => {
              console.log('扫码失败:', err);
              if (err.errorCode !== 300001) {
                this.$toast.fail("未扫描到二维码，请重新扫描！");
              }
              // 继续扫描
              setTimeout(startScan, 1000);
            },
            onCancel: () => {
              console.log('用户取消扫描');
              this.stopScan(scannedResults); // 用户取消扫描时停止扫描
            }
          });
        });
      };

      // 启动首次扫描
      startScan();
    },

    stopScan(scannedResults) {
      this.$toast({
        message: `已停止批量扫描，共扫描${scannedResults.length}个！`,
        type: 'success',
        duration: 2000
      });
      this.navigateToResultsPage(scannedResults); // 跳转到结果页面
    },

    navigateToResultsPage(scannedResults) {
      const department = this.$route.params.department;
      this.$router.push({
        path: `/${department}/batch_scan_results`,
        query: { scannedResults: JSON.stringify(scannedResults) }
      });
    }
  }
};
</script>

<!--.app-item:hover {
  background: #f0f8ff;
  border-color: #1989fa;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(25, 137, 250, 0.2);
}-->
<style scoped>
.all-applications-page {
  padding: 16px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.search-container {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  background: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-input {
  flex: 1;
}

.search-btn {
  width: 80px;
  height: 40px;
  margin-right: 8px;
  background: linear-gradient(to bottom, #1989fa, #0d6efd);
  border: none;
  border-radius: 25px;
  box-shadow:
    0 4px 6px rgba(25, 137, 250, 0.3),
    0 1px 3px rgba(0, 0, 0, 0.1);
  font-weight: 500;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.search-btn::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  background: linear-gradient(145deg, #2196F3, #1E88E5);
  border-radius: 23px;
  z-index: -1;
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.3);
}

.search-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 6px 10px rgba(25, 137, 250, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.15);
  background: linear-gradient(to bottom, #2196F3, #1565C0);
}

.search-btn:active {
  transform: translateY(1px);
  box-shadow:
    0 2px 4px rgba(25, 137, 250, 0.2),
    0 1px 2px rgba(0, 0, 0, 0.1);
}

.reset-btn {
  width: 80px;
  height: 40px;
  background: linear-gradient(to bottom, #f0f0f0, #e0e0e0);
  color: #333;
  border: none;
  border-radius: 25px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.1);
  font-weight: 500;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.reset-btn::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  background: linear-gradient(145deg, #f5f5f5, #dcdcdc);
  border-radius: 23px;
  z-index: -1;
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.5);
}

.reset-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 6px 10px rgba(0, 0, 0, 0.15),
    0 2px 4px rgba(0, 0, 0, 0.1);
  background: linear-gradient(to bottom, #f5f5f5, #d0d0d0);
}

.reset-btn:active {
  transform: translateY(1px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.05);
}

.applications-container {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.application-group {
  margin-bottom: 24px;
}

.group-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0 0 12px 0;
  padding: 8px 0;
  border-bottom: 2px solid #e0e0e0;
}

.group-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.app-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #ebedf0;
  border-radius: 8px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.3s ease;
}
.app-icon {
  width: 48px;
  height: 48px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.app-info {
  flex: 1;
}

.app-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.app-path {
  font-size: 12px;
  color: #969799;
  word-break: break-all;
}
</style>
