<template>
  <div class="video-meeting-container">
    <div class="video-header">
      <h2>🎥 晟思视频会议 - 房间号：<span>{{ roomName }}</span></h2>
    </div>
    <div id="videoContainer" class="video-grid"></div>

    <CustomizableFloatingButton
      :initial-position="{ bottom: 70, right: 20 }"
      :icon-src="require('@/assets/返回.png')"
      :background-size="49"
      :icon-size="49"
      :on-click="leaveRoom"
    />
  </div>
</template>

<script>
import CustomizableFloatingButton from "../../components/CustomizableFloatingButton.vue";
import { Room, RoomEvent, Track, VideoPresets } from 'livekit-client';

export default {
  name: 'VideoMeeting',
  components: {
    CustomizableFloatingButton
  },
  data() {
    return {
      meetingUrl: '',
      roomName: '未连接',
      room: null,
      // ✅ 修正 WebSocket 地址：去掉 /livechat，让 LiveKit 客户端自动拼接 /rtc/v1
      wsUrl: 'wss://api-v2.sensor-smart.cn:29028/',
      mediaRequestInProgress: false,   // 防止重复请求
    };
  },
  created() {
    this.meetingUrl = decodeURIComponent(this.$route.query.meetingUrl || '');
    this.roomName = decodeURIComponent(this.$route.query.meetingName || '未命名会议');
    document.title = this.roomName;

    console.log('=== 视频会议页面初始化 ===');
    console.log('会议 URL:', this.meetingUrl);
    console.log('会议名称:', this.roomName);
    console.log('当前协议:', window.location.protocol);
    console.log('安全上下文:', window.isSecureContext);
    console.log('是否支持 mediaDevices:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
  },
  mounted() {
    if (this.meetingUrl) {
      this.parseAndJoinRoom();
    } else {
      this.$toast.fail('缺少会议链接参数');
      setTimeout(() => {
        this.leaveRoom();
      }, 1500);
    }
  },
  beforeDestroy() {
    this.disconnectRoom();
    document.title = '工作助手';
  },
  methods: {
    navigateTo(path) {
      const department = this.$route.params.department;
      if (department) {
        this.$router.push('/' + department + path);
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
    },

    leaveRoom() {
      this.disconnectRoom();
      this.navigateTo('/meetingManagement');
    },

    parseAndJoinRoom() {
      try {
        const url = new URL(this.meetingUrl);
        const params = new URLSearchParams(url.search);
        const dataParam = params.get('data');

        if (!dataParam) {
          console.error('❌ 缺少 data 参数');
          this.$toast.fail('会议链接格式错误');
          return;
        }

        const decodedData = JSON.parse(decodeURIComponent(dataParam));
        const token = decodedData.token;
        const room = decodedData.room;
        const user = decodedData.user || '参会者';

        console.log('✅ 解析成功:', {
          token: token.substring(0, 20) + '...',
          room: room,
          user: user
        });

        this.joinRoom(room, user, token);
      } catch (error) {
        console.error('❌ 解析会议链接失败:', error);
        this.$toast.fail('会议链接解析失败');
      }
    },

    /**
     * 增强版媒体支持检测，提供详细错误信息
     */
    checkMediaSupport() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isSecure = window.isSecureContext;
        let errorMsg = '';
        if (!isSecure) {
          errorMsg = '当前页面不是 HTTPS 环境（或非 localhost），无法访问摄像头/麦克风';
        } else {
          errorMsg = '浏览器不支持 getUserMedia API，请升级浏览器';
        }
        console.warn('⚠️', errorMsg);
        this.$toast.fail(errorMsg);
        return false;
      }
      return true;
    },

    async joinRoom(roomName, userName, token) {
      if (!roomName || !userName || !token) {
        console.error('❌ 缺少必要参数');
        this.$toast.fail('会议参数不完整');
        return;
      }

      console.log(`⏳ 正在连接房间 "${roomName}" 作为 "${userName}"...`);

      const loadingToast = this.$toast.loading({
        message: '正在加入会议室...',
        forbidClick: true,
        duration: 0
      });

      try {
        this.room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: VideoPresets.h540,
          },
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseCancellation: true,
            autoGainControl: true
          }
        });

        this.setupRoomEvents();

        // 连接房间
        await this.room.connect(this.wsUrl, token);
        console.log('✅ 成功加入房间:', this.room.name, '作为:', userName);
        this.roomName = this.room.name;

        // 检查媒体支持
        const mediaSupported = this.checkMediaSupport();

        if (mediaSupported) {
          try {
            await this.enableMedia(userName);
            loadingToast.close();
            this.$toast.success('已进入会议室');
          } catch (mediaError) {
            console.error('媒体初始化失败，降级为观看模式', mediaError);
            loadingToast.close();
            this.$toast.fail('摄像头/麦克风不可用，仅能观看');
            this.createLocalPlaceholder(userName);
          }
        } else {
          loadingToast.close();
          this.$toast.fail('摄像头/麦克风不可用，仅能观看');
          this.createLocalPlaceholder(userName);
        }
      } catch (error) {
        console.error('❌ 连接失败:', error);
        loadingToast.close();

        if (error.message && error.message.includes('getUserMedia')) {
          this.$toast.fail('无法访问摄像头/麦克风，请检查浏览器权限设置');
          this.createLocalPlaceholder(userName);
        } else {
          this.$toast.fail('连接会议室失败：' + error.message);
          this.disconnectRoom();
        }
      }
    },

    /**
     * 获取本地媒体并发布到房间，同时显示本地视频
     */
    async enableMedia(userName) {
      if (this.mediaRequestInProgress) return;
      this.mediaRequestInProgress = true;

      try {
        // 请求音视频权限
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        // 发布视频轨道
        const videoTrack = mediaStream.getVideoTracks()[0];
        if (videoTrack) {
          const localVideoTrack = new Track.LocalVideoTrack(videoTrack, {
            name: 'camera',
            source: Track.Source.Camera
          });
          await this.room.localParticipant.publishTrack(localVideoTrack, {
            videoEncoding: { maxBitrate: 1500000 }
          });
        }

        // 发布音频轨道
        const audioTrack = mediaStream.getAudioTracks()[0];
        if (audioTrack) {
          const localAudioTrack = new Track.LocalAudioTrack(audioTrack, {
            name: 'microphone',
            source: Track.Source.Microphone
          });
          await this.room.localParticipant.publishTrack(localAudioTrack);
        }

        console.log('✅ 本地音视频已发布');

        // 显示本地视频画面
        this.createLocalVideoElement(userName, mediaStream);
      } catch (error) {
        console.error('❌ 获取/发布本地媒体失败:', error);
        let errorMsg = '';
        if (error.name === 'NotAllowedError') {
          errorMsg = '用户拒绝了摄像头/麦克风权限，请手动授权后刷新页面';
        } else if (error.name === 'NotFoundError') {
          errorMsg = '未检测到摄像头或麦克风设备';
        } else {
          errorMsg = '无法访问摄像头/麦克风：' + error.message;
        }
        this.$toast.fail(errorMsg);
        throw error;
      } finally {
        this.mediaRequestInProgress = false;
      }
    },

    /**
     * 创建本地视频元素并附加到容器
     */
    createLocalVideoElement(userName, mediaStream) {
      const container = document.getElementById('videoContainer');
      if (!container) return;

      // 避免重复创建
      if (document.querySelector('.video-item[data-is-local="true"]')) {
        return;
      }

      const videoEl = document.createElement('video');
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = true; // 避免本地回声
      videoEl.srcObject = mediaStream;
      videoEl.onloadedmetadata = () => videoEl.play().catch(e => console.warn('自动播放失败', e));

      const itemDiv = document.createElement('div');
      itemDiv.className = 'video-item';
      itemDiv.setAttribute('data-is-local', 'true');
      itemDiv.setAttribute('data-track-sid', 'local');

      const label = document.createElement('p');
      label.textContent = `${userName} (你)`;

      itemDiv.appendChild(videoEl);
      itemDiv.appendChild(label);
      container.prepend(itemDiv);
    },

    setupRoomEvents() {
      const self = this;

      this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('📺 订阅轨道:', participant.identity, track.kind);

        if (track.kind === Track.Kind.Video) {
          const videoEl = document.createElement('video');
          videoEl.autoplay = true;
          videoEl.playsInline = true;
          track.attach(videoEl);

          const container = document.createElement('div');
          container.className = 'video-item';
          container.dataset.trackSid = track.sid;

          const label = document.createElement('p');
          label.textContent = participant.identity;

          container.appendChild(label);
          container.appendChild(videoEl);
          document.getElementById('videoContainer').appendChild(container);
        } else if (track.kind === Track.Kind.Audio) {
          track.attach();
        }
      });

      this.room.on(RoomEvent.TrackUnsubscribed, (track) => {
        const el = document.querySelector(`.video-item[data-track-sid="${track.sid}"]`);
        if (el) el.remove();
        track.detach();
      });

      this.room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('✅ 参与者加入:', participant.identity);
      });

      this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('❌ 参与者离开:', participant.identity);
      });

      this.room.on(RoomEvent.Disconnected, () => {
        console.log('👋 房间已断开');
        document.getElementById('videoContainer').innerHTML = '';
        self.roomName = '未连接';
      });
    },

    /**
     * 创建本地占位符，并提供重试按钮
     */
    createLocalPlaceholder(userName) {
      const container = document.getElementById('videoContainer');
      if (!container) return;

      // 避免重复创建
      if (document.querySelector('.video-item[data-is-local="true"]')) {
        return;
      }

      const itemDiv = document.createElement('div');
      itemDiv.className = 'video-item placeholder';
      itemDiv.setAttribute('data-is-local', 'true');
      itemDiv.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      itemDiv.style.display = 'flex';
      itemDiv.style.flexDirection = 'column';
      itemDiv.style.alignItems = 'center';
      itemDiv.style.justifyContent = 'center';

      const icon = document.createElement('div');
      icon.innerHTML = '🎥';
      icon.style.fontSize = '48px';
      icon.style.marginBottom = '12px';

      const label = document.createElement('p');
      label.textContent = `${userName} (你)`;
      label.style.background = 'transparent';
      label.style.position = 'static';
      label.style.margin = '0 0 12px 0';

      const retryBtn = document.createElement('button');
      retryBtn.textContent = '开启摄像头/麦克风';
      retryBtn.style.padding = '8px 16px';
      retryBtn.style.border = 'none';
      retryBtn.style.borderRadius = '20px';
      retryBtn.style.backgroundColor = '#fff';
      retryBtn.style.color = '#667eea';
      retryBtn.style.cursor = 'pointer';
      retryBtn.style.fontSize = '14px';
      retryBtn.onclick = async (e) => {
        e.stopPropagation();
        if (!this.checkMediaSupport()) return;
        try {
          await this.enableMedia(userName);
          itemDiv.remove(); // 移除占位符
        } catch (err) {
          // 错误已在 enableMedia 中提示
        }
      };

      itemDiv.appendChild(icon);
      itemDiv.appendChild(label);
      itemDiv.appendChild(retryBtn);
      container.prepend(itemDiv);

      console.log('✅ 已创建本地占位符（带重试按钮）');
    },

    disconnectRoom() {
      if (this.room) {
        this.room.disconnect();
        this.room = null;
        console.log('房间已断开连接');
      }
    }
  }
};
</script>

