<template>
  <div v-if="isDingDingEnv">
    <h4>欢迎进入工作助手 ！</h4>
  </div>
  <div v-else>
    <p>请使用钉钉打开此应用</p>
  </div>
</template>

<script>
import { GetDingUserToken, getCurrentDepartmentAsync } from '../../utils/Dingding'

export default {
  name: 'LoginPage',
  metaInfo() {
    return {
      title: '登录'
    }
  },
  data() {
    return {
      code: '',
      isDingDingEnv: false
    }
  },
  mounted() {
    this.checkDingDingEnv()
  },
  methods: {
    checkDingDingEnv() {
      const userAgent = navigator.userAgent.toLowerCase()
      if (userAgent.includes('dingtalk')) {
        this.isDingDingEnv = true
        this.ddFun()
      } else {
        alert('请使用钉钉，打开小程序使用')
        this.isDingDingEnv = false
      }
    },
    ddFun() {
      const type = this.$route.params.type
      const department = this.$route.params.department
      console.log('获取到的 type 类型是：', type)
      // alert('获取到的 type 类型是：' + type)
      console.log('进入 GetDingUserToken 方法')
      // alert('进入 GetDingUserToken 方法')
        GetDingUserToken(department,
          (token) => {
            // 不需要重复设置 token，因为 setNewToken 已处理
            console.log('GetDingUserToken 方法获取到的 token 是1122：', token)
            let targetPath = `/${department}/index`
            if (type === 'task') {
              targetPath = `/${department}/taskList`
            } else if (type === 'share') {
              targetPath = `/${department}/cartList`
            }

            if (this.$route.path !== targetPath) {
              this.$router.push({ path: targetPath }).catch(err => {
                console.error('登录后跳转失败:', err)
              })
            }
          },
          (error) => {
            alert('获取用户令牌失败，请联系管理员:' + error)
            console.error('获取用户令牌失败:', error)
          }
        )
    }
  }
}
</script>
