// src/plugins/mqtt.js
import MqttService from '../services/MqttService'

export default {
  install(Vue, options) {
    // 将MQTT服务挂载到Vue原型
    Vue.prototype.$mqtt = MqttService

    // 添加全局混入
    Vue.mixin({
      data() {
        return {
          mqttConnected: false
        }
      },
      created() {
        // 组件创建时监听MQTT状态
        this.$mqtt.registerGlobalCallback((data) => {
          if (data.type === 'connected') {
            this.mqttConnected = true
          } else if (data.type === 'disconnected' || data.type === 'error') {
            this.mqttConnected = false
          }
        })
      },
      beforeDestroy() {
        // 组件销毁时自动注销回调
        if (this.$options.name === 'ChatDetail' && this.currentContact && this.currentContact.roomIndex) {
          this.$mqtt.unregisterCallback(this.currentContact.roomIndex)
        }
      }
    })

    // 添加全局方法
    Vue.prototype.$connectMQTT = async function(userId, token) {
      return await MqttService.init(userId, token)
    }

    Vue.prototype.$disconnectMQTT = function() {
      MqttService.disconnect()
    }
  }
}
