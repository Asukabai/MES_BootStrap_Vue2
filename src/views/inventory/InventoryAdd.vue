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
          />

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

export default {
  name: 'InventoryAdd',
  data() {
    return {
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
        Company: ''
      },
      showProjectPicker: false,
      projectColumns: [],
      fullProjectList: [], // 保存完整的项目信息
      selectedProjectName: '' // 用于显示选中的项目名称
    };
  },
  created() {
    this.loadProjectOptions();
  },
  methods: {
    onClickLeft() {
      this.$router.go(-1);
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

    onSubmit(values) {
      // 构造请求参数
      const param = {
        ...this.itemForm,
        Current_Stock: 0, // 新增物品初始库存为0
        Is_Low_Stock: '' // 初始状态不设置低库存标记
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

      SensorRequest.InventoryItemsAddFun(JSON.stringify(param), (respData) => {
        Toast.success('新增物品成功');
        // 返回上一页
        this.$router.go(-1);
      }, (error) => {
        console.error('新增物品失败:', error);
        Toast.fail('新增物品失败');
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
</style>
