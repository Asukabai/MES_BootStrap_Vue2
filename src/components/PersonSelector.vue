NEW_FILE_CODE
<template>
  <div class="person-selector-component">
    <van-field
      v-model="selectedPersonName"
      :name="fieldName"
      :label="label"
      :placeholder="placeholder"
      is-link
      readonly
      :rules="rules"
      @click="onPersonFieldClick"
    >
      <template #label>
        <slot name="label">
          <span>{{ label }}</span>
        </slot>
      </template>
      <template #input>
        <div v-if="selectedPersonName && selectedPersonDepartment" class="person-display">
          <span class="person-name">{{ selectedPersonName }}</span>
          <span class="person-department">[{{ selectedPersonDepartment }}]</span>
        </div>
      </template>
    </van-field>

    <!-- 人员选择器弹窗 -->
    <van-popup v-model="showPicker" position="bottom" closeable round>
      <div class="person-picker-container">
        <!-- 搜索框 -->
        <van-search
          v-model="searchKeyword"
          :placeholder="searchPlaceholder"
          @input="filterPersons"
          class="person-search"
        >
        </van-search>

        <!-- 历史选择区域 -->
        <div v-if="recentPersons.length > 0" class="recent-persons">
          <div class="recent-title">最近选择：</div>
          <div class="recent-list">
            <van-tag
              v-for="(person, index) in recentPersons"
              :key="index"
              type="primary"
              size="medium"
              class="recent-item"
              @click="selectRecentPerson(person)"
            >
              {{ person }}
              <van-icon
                name="cross"
                size="14px"
                class="recent-item-close"
                @click.stop="removeRecentPerson(index)"
              />
            </van-tag>
          </div>
        </div>

        <!-- 人员列表 -->
        <div class="person-list">
          <div v-if="filteredPersonColumns.length === 0 && searchKeyword" class="no-person-result">
            未找到匹配的人员
          </div>
          <van-cell-group v-else>
            <van-cell
              v-for="(item, index) in filteredPersonColumns"
              :key="index"
              clickable
              @click="onPersonItemClick(item)"
              class="person-item"
            >
              <template #title>
                <div class="person-item-content">
                  <div class="person-item-info">
                    <div class="person-item-name">{{ extractPersonName(item) }}</div>
                    <div v-if="extractPersonDepartment(item)" class="person-item-department">{{ extractPersonDepartment(item) }}</div>
                  </div>
                  <div v-if="extractPersonPhone(item)" class="person-item-phone">{{ extractPersonPhone(item) }}</div>
                </div>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { Toast } from 'vant';
import SensorRequest from '../utils/SensorRequest.js';

