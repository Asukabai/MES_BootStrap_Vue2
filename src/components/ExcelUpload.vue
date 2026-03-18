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
            <div class="search-input-wrapper">
              <van-field
                v-model="searchForm.Item_Name"
                placeholder="请输入物品名称"
                clearable
                @input="onItemNameInput"
              >
                <template #button>
                  <van-button
                    size="small"
                    type="primary"
                    icon="search"
                    @click="searchItemName"
                  />
                </template>
              </van-field>
            </div>
            <!-- 物品名称搜索结果 -->
            <div v-if="itemNameSuggestions.length > 0" class="suggestions-list">
              <div
                v-for="(suggestion, index) in itemNameSuggestions"
                :key="index"
                class="suggestion-item"
                @click="selectItemName(suggestion)"
              >
                {{ suggestion }}
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">货架位置</label>
            <div class="search-input-wrapper">
              <van-field
                v-model="searchForm.Shelf_Location"
                placeholder="请输入货架位置"
                clearable
                @input="onShelfLocationInput"
              >
                <template #button>
                  <van-button
                    size="small"
                    type="primary"
                    icon="search"
                    @click="searchShelfLocation"
                  />
                </template>
              </van-field>
            </div>
            <!-- 货架位置搜索结果 -->
            <div v-if="shelfLocationSuggestions.length > 0" class="suggestions-list">
              <div
                v-for="(suggestion, index) in shelfLocationSuggestions"
                :key="index"
                class="suggestion-item"
                @click="selectShelfLocation(suggestion)"
              >
                {{ suggestion }}
              </div>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">物品型号</label>
            <div class="search-input-wrapper">
              <van-field
                v-model="searchForm.Item_Model"
                placeholder="请输入物品型号"
                clearable
                @input="onItemModelInput"
              >
                <template #button>
                  <van-button
                    size="small"
                    type="primary"
                    icon="search"
                    @click="searchItemModel"
                  />
                </template>
              </van-field>
            </div>
            <!-- 物品型号搜索结果 -->
            <div v-if="itemModelSuggestions.length > 0" class="suggestions-list">
              <div
                v-for="(suggestion, index) in itemModelSuggestions"
                :key="index"
                class="suggestion-item"
                @click="selectItemModel(suggestion)"
              >
                {{ suggestion }}
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">物品品牌</label>
            <div class="search-input-wrapper">
              <van-field
                v-model="searchForm.Item_Brand"
                placeholder="请输入物品品牌"
                clearable
                @input="onItemBrandInput"
              >
                <template #button>
                  <van-button
                    size="small"
                    type="primary"
                    icon="search"
                    @click="searchItemBrand"
                  />
                </template>
              </van-field>
            </div>
            <!-- 物品品牌搜索结果 -->
            <div v-if="itemBrandSuggestions.length > 0" class="suggestions-list">
              <div
                v-for="(suggestion, index) in itemBrandSuggestions"
                :key="index"
                class="suggestion-item"
                @click="selectItemBrand(suggestion)"
              >
                {{ suggestion }}
              </div>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">分类类型</label>
            <div class="select-input" @click="showCategoryAction = true">
              <span :class="{ 'selected-value': searchForm.Category_Type }">
                {{ searchForm.Category_Type || '请选择分类类型' }}
              </span>
              <van-icon name="arrow" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">所属公司</label>
            <div class="select-input" @click="showCompanyAction = true">
              <span :class="{ 'selected-value': searchForm.Company }">
                {{ searchForm.Company || '请选择所属公司' }}
              </span>
              <van-icon name="arrow" />
            </div>
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

    <!-- 分类类型动作面板 -->
    <van-action-sheet
      v-model="showCategoryAction"
      :actions="categoryActions"
      @select="onCategorySelect"
      cancel-text="取消"
      close-on-click-action
    />

    <!-- 公司动作面板 -->
    <van-action-sheet
      v-model="showCompanyAction"
      :actions="companyActions"
      @select="onCompanySelect"
      cancel-text="取消"
      close-on-click-action
    />

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
      showCategoryAction: false,
      showCompanyAction: false,
      isSearching: false,
      searchDebounceTimer: null,
      searchForm: {
        Item_Name: '',
        Shelf_Location: '',
        Item_Model: '',
        Item_Brand: '',
        Category_Type: '',
        Company: ''
      },
      // 搜索建议列表
      itemNameSuggestions: [],
      shelfLocationSuggestions: [],
      itemModelSuggestions: [],
      itemBrandSuggestions: [],
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
  computed: {
    // 分类类型动作列表
    categoryActions() {
      return this.categoryOptions.map(option => ({
        name: option.text,
        value: option.value
      }))
    },
    // 公司动作列表
    companyActions() {
      return this.companyOptions.map(option => ({
        name: option.text,
        value: option.value
      }))
    }
  },
  methods: {
    // 物品名称输入处理（带防抖）
    onItemNameInput() {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }

      this.searchDebounceTimer = setTimeout(() => {
        if (this.searchForm.Item_Name && this.searchForm.Item_Name.trim()) {
          this.searchItemName();
        } else {
          this.itemNameSuggestions = [];
        }
      }, 500);
    },

    // 货架位置输入处理（带防抖）
    onShelfLocationInput() {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }

      this.searchDebounceTimer = setTimeout(() => {
        if (this.searchForm.Shelf_Location && this.searchForm.Shelf_Location.trim()) {
          this.searchShelfLocation();
        } else {
          this.shelfLocationSuggestions = [];
        }
      }, 500);
    },

    // 物品型号输入处理（带防抖）
    onItemModelInput() {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }

      this.searchDebounceTimer = setTimeout(() => {
        if (this.searchForm.Item_Model && this.searchForm.Item_Model.trim()) {
          this.searchItemModel();
        } else {
          this.itemModelSuggestions = [];
        }
      }, 500);
    },

    // 物品品牌输入处理（带防抖）
    onItemBrandInput() {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }

      this.searchDebounceTimer = setTimeout(() => {
        if (this.searchForm.Item_Brand && this.searchForm.Item_Brand.trim()) {
          this.searchItemBrand();
        } else {
          this.itemBrandSuggestions = [];
        }
      }, 500);
    },

    // 选择物品名称
    selectItemName(name) {
      this.searchForm.Item_Name = name;
      this.itemNameSuggestions = [];
      Toast.success(`已选择：${name}`);
    },

    // 选择货架位置
    selectShelfLocation(location) {
      this.searchForm.Shelf_Location = location;
      this.shelfLocationSuggestions = [];
      Toast.success(`已选择：${location}`);
    },

    // 选择物品型号
    selectItemModel(model) {
      this.searchForm.Item_Model = model;
      this.itemModelSuggestions = [];
      Toast.success(`已选择：${model}`);
    },

    // 选择物品品牌
    selectItemBrand(brand) {
      this.searchForm.Item_Brand = brand;
      this.itemBrandSuggestions = [];
      Toast.success(`已选择：${brand}`);
    },

    // 搜索物品名称
    searchItemName() {
      if (!this.searchForm.Item_Name || this.isSearching) return;

      this.isSearching = true;
      const keyword = this.searchForm.Item_Name.trim();

      const param = {
        PageIndex: 0,
        PageSize: 20,
        Item_Name: keyword,
        Item_Model: '',
        Company: '',
        Shelf_Location: '',
        Item_Brand: '',
        Category_Type: '',
        Company_Filter: ''
      };

      SensorRequestPage.InventoryItemGetFun(
        JSON.stringify(param),
        (respData) => {
          try {
            let parsedData = null;
            if (typeof respData === 'string') {
              parsedData = JSON.parse(respData);
            } else {
              parsedData = respData;
            }

            if (parsedData && parsedData.Data) {
              const suggestions = [];
              const seen = new Set();

              parsedData.Data.forEach(item => {
                if (item.Item_Name && !seen.has(item.Item_Name)) {
                  suggestions.push(item.Item_Name);
                  seen.add(item.Item_Name);
                }
              });

              this.itemNameSuggestions = suggestions.slice(0, 20);
            } else if (parsedData && parsedData.Msg) {
              // 显示后端返回的错误信息
              Toast.fail(parsedData.Msg);
            }
          } catch (error) {
            console.error('获取物品名称建议失败:', error);
            Toast.fail('解析数据失败');
            this.itemNameSuggestions = [];
          } finally {
            this.isSearching = false;
          }
        },
        (error) => {
          console.error('获取物品名称建议接口失败:', error);
          const errorMsg = typeof error === 'string' ? error : '请求失败';
          Toast.fail(errorMsg);
          this.isSearching = false;
          this.itemNameSuggestions = [];
        }
      );
    },

    // 搜索货架位置
    searchShelfLocation() {
      if (!this.searchForm.Shelf_Location || this.isSearching) return;

      this.isSearching = true;
      const keyword = this.searchForm.Shelf_Location.trim();

      const param = {
        PageIndex: 0,
        PageSize: 20,
        Item_Name: '',
        Item_Model: '',
        Company: '',
        Shelf_Location: keyword,
        Item_Brand: '',
        Category_Type: '',
        Company_Filter: ''
      };

      SensorRequestPage.InventoryItemGetFun(
        JSON.stringify(param),
        (respData) => {
          try {
            let parsedData = null;
            if (typeof respData === 'string') {
              parsedData = JSON.parse(respData);
            } else {
              parsedData = respData;
            }

            if (parsedData && parsedData.Data) {
              const suggestions = [];
              const seen = new Set();

              parsedData.Data.forEach(item => {
                if (item.Shelf_Location && !seen.has(item.Shelf_Location)) {
                  suggestions.push(item.Shelf_Location);
                  seen.add(item.Shelf_Location);
                }
              });

              this.shelfLocationSuggestions = suggestions.slice(0, 20);
            } else if (parsedData && parsedData.Msg) {
              // 显示后端返回的错误信息
              Toast.fail(parsedData.Msg);
            }
          } catch (error) {
            console.error('获取货架位置建议失败:', error);
            Toast.fail('解析数据失败');
            this.shelfLocationSuggestions = [];
          } finally {
            this.isSearching = false;
          }
        },
        (error) => {
          console.error('获取货架位置建议接口失败:', error);
          const errorMsg = typeof error === 'string' ? error : '请求失败';
          Toast.fail(errorMsg);
          this.isSearching = false;
          this.shelfLocationSuggestions = [];
        }
      );
    },

    // 搜索物品型号
    searchItemModel() {
      if (!this.searchForm.Item_Model || this.isSearching) return;

      this.isSearching = true;
      const keyword = this.searchForm.Item_Model.trim();

      const param = {
        PageIndex: 0,
        PageSize: 20,
        Item_Name: '',
        Item_Model: keyword,
        Company: '',
        Shelf_Location: '',
        Item_Brand: '',
        Category_Type: '',
        Company_Filter: ''
      };

      SensorRequestPage.InventoryItemGetFun(
        JSON.stringify(param),
        (respData) => {
          try {
            let parsedData = null;
            if (typeof respData === 'string') {
              parsedData = JSON.parse(respData);
            } else {
              parsedData = respData;
            }

            if (parsedData && parsedData.Data) {
              const suggestions = [];
              const seen = new Set();

              parsedData.Data.forEach(item => {
                if (item.Item_Model && item.Item_Model.trim() && !seen.has(item.Item_Model)) {
                  suggestions.push(item.Item_Model);
                  seen.add(item.Item_Model);
                }
              });

              this.itemModelSuggestions = suggestions.slice(0, 20);
            } else if (parsedData && parsedData.Msg) {
              // 显示后端返回的错误信息
              Toast.fail(parsedData.Msg);
            }
          } catch (error) {
            console.error('获取物品型号建议失败:', error);
            Toast.fail('解析数据失败');
            this.itemModelSuggestions = [];
          } finally {
            this.isSearching = false;
          }
        },
        (error) => {
          console.error('获取物品型号建议接口失败:', error);
          const errorMsg = typeof error === 'string' ? error : '请求失败';
          Toast.fail(errorMsg);
          this.isSearching = false;
          this.itemModelSuggestions = [];
        }
      );
    },

    // 搜索物品品牌
    searchItemBrand() {
      if (!this.searchForm.Item_Brand || this.isSearching) return;

      this.isSearching = true;
      const keyword = this.searchForm.Item_Brand.trim();

      const param = {
        PageIndex: 0,
        PageSize: 20,
        Item_Name: '',
        Item_Model: '',
        Company: '',
        Shelf_Location: '',
        Item_Brand: keyword,
        Category_Type: '',
        Company_Filter: ''
      };

      SensorRequestPage.InventoryItemGetFun(
        JSON.stringify(param),
        (respData) => {
          try {
            let parsedData = null;
            if (typeof respData === 'string') {
              parsedData = JSON.parse(respData);
            } else {
              parsedData = respData;
            }

            if (parsedData && parsedData.Data) {
              const suggestions = [];
              const seen = new Set();

              parsedData.Data.forEach(item => {
                if (item.Item_Brand && !seen.has(item.Item_Brand)) {
                  suggestions.push(item.Item_Brand);
                  seen.add(item.Item_Brand);
                }
              });

              this.itemBrandSuggestions = suggestions.slice(0, 20);
            } else if (parsedData && parsedData.Msg) {
              // 显示后端返回的错误信息
              Toast.fail(parsedData.Msg);
            }
          } catch (error) {
            console.error('获取物品品牌建议失败:', error);
            Toast.fail('解析数据失败');
            this.itemBrandSuggestions = [];
          } finally {
            this.isSearching = false;
          }
        },
        (error) => {
          console.error('获取物品品牌建议接口失败:', error);
          const errorMsg = typeof error === 'string' ? error : '请求失败';
          Toast.fail(errorMsg);
          this.isSearching = false;
          this.itemBrandSuggestions = [];
        }
      );
    },

    // 分类类型选择
    onCategorySelect(item) {
      this.searchForm.Category_Type = item.value;
      Toast.success(`已选择：${item.name}`);
    },

    // 公司选择
    onCompanySelect(item) {
      this.searchForm.Company = item.value;
      Toast.success(`已选择：${item.name}`);
    },

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
      this.itemNameSuggestions = [];
      this.shelfLocationSuggestions = [];
      this.itemModelSuggestions = [];
      this.itemBrandSuggestions = [];
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
  },
  beforeDestroy() {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
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
  position: relative;
}

.form-label {
  display: block;
  margin-bottom: 10px;
  font-size: 15px;
  color: #555;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.search-input-wrapper {
  position: relative;
}

.suggestions-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  background: white;
  border: 1px solid #ebedf0;
  border-radius: 8px;
  margin-top: 4px;
  max-height: 300px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.suggestion-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
  color: #323233;
}

.suggestion-item:hover {
  background-color: #f7f8fa;
}

.suggestion-item:active {
  background-color: #e8f3ff;
}

.select-input {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f7f8fa;
  border: 1px solid #ebedf0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.select-input:hover {
  border-color: #3f83f8;
  background-color: #f0f7ff;
}

.select-input span {
  font-size: 14px;
  color: #323233;
}

.select-input .selected-value {
  color: #3f83f8;
  font-weight: 500;
}

.select-input .van-icon {
  font-size: 16px;
  color: #969799;
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
