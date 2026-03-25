<template>
  <div class="video-meeting-container">
    <!-- 钉钉环境提示层 -->
    <div v-if="isInDingTalk" class="dingtalk-overlay">
      <div class="dingtalk-card">
        <div class="dingtalk-icon">⚠️</div>
        <h3>检测到当前在钉钉内打开</h3>
        <p>由于钉钉小程序不支持摄像头/麦克风权限，视频会议无法正常运行。</p>
        <p>请点击下方按钮，在系统浏览器中打开，即可正常加入会议。</p>
        <button @click="openInBrowser" class="open-browser-btn">
          在浏览器中打开
        </button>
        <button @click="copyLinkAndExit" class="copy-link-btn">
          复制链接并退出
        </button>
      </div>
    </div>

    <!-- 正常视频会议界面（仅在非钉钉环境显示） -->
    <div v-else>
      <div class="video-header">
        <h2>🎥 晟思视频会议 - 房间号：<span>{{ roomName }}</span></h2>
      </div>
      <div id="videoContainer" class="video-grid"></div>

      <!-- 控制栏 -->
      <div class="video-controls">
        <button @click="toggleCamera" :class="{ active: cameraEnabled }">
          📷 {{ cameraEnabled ? '摄像头开' : '摄像头关' }}
        </button>
        <button @click="toggleMicrophone" :class="{ active: microphoneEnabled }">
          🎤 {{ microphoneEnabled ? '麦克风开' : '麦克风关' }}
        </button>
        <button @click="shareScreen" :class="{ active: screenShareActive }">
          🖥️ {{ screenShareActive ? '停止共享' : '共享屏幕' }}
        </button>
      </div>
    </div>

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
      wsUrl: 'wss://api-v2.sensor-smart.cn:29028',
      mediaRequestInProgress: false,
      cameraEnabled: true,
      microphoneEnabled: true,
      screenShareActive: false,
      screenShareTrack: null,
      localCameraTrack: null,
      localMicrophoneTrack: null,
      isInDingTalk: false,
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
    this.checkDingTalkEnvironment();

    if (this.isInDingTalk) return;

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
    checkDingTalkEnvironment() {
      const ua = navigator.userAgent.toLowerCase();
      const isDingTalkUA = ua.includes('dingtalk');
      const hasDD = typeof window.dd !== 'undefined';
      this.isInDingTalk = isDingTalkUA || hasDD;
      if (this.isInDingTalk) {
        console.log('⚠️ 检测到钉钉环境，将引导用户跳转至浏览器');
      }
    },

    openInBrowser() {
      const currentUrl = window.location.href;
      if (window.dd && window.dd.biz && window.dd.biz.util && window.dd.biz.util.openLink) {
        window.dd.biz.util.openLink({
          url: currentUrl,
          onSuccess: () => console.log('跳转成功'),
          onFail: (err) => {
            console.error('钉钉跳转失败', err);
            this.fallbackOpenLink(currentUrl);
          }
        });
      } else {
        this.fallbackOpenLink(currentUrl);
      }
    },

    fallbackOpenLink(url) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          this.$toast.success('链接已复制，请打开浏览器访问');
        }).catch(() => {
          this.$toast.fail('复制失败，请手动复制链接');
        });
      } else {
        prompt('请复制以下链接到浏览器中打开', url);
      }
    },

    copyLinkAndExit() {
      const currentUrl = window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(currentUrl).then(() => {
          this.$toast.success('链接已复制，请打开浏览器访问');
          setTimeout(() => this.leaveRoom(), 1000);
        }).catch(() => {
          this.$toast.fail('复制失败，请手动复制');
        });
      } else {
        prompt('请复制以下链接到浏览器中打开', currentUrl);
        this.leaveRoom();
      }
    },

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

    checkMediaSupport() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        const isHttps = protocol === 'https:';
        const isSecure = window.isSecureContext;

        let errorMsg = '';
        if (!isHttps && !isLocalhost) {
          errorMsg = '当前页面不是 HTTPS 环境，且非 localhost，无法访问摄像头/麦克风。请使用 HTTPS 访问或在开发环境使用 localhost。';
        } else if (isHttps && !isSecure) {
          errorMsg = '页面虽然是 HTTPS，但由于混合内容（HTTP 资源）导致安全上下文无效，无法访问摄像头/麦克风。请确保所有资源均通过 HTTPS 加载。';
        } else {
          errorMsg = '浏览器不支持 getUserMedia API，请升级浏览器或检查权限设置。';
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
          videoCaptureDefaults: { resolution: VideoPresets.h540 },
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseCancellation: true,
            autoGainControl: true
          }
        });

        this.setupRoomEvents();

        await this.room.connect(this.wsUrl, token);
        console.log('✅ 成功加入房间:', this.room.name, '作为:', userName);
        this.roomName = this.room.name;

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
     * 等待指定来源的轨道发布
     * @param {string} source - Track.Source.Camera 或 Track.Source.Microphone
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise<TrackPublication>}
     */
    waitForTrack(source, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const check = () => {
          const publication = this.room.localParticipant.getTrackPublication(source);
          if (publication && publication.track) {
            resolve(publication);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error(`等待轨道 ${source} 超时`));
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    },

    /**
     * 启用本地媒体（摄像头和麦克风） - 使用官方 API
     */
    async enableMedia(userName) {
      if (this.mediaRequestInProgress) return;
      this.mediaRequestInProgress = true;

      try {
        // 启用摄像头和麦克风
        let cameraError = null;
        let micError = null;

        try {
          await this.room.localParticipant.setCameraEnabled(true);
        } catch (err) {
          cameraError = err;
          this.cameraEnabled = false;
        }

        try {
          await this.room.localParticipant.setMicrophoneEnabled(true);
        } catch (err) {
          micError = err;
          this.microphoneEnabled = false;
        }

        // 等待摄像头轨道发布，用于本地预览
        let cameraPublication = null;
        try {
          cameraPublication = await this.waitForTrack(Track.Source.Camera, 5000);
          if (cameraPublication && cameraPublication.track) {
            this.localCameraTrack = cameraPublication.track;
            // 使用 track.attach 创建视频元素
            this.createLocalVideoElementWithTrack(userName, this.localCameraTrack);
          }
        } catch (waitErr) {
          console.warn('等待摄像头轨道超时', waitErr);
        }

        // 获取麦克风轨道（仅保存引用，不用于控制）
        try {
          const micPublication = await this.waitForTrack(Track.Source.Microphone, 5000);
          if (micPublication && micPublication.track) {
            this.localMicrophoneTrack = micPublication.track;
          }
        } catch (waitErr) {
          console.warn('等待麦克风轨道超时', waitErr);
        }

        if (!cameraPublication || !cameraPublication.track) {
          console.warn('无法获取摄像头轨道，显示占位符');
          this.createLocalPlaceholder(userName);
        }

        // 显示错误提示（若有）
        if (cameraError) {
          this.$toast.fail('摄像头开启失败：' + (cameraError.message || '未知错误'));
        }
        if (micError) {
          this.$toast.fail('麦克风开启失败：' + (micError.message || '未知错误'));
        }

        console.log('✅ 本地媒体启用完成', { cameraEnabled: this.cameraEnabled, microphoneEnabled: this.microphoneEnabled });
      } catch (error) {
        console.error('❌ 启用媒体失败:', error);
        this.$toast.fail('无法访问摄像头/麦克风，请检查权限');
        throw error;
      } finally {
        this.mediaRequestInProgress = false;
      }
    },

    /**
     * 使用轨道直接创建本地视频元素
     */
    createLocalVideoElementWithTrack(userName, videoTrack) {
      const container = document.getElementById('videoContainer');
      if (!container) return;

      if (document.querySelector('.video-item[data-is-local="true"]')) return;

      const videoEl = document.createElement('video');
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = true;
      // 使用 track.attach 将视频流绑定到 video 元素
      videoTrack.attach(videoEl);

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

    async toggleCamera() {
      if (!this.room || !this.room.localParticipant) {
        this.$toast.fail('未连接房间');
        return;
      }
      const newEnabled = !this.cameraEnabled;
      try {
        await this.room.localParticipant.setCameraEnabled(newEnabled);
        this.cameraEnabled = newEnabled;
        console.log(`摄像头已${newEnabled ? '开启' : '关闭'}`);
      } catch (err) {
        console.error('切换摄像头失败', err);
        this.$toast.fail('切换摄像头失败: ' + (err.message || '未知错误'));
      }
    },

    async toggleMicrophone() {
      if (!this.room || !this.room.localParticipant) {
        this.$toast.fail('未连接房间');
        return;
      }
      const newEnabled = !this.microphoneEnabled;
      try {
        await this.room.localParticipant.setMicrophoneEnabled(newEnabled);
        this.microphoneEnabled = newEnabled;
        console.log(`麦克风已${newEnabled ? '开启' : '关闭'}`);
      } catch (err) {
        console.error('切换麦克风失败', err);
        this.$toast.fail('切换麦克风失败: ' + (err.message || '未知错误'));
      }
    },

    async shareScreen() {
      if (!this.room || !this.room.localParticipant) {
        this.$toast.fail('未连接房间');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        this.$toast.fail('当前浏览器不支持屏幕共享，请使用 Chrome/Edge 等支持屏幕共享的浏览器，并确保在 HTTPS 环境下');
        return;
      }

      if (this.screenShareActive) {
        await this.stopScreenShare();
        return;
      }

      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        if (!screenVideoTrack) throw new Error('无法获取屏幕视频轨道');

        screenVideoTrack.onended = () => {
          console.log('用户通过浏览器停止了屏幕共享');
          this.stopScreenShare();
        };

        const localScreenTrack = new Track.LocalVideoTrack(screenVideoTrack, {
          name: 'screen',
          source: Track.Source.ScreenShare,
        });

        await this.room.localParticipant.publishTrack(localScreenTrack);
        this.screenShareTrack = localScreenTrack;
        this.screenShareActive = true;
        this.createLocalScreenShareElement(screenStream);
        console.log('✅ 屏幕共享已开始');
        this.$toast.success('屏幕共享已开始');
      } catch (error) {
        console.error('屏幕共享失败:', error);
        if (error.name === 'NotAllowedError') {
          this.$toast.fail('用户拒绝了屏幕共享权限');
        } else if (error.name === 'NotFoundError') {
          this.$toast.fail('未找到可共享的屏幕或窗口');
        } else {
          this.$toast.fail('屏幕共享失败: ' + error.message);
        }
      }
    },

    async stopScreenShare() {
      if (!this.screenShareTrack) return;
      try {
        await this.room.localParticipant.unpublishTrack(this.screenShareTrack);
        this.screenShareTrack.stop();
        const screenElement = document.querySelector('.video-item[data-is-screen-share="true"]');
        if (screenElement) screenElement.remove();
        this.screenShareTrack = null;
        this.screenShareActive = false;
        console.log('✅ 屏幕共享已停止');
        this.$toast.success('屏幕共享已停止');
      } catch (err) {
        console.error('停止屏幕共享失败:', err);
        this.$toast.fail('停止屏幕共享失败');
      }
    },

    createLocalScreenShareElement(mediaStream) {
      const container = document.getElementById('videoContainer');
      if (!container) return;
      if (document.querySelector('.video-item[data-is-screen-share="true"]')) return;

      const videoEl = document.createElement('video');
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = true;
      videoEl.srcObject = mediaStream;
      videoEl.onloadedmetadata = () => videoEl.play().catch(e => console.warn('自动播放失败', e));

      const itemDiv = document.createElement('div');
      itemDiv.className = 'video-item';
      itemDiv.setAttribute('data-is-screen-share', 'true');
      itemDiv.setAttribute('data-track-sid', 'screen-share');

      const label = document.createElement('p');
      label.textContent = '你的屏幕共享';

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

    createLocalPlaceholder(userName) {
      const container = document.getElementById('videoContainer');
      if (!container) return;
      if (document.querySelector('.video-item[data-is-local="true"]')) return;

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
          itemDiv.remove();
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
      if (this.localCameraTrack) this.localCameraTrack = null;
      if (this.localMicrophoneTrack) this.localMicrophoneTrack = null;
      if (this.screenShareActive) this.stopScreenShare();
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

.video-controls {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 15px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  padding: 10px 20px;
  border-radius: 50px;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.video-controls button {
  background: #fff;
  border: none;
  border-radius: 40px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #333;
}

.video-controls button.active {
  background: #667eea;
  color: white;
}

.video-controls button:active {
  transform: scale(0.95);
}

.dingtalk-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dingtalk-card {
  background: white;
  border-radius: 16px;
  width: 85%;
  max-width: 320px;
  padding: 24px 20px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dingtalk-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.dingtalk-card h3 {
  font-size: 20px;
  margin: 0 0 12px 0;
  color: #333;
}

.dingtalk-card p {
  font-size: 14px;
  color: #666;
  margin: 8px 0;
  line-height: 1.5;
}

.open-browser-btn, .copy-link-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 12px;
}

.open-browser-btn {
  background: #667eea;
  color: white;
}

.copy-link-btn {
  background: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
}

@media (max-width: 768px) {
  .video-controls button {
    padding: 6px 12px;
    font-size: 12px;
  }
  .video-controls {
    gap: 10px;
    padding: 8px 16px;
  }
}

@media (max-width: 480px) {
  .video-controls button {
    padding: 5px 10px;
    font-size: 10px;
  }
  .video-controls {
    gap: 8px;
    bottom: 15px;
  }
}

@media (max-height: 500px) and (orientation: landscape) {
  .video-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
  .video-item video {
    aspect-ratio: 16/9;
  }
  .video-controls {
    bottom: 10px;
  }
}
</style>
