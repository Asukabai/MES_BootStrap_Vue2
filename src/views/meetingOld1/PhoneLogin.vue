<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>身份认证</h1>
        <p>请输入手机号和验证码进入会议</p>
      </div>

      <div class="login-form">
        <div class="form-item">
          <label class="form-label">手机号</label>
          <input
            v-model="phoneNumber"
            type="tel"
            maxlength="11"
            placeholder="请输入手机号"
            class="form-input"
          />
        </div>

        <div class="form-item">
          <label class="form-label">验证码</label>
          <div class="code-input-group">
            <input
              v-model="verifyCode"
              type="text"
              maxlength="6"
              placeholder="请输入验证码"
              class="form-input"
            />
            <button
              @click="sendVerifyCode"
              :disabled="countdown > 0"
              class="send-code-btn"
            >
              {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
            </button>
          </div>
        </div>

        <button
          @click="handleLogin"
          :loading="loginLoading"
          class="login-btn"
        >
          {{ loginLoading ? '进入会议中...' : '进入会议' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import SensorRequest from '../../utils/SensorRequest.js';
import { setNewToken, key_DingName, key_DingUserIndex, key_DingUserPhone } from '../../utils/Dingding.js';

export default {
  name: 'PhoneLogin',
  data() {
    return {
      phoneNumber: '',
      verifyCode: '',
      countdown: 0,
      timer: null,
      loginLoading: false,
      department: '', // 默认部门
    };
  },
  created() {
    // 从路由参数或 localStorage 获取部门信息
    const department = this.$route.params.department
    if (department) {
      this.department = department;
    }
  },
  beforeDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  },
  methods: {
    // 发送验证码
    async sendVerifyCode() {
      if (!this.phoneNumber || this.phoneNumber.length !== 11) {
        this.$toast.fail('请输入正确的手机号');
        return;
      }

      try {
        const getCodeMethod = this.getCodeMethodName();
        const param = {
          Phone: this.phoneNumber
        };

        await new Promise((resolve, reject) => {
          SensorRequest.GetDDingCode(getCodeMethod, JSON.stringify(param),
            (respData) => {
              console.log('发送验证码成功:', respData);
              this.$toast.success('验证码已发送');
              this.startCountdown();
              resolve(respData);
            },
            (error) => {
              console.error('发送验证码失败:', error);
              this.$toast.fail('发送验证码失败：' + (error || '未知错误'));
              reject(error);
            }
          );
        });
      } catch (error) {
        console.error('发送验证码异常:', error);
      }
    },

    // 获取验证码方法名
    getCodeMethodName() {
      const codeMethods = {
        'xian': 'Ding_GetMFACode',
        'taiyuan': 'Dajun_GetMFACode'
      };
      return codeMethods[this.department] || 'Ding_GetMFACode';
    },

    // 开始倒计时
    startCountdown() {
      this.countdown = 60;
      if (this.timer) {
        clearInterval(this.timer);
      }
      this.timer = setInterval(() => {
        if (this.countdown > 0) {
          this.countdown--;
        } else {
          clearInterval(this.timer);
          this.timer = null;
        }
      }, 1000);
    },

    // 登录
    async handleLogin() {
      if (!this.phoneNumber || this.phoneNumber.length !== 11) {
        this.$toast.fail('请输入正确的手机号');
        return;
      }

      if (!this.verifyCode || this.verifyCode.length < 4) {
        this.$toast.fail('请输入验证码');
        return;
      }

      this.loginLoading = true;

      try {
        const param = {
          Phone: this.phoneNumber,
          Code: this.verifyCode
        };

        await new Promise((resolve, reject) => {
          SensorRequest.Ding_LoginByPhoneCode(JSON.stringify(param),
            (respData) => {
              console.log('登录成功，返回数据:', respData);

              try {
                // 解析后端返回的数据
                let responseData;
                if (typeof respData === 'string') {
                  responseData = JSON.parse(respData);
                } else {
                  responseData = respData;
                }

                // 提取 Token 和用户信息
                if (responseData.Token) {
                  // 保存 Token
                  setNewToken(responseData.Token);

                  // 保存用户信息到 localStorage
                  if (responseData.Name) {
                    localStorage.setItem(key_DingName, responseData.Name);
                  }
                  if (responseData.Phone) {
                    localStorage.setItem(key_DingUserPhone, responseData.Phone);
                  }
                  if (responseData.UserID || responseData.userIndex) {
                    localStorage.setItem(key_DingUserIndex, responseData.UserID || responseData.userIndex);
                  }

                  this.$toast.success('登录成功');

                  // 延迟跳转到会议页面
                  setTimeout(() => {
                    this.redirectToMeeting();
                  }, 1000);
                } else {
                  throw new Error('未获取到 Token');
                }

                resolve(respData);
              } catch (parseError) {
                console.error('解析响应数据失败:', parseError);
                this.$toast.fail('登录失败：数据解析错误');
                reject(parseError);
              }
            },
            (error) => {
              console.error('登录失败:', error);
              this.$toast.fail('登录失败：' + (error || '未知错误'));
              this.loginLoading = false;
              reject(error);
            }
          );
        });
      } catch (error) {
        console.error('登录异常:', error);
        this.loginLoading = false;
      }
    },

    // 跳转到会议页面
    redirectToMeeting() {
      // 获取原始会议 URL 参数
      const meetingUrl = this.$route.query.meetingUrl;
      const meetingName = this.$route.query.meetingName;

      if (meetingUrl) {
        // 重新加载会议页面，此时已有 token
        window.location.href = `/video-meeting?meetingUrl=${encodeURIComponent(meetingUrl)}&meetingName=${encodeURIComponent(meetingName || '')}`;
      } else {
        // 没有会议参数，返回首页或提示
        this.$toast.fail('缺少会议参数');
        setTimeout(() => {
          this.$router.push('/');
        }, 1500);
      }
    }
  },
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.login-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-card {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  padding: 40px 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}

.login-header p {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #667eea;
}

.code-input-group {
  display: flex;
  gap: 12px;
}

.code-input-group .form-input {
  flex: 1;
}

.send-code-btn {
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #667eea;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.send-code-btn:disabled {
  color: #999;
  cursor: not-allowed;
}

.send-code-btn:not(:disabled):hover {
  background: #e0e0e0;
}

.login-btn {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.login-btn:hover {
  transform: scale(1.02);
}

.login-btn:active {
  transform: scale(0.98);
}

@media (max-width: 768px) {
  .login-card {
    padding: 32px 24px;
  }
}
</style>
