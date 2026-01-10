<template>
  <div class="inventory-add-page">
    <div class="form-container">
      <van-form @submit="onSubmit">
        <van-cell-group inset>
          <van-field
            v-model="itemForm.Item_Name"
            name="Item_Name"
            label="物品名称"
            placeholder="请输入物品名称"
            :rules="[{ required: true, message: '请填写物品名称' }]"
          />
          <van-field
            v-model="itemForm.Shelf_Location"
            name="Shelf_Location"
            label="货架位置"
            placeholder="请输入货架位置或直接扫码获取"
            :rules="[{ required: true, message: '请填写货架位置' }]"
            :right-icon="scanIcon"
            @click-right-icon="handleScanClick"
          >
            <template #label>
              <span>货架位置</span>
            </template>
          </van-field>

          <van-field
            v-model="itemForm.Item_Model"
            name="Item_Model"
            label="型号"
            placeholder="请输入物品型号"
          />

          <van-field
            name="Company"
            label="所属公司"
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
            label="库存分类"
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
            label="关联项目"
            placeholder="请选择关联项目"
            is-link
            readonly
            @click="showProjectPicker = true"
          />

          <van-field
            v-model="itemForm.Remark"
            name="Remark"
            label="备注"
            placeholder="请输入备注"
          />

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
            placeholder="请输入物品材质信息（最多100字）"
            show-word-limit
          />

          <!-- 更多信息输入 -->
          <van-cell :border="false">
            <template #title>
              <span>更多信息</span>
            </template>
          </van-cell>
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

    <!-- 项目选择器 -->
    <van-popup v-model="showProjectPicker" position="bottom">
      <van-picker
        show-toolbar
        :columns="projectColumns"
        @confirm="onProjectConfirm"
        @cancel="showProjectPicker = false"
      />
    </van-popup>
  </div>
</template>

<script>
import { Toast } from 'vant';
import SensorRequest from '../../utils/SensorRequest.js';
import * as dd from 'dingtalk-jsapi';
import SensorRequestPage from "../../utils/SensorRequestPage";

export default {
  name: 'InventoryAddV1',
  data() {
    return {
      scanIcon: require('../../assets/scan_icon.png'), // 添加扫码图标
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
      fullProjectList: [], // 保存完整的项目信息
      selectedProjectName: '', // 用于显示选中的项目名称
      // 更多字段
      moreFields: [],
      // 图片相关
      fileList: [],
      imageList: []
    };
  },
  created() {
    this.loadProjectOptions();
  },
  methods: {
    onClickLeft() {
      this.$router.go(-1);
    },

    // 添加扫码点击处理函数
    handleScanClick() {
      this.scanQRCode();
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
    showExistingItemsDialog(items) {
      // 构建弹窗内容
      let message = '该位置已存在以下物品信息：\n\n';

      items.forEach((item, index) => {
        const createTime = item.Ts_create ? new Date(item.Ts_create).toLocaleString('zh-CN') : '未知时间';
        const companyName = item.Company || '未知公司';

        message += `${index + 1}. ${companyName}库房已于${createTime}新建一条数据\n`;
        message += `   物品名称：${item.Item_Name || '未知'}\n`;
        message += `   物品型号：${item.Item_Model || '未知'}\n`;
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
      }).then(() => {
        // 用户选择继续添加，不做任何操作，保持当前表单状态
        Toast.info('您可以继续添加新物品');
      }).catch(() => {
        // 用户选择取消，清空已填入的货架位置
        this.itemForm.Shelf_Location = '';
        Toast.info('已取消添加');
      });
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
    },

    onProjectConfirm(value) {
      // 保存选中的项目名称用于显示
      this.selectedProjectName = value;
      this.showProjectPicker = false;
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
          Item_Mores: this.convertMoreFieldsToString() // 将更多字段转换为字符串
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

        SensorRequestPage.InventoryItemAddFun(JSON.stringify(param), (respData) => {
          Toast.success('新增物品成功');
          // // 返回上一页
          // this.$router.go(-1);
          this.navigateTo('/inventoryV1');
        }, (error) => {
          console.error('新增物品失败:', error);
          Toast.fail('新增物品失败');
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

        SensorRequest.InventoryItemsGetFun(JSON.stringify(checkParam), (respData) => {
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
    }
  }
};
</script>

<style scoped>
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
</style>
