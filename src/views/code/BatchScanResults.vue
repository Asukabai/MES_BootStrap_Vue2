<template>
  <div class="batch-scan-results-container">
    <div class="main-content">
      <van-cell-group class="result-card">
        <van-cell :border="false" class="count-cell">
          <div slot="title" class="count-text">
            <strong>共计: {{ count }} 条</strong>
          </div>
        </van-cell>

        <van-cell
          v-for="(result, index) in results"
          :key="index"
          :title="result"
          :border="false"
          class="result-item"
        />
      </van-cell-group>

      <div class="button-container">
        <van-button
          type="info"
          size="normal"
          block
          @click="clearAndRescan"
          class="action-button clear-btn"
        >
          清空列表重新扫码
        </van-button>
        <van-button
          type="info"
          size="normal"
          block
          @click="navigateToForm"
          class="action-button confirm-btn"
        >
          确定
        </van-button>
      </div>
    </div>
  </div>
</template>

<script>
import SensorBorderRequest from "../../utils/sensorBorder";
import {
  departmentPrefix,
  key_DingResponseStored,
  key_DingResponseUsed,
  updateCachedResponseStored,
  updateCachedResponseUsed
} from "@/utils/Dingding";

export default {
  data() {
    return {
      results: [],
      count: 0 // 添加 count 属性
    };
  },
  created() {
    // 从查询参数中获取扫码结果
    this.results = JSON.parse(this.$route.query.scannedResults || '[]');
    this.count = this.results.length; // 初始化 count 值
  },
  methods: {
    clearAndRescan() {
      this.results = []; // 清空结果列表
      const department = this.$route.params.department;
      this.$router.push(`/${department}/all-applications`);
    },
    navigateToForm() {
      if (this.results.length > 0) {
        const results = this.results;
        // 先将所有的扫码内容放到数据库中去查询这些板卡是否是都是属于同一个项目的，如果不是则应该给出提示，并不行页面跳转
        SensorBorderRequest.scanResults(
          { 'results': results },
          // eslint-disable-next-line no-unused-vars
          (response) => {
            // if (Array.isArray(response) && response.length > 0) {
            // 获取每条数据的 _ 前部分
            const prefixes = this.results.map(result => result.split('_')[0]);
            // 检查所有前缀是否相同
            const allPrefixesSame = prefixes.every(prefix => prefix === prefixes[0]);
            if (allPrefixesSame) {
              SensorBorderRequest.scanListOperation( // 传入一个list 判断每个 二维码的两个状态值，若每个二维码状态值都一致，则可进行批量操作，否则不行
                { 'results': results },
                (response) => {
                  // 接受的是一个 list map
                  // console.log(response);
                  // alert(response[0].isStored);
                  // alert(response[0].isUsed);
                  sessionStorage.setItem(key_DingResponseStored, response[0].isStored);
                  // 调用更新函数
                  updateCachedResponseStored(response[0].isStored);
                  sessionStorage.setItem(key_DingResponseUsed, response[0].isUsed);
                  // 调用更新函数
                  updateCachedResponseUsed(response[0].isUsed);
                  // 检查数据库返回的状态
                  if (response[0].isStored === '已入库' && response[0].isUsed === '已领用') {
                    // 跳转到资产操作页面
                    this.$router.push({
                      path: '/add_history_storedBatch', // 目标页面的路径
                      query: { results: JSON.stringify(this.results) } // 传递 results 数据
                    });
                  } else {
                    // 跳转到出入库登记页面
                    this.$router.push({
                      path: '/add_history_batch', // 目标页面的路径
                      query: { results: JSON.stringify(this.results) } // 传递 results 数据
                    });
                  }
                },
                (error) => {
                  // 处理错误
                  // alert(error);
                  this.$toast({
                    message: error,
                    type: 'fail'
                  });
                }
              );
            } else {
              this.$toast({
                message: '扫描了不同类型的资产，请重新扫描相同的资产类型！',
                type: 'fail'
              });
            }
          },
          (error) => {
            // 处理错误
            // alert(error);
            this.$toast({
              message: '列表中有不同项目板卡，请确保所有扫描板卡都属于同一个项目！',
              type: 'fail'
            });
          }
        )
      } else {
        this.$toast({
          message: '二维码信息异常，未查询到，请联系管理员录入',
          type: 'fail'
        });
      }
    }
  }
};
</script>

<style scoped>
.batch-scan-results-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f7f8fa;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  box-sizing: border-box;
}

.result-card {
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
}

.count-cell {
  background-color: #f9f9f9;
  padding: 12px 16px;
}

.count-text {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.result-item {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}

.result-item:last-child {
  border-bottom: none;
}

.button-container {
  display: flex;
  gap: 10px;
}

.action-button {
  flex: 1;
  height: 44px;
  border-radius: 8px;
}

.clear-btn {
  background-color: #f44336;
  border: none;
}

.confirm-btn {
  background-color: #3f83f8;
  border: none;
}
</style>
