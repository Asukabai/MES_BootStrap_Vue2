<template>
  <div class="code-list-page">
    <!-- 日志列表 -->
    <div class="log-list-container">
      <van-pull-refresh v-model="isLoadingRefresh" @refresh="onRefresh">
        <van-list
          v-model="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <van-cell-group inset>
            <van-cell
              v-for="(activity, index) in activities"
              :key="index"
              :title="activity.content"
              :label="`操作类型: ${activity.operation}`"
              :value="activity.timestamp"
              size="large"
            />
          </van-cell-group>
        </van-list>
      </van-pull-refresh>
    </div>

    <!-- 底部按钮区域 -->
    <div class="footer-buttons">
      <van-button
        type="default"
        size="normal"
        block
        @click="goBackFlash"
        class="footer-btn"
      >
        刷新列表
      </van-button>
      <van-button
        type="info"
        size="normal"
        block
        @click="goBackMore"
        class="footer-btn"
      >
        查看详情
      </van-button>
    </div>

    <!-- 空状态提示 -->
    <van-empty
      v-if="activities.length === 0 && !isLoading"
      description="暂无数据，日志记录时间列表为空"
    />

    <!-- 提示文字 -->
    <div class="hint-text" v-if="activities.length > 0">
      需上传记录此处才有日志，仅扫码无记录
    </div>
    <CustomizableFloatingButton
      :initial-position="{ bottom: 190, right: 20 }"
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
      isLoading: true, // 加载状态
      loading: false, // 上拉加载状态
      finished: false, // 是否已完成加载
      isLoadingRefresh: false // 下拉刷新状态
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
    goBackMore() {
      this.$router.push({ path: '/ddinguia/web/history222' });
    },
    goBackFlash() {
      this.fetchActivities();
      this.$toast.success('刷新成功！');
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
            this.activities = parse.map(item => ({
              operation: item.Operation_Type,     // 操作类型：焊接、入库等
              content: item.Asset_Code,          // 资产编号
              timestamp: this.formatTimestamp(item.Ts_create), // 格式化时间
            })).reverse();
            this.$toast.success('查询日志记录列表成功');
          } else {
            this.activities = []; // 设置为空数组
            this.$toast('暂无数据，日志记录时间列表为空！');
          }

          this.isLoading = false; // 数据加载完成后将 isLoading 设置为 false
          this.finished = true; // 设置加载完成状态
        },
        (error) => {
          console.error(error);
          this.$toast.fail(error);
          this.isLoading = false;
          this.finished = true;
        }
      );
    },

    // 下拉刷新
    onRefresh() {
      this.fetchActivities();
      this.isLoadingRefresh = false;
    },

    // 上拉加载
    onLoad() {
      // 由于数据是一次性获取的，所以直接标记完成
      this.loading = false;
      this.finished = true;
    }
  },
  mounted() {
    this.fetchActivities(); // 组件挂载时获取数据
  }
};
</script>

<style scoped>
.code-list-page {
  padding: 10px 0;
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.operations-container {
  margin-bottom: 10px;
  padding: 0 10px;
}

.log-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px;
}

.footer-buttons {
  padding: 15px 10px;
  background-color: white;
  border-top: 1px solid #f0f0f0;
}

.footer-btn {
  margin-bottom: 10px;
  border-radius: 8px;
}

.footer-btn:last-child {
  margin-bottom: 0;
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

  .footer-btn {
    margin-bottom: 8px;
  }
}

/* 确保页面有足够的空间显示内容 */
/deep/ .van-cell__value {
  flex: 1;
  text-align: right;
  word-break: break-all;
  font-size: 12px;
  color: #969799;
}

/deep/ .van-cell__label {
  margin-top: 4px;
  font-size: 12px;
  color: #888;
}
</style>
