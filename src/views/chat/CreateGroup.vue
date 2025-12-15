<template>
  <div class="create-group-page">
    <!-- 群聊名称输入 -->
    <van-field
      v-model="groupName"
      placeholder="请输入群聊名称"
      label="群聊名称"
      class="group-name-input"
    />

    <van-search
      v-model="searchValue"
      placeholder="搜索联系人"
      shape="round"
      class="search-input"
    />

    <div class="selected-users" v-if="selectedUsers.length > 0">
      <div class="selected-title">已选择 ({{ selectedUsers.length }})：</div>
      <div class="selected-list">
        <van-tag
          v-for="user in selectedUsers"
          :key="user.id"
          type="primary"
          size="medium"
          closeable
          @close="deselectUser(user.id)"
          class="user-tag"
        >
          {{ user.name }}
        </van-tag>
      </div>
    </div>

    <van-checkbox-group v-model="selectedUserIds" class="user-list">
      <van-cell
        v-for="user in filteredUsers"
        :key="user.id"
        clickable
        @click="toggleUserSelection(user)"
      >
        <template #title>
          <div class="user-item">
            <van-image
              :src="user.avatar || require('@/assets/头像.png')"
              round
              width="40px"
              height="40px"
              class="user-avatar"
            />
            <div class="user-info">
              <div class="user-name">{{ user.name }}</div>
              <div class="user-phone">{{ user.phone || '未知联系方式' }}</div>
            </div>
          </div>
        </template>
        <template #right-icon>
          <van-checkbox :name="user.id" />
        </template>
      </van-cell>
    </van-checkbox-group>

    <div class="footer">
      <van-button
        type="info"
        round
        block
        :disabled="selectedUsers.length === 0 || !groupName.trim()"
        @click="createGroup"
      >
        创建群聊 ({{ selectedUsers.length }})
      </van-button>
    </div>
  </div>
</template>

<script>
import { Toast } from 'vant';
import SensorRequest from '../../utils/SensorRequest';

export default {
  name: 'CreateGroup',
  data() {
    return {
      groupName: '', // 群聊名称
      searchValue: '',
      allUsers: [],
      selectedUserIds: [],
      loading: false
    };
  },
  computed: {
    selectedUsers() {
      return this.allUsers.filter(user => this.selectedUserIds.includes(user.id));
    },
    filteredUsers() {
      if (!this.searchValue) {
        return this.allUsers;
      }
      const searchLower = this.searchValue.toLowerCase();
      return this.allUsers.filter(user =>
        user.name.toLowerCase().includes(searchLower) ||
        (user.phone && user.phone.toLowerCase().includes(searchLower))
      );
    }
  },
  mounted() {
    this.loadUsers();
  },
  methods: {
    loadUsers() {
      this.loading = true;

      SensorRequest.Talk_GetUserList(
        JSON.stringify({}),
        (response) => {
          try {
            const respData = JSON.parse(response) || [];
            console.log("👥 获取到的用户列表:", respData);

            // 根据实际返回的数据结构调整映射逻辑
            if (Array.isArray(respData)) {
              this.allUsers = respData.map(user => ({
                id: user.id || user.userId,
                userIndex: user.userIndex,
                name: user.name || user.userName || '未知用户',
                avatar: user.avatar || user.png || null,
                phone: user.phone || null
              }));
            } else {
              console.warn('返回用户数据格式不符合预期:', respData);
              this.allUsers = [];
            }
          } catch (error) {
            console.error('解析用户列表数据时出错:', error);
            Toast.fail('数据解析失败');
            this.allUsers = [];
          }

          this.loading = false;
        },
        (error) => {
          console.error('获取用户列表失败:', error);
          Toast.fail('获取联系人失败');
          this.allUsers = [];
          this.loading = false;
        }
      );
    },
    toggleUserSelection(user) {
      const index = this.selectedUserIds.indexOf(user.id);
      if (index > -1) {
        this.selectedUserIds.splice(index, 1);
      } else {
        this.selectedUserIds.push(user.id);
      }
    },
    deselectUser(userId) {
      const index = this.selectedUserIds.indexOf(userId);
      if (index > -1) {
        this.selectedUserIds.splice(index, 1);
      }
    },
    createGroup() {
      if (!this.groupName.trim()) {
        Toast.fail('请输入群聊名称');
        return;
      }

      if (this.selectedUsers.length < 2) {
        Toast.fail('请选择至少两个成员');
        return;
      }

      const loadingToast = Toast.loading({
        message: '创建中...',
        forbidClick: true,
        duration: 0
      });

      // 准备创建房间的参数，使用正确的结构体
      const roomParams = {
        roomID: "", // 待定
        roomCaption: this.groupName, // 使用用户输入的群聊名称
        roomUsers: this.selectedUsers.map(user => user.userIndex),
        desc1: "",
        desc2: "",
        desc3: "",
        announcement: "",
        extra1: "",
        extra2: "",
        extra3: ""
      };

      SensorRequest.Talk_CreateRoom(
        JSON.stringify(roomParams),
        (response) => {
          loadingToast.clear();
          try {
            const respData = JSON.parse(response) || {};
            console.log("🏠 创建房间返回数据:", respData);

            Toast.success('创建成功');

            // 延迟1秒后返回上一页
            setTimeout(() => {
              this.$router.go(-1);
            }, 1000);
          } catch (error) {
            console.error('创建房间响应解析失败:', error);
            Toast.fail('创建失败');
          }
        },
        (error) => {
          loadingToast.clear();
          console.error('创建房间失败:', error);
          Toast.fail('创建失败');
        }
      );
    },
    goBack() {
      this.$router.go(-1);
    }
  }
};
</script>

<style scoped>
.create-group-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f7f8fa;
}

.group-name-input {
  padding: 12px;
  background-color: #fff;
}

.search-input {
  padding: 12px;
}

.selected-users {
  padding: 12px 16px;
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.selected-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.user-tag {
  border-radius: 16px;
}

.user-list {
  flex: 1;
  overflow-y: auto;
}

.user-item {
  display: flex;
  align-items: center;
}

.user-avatar {
  margin-right: 12px;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.user-phone {
  font-size: 12px;
  color: #999;
}

.footer {
  padding: 16px;
  background-color: #fff;
  border-top: 1px solid #f0f0f0;
}
</style>