export default {
  name: 'PersonSelector',
  props: {
    // 字段名
    fieldName: {
      type: String,
      default: 'Employ_Person'
    },
    // 标签文本
    label: {
      type: String,
      default: '*使用用户'
    },
    // 占位符
    placeholder: {
      type: String,
      default: '请选择使用用户'
    },
    // 搜索框占位符
    searchPlaceholder: {
      type: String,
      default: '请输入姓名、部门或手机号搜索'
    },
    // 验证规则
    rules: {
      type: Array,
      default: () => [{ required: true, message: '请选择使用用户' }]
    },
    // 是否启用最近选择功能
    enableRecent: {
      type: Boolean,
      default: true
    },
    // 最近选择的最大数量
    maxRecentCount: {
      type: Number,
      default: 5
    },
    // 本地存储键名
    storageKey: {
      type: String,
      default: 'recentPersons'
    }
  },
  data() {
    return {
      showPicker: false,
      selectedPersonName: '',
      selectedPersonDepartment: '',
      selectedPersonPhone: '',
      selectedPersonDingID: '',
      selectedPersonId: null,
      personColumns: [],
      filteredPersonColumns: [],
      fullPersonList: [],
      searchKeyword: '',
      recentPersons: []
    };
  },
  created() {
    this.loadPersonOptions();
    if (this.enableRecent) {
      this.loadRecentPersons();
    }
  },
  watch: {
    showPicker(newVal) {
      if (newVal) {
        this.searchKeyword = '';
        this.filterPersons();
      }
    }
  },
  methods: {
    loadPersonOptions() {
      const param = {};
      SensorRequest.PersonGetFun(JSON.stringify(param), (respData) => {
        try {
          let data = [];
          if (typeof respData === 'string') {
            data = JSON.parse(respData);
          } else {
            data = respData;
          }

          const personList = Array.isArray(data) ? data : (data.data || []);

          this.fullPersonList = personList;

          this.personColumns = personList.map(person => {
            const personName = person.Person_Name || person.name || person.personName || '未知人员';
            const personDepartment = person.Person_Department || '';
            return personDepartment ? `${personName} [${personDepartment}]` : personName;
          });
          this.filteredPersonColumns = this.personColumns;
        } catch (error) {
          console.error('解析人员数据失败:', error);
          Toast.fail('人员数据解析失败');
        }
      }, (error) => {
        console.error('获取人员信息失败:', error);
        Toast.fail('获取人员信息失败');
      });
    },

    onPersonFieldClick() {
      this.showPicker = true;
      this.searchKeyword = '';
      this.filterPersons();
    },

    onPersonItemClick(itemText) {
      const personName = this.extractPersonName(itemText);
      this.onPersonConfirm(personName);
    },

    extractPersonName(item) {
      if (typeof item === 'string') {
        const match = item.match(/^(.*?)\s*\[/);
        return match ? match[1].trim() : item;
      }
      return item.Person_Name || item.name || item.personName || '未知人员';
    },

    extractPersonDepartment(item) {
      if (typeof item === 'string') {
        const match = item.match(/\[(.*?)\]/);
        return match ? match[1] : '';
      }
      return item.Person_Department || '';
    },

    extractPersonPhone(item) {
      if (typeof item === 'string') {
        return '';
      }
      return item.Person_Phone || '';
    },

    onPersonConfirm(value) {
      this.selectedPersonName = value;
      this.showPicker = false;

      const selectedPerson = this.fullPersonList.find(person =>
        (person.Person_Name || person.name || person.personName) === value
      );
      if (selectedPerson) {
        this.selectedPersonDepartment = selectedPerson.Person_Department || '';
        this.selectedPersonPhone = selectedPerson.Person_Phone || '';
        this.selectedPersonDingID = selectedPerson.Person_DingID || '';
        this.selectedPersonId = selectedPerson.ID_Person || null;

        this.$emit('change', {
          personName: this.selectedPersonName,
          personDepartment: this.selectedPersonDepartment,
          personPhone: this.selectedPersonPhone,
          personDingID: this.selectedPersonDingID,
          personId: this.selectedPersonId,
          fullData: selectedPerson
        });
      }
      if (this.enableRecent) {
        this.saveToRecentPersons(value);
      }
    },

    filterPersons() {
      if (!this.searchKeyword) {
        this.filteredPersonColumns = this.personColumns;
        return;
      }

      const keyword = this.searchKeyword.toLowerCase().trim();

      this.filteredPersonColumns = this.personColumns.filter((person, index) => {
        const personName = person.toLowerCase();
        const personDepartment = (this.fullPersonList[index].Person_Department || '').toLowerCase();
        const personPhone = (this.fullPersonList[index].Person_Phone || '').toLowerCase();
        return personName.includes(keyword) ||
          personDepartment.includes(keyword) ||
          personPhone.includes(keyword);
      });
    },

    selectRecentPerson(personName) {
      this.selectedPersonName = personName;
      this.showPicker = false;

      const selectedPerson = this.fullPersonList.find(person =>
        (person.Person_Name || person.name || person.personName) === personName
      );
      if (selectedPerson) {
        this.selectedPersonDepartment = selectedPerson.Person_Department || '';
        this.selectedPersonPhone = selectedPerson.Person_Phone || '';
        this.selectedPersonDingID = selectedPerson.Person_DingID || '';
        this.selectedPersonId = selectedPerson.ID_Person || null;

        this.$emit('change', {
          personName: this.selectedPersonName,
          personDepartment: this.selectedPersonDepartment,
          personPhone: this.selectedPersonPhone,
          personDingID: this.selectedPersonDingID,
          personId: this.selectedPersonId,
          fullData: selectedPerson
        });
      }
      if (this.enableRecent) {
        this.saveToRecentPersons(personName);
      }
    },

    removeRecentPerson(index) {
      this.recentPersons.splice(index, 1);
      localStorage.setItem(this.storageKey, JSON.stringify(this.recentPersons));
      Toast.success('已清除最近选择');
    },

    saveToRecentPersons(personName) {
      if (!this.recentPersons.includes(personName)) {
        this.recentPersons.unshift(personName);
        if (this.recentPersons.length > this.maxRecentCount) {
          this.recentPersons.pop();
        }
        localStorage.setItem(this.storageKey, JSON.stringify(this.recentPersons));
      }
    },

    loadRecentPersons() {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.recentPersons = JSON.parse(stored);
      }
    },

    clearSelection() {
      this.selectedPersonName = '';
      this.selectedPersonDepartment = '';
      this.selectedPersonPhone = '';
      this.selectedPersonDingID = '';
      this.selectedPersonId = null;
      this.$emit('change', {
        personName: '',
        personDepartment: '',
        personPhone: '',
        personDingID: '',
        personId: null,
        fullData: null
      });
    },

    setPerson(personName, personDepartment = '', personPhone = '', personDingID = '', personId = null) {
      this.selectedPersonName = personName;
      this.selectedPersonDepartment = personDepartment;
      this.selectedPersonPhone = personPhone;
      this.selectedPersonDingID = personDingID;
      this.selectedPersonId = personId;

      const selectedPerson = this.fullPersonList.find(person =>
        (person.Person_Name || person.name || person.personName) === personName
      );

      if (selectedPerson) {
        if (!personDepartment) {
          this.selectedPersonDepartment = selectedPerson.Person_Department || '';
        }
        if (!personPhone) {
          this.selectedPersonPhone = selectedPerson.Person_Phone || '';
        }
        if (!personDingID) {
          this.selectedPersonDingID = selectedPerson.Person_DingID || '';
        }
        if (!personId) {
          this.selectedPersonId = selectedPerson.ID_Person || null;
        }
      }

      this.$emit('change', {
        personName: this.selectedPersonName,
        personDepartment: this.selectedPersonDepartment,
        personPhone: this.selectedPersonPhone,
        personDingID: this.selectedPersonDingID,
        personId: this.selectedPersonId,
        fullData: selectedPerson || null
      });
    }
  }
};
</script>

