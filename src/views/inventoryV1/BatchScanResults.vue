<template>
  <div class="batch-scan-results-container">
    <div class="main-content">
      <!-- 空状态提示 - 使用 hasScannedData 判断 -->
      <div v-if="!hasScannedData" class="empty-hint">
        <van-empty description="请点击下方按钮开始扫码，且仅支持嘉立创物品批量扫码快速新增入库">
          <van-button
            type="info"
            icon="scan"
            class="custom-round-btn"
            @click="startBatchScan"
          >
            开始扫码
          </van-button>
        </van-empty>
      </div>

      <!-- 结果概览 -->
      <van-cell-group v-else class="result-card">
        <!-- 结构化展示每条结果 -->
        <van-cell
          v-for="(result, index) in paginatedResults"
          :key="index"
          :border="false"
          class="result-item"
        >
          <div slot="title" class="result-title">
            <div class="result-header">
              <span>编号：{{ result.pc }}</span>
              <span>数量：{{ result.qty}}</span>
              <div class="tags-container">
                <van-tag v-if="result.jlcDetail" type="success" size="mini">嘉立创商品</van-tag>
                <van-tag v-else type="default" size="mini">普通商品</van-tag>
              </div>
            </div>
          </div>
          <div slot="label" class="result-detail">
            <!-- 图片上传区域 - 只在有嘉立创详情数据时显示 -->
            <div v-if="result.jlcDetail" class="image-upload-section">
              <div class="section-title-with-icon" @click="toggleImageUpload(index)">
                <van-icon name="photo-o" color="#3f83f8" size="16" />
                <span>上传图片</span>
                <van-icon
                  :name="expandedImages.has(index) ? 'arrow-up' : 'arrow-down'"
                  color="#999"
                  size="14"
                />
              </div>
              <div v-show="expandedImages.has(index)" class="image-upload-area">
                <ImageUploaderComponent
                  :ref="'imageUploader_' + index"
                  :file-list="result.images || []"
                  :custom-icon="require('@/assets/custom-upload-icon2.png')"
                  icon-style="width: 60px; height: 60px;"
                  :max-count="3"
                  :max-size="5 * 1024 * 1024"
                  note="支持点击图标上传图片，总大小不得超过 5M，最多 3 张"
                  @input="handleImageUpdate($event, index)"
                />
              </div>
            </div>
            <!-- 展示嘉立创详情数据 -->
            <div v-if="result.jlcDetail" class="jlc-detail-section">
              <div class="section-divider"></div>
              <div class="section-title" @click="toggleExpand(index)">
                <van-icon name="star" color="#ff976a" /> 商品信息
                <van-icon
                  :name="expandedItems.has(index) ? 'arrow-up' : 'arrow-down'"
                  color="#999"
                  size="14"
                />
              </div>
              <div v-show="expandedItems.has(index)" class="jlc-info-grid">
                <div class="info-item" v-if="result.jlcDetail.Item_Name">
                  <span class="info-label">商品名称:</span>
                  <span class="info-value">{{ result.jlcDetail.Item_Name }}</span>
                </div>
                <div class="info-item" v-if="parseJlcMore(result.jlcDetail.Item_Mores).商品编号">
                  <span class="info-label">商品编号:</span>
                  <span class="info-value">{{ parseJlcMore(result.jlcDetail.Item_Mores).商品编号 }}</span>
                </div>
                <div class="info-item" v-if="result.jlcDetail.Item_Brand">
                  <span class="info-label">品牌:</span>
                  <span class="info-value">{{ result.jlcDetail.Item_Brand }}</span>
                </div>
                <div class="info-item" v-if="result.jlcDetail.Item_Model">
                  <span class="info-label">规格型号:</span>
                  <span class="info-value">{{ result.jlcDetail.Item_Model }}</span>
                </div>
                <div class="info-item" v-if="parseJlcMore(result.jlcDetail.Item_Mores).封装规格">
                  <span class="info-label">封装规格:</span>
                  <span class="info-value">{{ parseJlcMore(result.jlcDetail.Item_Mores).封装规格 }}</span>
                </div>
                <div class="info-item" v-if="parseJlcMore(result.jlcDetail.Item_Mores).最小包装单位">
                  <span class="info-label">最小包装单位:</span>
                  <span class="info-value">{{ parseJlcMore(result.jlcDetail.Item_Mores).最小包装单位 }}</span>
                </div>
                <div class="info-item" v-if="parseJlcMore(result.jlcDetail.Item_Mores).最小包装数量">
                  <span class="info-label">最小起订:</span>
                  <span class="info-value">{{ parseJlcMore(result.jlcDetail.Item_Mores).最小包装数量 }}</span>
                </div>
                <div class="info-item" v-if="parseJlcMore(result.jlcDetail.Item_Mores).产品毛重">
                  <span class="info-label">产品毛重:</span>
                  <span class="info-value">{{ parseJlcMore(result.jlcDetail.Item_Mores).产品毛重 }}</span>
                </div>
                <div class="info-item" v-if="parseJlcMore(result.jlcDetail.Item_Mores).一级目录名称">
                  <span class="info-label">一级目录:</span>
                  <span class="info-value">{{ parseJlcMore(result.jlcDetail.Item_Mores).一级目录名称 }}</span>
                </div>
                <div class="info-item" v-if="parseJlcMore(result.jlcDetail.Item_Mores).二级目录名称">
                  <span class="info-label">二级目录:</span>
                  <span class="info-value">{{ parseJlcMore(result.jlcDetail.Item_Mores).二级目录名称 }}</span>
                </div>
                <!-- 如果没有匹配到任何字段，显示提示信息 -->
                <div v-if="!hasAnyJlcField(result.jlcDetail)" class="no-jlc-data">
                  <van-empty :image-size="60" description="嘉立创详情数据为空或格式不匹配" />
                </div>
              </div>
            </div>
            <!-- 如果没有嘉立创详情数据，显示提示 -->
            <div v-else class="no-jlc-tip">
              <van-icon name="info-o" color="#999" />
              <span>该物品无嘉立创详情数据</span>
            </div>
          </div>
        </van-cell>
      </van-cell-group>
      <!-- 分页控件 -->
      <van-pagination
        v-if="uniqueResults.length > pageSize"
        v-model="currentPage"
        :total-items="uniqueResults.length"
        :items-per-page="pageSize"
        class="pagination"
      />
      <div v-if="uniqueResults.length > 0" class="project-selection-section">
      <!-- 货架位置输入区域 -->
        <div class="shelf-location-container">
          <van-field
            v-model="selectedShelfLocation"
            name="Shelf_Location"
            label="*货架位置"
            placeholder="请输入货架位置或扫码获取"
            :rules="[{ required: true, message: '请填写货架位置' }]"
            :right-icon="scanIcon"
            @click-right-icon="handleShelfLocationScan"
            @input="onShelfLocationInput"
            @blur="onShelfLocationBlur"
          >
            <template #label>
              <span style="color: red;">*</span>
              <span>货架位置</span>
            </template>
          </van-field>
          <!-- 下拉建议列表 -->
          <div
            v-if="showSuggestionList && suggestionList.length > 0"
            class="suggestion-dropdown"
          >
            <div
              v-for="(item, index) in suggestionList"
              :key="index"
              class="suggestion-item"
              @click="selectSuggestion(item)"
            >
              <div class="suggestion-title">{{ item.Item_Name }}</div>
              <div class="suggestion-subtitle">
                位置：{{ item.Shelf_Location }} |
                型号：{{ item.Item_Model || '未知' }} |
                库存：{{ item.Current_Stock }}
              </div>
            </div>
          </div>
          <!-- 提示信息 -->
          <div
            v-else-if="showSuggestionList && suggestionList.length === 0 && selectedShelfLocation"
            class="no-result"
          >
            该位置不存在可放心添加
          </div>
        </div>
      </div>

      <!-- 项目信息展示区域 -->
      <div v-if="uniqueResults.length > 0" class="project-selection-section">
        <van-cell-group inset>
          <van-field
            v-model="selectedProjectName"
            name="Project_Code"
            label="*关联项目"
            placeholder="请选择关联项目"
            is-link
            readonly
            @click="openProjectPicker"
          >
            <template #label>
              <span style="color: red;">*</span>
              <span>关联项目</span>
            </template>
          </van-field>
        </van-cell-group>
        <div v-if="selectedProjectCode" class="project-selected-hint">
          <van-icon name="checked" color="#07c160" size="16" />
          <span>已选择：{{ selectedProjectName }}</span>
        </div>
      </div>

      <div v-if="uniqueResults.length > 0" class="action-bar">
        <div class="button-container">
          <button
            class="btn-confirm cancel-btn"
            @click="startBatchScan"
          >
            继续扫码
          </button>
          <button
            class="btn-confirm confirm-btn"
            :disabled="!selectedProjectCode"
            @click="navigateToForm"
          >
            确定添加
          </button>
        </div>
      </div>
      <CustomizableFloatingButton
        :initial-position="{ bottom: 140, right: 10 }"
        :icon-src="require('@/assets/返回.png')"
        :background-size="46"
        :icon-size="46"
        :on-click="goBack"
      />
    </div>
    <!-- 项目选择器弹窗 - 从底部弹出 -->
    <van-popup v-model="showProjectPickerPopup" position="bottom" round>
      <div class="project-picker-full">
        <!-- 搜索框 -->
        <van-search
          v-model="searchKeyword"
          placeholder="请输入项目名称搜索"
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
              color="#999"
              class="clear-all-btn"
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
            </van-tag>
          </div>
        </div>
        <!-- 项目列表选择器 -->
        <div class="project-list-wrapper">
          <van-picker
            show-toolbar
            :columns="filteredProjectColumns"
            @change="onPickerChange"
            @confirm="onPickerConfirm"
            @cancel="showProjectPickerPopup = false"
          >
            <template #default>
              <div v-if="filteredProjectColumns.length === 0 && searchKeyword" class="no-project-result">
                未找到匹配的项目
              </div>
            </template>
          </van-picker>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import * as dd from 'dingtalk-jsapi';
