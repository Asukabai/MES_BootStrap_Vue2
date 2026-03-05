<template>
  <div class="inventory-add-page">
    <div class="form-container">
      <van-form @submit="onSubmit">
        <van-cell-group inset>
          <van-field
            v-model="itemForm.Item_Name"
            name="Item_Name"
            label="*物品名称"
            placeholder="请输入物品名称（必填）"
            :rules="[{ required: true, message: '请填写物品名称' }]"
            :right-icon="loadIcon"
            @click-right-icon="handleLoadClick"
          />

          <!-- 货架位置输入框，带实时搜索功能 -->
          <div class="shelf-location-container">
            <van-field
              v-model="itemForm.Shelf_Location"
              name="Shelf_Location"
              label="*货架位置"
              placeholder="请输入货架位置或直接扫码获取"
              :rules="[{ required: true, message: '请填写货架位置' }]"
              :right-icon="scanIcon"
              @click-right-icon="handleScanClick"
              @input="onShelfLocationInput"
              @blur="onShelfLocationBlur"
            >
              <template #label>
                <span>*货架位置</span>
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
                  位置: {{ item.Shelf_Location }} |
                  型号: {{ item.Item_Model || '未知' }} |
                  库存: {{ item.Current_Stock }}
                </div>
              </div>
            </div>

            <!-- 提示信息 -->
            <div
              v-else-if="showSuggestionList && suggestionList.length === 0 && itemForm.Shelf_Location"
              class="no-result"
            >
              该位置不存在可放心添加
            </div>
          </div>

          <van-field
            v-model="itemForm.Item_Model"
            name="Item_Model"
            label="型号"
            placeholder="请输入物品型号"
          />

          <van-field
            name="Company"
            label="*所属公司"
            :rules="[{ required: true, message: '请选择所属公司' }]"
          >
            <template #input>
              <van-radio-group
                v-model="itemForm.Company"
                direction="horizontal"
              >
                <van-radio name="晟思">晟思</van-radio>
                <van-radio name="大钧">大钧</van-radio>
                <van-radio name="星移">星移</van-radio>
              </van-radio-group>
            </template>
          </van-field>

          <van-field
            v-model="itemForm.Item_Brand"
            name="Item_Brand"
            label="品牌"
            placeholder="请输入品牌"
          />

          <van-field
            name="Category_Type"
            label="*库存分类"
            :rules="[{ required: true, message: '请选择库存分类' }]"
          >
            <template #input>
              <van-radio-group
                v-model="itemForm.Category_Type"
                direction="horizontal"
                @change="onCategoryChange"
              >
                <van-radio name="耗材">耗材</van-radio>
                <van-radio name="公用">公用</van-radio>
                <van-radio name="项目">项目</van-radio>
                <van-radio name="其他">其他</van-radio>
              </van-radio-group>
            </template>
          </van-field>

          <van-field
            v-if="itemForm.Category_Type === '耗材'"
            v-model.number="itemForm.Warning_Threshold"
            type="number"
            name="Warning_Threshold"
            label="预警阈值"
            placeholder="请输入预警阈值"
            :rules="[{ required: true, message: '耗材分类预警阈值必填' }]"
          />

          <van-field
            v-if="itemForm.Category_Type === '项目'"
            v-model="selectedProjectName"
            name="Project_Code"
            label="*关联项目"
            placeholder="请选择关联项目"
            is-link
            readonly
            @click="onProjectFieldClick"
          />

          <van-field
            v-model="itemForm.Remark"
            name="Remark"
            label="备注"
            placeholder="请输入备注"
          />

          <!-- 更多信息输入 -->
          <van-cell
            :border="false"
            center
            class="more-info-header"
          >
            <template #title>
              <span>更多信息</span>
            </template>
            <template #right-icon>
              <van-icon
                :name="showExtendedInfo ? 'arrow-up' : 'arrow-down'"
                size="16px"
                class="expand-arrow"
                @click="toggleExpandInfo"                style="cursor: pointer;"
              />
            </template>
          </van-cell>
          <!-- 扩展信息内容区域 - 使用 v-show 控制显示隐藏 -->
          <div v-show="showExtendedInfo" class="extended-info-content">
            <!-- 扩展信息 -->
            <van-field
              v-model="itemForm.Item_Color"
              name="Item_Color"
              label="物品颜色"
              placeholder="请输入物品颜色"
            />

            <van-field
              v-model="itemForm.Item_Size"
              name="Item_Size"
              label="物品尺寸"
              placeholder="请输入物品尺寸"
            />

            <van-field
              v-model="itemForm.Item_Unit"
              name="Item_Unit"
              label="物品单位"
              placeholder="请输入物品单位"
            />

            <van-field
              v-model="itemForm.Item_Material"
              rows="2"
              autosize
              type="textarea"
              maxlength="100"
              name="Item_Material"
              label="物品材质"
              placeholder="请输入物品材质信息（最多 100 字）"
              show-word-limit
            />
          </div>
          <div class="more-fields-container">
            <div v-for="(field, index) in moreFields" :key="index" class="more-field-row">
              <van-field
                v-model="field.key"
                placeholder="名称"
                class="more-field-input"
              />
              <van-field
                v-model="field.value"
                placeholder="内容（不能为空）"
                class="more-field-input"
              />
              <van-button
                type="danger"
                size="small"
                class="remove-field-btn"
                @click="removeMoreField(index)"
              >
                删除
              </van-button>
            </div>
            <van-button
              plain
              hairline
              type="primary"
              size="small"
              native-type="button"
              @click="addMoreField"
            >
              + 自定义添加更多信息字段
            </van-button>
          </div>
          <!-- 标签输入区域 -->
          <van-cell :border="false">
            <template #title>
              <span>物品标签</span>
            </template>
          </van-cell>
          <div class="tags-container">
            <!-- 已添加的标签 -->
            <div class="tag-list">
              <div
                v-for="(tag, index) in allTags"
                :key="index"
                :class="['custom-tag-item', isSystemTag(tag) ? 'system-tag' : 'user-tag']"
              >
                <span class="tag-text">{{ tag }}</span>
                <span
                  v-if="!isSystemTag(tag)"
                  class="tag-close"
                  @click="removeTag(index)"
                >×</span>
                <span
                  v-else
                  class="system-tag-indicator"
                >🔒</span>
              </div>
            </div>
            <!-- 标签输入 -->
            <div class="tag-input-wrapper">
              <van-field
                v-model="newTag"
                placeholder="输入标签后按回车添加"
                class="tag-input"
                @keypress.enter="addTag"
              />
              <van-button
                type="primary"
                size="small"
                @click="addTag"
                class="add-tag-btn"
                native-type="button"
              >
                添加
              </van-button>
            </div>
          </div>

          <!-- 图片上传 -->
          <van-cell title="物品图片">
            <template #label>
              <span class="upload-note">支持点击图标上传图片，但总大小不得超过5M，总数不得超过3个</span>
            </template>
            <van-uploader
              v-model="fileList"
              :after-read="onAfterRead"
              multiple
              :max-count="3"
              upload-text="上传图片"
              accept="image/*"
            >
              <!-- 自定义上传区域内容 -->
              <div class="custom-upload-area">
                <img src="../../assets/custom-upload-icon2.png" alt="上传图标" style="width: 88px; height: 88px;" />
              </div>
            </van-uploader>
          </van-cell>

          <van-field
            name="Current_Stock"
            label="当前库存"
            readonly
            :value="itemForm.Current_Stock.toString()"
          />
        </van-cell-group>
        <!--将容器的 display 设置为 flex，使子元素水平排列，添加 gap: 16px 在按钮之间增加间距，为每个按钮添加 style="flex: 1" 使它们平均分配宽度-->
        <div style="margin: 16px; display: flex; gap: 16px;">
          <van-button round block type="default" native-type="button" @click="onClickLeft" style="flex: 1;">
            取消返回
          </van-button>
          <van-button round block type="info" native-type="submit" style="flex: 1;">
            保存信息
          </van-button>
        </div>
      </van-form>
    </div>

    <!-- 项目选择器 - 修复版本 -->
    <van-popup v-model="showProjectPicker" position="bottom" closeable round>
      <div class="project-picker-container">
        <!-- 搜索框 -->
        <van-search
          v-model="searchKeyword"
          placeholder="请输入项目名称搜索"
          @input="filterProjects"
          class="project-search"
        >
