NEW_FILE_CODE
<template>
  <div class="inventory-export-page">
    <!-- 使用 Flexbox 实现垂直水平居中 -->
    <div class="export-container">
      <h2>库存信息条件查询导出</h2>

      <!-- 搜索表单区域 -->
      <div class="search-form">
        <div class="form-row">
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
        </div>

        <div class="form-row">
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
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">分类类型</label>
            <van-field
              v-model="searchForm.Category_Type"
              placeholder="请选择分类类型"
              readonly
              @click="showCategoryPicker = true"
            >
              <template #right-icon>
                <van-icon name="arrow" />
              </template>
            </van-field>
          </div>

          <div class="form-group">
            <label class="form-label">所属公司</label>
            <van-field
              v-model="searchForm.Company"
              placeholder="请选择所属公司"
              readonly
              @click="showCompanyPicker = true"
            >
              <template #right-icon>
                <van-icon name="arrow" />
              </template>
            </van-field>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="export-actions">
        <van-button
          type="default"
          @click="resetForm"
          :disabled="exporting"
          class="action-btn primary-btn"
        >
          重置条件
        </van-button>
        <van-button
          @click="exportInventory"
          :loading="exporting"
          class="action-btn primary-btn"
        >
          {{ exporting ? '导出中...' : '导出 Excel' }}
        </van-button>
      </div>
    </div>

    <!-- 分类类型选择器 -->
    <van-popup v-model="showCategoryPicker" position="bottom" round>
      <van-picker
        :columns="categoryOptions"
        @confirm="onCategoryConfirm"
        @cancel="showCategoryPicker = false"
      />
    </van-popup>

    <!-- 公司选择器 -->
    <van-popup v-model="showCompanyPicker" position="bottom" round>
      <van-picker
        :columns="companyOptions"
        @confirm="onCompanyConfirm"
        @cancel="showCompanyPicker = false"
      />
    </van-popup>

    <CustomizableFloatingButton
      :initial-position="{ bottom: 100, right: 50 }"
      :icon-src="require('@/assets/返回.png')"
      :background-size="46"
      :icon-size="46"
      :on-click="goBack"
    />

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
import CustomizableFloatingButton from "./CustomizableFloatingButton.vue";

export default {
  name: 'InventoryExport',
  components: {CustomizableFloatingButton},
  data() {
    return {
      currentYear: new Date().getFullYear(), // 当前年份
      exporting: false,
      showCategoryPicker: false,
      showCompanyPicker: false,
      searchForm: {
        Item_Name: '',
        Shelf_Location: '',
        Item_Model: '',
        Item_Brand: '',
        Category_Type: '',
        Company: ''
      },
      categoryOptions: [
        { text: '公用', value: '公用' },
        { text: '项目', value: '项目' },
        { text: '耗材', value: '耗材' },
        { text: '其他', value: '其他' }
      ],
      companyOptions: [
        { text: '晟思', value: '晟思' },
        { text: '大钧', value: '大钧' },
        { text: '星移', value: '星移' }
      ]
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

    // 分类类型确认选择
    onCategoryConfirm(value) {
      this.searchForm.Category_Type = value;
      this.showCategoryPicker = false;
    },

    // 公司确认选择
    onCompanyConfirm(value) {
      this.searchForm.Company = value;
      this.showCompanyPicker = false;
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
  max-width: 900px;
  background: white;
  border-radius: 16px;
  padding: 50px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
}

.export-container h2 {
  text-align: center;
  margin-bottom: 40px;
  color: #333;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 1px;
}

.search-form {
  margin-bottom: 40px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  display: block;
  margin-bottom: 10px;
  font-size: 15px;
  color: #555;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.export-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 40px;
}

.export-actions .action-btn {
  min-width: 140px;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 24px;
  transition: all 0.3s ease;
}

.export-actions .action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.export-actions .action-btn:active {
  transform: translateY(0);
}

/* 导出按钮 - 自定义蓝色背景 */
.export-actions .primary-btn {
  background-color: #3f83f8;
  border-color: #3f83f8;
  color: #ffffff;
}

.export-actions .primary-btn:hover {
  background-color: #2563eb;
  border-color: #2563eb;
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
    font-size: 22px;
    margin-bottom: 30px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .export-actions {
    flex-direction: column;
    gap: 12px;
  }

  .export-actions .action-btn {
    width: 100%;
    height: 44px;
    font-size: 15px;
  }
}

/* 大屏幕优化 */
@media (min-width: 1200px) {
  .export-container {
    max-width: 1000px;
    padding: 60px;
  }

  .export-container h2 {
    font-size: 32px;
  }

  .form-row {
    gap: 32px;
  }

  .form-label {
    font-size: 16px;
  }
}
</style>
