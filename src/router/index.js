import Vue from 'vue'
import Router from 'vue-router'
import * as dd from 'dingtalk-jsapi'

// 导入视图组件...
import Home from '../views/home/Home.vue'
import CartFile from '../views/share/CartFile.vue'
import User from '../views/user/User.vue'
import Task from "@/views/task/Task.vue";
import Login from "@/views/login/Login.vue"
import StatisticalReport from "@/views/summary/StatisticalReport.vue"
import UploadSummary from "@/views/summary/UploadSummary.vue"
import ChatCategory from "@/views/knowledge/ChatCategory.vue"
import CreatePost from "@/views/knowledge/CreatePost.vue"
import PostDetail from "@/views/knowledge/PostDetail.vue"

Vue.use(Router)

const basePath = '/sensor/ddingWork/'
// 获取当前部门前缀
const router = new Router({
  mode: 'history',
  base: basePath,
  routes: [
    // {
    //   path: '/',
    //   redirect: '/login'
    // },
    {
      path: '/:department/index',
      name: 'Home',
      component: Home,
      meta: { title: '首页' }
    },
    {
      path: '/:department/chat_category',
      name: 'ChatCategory',
      component: ChatCategory,
      meta: { title: '知识库' }
    },
    {
      path: '/:department/create_post',
      name: 'CreatePost',
      component: CreatePost,
      meta: { title: '创建帖子' }
    },
    {
      path: '/:department/post-detail',
      name: 'PostDetail',
      component: PostDetail,
      meta: { title: '详情信息' }
    },
    {
      path: '/:department/cartList',
      name: 'CartFile',
      component: CartFile,
      meta: { title: '文件分享' }
    },
    {
      path: '/:department/user',
      name: 'User',
      component: User,
      meta: { title: '用户中心' }
    },
    {
      path: '/:department/taskList',
      name: 'Task',
      component: Task,
      meta: { title: '任务管理' }
    },
    {
      path: '/:department/download',
      name: 'FileDownload',
      component: () => import('@/views/share/FileDownload.vue'),
      meta: { title: '文件下载' }
    },
    {
      path: '/:department/DingtalkFilePreview',
      name: 'DingtalkFilePreview',
      component: () => import('../views/share/DingtalkFilePreview.vue'),
      meta: { title: '钉钉文件预览' }
    },
    {
      path: '/:department/profile',
      name: 'Profile',
      component: () => import('@/views/user/Profile.vue'),
      meta: { title: '个人资料' }
    },
    {
      path: '/:department/project-code',
      name: 'ProjectCode',
      component: () => import('@/views/project/ProjectCode.vue'),
      meta: { title: '项目编码' }
    },
    {
      path: '/:department/code-recode',
      name: 'CodeRecode',
      component: () => import('@/views/share/CodeRecode.vue'),
      meta: { title: '编码记录' }
    },
    {
      path: '/:department/notice-detail',
      name: 'NoticeDetail',
      component: () => import('../components/NoticeDetail.vue'),
      meta: { title: '公告详情', showTabBar: false }
    },
    {
      path: '/:department/task-record',
      name: 'taskRecord',
      component: () => import('../views/task/taskRecord.vue'),
      meta: { title: '任务记录' }
    },
    {
      path: '/:department/statistical-report',
      name: 'StatisticalReport',
      component: StatisticalReport,
      meta: { title: '统计报表' }
    },
    {
      path: '/:department/upload-summary',
      name: 'UploadSummary',
      component: UploadSummary,
      meta: { title: '上传文件信息汇总' }
    },
    {
      path: '/:department/file-type-stats',
      name: 'FileTypeStats',
      component: () => import('@/views/summary/FileTypeStats.vue'),
      meta: { title: '文件类型统计' }
    },
    {
      path: '/:department/recent-logs',
      name: 'RecentLogs',
      component: () => import('@/views/summary/RecentLogs.vue'),
      meta: { title: '系统日志' }
    },
    {
      path: '/:department/project-manage',
      name: 'projectManage',
      component: () => import('@/views/project/projectManage.vue'),
      meta: { title: '项目列表' }
    },
    {
      path: '/:department/task-manage',
      name: 'taskManage',
      component: () => import('@/views/task/taskManage.vue'),
      meta: { title: '任务日历' }
    },
    {
      path: '/:department/task-detail',
      name: 'TaskDetail',
      component: () => import('@/views/task/taskDetail.vue'),
      meta: { title: '任务详情' }
    },
    {
      path: '/:department/task-detail-last',
      name: 'TaskDetailLast',
      component: () => import('@/views/task/taskDetailLast.vue'),
      meta: { title: '任务完成提交表单' }
    },
    {
      path: '/:department/task-detail-progress',
      name: 'TaskDetailProgress',
      component: () => import('@/views/task/taskDetailProgress.vue'),
      meta: { title: '任务进度提交表单' }
    },
    {
      path: '/:department/task-detail-look',
      name: 'TaskDetailLook',
      component: () => import('@/views/task/taskDetailLook.vue'),
      meta: { title: '查看任务详情' }
    },
    {
      path: '/:department/task/evidence-detail',
      name: 'EvidenceDetail',
      component: () => import('@/views/task/EvidenceDetail.vue'),
      meta: { title: '证据详情' },
    },
    {
      path: '/:department/code/codeList',
      name: 'CodeList',
      component: () => import('@/views/code/CodeList.vue'),
      meta: { title: '扫码记录日志时间列表' }
    },
    {
      path: '/:department/code/config',
      name: 'ScanConfigPage',
      component: () => import('@/views/code/ScanConfigPage.vue'),
      meta: { title: '扫码配置' }
    },
    {
      path: '/:department/code/configList',
      name: 'ScanConfigList',
      component: () => import('@/views/code/ScanConfigList.vue'),
      meta: { title: '配置列表' }
    },
    {
      path: '/:department/code/batch_scan_results',
      name: 'ScanConfigList',
      component: () => import('@/views/code/BatchScanResults.vue'),
      meta: { title: '批量扫码结果' }
    },
    {
      path: '/:department/code/AddStored',
      name: 'AddStored',
      component: () => import('@/views/code/AddStored.vue'),
      meta: { title: '晟思资产出入库表单' }
    },
    {
      path: '/:department/code/AddHistory',
      name: 'AddHistory',
      component: () => import('@/views/code/AddHistory.vue'),
      meta: { title: '资产记录表单' }
    },
    {
      path: '/:department/code/HistoryView',
      name: 'HistoryView',
      component: () => import('@/views/code/HistoryView.vue'),
      meta: { title: '资产记录详情' }
    },
    {
      path: '/:department/progress-tracking',
      name: 'ProgressTracking',
      component: () => import('@/views/project/ProgressTracking.vue'),
      meta: { title: '进度跟踪' }
    },
    {
      path: '/:department/weeklyReportManagement',
      name: 'WeeklyReportManagement',
      component: () => import('../views/weeklyReport/WeeklyReportManagement.vue'),
      meta: { title: '周报管理' }
    },
    {
      path: '/:department/weeklyReport/detail/:id',
      name: 'WeeklyReportDetail',
      component: () => import('@/views/weeklyReport/WeeklyReportDetail.vue'),
      meta: { title: '周报详情' }
    },
    {
      path: '/:department/weeklyReport/edit/:id',
      name: 'WeeklyReportEdit',
      component: () => import('@/views/weeklyReport/WeeklyReportEdit.vue'),
      meta: { title: '编辑周报' }
    },
    {
      path: '/:department/weeklyReport/add',
      name: 'WeeklyReportAdd',
      component: () => import('@/views/weeklyReport/WeeklyReportAdd.vue'),
      meta: { title: '新增周报' }
    },
    // 在路由配置中添加以下路由
    {
      path: '/:department/chat',
      name: 'ChatPage',
      component: () => import('../views/chat/ChatPage.vue'),
      meta: { title: '团队通讯' }
    },
    {
      path: '/:department/chatDetail/:contactId',
      name: 'ChatDetail',
      component: () => import('../views/chat/ChatDetail.vue'),
      meta: { title: '即时通讯' }
    },
    {
      path: '/:department/chat/createGroup',
      name: 'CreateGroup',
      component: () => import('../views/chat/CreateGroup.vue'),
      meta: { title: '创建群聊' }
    },
    {
      path: '/:department/inventory',
      name: 'InventoryManagement',
      component: () => import('../views/inventory/InventoryManagement.vue'),
      meta: { title: '库存管理' }
    },
    {
      path: '/:department/inventoryV1',
      name: 'InventoryManagementV1',
      component: () => import('../views/inventoryV1/InventoryManagementV1.vue'),
      meta: { title: '库存管理V1.0' }
    },
    {
      path: '/:department/inventoryDetail',
      name: 'InventoryDetail',
      component: () => import('../views/inventory/InventoryDetail.vue'),
      meta: { title: '库存详情' }
    },
    {
      path: '/:department/inventoryDetailV1',
      name: 'InventoryDetailV1',
      component: () => import('../views/inventoryV1/InventoryDetailV1.vue'),
      meta: { title: '库存详情V1.0' }
    },
    // 在 router/index.js 中添加路由
    {
      path: '/:department/inventory-outbound',
      name: 'InventoryOutbound',
      component: () => import('@/views/inventory/InventoryOutbound.vue'),
      meta: { title: '快速出库' }
    },
    {
      path: '/:department/inventory-inbound',
      name: 'InventoryInbound',
      component: () => import('../views/inventory/InventoryInbound.vue'),
      meta: { title: '快速入库' }
    },
    {
      path: '/:department/inventoryLog',
      name: 'InventoryLog',
      component: () => import('../views/inventory/InventoryLog.vue'),
      meta: { title: '日志记录' }
    },
    {
      path: '/:department/inventory-outboundV1',
      name: 'InventoryOutboundV1',
      component: () => import('../views/inventoryV1/InventoryOutboundV1.vue'),
      meta: { title: '快速出库V1' }
    },
    {
      path: '/:department/inventory-inboundV1',
      name: 'InventoryInboundV1',
      component: () => import('../views/inventoryV1/InventoryInboundV1.vue'),
      meta: { title: '快速入库V1' }
    },
    {
      path: '/:department/inventoryLogV1',
      name: 'InventoryLogV1',
      component: () => import('../views/inventoryV1/InventoryLogV1.vue'),
      meta: { title: '日志记录V1' }
    },
    {
      path: '/:department/inventory/add',
      name: 'InventoryAdd',
      component: () => import('../views/inventory/InventoryAdd.vue'),
      meta: { title: '新增物品' }
    },
    {
      path: '/:department/inventory/addV1',
      name: 'InventoryAddV1',
      component: () => import('../views/inventoryV1/InventoryAddV1.vue'),
      meta: { title: '新增物品信息V1.0' }
    },
    {
      path: '/:department/inventoryExtendInfoAdd',
      name: 'InventoryExtendInfoAdd',
      component: () => import('../views/inventory/InventoryExtendInfoAdd.vue'),
      meta: { title: '物品扩展信息新增表单' }
    },
    {
      path: '/:department/InventoryExtendInfoView',
      name: 'InventoryExtendInfoView',
      component: () => import('../views/inventory/InventoryExtendInfoView.vue'),
      meta: { title: '物品扩展信息表单' }
    },
    {
      path: '/:department/InventoryExtendInfoEdit',
      name: 'InventoryExtendInfoEdit',
      component: () => import('../views/inventory/InventoryExtendInfoEdit.vue'),
      meta: { title: '物品扩展信息编辑表单' }
    },
    {
      path: '/:department/InventoryInfoEdit',
      name: 'InventoryInfoEdit',
      component: () => import('../views/inventoryV1/InventoryInfoEdit.vue'),
      meta: { title: '物品信息编辑表单V1.0' }
    },
    {
      path: '/:department/excelUpload',
      name: 'ExcelUpload',
      component: () => import('../views/inventoryV1/ExcelUpload.vue'),
      meta: { title: '物品信息批量导入' }
    },
    {
      path: '/:department/inventoryPreview',
      name: 'InventoryPreview',
      component: () => import('../views/inventoryV1/InventoryPreview.vue'),
      meta: { title: '物品信息批量导入预览' }
    },
    {
      path: '/:department/advanced-search',
      name: 'AdvancedSearch',
      component: () => import('../views/inventoryV1/AdvancedSearch.vue'),
      meta: { title: '标签索引' }
    },
    {
      path: '/:department/vat-calculator',
      name: 'VatCalculator',
      component: () => import('@/components/VatCalculator.vue'),
      meta: { title: '增值税计算器' }
    },
    {
      path: '/:department/project-detail/:id',
      name: 'ProjectDetail',
      component: () => import('@/views/project/ProjectDetail.vue'),
      meta: { title: '项目详情' }
    },
    {
      path: '/:department/:type',
      name: 'Login',
      component: Login,
      meta: { title: '登录' }
    },
    {
      path: '*',
      redirect: '/:department/login'
    }
  ]
})