<!--          <van-search-->
<!--          v-model="searchKeyword"-->
<!--          placeholder="请输入项目名称搜索"-->
<!--          @input="filterProjects"-->
<!--          class="project-search"-->
<!--          show-action-->
<!--        >-->
<!--          <template #action>-->
<!--            <div @click="showProjectPicker = false">取消</div>-->
<!--          </template>-->
        </van-search>

        <!-- 历史选择区域 -->
        <div v-if="recentProjects.length > 0" class="recent-projects">
          <div class="recent-title">最近选择：</div>
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

        <!-- 项目列表 -->
        <div class="project-list">
          <van-picker
            show-toolbar
            :columns="filteredProjectColumns"
            @confirm="onProjectConfirm"
            @cancel="showProjectPicker = false"
          >
            <template #default>
              <!-- 如果没有搜索到项目时显示的提示 -->
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
import { Toast } from 'vant';
import SensorRequest from '../../utils/SensorRequest.js';
import * as dd from 'dingtalk-jsapi';
import SensorRequestPage from "../../utils/SensorRequestPage";
import {key_DingName, key_DingUserIndex, key_DingUserPhone} from "../../utils/Dingding";
export default {
  name: 'InventoryAddV1',
  data() {
    return {
      showExtendedInfo: false, // 控制扩展信息是否展开
      scanIcon: require('../../assets/scan_icon.png'), // 添加扫码图标
      loadIcon: require('../../assets/loadIcon.png'), // 添加扫码图标
      itemForm: {
        Item_Name: '',
        Shelf_Location: '',
        Item_Model: '',
        Current_Stock: 0,
        Item_Brand: '',
        Category_Type: '',
        Project_Code: '',
        Warning_Threshold: '',
        Is_Low_Stock: '',
        Remark: '',
        Company: '',
        // 扩展信息字段
        Item_Color: '',
        Item_Size: '',
        Item_Unit: '',
        Item_Material: '',
        Item_Images: [],
        Item_Mores: ''
      },
      showProjectPicker: false,
      projectColumns: [],
      filteredProjectColumns: [],
      fullProjectList: [], // 保存完整的项目信息
      selectedProjectName: '', // 用于显示选中的项目名称
      searchKeyword: '', // 搜索关键词
      recentProjects: [], // 最近选择的项目
      // 更多字段
      moreFields: [],
      // 图片相关
      fileList: [],
      imageList: [],
      // 标签相关
      userTags: [], // 存储用户添加的标签数组
      systemTags: [], // 存储系统标签（公司和分类）
      newTag: '', // 输入的新标签
      // 货架位置搜索相关数据
      showSuggestionList: false,
      suggestionList: [],
      debounceTimer: null // 防抖定时器
    };
  },
  computed: {
    // 合并系统标签和用户标签
    allTags() {
      return [...this.systemTags, ...this.userTags];
    }
  },
  watch: {
    'itemForm.Company'() {
      this.updateSystemTags();
    },
    'itemForm.Category_Type'() {
      this.updateSystemTags();
    },
    // 监听项目名称变化，更新系统标签
    'selectedProjectName'() {
      this.updateSystemTags();
    },
    showProjectPicker(newVal) {
      if (newVal) {
        // 当弹出选择器时，重置搜索状态
        this.searchKeyword = '';
        this.filterProjects();
      }
    }
  },
  created() {
    this.loadProjectOptions();
    this.loadRecentProjects(); // 加载最近选择
    this.filteredProjectColumns = this.projectColumns; // 初始化为完整列表
    // 检查是否有扫码数据传入
    const scanData = this.$route.query.scanData;
    if (scanData) {
      try {
        const parsedScanData = JSON.parse(scanData);
        this.populateFormFromScanData(parsedScanData);
      } catch (e) {
        console.error('解析扫码数据失败:', e);
      }
    }
  },
  methods: {
    // 切换扩展信息的展开/收起状态
    toggleExpandInfo() {
      this.showExtendedInfo = !this.showExtendedInfo;
    },
    // 项目字段点击事件
    onProjectFieldClick() {
      this.showProjectPicker = true;
      this.searchKeyword = '';
      this.filterProjects();
    },

    // 添加新增信息操作日志记录方法
    addAdditionRecord(itemId, itemName) {
      // 构造新增操作的事务请求参数
      const requestData = {
        PageIndex: 0,
        PageSize: 10,
        Inventory_ID: itemId, // 使用新增物品的ID作为库存ID
        Transaction_Type: "新增", // 操作类型为"新增"
        Quantity_Change: 0,
        Current_Quantity: 0,
        Report_Person: {
          Person_Name: this.getLocalUserInfo().name,
          Person_Phone: this.getLocalUserInfo().phone,
          Person_DingID: this.getLocalUserInfo().dingID
        },
        Remark: `${this.getLocalUserInfo().name} 新增了物品: ${itemName}`
      };

      // 调用事务记录接口
      SensorRequestPage.InventoryTransactionAddFun(
        JSON.stringify(requestData),
        (respData) => {
          console.log('新增操作记录添加成功:', respData);
        },
        (error) => {
          console.error('新增操作记录添加失败:', error);
          this.$toast.fail('新增操作记录添加失败: ' + (error.message || '未知错误'));
        }
      );
    },

    // 获取本地用户信息
    getLocalUserInfo() {
      const name = localStorage.getItem(key_DingName);
      const phone = localStorage.getItem(key_DingUserPhone);
      const dingID = localStorage.getItem(key_DingUserIndex);

      return {
        name: name || '',
        phone: phone || '',
        dingID: dingID || ''
      };
    },
    onClickLeft() {
      this.$router.go(-1);
    },

    // 添加扫码点击处理函数
    handleScanClick() {
      this.scanQRCode();
    },

// 点击图标实现（导入上一篇功能）
// 修改新增物品信息时候的组件页面逻辑-2（新增导入上一篇的逻辑）
    async handleLoadClick() {
      try {
        // 弹窗提示用户确认是否导入上一篇操作信息记录
        await this.$dialog.confirm({
          title: '确认导入',
          message: '是否确认导入上一篇操作信息记录（位置，图片，标签信息除外）',
          confirmButtonText: '确定',
          cancelButtonText: '取消'
        });

        // 构造请求参数
        const userInfo = this.getLocalUserInfo();
        const param = {
          "Report_Person": {
            "Person_Phone": userInfo.phone,
            "Person_ID": userInfo.dingID
          }
        };

        // 调用后端接口获取上一篇操作记录
        const respData = await new Promise((resolve, reject) => {
          SensorRequestPage.InventoryItemLastGetFunWithPerson(
            JSON.stringify(param),
            (respData) => {
              console.log('上一篇操作记录 respData:', respData);
              resolve(respData);
            },
            (error) => {
              reject(error);
            }
          );
        });

        // 解析响应数据
        const responseJson = JSON.parse(respData);
        console.log('上一篇操作记录 responseJson:', responseJson);
        // 检查是否有返回数据（对象）
        if (responseJson && typeof responseJson === 'object') {
          const lastRecord = responseJson; // 直接使用返回的对象
          // 保存原有的位置信息和图片信息
          const originalShelfLocation = this.itemForm.Shelf_Location;
          const originalImages = this.imageList;
          // 覆盖表单项（除了位置信息、图片信息和标签）
          this.itemForm.Item_Name = lastRecord.Item_Name || '';
          this.itemForm.Item_Model = lastRecord.Item_Model || '';
          this.itemForm.Item_Brand = lastRecord.Item_Brand || '';
          this.itemForm.Category_Type = lastRecord.Category_Type || '';
          this.itemForm.Project_Code = lastRecord.Project_Code || '';
          this.itemForm.Warning_Threshold = lastRecord.Warning_Threshold || '';
          this.itemForm.Is_Low_Stock = lastRecord.Is_Low_Stock || '';
          this.itemForm.Remark = lastRecord.Remark || '';
          this.itemForm.Company = lastRecord.Company || '';
          // 扩展信息字段
          this.itemForm.Item_Color = lastRecord.Item_Color || '';
          this.itemForm.Item_Size = lastRecord.Item_Size || '';
          this.itemForm.Item_Unit = lastRecord.Item_Unit || '';
          this.itemForm.Item_Material = lastRecord.Item_Material || '';
          // 更多信息字段
          if (lastRecord.Item_Mores) {
            try {
              const moreFieldsObj = JSON.parse(lastRecord.Item_Mores);
              this.moreFields = Object.keys(moreFieldsObj).map(key => ({
                key: key,
                value: moreFieldsObj[key]
              }));
            } catch (e) {
              console.error('解析更多信息字段失败:', e);
              this.moreFields = [];
            }
          } else {
            this.moreFields = [];
          }
          // 项目名称
          if (lastRecord.Project_Code) {
            const project = this.fullProjectList.find(p => p.Project_Code === lastRecord.Project_Code);
            if (project) {
              this.selectedProjectName = project.Project_Name || project.name || project.projectName || '';
            }
          }
          // 恢复原有的位置信息和图片信息
          this.itemForm.Shelf_Location = originalShelfLocation;
          this.imageList = originalImages;
          // 清空用户标签，只保留系统标签
          this.userTags = [];
          // 更新系统标签（根据导入的数据重新生成系统标签）
          this.updateSystemTags();
          // 显示成功消息
          this.$toast.success('已导入上一篇操作记录信息（标签不导入）');
        } else {
          // 返回的是空内容
          this.$toast('暂未查询到上一篇操作记录');
        }
      } catch (error) {
        // 用户点击取消或其他错误
        if (error.message && error.message.includes('cancel')) {
          // 用户取消操作，不做任何处理
          console.log('用户取消导入');
        } else {
          console.error('导入上一篇记录失败:', error);
          this.$toast.fail('导入失败: ' + (error.message || '未知错误'));
        }
      }
    },

    // 货架位置输入事件处理
    onShelfLocationInput() {
      // 清除之前的防抖定时器
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // 设置防抖，延迟500ms执行查询
      this.debounceTimer = setTimeout(() => {
        this.searchShelfLocation();
      }, 500);
    },

    // 货架位置失去焦点时隐藏下拉列表
    onShelfLocationBlur() {
      // 延迟隐藏，让用户有机会点击下拉项
      setTimeout(() => {
        this.showSuggestionList = false;
      }, 200);
    },

    // 搜索货架位置
    async searchShelfLocation() {
      const input = this.itemForm.Shelf_Location.trim();

      // 如果输入为空，不执行搜索
      if (!input) {
        this.showSuggestionList = false;
        this.suggestionList = [];
        return;
      }

      try {
        // 调用后端接口验证扫描结果
        const params = {
          Shelf_Location: input
        };

        const respData = await new Promise((resolve, reject) => {
          SensorRequestPage.InventoryItemGetFun(
            JSON.stringify(params),
            (respData) => {
              resolve(respData);
            },
            (error) => {
              reject(error);
            }
          );
        });

        // 解析响应数据
        const responseJson = JSON.parse(respData);

        // 从 Data 数组中获取库存项
        if (responseJson.Data && Array.isArray(responseJson.Data)) {
          this.suggestionList = responseJson.Data;

          // 如果输入的货架位置完全匹配某个结果，直接显示警告
          if (responseJson.Data.length > 0) {
            const exactMatch = responseJson.Data.find(item =>
              item.Shelf_Location.toLowerCase() === input.toLowerCase()
            );

            if (exactMatch) {
              // 直接显示警告信息，而不只是显示下拉列表
              this.$dialog.alert({
                title: '警告',
                message: `该位置已存在物品信息：
                         \n物品名称：${exactMatch.Item_Name || '未知'}
                         \n型号：${exactMatch.Item_Model || '未知'}
                         \n当前位置：${exactMatch.Shelf_Location}
                         \n当前库存：${exactMatch.Current_Stock || 0}
                         \n\n建议您谨慎操作，避免重复添加。`
              });
            }
          }

          this.showSuggestionList = true;
        } else {
          this.suggestionList = [];
          this.showSuggestionList = true; // 仍然显示，用于显示"不存在"的消息
        }
      } catch (error) {
        console.error('搜索货架位置失败:', error);
        this.suggestionList = [];
        this.showSuggestionList = false;
      }
    },

    // 选择下拉建议项
    selectSuggestion(item) {
      // 将选中的项填充到表单中
      this.itemForm.Shelf_Location = item.Shelf_Location;

      // 隐藏下拉列表
      this.showSuggestionList = false;

      // 显示警告信息
      this.$dialog.alert({
        title: '警告',
        message: `该位置已存在物品信息：
                 \n物品名称：${item.Item_Name || '未知'}
                 \n型号：${item.Item_Model || '未知'}
                 \n当前位置：${item.Shelf_Location}
                 \n当前库存：${item.Current_Stock || 0}
                 \n\n建议您谨慎操作，避免重复添加。`
      });
    },

    // 扫码功能实现
    scanQRCode() {
      // 判断是否在钉钉环境中且为移动端
      if (typeof dd === 'undefined' || !dd.env || dd.env.platform === 'pc') {
        Toast.fail('请在钉钉移动端中使用扫码功能');
        return;
      }

      // 调用钉钉扫码功能
      dd.ready(() => {
        dd.biz.util.scan({
          type: 'qrCode', // 只扫描二维码
          onSuccess: (data) => {
            const result = data.text; // 获取扫描结果
            if (result) {
              // 将扫描结果填入货架位置字段
              this.itemForm.Shelf_Location = result;
              // 调用接口检查该位置是否已存在物品信息
              this.checkShelfLocationExist(result);
            } else {
              Toast.fail('未获取到二维码内容');
            }
          },
          onFail: (err) => {
            if (err.errorCode !== 300001) {
              Toast.fail('未扫描到二维码！');
            }
          }
        });
      });
    },

    // 检查货架位置是否已存在物品信息
    async checkShelfLocationExist(shelfLocation) {
      // 调用后端接口获取库存信息
      const params = {
        Shelf_Location: shelfLocation
      };
      console.log('获取库存信息参数：', params);

      try {
        const respData = await new Promise((resolve, reject) => {
          SensorRequestPage.InventoryItemGetFun(
            JSON.stringify(params),
            (respData) => {
              resolve(respData);
            },
            (error) => {
              reject(error);
            }
          );
        });

        // 解析响应数据
        const responseJson = JSON.parse(respData);

        // 从 Data 数组中获取库存项 （根据后端返回值结构解析）
        if (responseJson.Data && Array.isArray(responseJson.Data) && responseJson.Data.length > 0) {
          // 存在物品信息，显示弹窗提示用户
          // alert('该位置已存在物品信息'+JSON.stringify(responseJson.Data))
          this.showExistingItemsDialog(responseJson.Data);
        } else {
          // 不存在物品信息，提示用户可以放心添加
          Toast.success('数据库并无该记录，请放心添加');
        }
      } catch (parseError) {
        console.error('解析库存信息响应失败:', parseError);
        Toast.fail('数据格式错误');
      }
    },

    // 显示已存在的物品信息弹窗
// 显示已存在的物品信息弹窗
    showExistingItemsDialog(items) {
      // 构建弹窗内容
      let message = '该位置已存在以下物品信息：\n\n';

      items.forEach((item, index) => {
        const createTime = item.Ts_create ? new Date(item.Ts_create).toLocaleString('zh-CN') : '未知时间';
        const companyName = item.Company || '未知公司';
        const shelfLocation = item.Shelf_Location || '未知位置';

        message += `${index + 1}. ${companyName}库房已于${createTime}新建一条数据\n`;
        message += `   物品名称：${item.Item_Name || '未知'}\n`;
        message += `   物品型号：${item.Item_Model || '未知'}\n`;
        message += `   货架位置：${shelfLocation}\n`;
        message += `   当前库存：${item.Current_Stock || 0}\n\n`;
      });

      message += '建议您不再重复添加，是否继续添加？';

      // 显示确认弹窗
      this.$dialog.confirm({
        title: '物品已存在',
        message: message,
        messageAlign: 'left',
        confirmButtonText: '继续添加',
        cancelButtonText: '取消'
      }).then(async () => {
        // 用户选择继续添加，显示储物箱规则弹窗
        const storageBoxMessage = `继续添加将默认此位置为储物箱非收纳格。
请按照如下编号规则进行物品添加，且编号不能与已有物品编号重复：
编码规则：货架-层数-位置-序号
例如：A1L-2-003-01
同一货位存放多个物品时使用序号区分
若是上一个编号是AL1-01-012，则生成的是AL1-01-012-01，
若上一个编号是AL1-01-012-05，则生成的是AL1-01-012-06，
生成的编号会自动填入对应的位置中，
并且此时会产生一个标签"储物箱"作为固定标签，不能删除。`;

        try {
          await this.$dialog.confirm({
            title: '储物箱规则',
            message: storageBoxMessage,
            confirmButtonText: '确定',
            cancelButtonText: '取消'
          });

          // 获取该位置的所有物品编号并生成新编号
          // 使用最后一个数据的Shelf_Location作为基准
          const lastItem = items[items.length - 1]; // 获取最后一个数据
          const newNumber = await this.generateNextItemNumber(lastItem.Shelf_Location);

          // 确保在异步操作完成后更新字段
          this.$nextTick(() => {
            // 自动填入新生成的编号到货架位置字段（而不是物品名称字段）
            this.itemForm.Shelf_Location = newNumber;

            // 添加"储物箱"标签到系统标签中
            if (!this.systemTags.includes('储物箱')) {
              this.systemTags.push('储物箱');
            }
            Toast('已按照储物箱规则生成新编号并添加储物箱标签，若生成有误请手动修正');
          });
        } catch (error) {
          // 用户取消储物箱规则确认，不清空货架位置
          Toast('已取消储物箱添加');
        }
      }).catch(() => {
        // 用户选择取消，清空已填入的货架位置
        this.itemForm.Shelf_Location = '';
        Toast('已取消添加');
      });
    },

    // 检查是否为有效的编号格式
    isValidNumberFormat(location) {
      // 检查是否包含"-数字"格式，这是编号的特征
      return /-\d+$/.test(location);
    },

    // 生成下一个物品编号的方法
    async generateNextItemNumber(shelfLocation) {
      return new Promise((resolve, reject) => {
        // 构造查询参数，获取该货架位置下的所有物品
        // 调用后端接口获取库存信息
        const param = {
          Shelf_Location: shelfLocation
        };
        console.log('获取库存信息参数：', param);
        SensorRequestPage.InventoryItemGetFun(
          JSON.stringify(param),
          (respData) => {
            try {
              // 解析响应数据 (模仿第401-407行的解析逻辑)
              const responseJson = JSON.parse(respData);

              // 从 Data 数组中获取库存项
              let items = [];
              if (responseJson.Data && Array.isArray(responseJson.Data)) {
                items = responseJson.Data;
              }

              // 从返回的items中获取所有的Shelf_Location内容
              const allShelfLocations = items.map(item => item.Shelf_Location).filter(location => location);
              // alert('所有货架位置：'+ allShelfLocations);

              if (allShelfLocations.length > 0) {
                // 对Shelf_Location进行排序，找出最大的编号
                const sortedLocations = allShelfLocations.sort((a, b) => {
                  const partsA = a.split('-');
                  const partsB = b.split('-');

                  const maxLength = Math.max(partsA.length, partsB.length);
                  for (let i = 0; i < maxLength; i++) {
                    // 如果一个数组结束了，另一个还有内容，则长度长的更大
                    if (i >= partsA.length) return -1; // b更长，b更大
                    if (i >= partsB.length) return 1;  // a更长，a更大

                    const partA = partsA[i];
                    const partB = partsB[i];

                    // 检查是否都是纯数字
                    const isNumA = /^\d+$/.test(partA);
                    const isNumB = /^\d+$/.test(partB);

                    if (isNumA && isNumB) {
                      // 都是数字，按数值比较
                      const numA = parseInt(partA);
                      const numB = parseInt(partB);
                      if (numA !== numB) {
                        return numA - numB;
                      }
                    } else {
                      // 非数字部分按字符串比较
                      const comparison = partA.localeCompare(partB);
                      if (comparison !== 0) {
                        return comparison;
                      }
                    }
                  }
                  return 0;
                });

                const lastShelfLocation = sortedLocations[sortedLocations.length - 1];

                // 检查最后一条数据的Shelf_Location是否符合编号规则
                if (this.isValidNumberFormat(lastShelfLocation)) {
                  // 如果最后一条数据的Shelf_Location已经有编号格式，基于它生成下一个编号
                  const newNumber = this.incrementNumber(lastShelfLocation);
                  resolve(newNumber);
                } else {
                  // 如果没有编号格式，基于原始扫描位置生成
                  const basePart = shelfLocation.replace(/[^A-Za-z0-9]/g, '');
                  resolve(`${basePart}-01`);
                }
              } else {
                // 如果没有找到相关数据，基于原始扫描位置生成
                const basePart = shelfLocation.replace(/[^A-Za-z0-9]/g, '');
                console.log('basePart 11:', basePart);
                resolve(`${basePart}-01`);
              }
            } catch (error) {
              console.error('解析物品数据失败:', error);
              reject(error);
            }
          },
          (error) => {
            console.error('获取物品数据失败:', error);
            reject(error);
          }
        );
      });
    },

    // 从货架位置中提取编号部分
    extractNumberFromShelfLocation(shelfLocation) {
      // 检查是否已经是标准格式（包含至少两个连字符）
      if ((shelfLocation.match(/-/g) || []).length >= 2) {
        // 如果是形如 "A1L-2-003-01" 或 "AL1-01-012-01" 的格式
        return shelfLocation;
      } else {
        // 如果不是标准格式，尝试构建一个基础编号
        return shelfLocation;
      }
    },

    // 从物品名称中提取编号部分
    extractNumberFromItemName(itemName) {
      // 检查是否已经是标准格式（包含至少两个连字符）
      if ((itemName.match(/-/g) || []).length >= 2) {
        // 如果是形如 "A1L-2-003-01" 或 "AL1-01-012-01" 的格式
        return itemName;
      } else {
        // 如果不是标准格式，尝试构建一个基础编号
        return itemName;
      }
    },

    // 递增编号的方法
    // A2L-2-005 → A2L-2-005-01（首次扩展）
    // A2L-2-005-01 → A2L-2-005-02（继续递增）
    incrementNumber(number) {
      // 检查编号是否已经包含扩展序号（如 A2L-2-005-01）
      const parts = number.split('-');

      // 检查是否已经是扩展编号格式（最后一个是数字）
      if (parts.length >= 4 && /^\d+$/.test(parts[parts.length - 1])) {
        // 已经是扩展编号格式，递增最后一个数字部分
        const lastNum = parseInt(parts[parts.length - 1]);
        const incrementedNum = String(lastNum + 1).padStart(parts[parts.length - 1].length, '0');
        parts[parts.length - 1] = incrementedNum;
        return parts.join('-');
      } else {
        // 不是扩展编号格式，添加 -01 作为扩展序号
        return number + '-01';
      }
    },

    onCategoryChange(value) {
      // 当分类改变时，清空项目代码和预警阈值
      if (value !== '项目') {
        this.itemForm.Project_Code = '';
        this.selectedProjectName = '';
      }
      if (value !== '耗材') {
        this.itemForm.Warning_Threshold = '';
      }
      // 触发系统标签更新
      this.updateSystemTags();
    },
// 在 onProjectConfirm 方法中
    onProjectConfirm(value) {
      // 保存选中的项目名称用于显示
      this.selectedProjectName = value;
      this.showProjectPicker = false;
      // 查找对应的项目代码并更新表单
      const selectedProject = this.fullProjectList.find(project =>
        (project.Project_Name || project.name || project.projectName) === value
      );
      if (selectedProject) {
        this.itemForm.Project_Code = selectedProject.Project_Code || '';
      }
      // 更新系统标签以包含项目名称
      this.updateSystemTags();
      // 保存到历史记录
      this.saveToRecentProjects(value);
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

    // 选择最近项目
    selectRecentProject(projectName) {
      this.selectedProjectName = projectName;
      this.showProjectPicker = false;
      // 更新表单中的项目代码
      const selectedProject = this.fullProjectList.find(project =>
        (project.Project_Name || project.name || project.projectName) === projectName
      );
      if (selectedProject) {
        this.itemForm.Project_Code = selectedProject.Project_Code || '';
      }
      // 更新系统标签
      this.updateSystemTags();
      // 保存到历史记录
      this.saveToRecentProjects(projectName);
    },

    // 保存到最近选择
    saveToRecentProjects(projectName) {
      // 限制历史记录数量为5条
      const maxRecentCount = 5;
      if (!this.recentProjects.includes(projectName)) {
        this.recentProjects.unshift(projectName); // 添加到开头
        if (this.recentProjects.length > maxRecentCount) {
          this.recentProjects.pop(); // 超出限制则移除最后一条
        }
        // 保存到本地存储
        localStorage.setItem('recentProjects', JSON.stringify(this.recentProjects));
      }
    },

    // 加载最近选择
    loadRecentProjects() {
      const stored = localStorage.getItem('recentProjects');
      if (stored) {
        this.recentProjects = JSON.parse(stored);
      }
    },

    loadProjectOptions() {
      const param = {};
      SensorRequest.ProjectInfoGetFun(JSON.stringify(param), (respData) => {
        try {
          let data = [];
          if (typeof respData === 'string') {
            data = JSON.parse(respData);
          } else {
            data = respData;
          }

          // 确保是数组格式
          const projectList = Array.isArray(data) ? data : (data.data || []);

          // 保存完整的项目信息（包含Project_Code和Project_Name）
          this.fullProjectList = projectList;

          // 只提取项目名称用于选择器显示
          this.projectColumns = projectList.map(project =>
            project.Project_Name || project.name || project.projectName || '未知项目'
          );
          this.filteredProjectColumns = this.projectColumns; // 初始化过滤后的项目列表
        } catch (error) {
          console.error('解析项目数据失败:', error);
          Toast.fail('项目数据解析失败');
        }
      }, (error) => {
        console.error('获取项目信息失败:', error);
        Toast.fail('获取项目信息失败');
      });
    },

    // 添加更多字段
    addMoreField() {
      this.moreFields.push({ key: '', value: '' });
    },

    // 移除更多字段
    removeMoreField(index) {
      this.moreFields.splice(index, 1);
    },

    // 更新系统标签（公司、分类和项目）
    updateSystemTags() {
      const newSystemTags = [];
      // 添加公司标签（如果已选择）
      if (this.itemForm.Company) {
        newSystemTags.push(this.itemForm.Company);
      }
      // 添加分类标签（如果已选择）
      if (this.itemForm.Category_Type) {
        newSystemTags.push(this.itemForm.Category_Type);
      }

      // 如果是项目分类且已选择项目，添加项目名称作为系统标签
      if (this.itemForm.Category_Type === '项目' && this.selectedProjectName) {
        newSystemTags.push(this.selectedProjectName);
      }

      // 保留原有的特殊系统标签（如储物箱）
      const specialSystemTags = ['储物箱']; // 定义特殊标签列表
      specialSystemTags.forEach(tag => {
        if (this.systemTags.includes(tag) && !newSystemTags.includes(tag)) {
          newSystemTags.push(tag);
        }
      });

      // 重新排序：系统标签在前，用户标签在后
      this.systemTags = newSystemTags;
    },
    // 判断是否为系统标签
    isSystemTag(tag) {
      return this.systemTags.includes(tag);
    },

    // 添加标签方法
    addTag() {
      if (this.newTag.trim()) {
        // 检查标签是否已存在（包括系统标签和用户标签）
        const allCurrentTags = [...this.systemTags, ...this.userTags];

        if (!allCurrentTags.includes(this.newTag.trim())) {
          // 确保不是系统标签才添加到用户标签
          if (!this.systemTags.includes(this.newTag.trim())) {
            this.userTags.push(this.newTag.trim());
            this.newTag = ''; // 清空输入框
            Toast.success('标签添加成功');
          } else {
            Toast('系统标签不可手动添加');
          }
        } else {
          Toast('标签已存在，不允许重复添加');
        }
      } else {
        Toast('请输入标签内容');
      }
    },

    // 删除标签方法
    removeTag(index) {
      // 计算实际在userTags中的索引
      const actualIndex = index - this.systemTags.length;

      // 检查是否为系统标签
      if (index < this.systemTags.length) {
        Toast('系统标签不可删除');
        return;
      }

      // 从用户标签中删除
      if (actualIndex >= 0 && actualIndex < this.userTags.length) {
        this.userTags.splice(actualIndex, 1);
        Toast.success('标签已删除');
      }
    },

    // 将文件转换为base64的方法
    processFileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const base64 = e.target.result.split(',')[1]; // 获取base64数据部分
            const fileInfo = {
              File_Name: file.file ? file.file.name : file.name,
              File_Base64: base64,
              Upload_Time: new Date().toISOString()
            };
            this.imageList.push(fileInfo);
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = (error) => {
          reject(error);
        };
        reader.readAsDataURL(file.file || file);
      });
    },

    async onAfterRead(file) {
      // 检查文件类型
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const files = Array.isArray(file) ? file : [file];

      for (const f of files) {
        if (!f.file || !f.file.type) {
          this.$toast.fail('无法识别文件类型，请上传有效的图片文件');
          return;
        }
        if (!allowedTypes.includes(f.file.type)) {
          this.$toast.fail(`不支持的文件类型: ${f.file.type}，请上传图片文件`);
          return;
        }
      }

      // 处理文件并转换为base64
      try {
        if (Array.isArray(file)) {
          // 如果是多文件，逐个处理
          for (const f of file) {
            await this.processFileToBase64(f);
          }
        } else {
          // 单个文件处理
          await this.processFileToBase64(file);
        }
      } catch (error) {
        console.error('处理文件失败:', error);
        this.$toast.fail('处理文件失败');
      }
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
    // 在 methods 中修改 onSubmit 方法
// 修改 onSubmit 方法
    async onSubmit(values) {
      // 显示确认弹窗，让用户确认信息是否无误
      try {
        await this.$dialog.confirm({
          title: '确认保存',
          message: '请确认信息是否无误，确定保存？',
          confirmButtonText: '确定保存',
          cancelButtonText: '继续编辑'
        });
      } catch (error) {
        // 用户点击取消，不执行保存操作
        Toast('已取消保存');
        return;
      }

      // 先检查货架位置是否已存在
      try {
        const exists = await this.checkShelfLocationExists();
        if (exists) {
          Toast.fail('该位置信息已存在，请更换位置新增物品');
          return;
        }

        // 构造请求参数
        const param = {
          ...this.itemForm,
          Current_Stock: 0, // 新增物品初始库存为0
          Is_Low_Stock: '', // 初始状态不设置低库存标记
          Item_Images: this.imageList, // 设置图片信息
          Item_Mores: this.convertMoreFieldsToString(), // 将更多字段转换为字符串
          Item_Tags: [...this.systemTags, ...this.userTags] // 使用合并后的标签数组，确保包含储物箱标签
        };

        // 如果是项目分类，需要查找对应的项目代码
        if (param.Category_Type === '项目' && this.selectedProjectName) {
          const selectedProject = this.fullProjectList.find(project =>
            (project.Project_Name || project.name || project.projectName) === this.selectedProjectName
          );

          if (selectedProject) {
            param.Project_Code = selectedProject.Project_Code || '';
          } else {
            param.Project_Code = '';
          }
        }
        // 如果不是耗材分类，清除预警阈值
        if (param.Category_Type !== '耗材') {
          param.Warning_Threshold = 0;
        }
        // 如果不是项目分类，清除项目代码
        if (param.Category_Type !== '项目') {
          param.Project_Code = '';
        }
        // 显示加载提示，告知用户正在处理中
        Toast.loading({
          mask: true,
          message: '保存中...',
          duration: 0 // 不自动消失
        });
        SensorRequestPage.InventoryItemAddFun(JSON.stringify(param), (respData) => {
          // 解析返回的响应数据，获取新增物品的ID
          try {
            console.log('新增物品ID:', respData);
            if (respData) {
              // 记录新增操作日志
              this.addAdditionRecord(respData, this.itemForm.Item_Name);
            } else {
              console.error('新增物品成功但未获取到物品ID:', respData);
            }
          } catch (parseError) {
            console.error('解析新增物品响应失败:', parseError);
          }
          // 隐藏加载提示
          Toast.clear();
          // 显示成功消息
          Toast.success('新增物品成功，即将返回库存管理页面');
          // 返回上一页
          this.navigateTo('/inventoryV1');
        }, (error) => {
          console.error('新增物品失败:', error);
          // 隐藏加载提示
          Toast.clear();
          // 显示错误消息
          Toast.fail('新增物品失败：'+ error)
        });
      } catch (error) {
        console.error('检查货架位置失败:', error);
        Toast.fail('检查货架位置失败');
      }
    },

    // 将更多字段转换为字符串
    convertMoreFieldsToString() {
      if (!this.moreFields || this.moreFields.length === 0) {
        return '';
      }

      // 过滤掉空的字段
      const validFields = this.moreFields.filter(field => field.key && field.value);

      if (validFields.length === 0) {
        return '';
      }

      // 转换为JSON字符串
      return JSON.stringify(validFields.reduce((acc, field) => {
        acc[field.key] = field.value;
        return acc;
      }, {}));
    },

    // 新增检查货架位置是否已存在的方法
    checkShelfLocationExists() {
      return new Promise((resolve, reject) => {
        // 构造检查参数
        const checkParam = {
          PageIndex: 0,
          PageSize: 10,
          Item_Name: "",
          Shelf_Location: this.itemForm.Shelf_Location,
          Item_Model: "",
          Item_Brand: "",
          Category_Type: "",
          Company: this.itemForm.Company
        };

        SensorRequestPage.InventoryItemGetFun(JSON.stringify(checkParam), (respData) => {
          try {
            const data = JSON.parse(respData);
            // 如果返回空数组，说明位置不存在，可以新增
            const exists = Array.isArray(data) && data.length > 0;
            resolve(exists);
          } catch (error) {
            console.error('解析检查结果失败:', error);
            reject(error);
          }
        }, (error) => {
          console.error('检查货架位置失败:', error);
          reject(error);
        });
      });
    },
    // 新增方法：根据扫码数据填充表单
    populateFormFromScanData(scanData) {
      // 映射规则：pc -> Item_Name, pm -> Item_Model, qty -> Current_Stock
      if (scanData.pc) {
        this.itemForm.Item_Name = scanData.pc;
      }
      if (scanData.pm) {
        this.itemForm.Item_Model = scanData.pm;
      }
      if (scanData.qty) {
        this.itemForm.Current_Stock = parseInt(scanData.qty, 10) || 0;
      }

      // 可以在这里添加更多的字段映射逻辑
      // 例如：on -> Remark, cc -> Company 等
    }
  },
  // 组件销毁时清理定时器
  beforeDestroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
};
</script>