<style scoped>
.person-selector-component {
  width: 100%;
}

.person-display {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.person-name {
  flex: 1;
  color: #323233;
}

.person-department {
  color: #1989fa;
  font-weight: 500;
  font-size: 13px;
  white-space: nowrap;
}

.person-picker-container {
  background-color: #fff;
  border-radius: 16px 16px 0 0;
  overflow: hidden;
}

.person-search {
  background-color: #fff;
}

.recent-persons {
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
  position: relative;
  padding-right: 24px;
}

.recent-item:hover {
  opacity: 0.8;
}

.recent-item-close {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  color: #fff;
  opacity: 0.8;
  transition: all 0.2s;
}

.recent-item-close:hover {
  opacity: 1;
  color: #ff7676;
}

.person-list {
  max-height: 300px;
  overflow-y: auto;
}

.person-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f2f3f5;
}

.person-item:last-child {
  border-bottom: none;
}

.person-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.person-item-info {
  flex: 1;
}

.person-item-name {
  font-size: 14px;
  color: #323233;
  margin-bottom: 4px;
}

.person-item-department {
  font-size: 12px;
  color: #1989fa;
  font-weight: 500;
}

.person-item-phone {
  font-size: 12px;
  color: #969799;
  margin-left: 8px;
  white-space: nowrap;
}

.no-person-result {
  padding: 20px;
  text-align: center;
  color: #969799;
  font-size: 14px;
}
</style>