<style scoped>
/* 样式保持不变，确保原有布局 */
.video-meeting-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  overflow-y: auto;
  padding-bottom: 80px;
}

.video-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.video-header h2 {
  font-size: 18px;
  margin: 0;
  text-align: center;
  font-weight: bold;
}

.video-header span {
  color: #fff;
  font-weight: bold;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  padding: 15px;
  width: 100%;
}

.video-item {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  min-height: 200px;
}

.video-item video {
  width: 100%;
  height: auto;
  display: block;
  background: #1e1e1e;
  aspect-ratio: 16/9;
  object-fit: cover;
}

.video-item p {
  margin: 0;
  padding: 8px 12px;
  font-size: 14px;
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}

/* 占位符样式调整 */
.video-item.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.video-item.placeholder p {
  position: static;
  background: transparent;
  color: white;
}

@media (max-width: 768px) {
  .video-header h2 {
    font-size: 16px;
  }

  .video-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 10px;
  }

  .video-item {
    border-radius: 8px;
  }

  .video-item video {
    aspect-ratio: 16/9;
  }

  .video-item p {
    font-size: 12px;
    padding: 6px 10px;
  }
}

@media (max-width: 480px) {
  .video-header h2 {
    font-size: 14px;
  }

  .video-grid {
    gap: 8px;
  }

  .video-item p {
    font-size: 11px;
    padding: 5px 8px;
  }
}

@media (max-height: 500px) and (orientation: landscape) {
  .video-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .video-item video {
    aspect-ratio: 16/9;
  }
}
</style>