<style scoped>

/* 扩展信息折叠样式 */
.expand-info-header {
  background-color: #f7f8fa;
  cursor: pointer;
  margin-top: 16px;
  margin-bottom: 0;
}

.expand-info-header:active {
  background-color: #eef0f2;
}

.expand-arrow {
  transition: transform 0.3s ease;
}

.extended-info-content {
  background-color: #fff;
}

.inventory-add-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.form-container {
  margin-top: 10px;
}

.van-radio-group {
  display: flex;
  flex-wrap: wrap;
}

.van-radio {
  margin-right: 15px;
  margin-bottom: 5px;
}

/* 货架位置输入框容器 */
.shelf-location-container {
  position: relative;
}

.suggestion-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  border: 1px solid #ebedf0;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  margin-top: 2px;
}

.suggestion-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f2f3f5;
  cursor: pointer;
  transition: background-color 0.2s;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background-color: #f7f8fa;
}

.suggestion-title {
  font-weight: 500;
  color: #323233;
  margin-bottom: 4px;
}

.suggestion-subtitle {
  font-size: 12px;
  color: #969799;
}

.no-result {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  border: 1px solid #ebedf0;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 12px 16px;
  color: #969799;
  margin-top: 2px;
}

.more-fields-container {
  width: 100%;
  padding-left: 16px; /* 与van-cell的内边距对齐 */
  padding-right: 16px; /* 与van-cell的内边距对齐 */
  margin-top: 1px; /* 负值让内容更贴近标题 */
}

