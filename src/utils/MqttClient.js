// src/utils/MqttClient.js
import mqtt from 'mqtt'

class MqttClient {
  constructor() {
    this.client = null
    this.connected = false
    this.messageCallback = null
  }

  // 在 connect() 方法中添加更多检查
  connect(userId, token) {
    if (!userId || !token) {
      console.error('MQTT连接失败: 缺少用户ID或token')
      return
    }

    // 添加详细日志
    console.log('=== MQTT connect() 开始 ===');
    console.log('当前连接状态:', this.connected);
    console.log('客户端实例:', this.client);

    // 防止重复连接
    if (this.client && this.connected) {
      console.log('MQTT已连接，无需重新连接');
      console.log('连接状态:', this.connected);
      console.log('客户端实例:', this.client);
      return;
    }

    const options = {
      username: userId,
      password: token,
    }

    console.log('正在建立连接...');
    this.client = mqtt.connect('wss://api-v2.sensor-smart.cn:29028/mqtt6', options)

    // 添加message事件监听器
    this.client.on('message', (topic, message) => {
      console.log('📩 收到MQTT消息:', {
        topic: topic,
        message: message.toString(),
        timestamp: new Date().toISOString()
      });

      if (this.messageCallback) {
        try {
          const parsedMessage = JSON.parse(message.toString());
          console.log('📋 解析后的消息对象:', parsedMessage);
          this.messageCallback(parsedMessage);
        } catch (error) {
          console.error('❌ 消息解析失败:', error, '原始消息:', message.toString());
        }
      } else {
        console.warn('⚠️ 消息回调未设置，收到消息但无法处理');
      }
    });

    this.client.on('connect', () => {
      console.log('MQTT连接成功')
      this.connected = true
      console.log('连接成功后状态:', this.connected)

      // 订阅个人消息主题
      const topic = `SensorRTU/talk/msg1/${userId}`
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error('❌ 订阅主题失败:', err)
        } else {
          console.log('✅ 成功订阅主题:', topic)
          console.log('📡 订阅详情:', {
            topic: topic,
            userId: userId,
            timestamp: new Date().toISOString()
          });
        }
      })
    })

    this.client.on('error', (error) => {
      console.error('❌ MQTT连接错误:', error)
      this.connected = false
      console.log('连接错误后状态:', this.connected)
    })

    this.client.on('close', () => {
      console.log('🔌 MQTT连接关闭')
      this.connected = false
      console.log('连接关闭后状态:', this.connected)
    })
  }

  onMessage(callback) {
    console.log('📞 设置消息回调函数');
    this.messageCallback = callback;

    // 立即测试回调是否可用
    if (typeof callback === 'function') {
      console.log('✅ 消息回调函数设置成功');
    } else {
      console.warn('⚠️ 消息回调函数设置异常，类型:', typeof callback);
    }
  }

  publish(topic, message) {
    if (!this.connected) {
      console.error('❌ MQTT未连接，无法发送消息')
      return
    }

    console.log('📤 发送MQTT消息:', {
      topic: topic,
      message: message,
      timestamp: new Date().toISOString()
    });

    this.client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ 发布消息失败:', err)
      } else {
        console.log('✅ 消息发布成功');
      }
    })
  }

  // MQTT 连接将只在需要时建立，并且在页面离开时正确清理，在组件挂载时建立连接，销毁时断开连接
  disconnect() {
    if (this.client && this.connected) {  // 添加状态检查
      console.log('正在结束MQTT连接...');

      // 添加断开标志，防止重复调用
      this.connected = false;
      try {
        const client = this.client;
        client.end(true);  // 强制立即关闭
        client.removeAllListeners();  // 移除所有监听器
      } catch (error) {
        // 忽略已关闭的错误
        console.log('连接已关闭或正在关闭中:', error.message);
      }

      this.client = null;
      console.log('客户端实例已置空');
    } else {
      console.log('客户端已断开或不存在，无需重复断开');
    }
  }

  // 在 MqttClient 类中添加状态监控方法
  getConnectStatus() {
    return {
      connected: this.connected,
      client: this.client,
      isConnected: this.client && this.connected
    };
  }
}

// 导出单例实例
export default new MqttClient()