import SensorRequest from '../../utils/SensorRequest.js';
import CustomizableFloatingButton from "../../components/CustomizableFloatingButton.vue";
import ImageUploaderComponent from "@/components/ImageUploaderComponent.vue";
export default {
  name: 'BatchScanResults',
  components: {CustomizableFloatingButton, ImageUploaderComponent},
  data() {
    return {
      results: [], // 所有扫码结果
      uniqueResults: [], // 去重后的结果
      count: 0, // 结果总数
      currentPage: 1, // 当前页码
      pageSize: 50, // 每页显示条数
      isScanning: false, // 是否正在扫码
      hasScannedData: false, // 是否有扫码数据标志
      expandedItems: new Set(), // 已展开的物品索引集合
      expandedImages: new Set(), // 已展开图片上传区域的物品索引集合
      showProjectPickerPopup: false, // 显示项目选择器弹窗
      selectedProjectCode: '', // 选中的项目代码
      selectedProjectName: '', // 选中的项目名称
      // 项目选择相关数据
      projectColumns: [], // 项目名称列表
      filteredProjectColumns: [], // 过滤后的项目列表
      fullProjectList: [], // 完整的项目信息列表
      searchKeyword: '', // 搜索关键词
      recentProjects: [], // 最近选择的项目
      // 货架位置相关数据
      selectedShelfLocation: '', // 选中的货架位置
      suggestionList: [], // 建议列表
      showSuggestionList: false, // 是否显示建议列表
      scanIcon: 'scan' // 扫码图标
    };
  },
  computed: {
    // 分页后的结果
    paginatedResults() {
      const start = (this.currentPage- 1) * this.pageSize;
      const end = start + this.pageSize;
      console.log('[paginatedResults] 计算分页:', {
        currentPage: this.currentPage,
        pageSize: this.pageSize,
        totalLength: this.uniqueResults.length,
        start,
        end,
        sliceResult: this.uniqueResults.slice(start, end)
      });
      return this.uniqueResults.slice(start, end);
    }
  },
  created() {
    // 页面初始化时不获取任何数据，等待用户扫码
    console.log('==================== [created] 页面初始化 ====================');
    console.log('[created] hasScannedData:', this.hasScannedData);
    console.log('[created] results:', JSON.parse(JSON.stringify(this.results)));
    console.log('[created] uniqueResults:', JSON.parse(JSON.stringify(this.uniqueResults)));
    console.log('[created] count:', this.count);
    console.log('[created] currentPage:', this.currentPage);
    console.log('[created] pageSize:', this.pageSize);
    console.log('[created] 空状态判断条件 !hasScannedData:', !this.hasScannedData);
    console.log('==========================================================\n');

    // 加载项目选项和历史记录
    this.loadProjectOptions();
    this.loadRecentProjects();
  },
  mounted() {
    console.log('==================== [mounted] 页面已挂载 ====================');
    console.log('[mounted] hasScannedData:', this.hasScannedData);
    console.log('[mounted] uniqueResults.length:', this.uniqueResults.length);
    console.log('[mounted] uniqueResults:', JSON.parse(JSON.stringify(this.uniqueResults)));
    console.log('[mounted] 空状态应该显示:', !this.hasScannedData);
    console.log('==========================================================\n');
  },
  methods: {
    // 处理货架位置输入
    onShelfLocationInput(value) {
      console.log('[onShelfLocationInput] 货架位置输入:', value);
      if (value && value.length > 0) {
        this.searchShelfLocationSuggestions(value);
      } else {
        this.showSuggestionList = false;
        this.suggestionList = [];
      }
    },

    // 处理货架位置失去焦点
    onShelfLocationBlur() {
      console.log('[onShelfLocationBlur] 货架位置失去焦点');
      // 延迟隐藏，给点击事件留出时间
      setTimeout(() => {
        this.showSuggestionList = false;
      }, 200);
    },

    // 搜索货架位置建议
    searchShelfLocationSuggestions(keyword) {
      const param = {
        keyword: keyword
      };

      SensorRequest.InventoryFun_GetList(
        JSON.stringify(param),
        (respData) => {
          try {
            let data = [];
            if (typeof respData === 'string') {
              data = JSON.parse(respData);
            } else {
              data = respData;
            }

            const inventoryList = Array.isArray(data) ? data : (data.data || []);

            // 过滤出有货架位置的记录
            this.suggestionList = inventoryList
              .filter(item => item.Shelf_Location)
              .slice(0, 10); // 最多显示 10 条

            this.showSuggestionList = this.suggestionList.length > 0;

            console.log('[searchShelfLocationSuggestions] ✓ 获取建议成功:', {
              keyword: keyword,
              count: this.suggestionList.length
            });
          } catch (error) {
            console.error('[searchShelfLocationSuggestions] ✗ 解析数据失败:', error);
            this.showSuggestionList = false;
          }
        },
        (error) => {
          console.error('[searchShelfLocationSuggestions] ✗ 获取建议失败:', error);
          this.showSuggestionList = false;
        }
      );
    },

    // 选择建议项
    selectSuggestion(item) {
      console.log('[selectSuggestion] 选择建议项:', item);
      this.selectedShelfLocation = item.Shelf_Location;
      this.showSuggestionList = false;

      // 可以在这里触发后续操作，比如自动填充其他字段
      this.$toast.success(`已选择位置：${item.Shelf_Location}`);
    },

    // 处理货架位置扫码
    handleShelfLocationScan() {
      console.log('==================== [handleShelfLocationScan] 开始扫码 ====================');

      // 判断是否为 PC 端
      if (typeof dd === 'undefined' || !dd.env || dd.env.platform === 'pc') {
        console.warn('[handleShelfLocationScan] PC 端不支持扫码');
        this.$toast.fail('PC 端暂不支持扫码功能，请在钉钉移动端使用');
        return;
      }

      this.$toast.loading({ message: '请扫描货架二维码', duration: 0 });

      dd.ready(() => {
        dd.biz.util.scan({
          type: 'qrCode',
          onSuccess: (data) => {
            const result = data.text;
            console.log('[handleShelfLocationScan.scan.onSuccess] 扫描结果:', result);

            this.$toast.clear();
            this.selectedShelfLocation = result;
            this.showSuggestionList = false;

            // 尝试查询该位置是否存在
            if (result && result.trim()) {
              this.searchShelfLocationSuggestions(result.trim());
            }

            this.$toast.success('扫码成功');
          },
          onFail: (err) => {
            console.log('[handleShelfLocationScan.scan.onFail] 扫码失败:', err);
            this.$toast.clear();
            if (err.errorCode !== 300001) {
              this.$toast.fail('扫码失败，请重试');
            }
          },
          onCancel: () => {
            console.log('[handleShelfLocationScan.scan.onCancel] 用户取消扫码');
            this.$toast.clear();
          }
        });
      });
    },
    // 加载项目选项
    loadProjectOptions() {
      const param = {};
      SensorRequest.ProjectInfoGetFun(JSON.stringify(param), (respData) => {
        try {
          let data = [];
          if (typeof respData === 'string') {
            data = JSON.parse(respData);
          } else {data = respData;}
          // 确保是数组格式
          const projectList = Array.isArray(data) ? data : (data.data || []);
          // 保存完整的项目信息
          this.fullProjectList = projectList;
          // 只提取项目名称用于选择器显示
          this.projectColumns = projectList.map(project =>
            project.Project_Name || project.name || project.projectName || '未知项目'
          );
          this.filteredProjectColumns = this.projectColumns;
          console.log('[loadProjectOptions] ✓ 项目选项加载成功:', {
            total: projectList.length,
            columns: this.projectColumns.length
          });
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
    // 清除所有最近选择的项目
    clearAllRecentProjects() {
      console.log('[clearAllRecentProjects] 清除所有最近选择的项目');
      this.$dialog.confirm({
        title: '确认清除',
        message: '确定要清除所有最近选择的项目吗？',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }).then(() => {
        this.recentProjects = [];
        localStorage.removeItem('recentProjects');
        this.$toast.success('已清除所有最近选择');
        console.log('[clearAllRecentProjects] ✓ 清除成功');
      }).catch(() => {
        console.log('[clearAllRecentProjects] 用户取消清除');
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
// 选择器确认事件
    onPickerConfirm(value) {
      console.log('[onPickerConfirm] 选择器确认:', value);
      this.selectProject(value);
      this.showProjectPickerPopup = false;
    },
    // 选择器变化事件（新增）
    onPickerChange(picker, values, index) {
      console.log('[onPickerChange] 选择器值变化:', values, index);
      // 实时更新选中的项目，这样即使用户直接点击"完成选择"也能获取到当前选中的值
      if (values && values[0]) {
        this.selectedProjectName = values[0];
        // 查找对应的项目代码
        const selectedProject = this.fullProjectList.find(project =>
          (project.Project_Name || project.name || project.projectName) === values[0]
        );
        const projectCode = selectedProject ? (selectedProject.Project_Code || '') : '';
        this.selectedProjectCode = projectCode;
        console.log('[onPickerChange] 实时更新项目选择:', {
          projectName: values[0],
          projectCode: projectCode
        });
      }
    },
    // 选择最近项目
    selectRecentProject(projectName) {
      console.log('[selectRecentProject] 选择最近项目:', projectName);
      this.selectProject(projectName);
      // 直接完成选择并关闭弹窗
      this.showProjectPickerPopup = false;
    },
    // 选择项目的统一处理函数
    selectProject(projectName) {
      this.selectedProjectName = projectName;
      // this.showProjectPickerPopup = false; // 不关闭弹窗，让用户点击完成按钮
      // 查找对应的项目代码
      const selectedProject = this.fullProjectList.find(project =>
        (project.Project_Name || project.name || project.projectName) === projectName
      );
      const projectCode = selectedProject ? (selectedProject.Project_Code || '') : '';
      // 更新选中的项目代码
      this.selectedProjectCode = projectCode;
      console.log('[selectProject] 项目选择结果:', {
        projectName: projectName,
        projectCode: projectCode
      });

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
    // 打开项目选择器
    openProjectPicker() {
      console.log('==================== [openProjectPicker] 打开项目选择器 ====================');
      if (this.uniqueResults.length === 0) {
        console.warn('[openProjectPicker] ✗ 没有扫描数据');
        this.$toast.fail('请先扫码添加物品');
        return;
      }
      console.log('[openProjectPicker] ✓ 打开项目选择器弹窗');
      console.log('[openProjectPicker] 项目列表数量:', this.projectColumns.length);
      this.showProjectPickerPopup = true;
      // 重置搜索关键词
      this.searchKeyword = '';
      this.filterProjects();
      console.log('==========================================================\n');
    },
    // 切换图片上传区域展开/折叠状态
    toggleImageUpload(index) {
      const newSet = new Set(this.expandedImages);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      this.expandedImages = newSet;
      console.log(`[toggleImageUpload] 物品 ${index} 图片上传区域展开状态：`, newSet.has(index));
    },
    // 处理图片更新
    handleImageUpdate(fileList, index) {
      console.log(`[handleImageUpdate] 物品 ${index} 图片更新:`, fileList);
      // 确保 uniqueResults[index] 存在
      if (this.uniqueResults[index]) {
        // 将图片文件列表保存到物品数据中
        this.$set(this.uniqueResults[index], 'images', fileList);
        console.log('[handleImageUpdate] 更新后的物品数据:', this.uniqueResults[index]);
      }
    },
    // 切换展开/折叠状态
    toggleExpand(index) {
      const newSet = new Set(this.expandedItems);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      this.expandedItems = newSet;
      console.log(`[toggleExpand] 物品 ${index} 展开状态：`, newSet.has(index));
    },
    // 返回上一页
    goBack() {
      this.navigateTo('/inventoryV1');
    },
    navigateTo(path) {
      const department= this.$route.params.department;
      if (department) {
        this.$router.push(`/${department}${path}`);
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
    },
    // 批量扫码方法
    startBatchScan() {
      console.log('==================== [startBatchScan] 开始扫码 ====================');
      if (this.isScanning) {
        console.warn('[startBatchScan] 正在扫码中...');
        this.$toast('正在扫码中...');
        return;
      }
      // 判断是否为 PC 端 (非钉钉环境或钉钉 PC 端)
      if (typeof dd === 'undefined' || !dd.env || dd.env.platform === 'pc') {
        console.warn('[startBatchScan] PC 端不支持扫码');
        this.$toast.fail('PC 端暂不支持扫码功能，请在钉钉移动端使用');
        return;
      }
      console.log('[startBatchScan] 开始资产批量扫码');
      console.log('[startBatchScan] 当前状态:', {
        isScanning: this.isScanning,
        hasScannedData: this.hasScannedData,
        uniqueResults: this.uniqueResults,
        count: this.count
      });
      // 提示用户进入批量扫描模式
      this.$toast({
        message: '已进入批量扫码模式，请扫描相同类型物品!',
        type: 'info',
        duration: 2000
      });
      this.isScanning = true;
      // 定义递归扫描函数
      const startScan = () => {
        dd.ready(() => {
          dd.biz.util.scan({
            type: 'qrCode',
            onSuccess: async (data) => {
              const result = data.text;
              console.log('\n[startBatchScan.scan.onSuccess] 扫描结果:', result);
              // 手动解析非标准 JSON 格式
              const parsedResult= this.parseCustomJSON(result);
              console.log('[startBatchScan.scan.onSuccess] 解析后的对象:', parsedResult);
              const requiredFields = ['on', 'pc'];
              // 检查是否包含所有必需字段
              const hasRequiredFields = parsedResult && typeof parsedResult === 'object' &&
                requiredFields.every(field => field in parsedResult);
              if (hasRequiredFields) {
                console.log('[startBatchScan.scan.onSuccess] ✓ 扫描结果为嘉立创商城物品结构体');
                console.log('[startBatchScan.scan.onSuccess] 必需字段检查:', {
                  hasOn: 'on' in parsedResult,
                  hasPc: 'pc' in parsedResult,
                });
              }
              try {
                // 显示加载提示
                this.$toast.loading({
                  message: '获取商品详情中...',
                  duration: 0
                });
                // 提取商品编号
                let productCode = '';
                // 方案一：从 pc 字段提取（仅当有必需字段时）
                if (hasRequiredFields && parsedResult.pc && typeof parsedResult.pc === 'string') {
                  const match = parsedResult.pc.match(/C\d{1,}/i);
                  if (match) {
                    productCode = match[0];
                    console.log('[startBatchScan.scan.onSuccess] 方案一提取到商品编号:', productCode);
                  }
                }
                // 方案二：如果方案一失败，尝试按分号分隔，寻找 C 开头 + 至少 1 位数字的字符串
                if (!productCode && result) {
                  console.log('[startBatchScan.scan.onSuccess] 方案一未提取到商品编号，尝试方案二');
                  const segments = result.split(';');
                  console.log('[startBatchScan.scan.onSuccess] 分段结果:', segments);
                  for (const segment of segments) {
                    const trimmed = segment.trim();
                    console.log('[startBatchScan.scan.onSuccess] 检查分段:', trimmed);
                    const match = trimmed.match(/^C\d{1,}$/i);
                    if (match) {
                      productCode = match[0];
                      console.log('[startBatchScan.scan.onSuccess] 方案二提取到商品编号:', productCode);
                      break;
                    }
                  }
                }
                // 如果两种方案都未能提取商品编号，提示错误
                if (!productCode) {
                  console.warn('[startBatchScan.scan.onSuccess] ✗ 两种方案都未能提取到商品编号');
                  this.$toast.clear();
                  this.$dialog.alert({
                    title: '扫码失败',
                    message: '无法从二维码中提取有效的商品编号，请扫描嘉立创商城的物品二维码。',
                    confirmButtonText: '确定'
                  }).then(() => {
                    setTimeout(() => {
                      startScan();
                    }, 1000);
                  });
                  return;
                }

                // 如果提取到商品编号，调用后端接口获取详情
                if (productCode) {
                  const jlcParam = {
                    keyword: productCode
                  };
                  console.log('[startBatchScan.scan.onSuccess] 调用后端接口获取详情:', jlcParam.keyword);
                  // 调用后端接口 - 使用回调方式
                  SensorRequest.Jlc_GetProductDetails(
                    JSON.stringify(jlcParam),
                    async (respData) => {
                      console.log('[startBatchScan.scan.onSuccess.Jlc_GetProductDetails.success] 嘉立创商品详情响应:', respData);
                      try {
                        // 解析响应数据
                        const detailData = JSON.parse(respData);
                        console.log('[startBatchScan.scan.onSuccess.Jlc_GetProductDetails.success] 解析后的商品详情:', detailData);
                        // 关闭加载提示
                        this.$toast.clear();
                        // 构造结果对象
                        const enrichedResult= {
                          ...parsedResult,
                          jlcDetail: detailData,
                          productCode: productCode,
                          images: [] // 初始化图片数组
                        };
                        console.log('[startBatchScan.scan.onSuccess.Jlc_GetProductDetails.success] 合并后的结果:', enrichedResult);
                        // 去重检查：检查是否已存在相同的物品
                        const isDuplicate = this.uniqueResults.some(existing => {
                          // 优先使用商品编号去重
                          if (productCode && existing.productCode) {
                            return existing.productCode === productCode;
                          }
                          // 如果商品编号不存在，使用传统字段去重
                          return existing.on === enrichedResult.on &&
                            existing.pc === enrichedResult.pc &&
                            existing.pm === enrichedResult.pm;
                        });
                        console.log('[startBatchScan.scan.onSuccess.Jlc_GetProductDetails.success] 去重检查结果:', {
                          isDuplicate: isDuplicate,
                          currentUniqueResultsLength: this.uniqueResults.length,
                          productCode: productCode
                        });
                        if (isDuplicate) {
                          console.warn('[startBatchScan.scan.onSuccess.Jlc_GetProductDetails.success] ✗ 检测到重复物品，跳过');
                          this.$toast.fail(`检测到重复物品:${enrichedResult.on || productCode},已自动跳过`);
                          console.log('[startBatchScan] 跳过重复物品后状态:', {
                            uniqueResults: this.uniqueResults,
                            count: this.count,
                            hasScannedData: this.hasScannedData
                          });
                          this.showContinueScanDialog(startScan);
                        } else {
                          console.log('[startBatchScan.scan.onSuccess.Jlc_GetProductDetails.success] ✓ 添加新物品');
                          this.uniqueResults.push(enrichedResult);
                          this.count++;
                          this.hasScannedData = true;
                          // 默认展开该物品的图片上传区域
                          const newExpandedImages = new Set(this.expandedImages);
                          newExpandedImages.add(this.uniqueResults.length - 1);
                          this.expandedImages = newExpandedImages;
                          console.log('[startBatchScan.scan.onSuccess.Jlc_GetProductDetails.success] 展开图片上传区域:', this.uniqueResults.length - 1);
                          console.log('[startBatchScan.scan.onSuccess.Jlc_GetProductDetails.success] 添加后状态:', {
                            uniqueResults: JSON.parse(JSON.stringify(this.uniqueResults)),
                            uniqueResultsLength: this.uniqueResults.length,
                            count: this.count,
                            hasScannedData: this.hasScannedData,
                            空状态应该显示:!this.hasScannedData
                          });
                          this.$toast.success('扫描成功!');
                          this.showContinueScanDialog(startScan);
                        }
                      } catch (error) {
                        console.error('[startBatchScan.scan.onSuccess.Jlc_GetProductDetails.success] 解析商品详情失败:', error);
                        this.$toast.clear();
                        this.$toast.fail('解析商品详情失败');
                        this.uniqueResults.push(parsedResult);
                        this.count++;
                        this.hasScannedData = true;
                        console.log('[startBatchScan] 解析失败后状态:', {
                          uniqueResults: JSON.parse(JSON.stringify(this.uniqueResults)),
                          uniqueResultsLength: this.uniqueResults.length,
                          count: this.count,
                          hasScannedData: this.hasScannedData
                        });
                        this.showContinueScanDialog(startScan);
                      }
                    },
                    (error) => {
                      console.error('[startBatchScan.scan.onSuccess.Jlc_GetProductDetails.fail] 获取嘉立创商品详情失败:', error);
                      this.$toast.clear();
                      this.$toast.fail('获取商品详情失败，使用原始数据');
                      this.uniqueResults.push(parsedResult);
                      this.count++;
                      this.hasScannedData = true;
                      console.log('[startBatchScan] 获取详情失败后状态:', {
                        uniqueResults: JSON.parse(JSON.stringify(this.uniqueResults)),
                        uniqueResultsLength: this.uniqueResults.length,
                        count: this.count,
                        hasScannedData: this.hasScannedData
                      });
                      this.showContinueScanDialog(startScan);
                    }
                  );
                }
              } catch (error) {
                console.error('[startBatchScan.scan.onSuccess] 获取商品详情失败:', error);
                this.$toast.clear();
                this.$toast.fail('获取商品详情失败，使用原始数据');
                const isDuplicate = this.uniqueResults.some(existing => {
                  // 优先使用商品编号去重
                  if (productCode && existing.productCode) {
                    return existing.productCode === productCode;
                  }
                  // 如果商品编号不存在，使用传统字段去重
                  return existing.on === parsedResult.on &&
                    existing.pc === parsedResult.pc &&
                    existing.pm === parsedResult.pm;
                });
                console.log('[startBatchScan.scan.onSuccess] 去重检查结果:', {
                  isDuplicate: isDuplicate,
                  currentUniqueResultsLength: this.uniqueResults.length,
                  productCode: productCode
                });
                if (isDuplicate) {
                  console.warn('[startBatchScan.scan.onSuccess] ✗ 检测到重复物品，跳过');
                  this.$toast.fail(`检测到重复物品:${parsedResult.on || productCode},已自动跳过`);
                  this.showContinueScanDialog(startScan);
                } else {
                  console.log('[startBatchScan.scan.onSuccess] ✓ 添加新物品 (获取详情失败)');
                  // 保存商品编号（如果有）
                  parsedResult.productCode = productCode;
                  parsedResult.images = []; // 初始化图片数组
                  this.uniqueResults.push(parsedResult);
                  this.count++;
                  this.hasScannedData = true;
                  // 默认展开该物品的图片上传区域
                  const newExpandedImages = new Set(this.expandedImages);
                  newExpandedImages.add(this.uniqueResults.length - 1);
                  this.expandedImages = newExpandedImages;
                  console.log('[startBatchScan.scan.onSuccess] 展开图片上传区域:', this.uniqueResults.length - 1);
                  console.log('[startBatchScan.scan.onSuccess] 添加后状态:', {
                    uniqueResults: JSON.parse(JSON.stringify(this.uniqueResults)),
                    uniqueResultsLength: this.uniqueResults.length,
                    count: this.count,
                    hasScannedData: this.hasScannedData,
                    空状态应该显示:!this.hasScannedData
                  });
                  this.showContinueScanDialog(startScan);
                }
              }
            },
            onFail: (err) => {
              console.log('[startBatchScan.scan.onFail] 扫码失败:', err);
              if (err.errorCode !== 300001) {
                console.warn('[startBatchScan.scan.onFail] 未扫描到二维码');
                this.$toast.fail("未扫描到二维码，请重新扫描!");
              }
              setTimeout(() => {
                startScan();
              }, 1000);
            },
            onCancel: () => {
              console.log('[startBatchScan.scan.onCancel] 用户取消扫描');
              console.log('[startBatchScan.scan.onCancel] 当前 hasScannedData:', this.hasScannedData);
              this.isScanning = false;
              if (!this.hasScannedData) {
                console.log('[startBatchScan.scan.onCancel] 显示取消提示');
                this.$toast('已取消批量扫码');
              }
            }
          });
        });
      };
      // 启动首次扫描
      startScan();
    },
    // 显示是否继续扫码的对话框
    showContinueScanDialog(continueCallback) {
      console.log('[showContinueScanDialog] 显示继续扫码对话框');
      console.log('[showContinueScanDialog] 当前状态:', {
        count: this.count,
        uniqueResultsLength: this.uniqueResults.length,
        hasScannedData: this.hasScannedData
      });
      this.$dialog.confirm({
        title: `已扫描 ${this.count} 个物品`,
        message: '是否继续扫描其他物品?',
        confirmButtonText: '继续扫描',
        cancelButtonText: '结束扫码'
      }).then(() => {
        console.log('[showContinueScanDialog] 用户选择继续扫描');
        setTimeout(() => {
          continueCallback();
        }, 1000);
      }).catch(() => {
        console.log('[showContinueScanDialog] 用户结束批量扫码');
        console.log('[showContinueScanDialog] 结束状态:', {
          count: this.count,
          uniqueResultsLength: this.uniqueResults.length,
          hasScannedData: this.hasScannedData,
          isScanning: this.isScanning
        });
        this.isScanning = false;
      });
    },
    // 解析自定义 JSON
    parseCustomJSON(str) {
      console.log('[parseCustomJSON] 解析字符串:', str);
      try {
        const result= JSON.parse(str);
        console.log('[parseCustomJSON] ✓ JSON 解析成功:', result);
        return result;
      } catch (e) {
        console.log('[parseCustomJSON] ✗ JSON 解析失败，尝试其他方式');
        let cleanStr = str.trim();
        if (cleanStr.startsWith('{') && cleanStr.endsWith('}')) {
          cleanStr = cleanStr.slice(1, -1);
          const pairs = cleanStr.split(',');
          const result = {};
          pairs.forEach(pair => {
            const [key, ...valueParts] = pair.split(':');
            if (key && valueParts.length > 0) {
              const value = valueParts.join(':').trim();
              const cleanKey = key.trim();
              const finalKey = cleanKey.replace(/^['"]|['"]$/g, '');
              const finalValue = value.replace(/^['"]|['"]$/g, '');
              result[finalKey] = finalValue;
            }
          });
          console.log('[parseCustomJSON] ✓ 手动解析成功:', result);
          return result;
        }
        console.log('[parseCustomJSON] 返回原始数据:', { raw: str });
        return { raw: str };
      }
    },
    // 解析 Item_Mores 字段 (JSON 字符串)
    parseJlcMore(itemMores) {
      if (!itemMores) {
        console.log('[parseJlcMore] itemMores 为空，返回空对象');
        return {};
      }
      try {
        // 如果是字符串，尝试解析 JSON
        if (typeof itemMores === 'string') {
          const result= JSON.parse(itemMores);
          console.log('[parseJlcMore] ✓ 解析成功:', result);
          return result;
        }
        // 如果已经是对象，直接返回
        console.log('[parseJlcMore] ✓ 已是对象，直接返回:', itemMores);
        return itemMores;
      } catch (e) {
        console.error('[parseJlcMore] ✗ 解析失败:', e);
        return {};
      }
    },
    // 检查是否有任意嘉立创字段
    hasAnyJlcField(jlcDetail) {
      if (!jlcDetail) {
        console.log('[hasAnyJlcField] jlcDetail 为空，返回 false');
        return false;
      }
      // 检查基本字段
      if (jlcDetail.Item_Name || jlcDetail.Item_Model || jlcDetail.Item_Brand) {
        console.log('[hasAnyJlcField] ✓ 找到基本字段');
        return true;
      }
      // 检查 Item_Mores 中的字段
      const mores = this.parseJlcMore(jlcDetail.Item_Mores);
      const moreKeys = ['商品编号', '一级目录名称', '二级目录名称', '封装规格',
        '最小包装单位', '商品编排方式', '最小包装数量', '产品毛重'];
      const hasField = moreKeys.some(key => mores[key]);
      console.log('[hasAnyJlcField] 检查结果:', {
        hasBasicFields: !!(jlcDetail.Item_Name || jlcDetail.Item_Model || jlcDetail.Item_Brand),
        hasMoreFields: hasField,
        mores: mores,
        result: hasField
      });
      return hasField;
    },
    // 清空列表并重新扫码
    clearAndRescan() {
      console.log('==================== [clearAndRescan] 清空列表 ====================');
      console.log('[clearAndRescan] 清空前状态:');
      console.log('[clearAndRescan]  results:', JSON.parse(JSON.stringify(this.results)));
      console.log('[clearAndRescan]   uniqueResults:', JSON.parse(JSON.stringify(this.uniqueResults)));
      console.log('[clearAndRescan]  count:', this.count);
      console.log('[clearAndRescan]   hasScannedData:', this.hasScannedData);
      this.results = [];
      this.uniqueResults = [];
      this.count = 0;
      this.currentPage = 1;
      this.hasScannedData = false;
      console.log('[clearAndRescan] 清空后状态:');
      console.log('[clearAndRescan]  results:', JSON.parse(JSON.stringify(this.results)));
      console.log('[clearAndRescan]   uniqueResults:', JSON.parse(JSON.stringify(this.uniqueResults)));
      console.log('[clearAndRescan]  count:', this.count);
      console.log('[clearAndRescan]   hasScannedData:', this.hasScannedData);
      console.log('[clearAndRescan]   空状态应该显示:', !this.hasScannedData);
      console.log('==========================================================\n');
      this.$toast.success('列表已清空，请重新开始扫码');
    },
    // 跳转到批量添加表单页面
    navigateToForm() {
      console.log('==================== [navigateToForm] 跳转表单 ====================');
      console.log('[navigateToForm] 当前状态:');
      console.log('[navigateToForm]   uniqueResults:', JSON.parse(JSON.stringify(this.uniqueResults)));
      console.log('[navigateToForm]   uniqueResults.length:', this.uniqueResults.length);
      console.log('[navigateToForm]  department:', this.$route.params.department);
      console.log('[navigateToForm]   selectedProjectCode:', this.selectedProjectCode);
      console.log('[navigateToForm]   selectedProjectName:', this.selectedProjectName);
      if (this.uniqueResults.length === 0) {
        console.warn('[navigateToForm] ✗ 没有扫描到任何结果');
        this.$toast.fail('没有扫描到任何结果');
        return;
      }
      if (!this.selectedProjectCode || !this.selectedProjectName) {
        console.warn('[navigateToForm] ✗ 未选择关联项目');
        this.$toast.fail('请先选择关联项目（点击右下角悬浮图标）');
        return;
      }
      console.log('[navigateToForm] ✓ 验证通过，准备跳转');
      this.$toast.success('正在跳转到批量添加页面...');
      const department= this.$route.params.department || 'default';
      const dataString = JSON.stringify(this.uniqueResults);
      console.log('[navigateToForm] 跳转路径:', `/${department}/inventory-addV1`);
      console.log('[navigateToForm] 传递的数据大小:', dataString.length, '字符');
      console.log('[navigateToForm] 传递的数据:', JSON.parse(JSON.stringify(this.uniqueResults)));
      this.$router.push({
        path: `/${department}/inventory-addV1`,
        query: { data: dataString }
      });
      console.log('==========================================================\n');
    }
  }
};
</script>

<style scoped>

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

.clear-all-btn {
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.3s;
}

.clear-all-btn:hover {
  background-color: #f0f0f0;
  opacity: 0.8;
}

.clear-all-btn:active {
  transform: scale(0.9);
}
.section-title-with-icon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #3f83f8;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 8px;
}

.section-title-with-icon:active {
  opacity: 0.7;
  transform: scale(0.98);
}

.image-upload-section {
  margin-bottom: 12px;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
}

.image-upload-area {
  margin-top: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #f57c00;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.section-title:active {
  opacity: 0.7;
  transform: scale(0.98);
}

.custom-round-btn {
  border-radius: 10px; /* 可自定义圆角大小 */
}

/* 项目选择区域样式 */
.project-selection-section {
  margin: 16px;
  padding: 0 16px;
}

.project-selected-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #e8f5e9;
  border-radius: 8px;
  font-size: 13px;
  color: #07c160;
  margin-top: 8px;
}

.project-selected-hint span {
  font-weight: 500;
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

.recent-title {
  font-size: 14px;
  color: #646566;
  margin-bottom: 8px;
  font-weight: 500;
}

.recent-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recent-item {
  cursor: pointer;
}

.recent-item:hover {
  opacity: 0.8;
}

/* 项目列表包装器 */
.project-list-wrapper {
  flex: 1;
  overflow-y: auto;
  min-height: 300px;
  max-height: 400px;
}

.project-list-wrapper :deep(.van-picker__toolbar) {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
}

.no-project-result {
  padding: 20px;
  text-align: center;
  color: #969799;
  font-size: 14px;
}

.picker-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.picker-btn {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.picker-btn-confirm {
  background: #3f83f8;
  color: white;
}

.picker-btn-confirm:active {
  transform: scale(0.98);
  opacity: 0.9;
}

/* 调整 ProjectPicker 组件的样式 */
.project-picker-full :deep(.van-cell__label) {
  min-width: 90px;
}

.project-picker-full :deep(.van-field__label) {
  width: auto;
}

.main-content {
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: 120px;
}

/* 空状态提示 */
.empty-hint {
  padding: 100px 16px;
  text-align: center;
}

.result-card {
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.count-cell {
  background-color: #e0f7fa;
  text-align: center;
}

.count-text {
  font-size: 16px;
  color: #00796b;
}

.result-item {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}

.result-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tags-container {
  display: flex;
  gap: 4px;
}

.no-jlc-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  color: #999;
}

.no-jlc-data {
  grid-column: 1 / -1;
  padding: 12px 0;
}

/* 嘉立创详情区域样式 */
.jlc-detail-section {
  margin-top: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #fff7e6 0%, #fff3e0 100%);
  border-radius: 8px;
  border: 1px solid #ffe0b2;
}

.section-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, #ff9800, transparent);
  margin: 8px 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #f57c00;
  margin-bottom: 12px;
}

.jlc-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  color: #333;
  font-weight: 500;
  word-break: break-word;
}
.pagination {
  margin: 16px 0;
  text-align: center;
}

.button-container {
  display: flex;
  flex-direction: row;
  gap: 16px;
}

/* 底部操作栏 */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  background: white;
  box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.button-container {
  display: flex;
  flex-direction: row;
  gap: 16px;
}

.btn-confirm {
  flex: 1;
  height: 56px;
  border: none;
  border-radius: 16px;
  background: #3f83f8;
  color: white;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn {
  background: #f0f0f0;
  color: #333;
}

.confirm-btn {
  background: #3f83f8;
  color: white;
}

.btn-confirm:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.btn-confirm:active:not(:disabled) {
  transform: scale(0.98);
  box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
}
</style>