// 动态设置标题 - 适配钉钉环境
router.beforeEach((to, from, next) => {
  console.log('=== 路由守卫 beforeEach ===');
  console.log('从路由:', from.path);
  console.log('到路由:', to.path);
  console.log('路由元信息:', to.meta);

  const title = to.meta.title || '工作助手';
  console.log('应设置的标题:', title);

  // 设置页面标题（普通浏览器）
  document.title = title;
  console.log('document.title 已设置为:', document.title);

  // 适配钉钉环境
  updatePageTitle(title);

  next();
});

// 路由切换完成后再次设置（确保生效）
router.afterEach((to) => {
  console.log('=== 路由守卫 afterEach ===');
  console.log('当前路由:', to.path);

  Vue.nextTick(() => {
    const title = to.meta.title || '工作助手';
    document.title = title;
    console.log('afterEach 中 document.title 设置为:', document.title);
    updatePageTitle(title);
  });
});

// 统一的页面标题更新函数
function updatePageTitle(title) {
  console.log('=== updatePageTitle 函数 ===');
  console.log('尝试设置标题:', title);

  // 首先设置文档标题
  document.title = title;
  console.log('document.title =', document.title);

  // 检查是否在钉钉环境中
  console.log('dd 对象是否存在:', typeof dd !== 'undefined');

  if (typeof dd !== 'undefined') {
    console.log('调用钉钉 API 设置标题');
    dd.biz.navigation.setTitle({
      title: title
    }).then(() => {
      console.log('钉钉标题设置成功:', title);
    }).catch((error) => {
      console.warn('钉钉标题设置失败:', error);
    });
  } else {
    console.log('不在钉钉环境中，跳过钉钉 API 调用');
  }
}

export default router;
