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
                @input="onItemNameInput"
                ref="itemNameInput"
              >
                <template #button>
                  <van-button
                    size="small"
                    type="primary"
                    icon="search"
                    @click="searchItemName"
                  />
                </template>
                <template #right-icon>
                  <van-icon
                    v-if="searchForm.Item_Name"
                    name="cross"
                    class="custom-clear-icon"
                    @click="clearItemName"
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
                @input="onShelfLocationInput"
                ref="shelfLocationInput"
              >
                <template #button>
                  <van-button
                    size="small"
                    type="primary"
                    icon="search"
                    @click="searchShelfLocation"
                  />
                </template>
                <template #right-icon>
                  <van-icon
                    v-if="searchForm.Shelf_Location"
                    name="cross"
                    class="custom-clear-icon"
                    @click="clearShelfLocation"
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
                @input="onItemModelInput"
                ref="itemModelInput"
              >
                <template #button>
                  <van-button
                    size="small"
                    type="primary"
                    icon="search"
                    @click="searchItemModel"
                  />
                </template>
                <template #right-icon>
                  <van-icon
                    v-if="searchForm.Item_Model"
                    name="cross"
                    class="custom-clear-icon"
                    @click="clearItemModel"
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
                @input="onItemBrandInput"
                ref="itemBrandInput"
              >
                <template #button>
                  <van-button
                    size="small"
                    type="primary"
                    icon="search"
                    @click="searchItemBrand"
                  />
                </template>
                <template #right-icon>
                  <van-icon
                    v-if="searchForm.Item_Brand"
                    name="cross"
                    class="custom-clear-icon"
                    @click="clearItemBrand"
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

        <!-- 关联项目字段 - 仅当分类类型为"项目"时显示 -->
        <div class="form-row" v-if="searchForm.Category_Type === '项目'">
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">
              <span style="color: red;">*</span> 关联项目
            </label>
            <van-field
              v-model="selectedProjectName"
              name="Project_Code"
              placeholder="请选择关联项目"
              is-link
              readonly
              @click="onProjectFieldClick"
            >
              <template #input>
                <div v-if="selectedProjectName && selectedProjectCode" class="project-display">
                  <span class="project-name">{{ selectedProjectName }}</span>
                  <span class="project-code">[{{ selectedProjectCode }}]</span>
                </div>
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

    <!-- 项目选择器弹窗 - 从底部弹出 -->
    <van-popup v-model="showProjectPickerPopup" position="bottom" round>
      <div class="project-picker-full">
        <!-- 搜索框 -->
        <van-search
          v-model="searchKeyword"
          placeholder="请输入项目名称或编码搜索"
          @input="filterProjects"
          class="project-search"
        />
        <!-- 历史选择区域 -->
        <div v-if="recentProjects.length > 0" class="recent-projects">
          <div class="recent-header">
            <div class="recent-title">最近选择:</div>
            <van-icon
              name="clear"
              size="14"
              color="#969799"
              class="clear-recent-icon"
              @click="clearAllRecentProjects"
            />
          </div>
          <div class="recent-list">
            <van-tag
              v-for="(project, index) in recentProjects"
              :key="index"
              type="primary"
              size="medium"
              class="recent-item"
              @click="selectRecentProject(project)"
            >
              {{ project }}
              <van-icon
                name="cross"
                size="14px"
                class="recent-item-close"
                @click.stop="removeRecentProject(index)"
              />
            </van-tag>
          </div>
        </div>
        <!-- 项目列表 -->
        <div class="project-list">
          <div v-if="filteredProjectColumns.length === 0 && searchKeyword" class="no-project-result">
            未找到匹配的项目
          </div>
          <van-cell-group v-else>
            <van-cell
              v-for="(item, index) in filteredProjectColumns"
              :key="index"
              clickable
              @click="onProjectItemClick(item)"
              class="project-item"
            >
              <template #title>
                <div class="project-item-content">
                  <div class="project-item-name">{{ extractProjectName(item) }}</div>
                  <div v-if="extractProjectCode(item)" class="project-item-code">{{ extractProjectCode(item) }}</div>
                </div>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </div>
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
      showCategoryAction: false,
      showCompanyAction: false,
      showProjectPickerPopup: false, // 项目选择器弹窗
      isSearching: false,
      searchDebounceTimer: null,
      searchForm: {
        Item_Name: '',
        Shelf_Location: '',
        Item_Model: '',
        Item_Brand: '',
        Category_Type: '',
        Company: '',
        Project_Code: '' // 新增：关联项目编码
      },
      // 项目选择相关
      selectedProjectName: '', // 选中的项目名称（用于显示）
      selectedProjectCode: '', // 选中的项目编码（用于提交）
      projectColumns: [], // 项目列表（显示用）
      fullProjectList: [], // 完整项目列表（原始数据）
      filteredProjectColumns: [], // 过滤后的项目列表
      searchKeyword: '', // 搜索关键词
      recentProjects: [], // 最近选择的项目
      // 搜索建议列表
      itemNameSuggestions: [],
      shelfLocationSuggestions: [],
      itemModelSuggestions: [],
      itemBrandSuggestions: [],
      categoryOptions: [
        { text: '公用', value: '公用' },
        { text: '项目', value: '项目' },
        { text: '耗材', value: '耗材' },
        { text: '其他', value: '其他' },
        { text: '所有', value: '' }
      ],
      companyOptions: [
        { text: '晟思', value: '晟思' },
        { text: '大钧', value: '大钧' },
        { text: '星移', value: '星移' },
        { text: '所有', value: '' }
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
  mounted() {
    this.loadProjectOptions(); // 加载项目列表
    this.loadRecentProjects(); // 加载最近选择
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
      // 可选：自动聚焦输入框
      this.$nextTick(() => {
        if (this.$refs.itemNameInput) {
          this.$refs.itemNameInput.focus();
        }
      });
    },

    // 选择货架位置
    selectShelfLocation(location) {
      this.searchForm.Shelf_Location = location;
      this.shelfLocationSuggestions = [];
      this.$nextTick(() => {
        if (this.$refs.shelfLocationInput) {
          this.$refs.shelfLocationInput.focus();
        }
      });
    },

    // 选择物品型号
    selectItemModel(model) {
      this.searchForm.Item_Model = model;
      this.itemModelSuggestions = [];
      this.$nextTick(() => {
        if (this.$refs.itemModelInput) {
          this.$refs.itemModelInput.focus();
        }
      });
    },

    // 选择物品品牌
    selectItemBrand(brand) {
      this.searchForm.Item_Brand = brand;
      this.itemBrandSuggestions = [];
      this.$nextTick(() => {
        if (this.$refs.itemBrandInput) {
          this.$refs.itemBrandInput.focus();
        }
      });
    },

    // 清空物品名称
    clearItemName() {
      this.searchForm.Item_Name = '';
      this.itemNameSuggestions = [];
      // 自动聚焦输入框以便继续输入
      this.$nextTick(() => {
        if (this.$refs.itemNameInput) {
          this.$refs.itemNameInput.focus();
        }
      });
    },

    // 清空货架位置
    clearShelfLocation() {
      this.searchForm.Shelf_Location = '';
      this.shelfLocationSuggestions = [];
      this.$nextTick(() => {
        if (this.$refs.shelfLocationInput) {
          this.$refs.shelfLocationInput.focus();
        }
      });
    },

    // 清空物品型号
    clearItemModel() {
      this.searchForm.Item_Model = '';
      this.itemModelSuggestions = [];
      this.$nextTick(() => {
        if (this.$refs.itemModelInput) {
          this.$refs.itemModelInput.focus();
        }
      });
    },

    // 清空物品品牌
    clearItemBrand() {
      this.searchForm.Item_Brand = '';
      this.itemBrandSuggestions = [];
      this.$nextTick(() => {
        if (this.$refs.itemBrandInput) {
          this.$refs.itemBrandInput.focus();
        }
      });
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

              this.itemNameSuggestions = suggestions;
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

              this.shelfLocationSuggestions = suggestions;
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

              this.itemModelSuggestions = suggestions;
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

              this.itemBrandSuggestions = suggestions;
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
      // 如果选择的不是"项目"，清空项目选择
      if (item.value !== '项目') {
        this.searchForm.Project_Code = '';
        this.selectedProjectName = '';
        this.selectedProjectCode = '';
      }
      Toast.success(`已选择：${item.name}`);
    },

    // 公司选择
    onCompanySelect(item) {
      this.searchForm.Company = item.value;
      Toast.success(`已选择：${item.name}`);
    },

    // 项目字段点击事件
    onProjectFieldClick() {
      this.showProjectPickerPopup = true;
      this.searchKeyword = '';
      this.filterProjects();
    },

    // 项目列表项点击事件
    onProjectItemClick(itemText) {
      // 从显示文本中提取项目名称
      const projectName = this.extractProjectName(itemText);
      this.onProjectConfirm(projectName);
    },

    // 提取项目名称
    extractProjectName(item) {
      if (typeof item === 'string') {
        // 如果是字符串格式 "项目名称 [编码]"
        const match = item.match(/^(.*?)\s*\[/);
        return match ? match[1].trim() : item;
      }
      return item.Project_Name || item.name || item.projectName || '未知项目';
    },

    // 提取项目编码
    extractProjectCode(item) {
      if (typeof item === 'string') {
        // 如果是字符串格式 "项目名称 [编码]"
        const match = item.match(/\[(.*?)\]/);
        return match ? match[1] : '';
      }
      return item.Project_Code || '';
    },

    // 项目选择器确认事件
    onProjectConfirm(value) {
      // 保存选中的项目名称用于显示
      this.selectedProjectName = value;
      this.showProjectPickerPopup = false;

      // 查找对应的项目代码并更新表单
      const selectedProject = this.fullProjectList.find(project =>
        (project.Project_Name || project.name || project.projectName) === value
      );

      if (selectedProject) {
        this.searchForm.Project_Code = selectedProject.Project_Code || '';
        this.selectedProjectCode = selectedProject.Project_Code || '';
      }

      // 保存到历史记录
      this.saveToRecentProjects(value);

      Toast.success(`已选择项目：${value}`);
    },

    // 选择最近项目
    selectRecentProject(projectName) {
      this.selectProject(projectName);
      this.showProjectPickerPopup = false;
    },

    // 选择项目的统一处理函数
    selectProject(projectName) {
      this.selectedProjectName = projectName;

      // 查找对应的项目代码
      const selectedProject = this.fullProjectList.find(project => {
        const fullName = (project.Project_Name || project.name || project.projectName);
        return fullName === projectName;
      });

      const projectCode = selectedProject ? (selectedProject.Project_Code || '') : '';
      this.searchForm.Project_Code = projectCode;
      this.selectedProjectCode = projectCode;

      // 保存到历史记录
      this.saveToRecentProjects(projectName);
    },

    // 保存到最近选择
    saveToRecentProjects(projectName) {
      // 限制历史记录数量为 5 条
      const maxRecentCount = 5;
      if (!this.recentProjects.includes(projectName)) {
        this.recentProjects.unshift(projectName);
        if (this.recentProjects.length > maxRecentCount) {
          this.recentProjects.pop();
        }
        // 保存到本地存储
        localStorage.setItem('recentProjects', JSON.stringify(this.recentProjects));
      }
    },

    // 移除最近选择
    removeRecentProject(index) {
      this.recentProjects.splice(index, 1);
      localStorage.setItem('recentProjects', JSON.stringify(this.recentProjects));
    },

    // 清除所有最近选择
    clearAllRecentProjects() {
      Dialog.confirm({
        title: '确认清除',
        message: '确定要清除所有最近选择的项目吗？',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }).then(() => {
        this.recentProjects = [];
        localStorage.removeItem('recentProjects');
        Toast.success('已清除所有最近选择');
      }).catch(() => {
        // 用户取消
      });
    },

    // 过滤项目列表
    filterProjects() {
      if (!this.searchKeyword) {
        this.filteredProjectColumns = this.projectColumns;
        return;
      }

      // 将搜索关键词转换为小写进行比较
      const keyword = this.searchKeyword.toLowerCase().trim();
      this.filteredProjectColumns = this.projectColumns.filter(project =>
        project.toLowerCase().includes(keyword)
      );
    },

    // 加载项目选项
    loadProjectOptions() {
      const param = {};
      SensorRequestPage.ProjectInfoGetFun(JSON.stringify(param), (respData) => {
        try {
          let parsedData = null;
          if (typeof respData === 'string') {
            parsedData = JSON.parse(respData);
          } else {
            parsedData = respData;
          }

          if (parsedData && parsedData.data) {
            const projectList = parsedData.data;

            // 保存完整的项目信息（包含 Project_Code 和 Project_Name）
            this.fullProjectList = projectList.map(p => ({
              Project_Code: p.Project_Code,
              Project_Name: p.Project_Name || p.name || p.projectName
            }));

            // 显示项目名称 + 项目编码的组合
            this.projectColumns = projectList.map(project => {
              const projectName = project.Project_Name || '未知项目';
              const projectCode = project.Project_Code || '';
              // 返回带有项目编码的显示文本
              return projectCode ? `${projectName} [${projectCode}]` : projectName;
            });

            this.filteredProjectColumns = this.projectColumns;
            console.log('[loadProjectOptions] ✓ 项目选项加载成功:', {
              total: projectList.length,
              columns: this.projectColumns.length
            });
          }
        } catch (error) {
          console.error('[loadProjectOptions] ✗ 解析项目数据失败:', error);
        }
      }, (error) => {
        console.error('[loadProjectOptions] ✗ 获取项目信息失败:', error);
      });
    },

    // 加载最近选择的项目
    loadRecentProjects() {
      const stored = localStorage.getItem('recentProjects');
      if (stored) {
        this.recentProjects = JSON.parse(stored);
      }
    },

    // 重置表单
    resetForm() {
      this.searchForm = {
        Item_Name: '',
        Shelf_Location: '',
        Item_Model: '',
        Item_Brand: '',
        Category_Type: '',
        Company: '',
        Project_Code: ''
      };
      this.selectedProjectName = '';
      this.selectedProjectCode = '';
      this.itemNameSuggestions = [];
      this.shelfLocationSuggestions = [];
      this.itemModelSuggestions = [];
      this.itemBrandSuggestions = [];
      Toast('已重置筛选条件');
    },

    // 导出库存信息
    async exportInventory() {
      // 验证：如果分类类型为"项目"，必须选择关联项目
      if (this.searchForm.Category_Type === '项目' && !this.selectedProjectCode) {
        Toast.fail('请选择关联项目');
        return;
      }

      // 构建请求参数
      const params = {
        Item_Name: this.searchForm.Item_Name || '',
        Shelf_Location: this.searchForm.Shelf_Location || '',
        Item_Model: this.searchForm.Item_Model || '',
        Item_Brand: this.searchForm.Item_Brand || '',
        Category_Type: this.searchForm.Category_Type || '',
        Company: this.searchForm.Company || '',
        Project_Code: this.searchForm.Project_Code || '' // 新增：关联项目编码
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

/* 项目选择器样式 */
.project-display {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.project-name {
  color: #323233;
  font-weight: 500;
}

.project-code {
  color: #969799;
  font-size: 13px;
}

/* 全屏项目选择器样式 */
.project-picker-full {
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 24px;
  max-height: 85vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.picker-header {
  text-align: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.picker-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.picker-header p {
  font-size: 14px;
  color: #999;
  margin: 0;
}

/* 搜索框样式 */
.project-search {
  margin-bottom: 12px;
  flex-shrink: 0;
}

/* 历史选择区域样式 */
.recent-projects {
  padding: 12px 16px;
  border-bottom: 1px solid #f2f3f5;
  background-color: #fafafa;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.recent-title {
  font-size: 14px;
  color: #646566;
  font-weight: 500;
}

.clear-recent-icon {
  cursor: pointer;
  padding: 4px;
}

.recent-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recent-item {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.recent-item-close {
  margin-left: 4px;
  cursor: pointer;
}

/* 项目列表包装器 */
.project-list {
  flex: 1;
  overflow-y: auto;
  min-height: 300px;
  max-height: 400px;
}

.project-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.project-item:hover {
  background-color: #f7f8fa;
}

.project-item:active {
  background-color: #e8f3ff;
}

.project-item-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-item-name {
  font-size: 15px;
  color: #323233;
  font-weight: 500;
}

.project-item-code {
  font-size: 13px;
  color: #969799;
}

.no-project-result {
  padding: 20px;
  text-align: center;
  color: #969799;
  font-size: 14px;
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

/* 自定义清除图标样式 */
.custom-clear-icon {
  font-size: 16px;
  color: #969799;
  padding: 0 8px;
  cursor: pointer;
}
.custom-clear-icon:active {
  color: #333;
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
