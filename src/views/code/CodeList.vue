<template>
  <div class="code-list-page">
    <!-- 日志列表 -->
    <div class="log-list-container" ref="logListContainer">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <div class="custom-cards-container">
          <!-- 自定义卡片列表 -->
          <div
            v-for="(activity, index) in activities"
            :key="index"
            class="custom-card"
          >
            <div class="card-header">
              <div class="card-title">{{ activity.operation || '操作类型未知' }}</div>
              <div class="card-timestamp">{{ activity.timestamp }}</div>
            </div>
            <div class="card-body">
              <div class="card-row">
                <span class="field-label">资产编号:</span>
                <span class="field-value">{{ activity.assetCode }}</span>
              </div>
              <div class="card-row">
                <span class="field-label">操作描述:</span>
                <span class="field-value">{{ activity.description }}</span>
              </div>
              <div class="card-row">
                <span class="field-label">操作人员:</span>
                <span class="field-value">{{ activity.personName }}</span>
              </div>
              <div class="card-row">
                <span class="field-label">联系电话:</span>
                <span class="field-value">{{ activity.personPhone }}</span>
              </div>
            </div>
          </div>
          <!-- 没有更多数据提示 -->
          <div v-if="activities.length > 0" class="no-more-text">
            没有更多了
          </div>
        </div>
      </van-pull-refresh>
    </div>
    <!-- 空状态提示 -->
    <van-empty
      v-if="activities.length === 0 && !loadingInitial"
      description="暂无数据，日志记录时间列表为空"
    />
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
import { key_DingUserPhone } from "@/utils/Dingding";
import SensorBorderRequest from "../../utils/SensorRequest";
import CustomizableFloatingButton from "../../components/CustomizableFloatingButton.vue";

export default {
  components: {CustomizableFloatingButton},
  data() {
    return {
      reverse: true,
      activities: [], // 初始化为空数组
      loadingInitial: true, // 初始加载状态
      refreshing: false // 下拉刷新状态
    };
  },
  methods: {
    goBack() {
      // this.$router.go(-1);
      this.navigateTo('/all-applications');
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
    formatTimestamp(timestamp) {
      const date = new Date(timestamp); // 解析 ISO 时间
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    },
    fetchActivities() {
      let key_DingUserPhone1 = localStorage.getItem(key_DingUserPhone);
      const requestParams = JSON.stringify({
        Person_Phone: key_DingUserPhone1,
      });

      SensorBorderRequest.GetAssetOperationInfoByPersonFun(
        requestParams,
        response => {
          console.log('Received response data:', response); // 打印日志
          let parse = JSON.parse(response);

          if (Array.isArray(parse) && parse.length > 0) {
            this.activities = parse.map(item => {
              // 解析 Operation_User 对象
              const operationUser = item.Operation_User || {};

              return {
                id: item.Id || null,           // 记录ID
                uuid: item.Uuid || null,       // UUID
                assetCode: item.Asset_Code || '未知',  // 资产编号
                operation: item.Operation_Type || '未知',  // 操作类型
                description: item.Operation_Description || '无描述', // 操作描述
                timestamp: this.formatTimestamp(item.Ts_create), // 格式化时间
                personName: operationUser.Person_Name || '未知',  // 操作人员姓名
                personPhone: operationUser.Person_Phone || '无', // 操作人员电话
                personDingID: operationUser.Person_DingID || '', // 钉钉ID
                personDepartment: operationUser.Person_Department || '', // 部门
                createTime: item.Ts_create || '',  // 创建时间
                editTime: item.Ts_edit || '',      // 编辑时间
                evidence: item.Operation_Evidence || [], // 证据信息
                logicDel: item.Logic_del,          // 逻辑删除标记
                assetStatus: item.Asset_Status || 'N/A', // 资产状态
                assetRemarks: item.Asset_Remarks || 'N/A' // 资产备注
              };
            }).reverse();
            this.$toast.success('查询日志记录列表成功');
          } else {
            this.activities = []; // 设置为空数组
            this.$toast('暂无数据，日志记录时间列表为空！');
          }

          this.loadingInitial = false; // 初始加载完成
        },
        (error) => {
          console.error(error);
          this.$toast.fail(error);
          this.loadingInitial = false;
        }
      );
    },
    // 下拉刷新
    onRefresh() {
      this.fetchActivities();
      this.refreshing = false; // 刷新完成后设置为 false
    },

    // 处理滚动穿透问题
    preventOverscroll(event) {
      const container = this.$refs.logListContainer;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // 检查是否滚动到了顶部或底部
      const isTop = scrollTop === 0;
      const isBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // 如果在顶部向上滚动或底部向下滚动，阻止默认行为
      if ((isTop && event.deltaY < 0) || (isBottom && event.deltaY > 0)) {
        event.preventDefault();
      }
    }
  },
  mounted() {
    this.fetchActivities();

    // 添加滚动穿透防护
    this.$nextTick(() => {
      const container = this.$refs.logListContainer;
      if (container) {
        container.addEventListener('wheel', this.preventOverscroll, { passive: false });
        container.addEventListener('touchmove', this.preventOverscroll, { passive: false });
      }
    });
  },
  beforeDestroy() {
    // 清理事件监听器
    const container = this.$refs.logListContainer;
    if (container) {
      container.removeEventListener('wheel', this.preventOverscroll);
      container.removeEventListener('touchmove', this.preventOverscroll);
    }
  }
};
</script>

<style scoped>
.code-list-page {
  height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  /* 防止整个页面滚动 */
  overflow: hidden;
}

.log-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px;
  height: 0;
  /* 防止滚动穿透 */
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch; /* iOS平滑滚动 */
}

.custom-cards-container {
  padding: 10px 0;
}

/* 其他样式保持不变 */
.custom-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 12px;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.custom-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
  background-color: #fafafa;
}

.card-title {
  font-weight: 500;
  color: #323233;
  font-size: 15px;
}

.card-timestamp {
  font-size: 12px;
  color: #969799;
}

.card-body {
  padding: 12px 16px;
}

.card-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid #f8f8f8;
}

.card-row:last-child {
  border-bottom: none;
}

.field-label {
  color: #969799;
  font-weight: 400;
  min-width: 80px;
  margin-right: 8px;
  text-align: left;
}

.field-value {
  color: #323233;
  flex: 1;
  text-align: right;
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.4;
}

.no-more-text {
  text-align: center;
  color: #969799;
  padding: 16px 0;
  font-size: 14px;
}

.hint-text {
  padding: 15px 10px;
  text-align: center;
  color: #969799;
  font-size: 14px;
}

/* 适配不同屏幕尺寸 */
@media (max-width: 768px) {
  .code-list-page {
    padding: 5px 0;
  }

  .field-label {
    min-width: 70px;
    font-size: 12px;
  }

  .field-value {
    font-size: 12px;
  }
}
</style>