.more-field-row {
  display: flex;
  flex-direction: column; /* 改为垂直布局 */
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px;
  border: 1px solid #ebedf0;
  border-radius: 4px;
  background-color: #fafafa;
}

.more-field-input {
  margin-bottom: 8px; /* 为每个输入框添加底部间距 */
}

.remove-field-btn {
  align-self: flex-end; /* 将删除按钮对齐到右侧 */
  margin-top: 5px;
}

.more-field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.more-field-key {
  flex: 1;
  margin-right: 0;
}

.more-field-value {
  flex: 1;
  margin-right: 0;
}

.remove-field-btn {
  flex-shrink: 0;
  margin-left: 5px;
}

.upload-note {
  font-size: 12px; /* 设置字体大小 */
  color: #999; /* 设置字体颜色为灰色 */
}

.custom-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border: 1px dashed #e5e5e5;
  border-radius: 4px;
}

.tags-container {
  padding-left: 16px;
  padding-right: 16px;
  margin-bottom: 15px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
}

.custom-tag-item {
  display: inline-flex;
  align-items: center;
  background-color: #f5f5f5;
  border: 1px solid #ebedf0;
  border-radius: 16px;
  padding: 4px 8px 4px 12px;
  margin-right: 5px;
  margin-bottom: 5px;
  font-size: 12px;
  line-height: 1.2;
}

.system-tag {
  background-color: #d0f0ff;
  border: 1px solid #87ceeb;
}

.user-tag {
  background-color: #f5f5f5;
  border: 1px solid #ebedf0;
}

.tag-text {
  margin-right: 5px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background-color: #c8c9cc;
  border-radius: 50%;
  color: white;
  font-size: 12px;
  cursor: pointer;
  font-weight: bold;
}

.tag-close:hover {
  background-color: #ee0a24;
}

.system-tag-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 12px;
  margin-left: 5px;
}

.tag-input-wrapper {
  display: flex;
  gap: 8px;
}

.tag-input {
  flex: 1;
  min-width: 0; /* 防止输入框溢出 */
}

/* 项目选择器样式 */
.project-picker-container {
  background-color: #fff;
  border-radius: 16px 16px 0 0;
  overflow: hidden;
}

.project-search {
  background-color: #fff;
}

.recent-projects {
  padding: 12px 16px;
  border-bottom: 1px solid #f2f3f5;
  background-color: #fafafa;
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

.project-list {
  max-height: 300px;
  overflow-y: auto;
}

.no-project-result {
  padding: 20px;
  text-align: center;
  color: #969799;
  font-size: 14px;
}
</style>
