NEW_FILE_CODE
<template>
  <div class="inventory-export-page">
    <!-- 使用 Flexbox 实现垂直水平居中 -->
    <div class="export-container">
      <h2>库存信息条件查询导出</h2>

      <!-- 搜索表单区域 -->
      <div class="search-form">
        <div class="form-group">
          <label class="form-label">物品名称</label>
          <van-field
            v-model="searchForm.Item_Name"
            placeholder="请输入物品名称"
            clearable
          />
        </div>

        <div class="form-group">
          <label class="form-label">货架位置</label>
          <van-field
            v-model="searchForm.Shelf_Location"
            placeholder="请输入货架位置"
            clearable
          />
        </div>

        <div class="form-group">
          <label class="form-label">物品型号</label>
          <van-field
            v-model="searchForm.Item_Model"
            placeholder="请输入物品型号"
            clearable
          />
        </div>

        <div class="form-group">
          <label class="form-label">物品品牌</label>
          <van-field
            v-model="searchForm.Item_Brand"
            placeholder="请输入物品品牌"
            clearable
          />
        </div>

        <div class="form-group">
          <label class="form-label">分类类型</label>
          <van-field
            v-model="searchForm.Category_Type"
            placeholder="请输入分类类型"
            clearable
          />
        </div>

        <div class="form-group">
          <label class="form-label">所属公司</label>
          <van-field
            v-model="searchForm.Company"
            placeholder="请输入公司名称"
            clearable
          />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="export-actions">
        <van-button
          type="default"
          @click="goBack"
          :disabled="exporting"
        >
          返回
        </van-button>
        <van-button
          type="primary"
          @click="resetForm"
          :disabled="exporting"
        >
          重置
        </van-button>
        <van-button
          type="info"
          @click="exportInventory"
          :loading="exporting"
        >
          {{ exporting ? '导出中...' : '导出' }}
        </van-button>
      </div>
    </div>

    <!-- 页脚 -->
    <div class="footer">
      <p>@ {{ currentYear }} <a href="https://www.sensor-smart.com/" target="_blank">陕西晟思智能测控有限公司</a></p>
    </div>
  </div>
</template>

<script>
import { Toast, Dialog } from 'vant'
import SensorRequestPage from "../utils/SensorRequestPage";
import { downloadFileByBase64 } from '../utils/fileUtils';

export default {
  name: 'InventoryExport',
  data() {
    return {
      currentYear: new Date().getFullYear(), // 当前年份
      exporting: false,
      searchForm: {
        Item_Name: '',
        Shelf_Location: '',
        Item_Model: '',
        Item_Brand: '',
        Category_Type: '',
        Company: ''
      }
    }
  },
  methods: {
    // 重置表单
    resetForm() {
      this.searchForm = {
        Item_Name: '',
        Shelf_Location: '',
        Item_Model: '',
        Item_Brand: '',
        Category_Type: '',
        Company: ''
      };
      Toast('已重置筛选条件');
    },

    // 导出库存信息
    async exportInventory() {
      // 构建请求参数
      const params = {
        Item_Name: this.searchForm.Item_Name || '',
        Shelf_Location: this.searchForm.Shelf_Location || '',
        Item_Model: this.searchForm.Item_Model || '',
        Item_Brand: this.searchForm.Item_Brand || '',
        Category_Type: this.searchForm.Category_Type || '',
        Company: this.searchForm.Company || ''
      };

      // 检查是否所有条件都为空
      const allEmpty = Object.values(params).every(value => value === '');
      if (allEmpty) {
        Dialog.confirm({
          title: '提示',
          message: '您未设置任何筛选条件，将导出全部库存数据，是否继续？'
        }).then(() => {
          this.doExport(params);
        }).catch(() => {
          // 用户取消
        });
      } else {
        this.doExport(params);
      }
    },

    // 执行导出操作
    doExport(params) {
      this.exporting = true;

      try {
        // 调用后端接口导出 Excel
        SensorRequestPage.InventoryExportToExcelFun(
          JSON.stringify(params),
          (respData) => {
            this.exporting = false;

            // 解析后端返回的数据
            if (respData) {
              const responseJson = typeof respData === 'string' ? JSON.parse(respData) : respData;

              if (responseJson.File_Name && responseJson.File_Base64) {
                Toast.success('文件导出成功，正在下载...');

                // 调用 Base64 下载方法
                downloadFileByBase64(
                  responseJson.File_Name,
                  responseJson.File_Base64
                );

                // 延迟返回，给用户下载时间
                setTimeout(() => {
                  this.goBack();
                }, 2000);
              } else {
                Toast.fail('导出数据格式错误');
              }
            } else {
              Toast.fail('未查询到符合条件的库存信息');
            }
          },
          (error) => {
            this.exporting = false;
            console.error('导出失败:', error);
            Toast.fail('导出失败：' + error);
          }
        );
      } catch (error) {
        this.exporting = false;
        console.error('导出异常:', error);
        Toast.fail('导出异常：' + error.message);
      }
    },

    goBack() {
      // 返回上一页
      this.$router.go(-1);
    }
  }
}
</script>

<style scoped>
.inventory-export-page {
  padding: 20px;
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.export-container {
  width: 100%;
  max-width: 700px;
  background: white;
  border-radius: 15px;
  padding: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.export-container h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 24px;
}

.search-form {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.export-actions {
  display: flex;
  gap: 10px;
}

.export-actions .van-button {
  flex: 1;
}

.footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  padding: 10px 0;
  color: #666;
  font-size: 14px;
  background-color: #f5f5f5;
}

.footer a {
  color: #3fb3fb;
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .export-container {
    padding: 30px 20px;
  }

  .export-container h2 {
    font-size: 20px;
  }

  .export-actions {
    flex-direction: column;
  }
}
</style>
