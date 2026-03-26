<template>
  <div class="video-meeting-container" :class="{ 'screen-sharing-mode': screenShareActive }">
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

      <!-- 视频容器：普通模式为网格，共享模式为全屏展示区 -->
      <div id="videoContainer" class="video-container" :class="{ 'grid-mode': !screenShareActive, 'fullscreen-mode': screenShareActive }"></div>

      <!-- 画廊容器：共享模式下显示其他参与者视频 -->
      <div v-if="screenShareActive" id="galleryContainer" class="gallery-container">
        <div class="gallery-title">参会者 ({{ galleryParticipantsCount }})</div>
        <div class="gallery-scroll"></div>
      </div>

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
  </div>
</template>

<script>
import { Room, RoomEvent, Track, VideoPresets, LocalVideoTrack } from 'livekit-client';

export default {
  name: 'VideoMeeting',
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
      screenStream: null, // 保存屏幕流，用于停止时释放
      localCameraTrack: null,
      localMicrophoneTrack: null,
      isInDingTalk: false,
      // 共享模式相关
      screenShareVideoElement: null,
      floatingCameraContainer: null,
      isDragging: false,
      isResizing: false,
      dragStartX: 0,
      dragStartY: 0,
      resizeStartX: 0,
      resizeStartY: 0,
      resizeStartWidth: 0,
      resizeStartHeight: 0,
      floatingInitialized: false,
      galleryParticipantsCount: 0,
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

    async enableMedia(userName) {
      if (this.mediaRequestInProgress) return;
      this.mediaRequestInProgress = true;

      try {
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

        let cameraPublication = null;
        try {
          cameraPublication = await this.waitForTrack(Track.Source.Camera, 5000);
          if (cameraPublication && cameraPublication.track) {
            this.localCameraTrack = cameraPublication.track;
            this.createLocalVideoElementWithTrack(userName, this.localCameraTrack);
          }
        } catch (waitErr) {
          console.warn('等待摄像头轨道超时', waitErr);
        }

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

    createLocalVideoElementWithTrack(userName, videoTrack) {
      const container = document.getElementById('videoContainer');
      if (!container) return;

      if (document.querySelector('.video-item[data-is-local="true"]')) return;

      const videoEl = document.createElement('video');
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = true;
      videoTrack.attach(videoEl);

      const itemDiv = document.createElement('div');
      itemDiv.className = 'video-item';
      itemDiv.setAttribute('data-is-local', 'true');
      itemDiv.setAttribute('data-track-sid', 'local');
      itemDiv.setAttribute('data-participant-name', userName);

      const label = document.createElement('p');
      label.textContent = `${userName} (你)`;

      itemDiv.appendChild(videoEl);
      itemDiv.appendChild(label);
      container.appendChild(itemDiv);

      // 如果当前是共享模式，需要将新创建的本地摄像头移动到浮动窗口
      if (this.screenShareActive && !this.floatingInitialized) {
        this.$nextTick(() => {
          this.enterScreenShareMode();
        });
      }
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

        // 保存屏幕流引用，以便停止时关闭
        this.screenStream = screenStream;

        screenVideoTrack.onended = () => {
          console.log('用户通过浏览器停止了屏幕共享');
          this.stopScreenShare();
        };

        // 先创建本地预览元素（确保在发布轨道前存在）
        this.createLocalScreenShareElement(screenStream);

        const localScreenTrack = new LocalVideoTrack(screenVideoTrack, {
          name: 'screen',
          source: Track.Source.ScreenShare,
        });

        await this.room.localParticipant.publishTrack(localScreenTrack);
        this.screenShareTrack = localScreenTrack;
        this.screenShareActive = true;

        // 进入共享模式（此时屏幕共享元素已存在）
        this.$nextTick(() => {
          this.enterScreenShareMode();
        });

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
        // 先停止轨道
        await this.room.localParticipant.unpublishTrack(this.screenShareTrack);
        this.screenShareTrack.stop();
        this.screenShareTrack = null;

        // 停止屏幕流的所有轨道
        if (this.screenStream) {
          this.screenStream.getTracks().forEach(track => track.stop());
          this.screenStream = null;
        }

        // 移除屏幕共享预览元素
        const screenElement = document.querySelector('.video-item[data-is-screen-share="true"]');
        if (screenElement) screenElement.remove();
        this.screenShareVideoElement = null;

        this.screenShareActive = false;

        // 退出共享模式
        this.exitScreenShareMode();

        console.log('✅ 屏幕共享已停止');
        this.$toast.success('屏幕共享已停止');
      } catch (err) {
        console.error('停止屏幕共享失败:', err);
        this.$toast.fail('停止屏幕共享失败');
      }
    },

    // 进入屏幕共享模式：屏幕共享全屏，本地摄像头浮动可调，其他参与者进入画廊
    enterScreenShareMode() {
      const container = document.getElementById('videoContainer');
      if (!container) return;

      // 获取屏幕共享视频元素
      const screenShareItem = document.querySelector('.video-item[data-is-screen-share="true"]');
      if (!screenShareItem) {
        console.warn('未找到屏幕共享视频元素');
        return;
      }

      // 保存屏幕共享元素引用
      this.screenShareVideoElement = screenShareItem;

      // 获取本地摄像头元素（可能尚未创建，需等待）
      let localCameraItem = document.querySelector('.video-item[data-is-local="true"]');

      // 获取所有其他参与者视频元素（非屏幕共享、非本地摄像头）
      const otherParticipants = document.querySelectorAll('.video-item:not([data-is-screen-share="true"]):not([data-is-local="true"])');

      // 清空容器，准备重新布局
      const videoContainer = document.getElementById('videoContainer');
      videoContainer.innerHTML = '';

      // 1. 将屏幕共享视频添加到全屏容器
      videoContainer.appendChild(screenShareItem);
      screenShareItem.classList.add('fullscreen-video');
      screenShareItem.style.position = 'absolute';
      screenShareItem.style.top = '0';
      screenShareItem.style.left = '0';
      screenShareItem.style.width = '100%';
      screenShareItem.style.height = '100%';
      screenShareItem.style.zIndex = '1';

      // 调整屏幕共享视频内的视频元素样式
      const screenVideo = screenShareItem.querySelector('video');
      if (screenVideo) {
        screenVideo.style.width = '100%';
        screenVideo.style.height = '100%';
        screenVideo.style.objectFit = 'contain';
      }

      // 2. 处理本地摄像头：如果存在则创建浮动窗口，否则尝试创建占位符并稍后创建浮动窗口
      const createFloating = () => {
        const currentLocalItem = document.querySelector('.video-item[data-is-local="true"]');
        if (currentLocalItem && !this.floatingCameraContainer) {
          this.createFloatingCamera(currentLocalItem);
        } else if (!currentLocalItem && !this.floatingCameraContainer) {
          // 如果没有本地摄像头，创建一个占位符并重试
          const userName = (this.room && this.room.localParticipant && this.room.localParticipant.identity) || '我';
          this.createLocalPlaceholder(userName);
          this.$nextTick(() => {
            const newLocalItem = document.querySelector('.video-item[data-is-local="true"]');
            if (newLocalItem && !this.floatingCameraContainer) {
              this.createFloatingCamera(newLocalItem);
            }
          });
        }
      };

      if (localCameraItem && !this.floatingCameraContainer) {
        this.createFloatingCamera(localCameraItem);
      } else if (!localCameraItem && !this.floatingCameraContainer) {
        createFloating();
      }

      // 3. 将其他参与者移到画廊
      this.updateGallery(otherParticipants);

      // 更新画廊计数
      this.galleryParticipantsCount = otherParticipants.length;
    },

    // 创建浮动摄像头窗口
    // 创建浮动摄像头窗口
    createFloatingCamera(cameraElement) {
      if (this.floatingCameraContainer) return;

      // 创建浮动容器
      const floatingDiv = document.createElement('div');
      floatingDiv.className = 'floating-camera';
      floatingDiv.setAttribute('data-floating', 'true');

      // 创建拖拽手柄
      const dragHandle = document.createElement('div');
      dragHandle.className = 'floating-drag-handle';
      dragHandle.innerHTML = '📷 我的摄像头 <span class="resize-hint">(拖动移动)</span>';

      // 创建缩放手柄
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'floating-resize-handle';
      resizeHandle.innerHTML = '↘';

      // 创建内容区域
      const contentDiv = document.createElement('div');
      contentDiv.className = 'floating-content';

      // 【关键修改】直接移动原 video 元素，而不是克隆
      const videoElement = cameraElement.querySelector('video');
      const label = cameraElement.querySelector('p');

      if (videoElement) {
        // 移动 video 元素到 contentDiv
        contentDiv.appendChild(videoElement);
        // 重新应用样式（确保在浮动窗口内正确显示）
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        // 确保视频继续播放
        if (videoElement.paused) videoElement.play();
      } else {
        // 没有视频元素（比如占位符），显示提示文字
        const placeholderDiv = document.createElement('div');
        placeholderDiv.style.display = 'flex';
        placeholderDiv.style.alignItems = 'center';
        placeholderDiv.style.justifyContent = 'center';
        placeholderDiv.style.height = '100%';
        placeholderDiv.style.backgroundColor = '#333';
        placeholderDiv.style.color = '#fff';
        placeholderDiv.textContent = '摄像头未开启';
        contentDiv.appendChild(placeholderDiv);
      }

      // 添加名称标签（可克隆或直接移动，但标签没有轨道问题）
      if (label) {
        const newLabel = label.cloneNode(true);
        newLabel.style.margin = '4px 0 0 0';
        newLabel.style.fontSize = '12px';
        newLabel.style.textAlign = 'center';
        contentDiv.appendChild(newLabel);
      }

      floatingDiv.appendChild(dragHandle);
      floatingDiv.appendChild(contentDiv);
      floatingDiv.appendChild(resizeHandle);

      // 设置默认位置和大小（右下角）
      floatingDiv.style.position = 'fixed';
      floatingDiv.style.bottom = '120px';
      floatingDiv.style.right = '20px';
      floatingDiv.style.width = '240px';
      floatingDiv.style.height = '180px';
      floatingDiv.style.zIndex = '1000';
      floatingDiv.style.background = '#1e1e1e';
      floatingDiv.style.borderRadius = '12px';
      floatingDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      floatingDiv.style.overflow = 'hidden';
      floatingDiv.style.cursor = 'default';

      // 应用样式
      dragHandle.style.padding = '8px 12px';
      dragHandle.style.background = 'rgba(0,0,0,0.7)';
      dragHandle.style.color = 'white';
      dragHandle.style.cursor = 'move';
      dragHandle.style.fontSize = '12px';
      dragHandle.style.userSelect = 'none';

      resizeHandle.style.position = 'absolute';
      resizeHandle.style.bottom = '0';
      resizeHandle.style.right = '0';
      resizeHandle.style.width = '20px';
      resizeHandle.style.height = '20px';
      resizeHandle.style.backgroundColor = 'rgba(255,255,255,0.5)';
      resizeHandle.style.cursor = 'nw-resize';
      resizeHandle.style.display = 'flex';
      resizeHandle.style.alignItems = 'center';
      resizeHandle.style.justifyContent = 'center';
      resizeHandle.style.fontSize = '14px';
      resizeHandle.style.borderRadius = '12px 0 12px 0';
      resizeHandle.style.userSelect = 'none';

      contentDiv.style.height = 'calc(100% - 40px)';
      contentDiv.style.padding = '8px';
      contentDiv.style.display = 'flex';
      contentDiv.style.flexDirection = 'column';

      document.body.appendChild(floatingDiv);
      this.floatingCameraContainer = floatingDiv;

      // 移除原摄像头容器（cameraElement 本身，它现在只包含标签，但 video 已被移动）
      if (cameraElement && cameraElement.parentNode) {
        cameraElement.remove();
      }
      // 添加拖拽事件
      this.initDragging(floatingDiv, dragHandle);
      // 添加缩放事件
      this.initResizing(floatingDiv, resizeHandle);
      this.floatingInitialized = true;
    },

    // 初始化拖拽功能
    initDragging(element, handle) {
      let startX, startY, startLeft, startTop;

      const onMouseMove = (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        // 边界限制
        const maxX = window.innerWidth - element.offsetWidth;
        const maxY = window.innerHeight - element.offsetHeight;
        newLeft = Math.max(0, Math.min(maxX, newLeft));
        newTop = Math.max(0, Math.min(maxY, newTop));

        element.style.left = newLeft + 'px';
        element.style.top = newTop + 'px';
        element.style.right = 'auto';
        element.style.bottom = 'auto';
      };

      const onMouseUp = () => {
        this.isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = element.offsetLeft;
        startTop = element.offsetTop;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    },

    // 初始化缩放功能
    initResizing(element, handle) {
      let startX, startY, startWidth, startHeight;

      const onMouseMove = (e) => {
        if (!this.isResizing) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newWidth = startWidth + dx;
        let newHeight = startHeight + dy;

        // 限制最小和最大尺寸
        newWidth = Math.max(150, Math.min(500, newWidth));
        newHeight = Math.max(120, Math.min(400, newHeight));

        element.style.width = newWidth + 'px';
        element.style.height = newHeight + 'px';
      };

      const onMouseUp = () => {
        this.isResizing = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = element.offsetWidth;
        startHeight = element.offsetHeight;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    },

    // 更新画廊（其他参与者视频）
    updateGallery(participants) {
      const galleryScroll = document.querySelector('#galleryContainer .gallery-scroll');
      if (!galleryScroll) return;

      galleryScroll.innerHTML = '';

      participants.forEach((participant, index) => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.setAttribute('data-original-id', participant.getAttribute('data-track-sid') || `participant-${index}`);

        // 克隆视频元素
        const video = participant.querySelector('video');
        const label = participant.querySelector('p');

        if (video) {
          const newVideo = video.cloneNode(true);
          newVideo.style.width = '100%';
          newVideo.style.height = 'auto';
          newVideo.style.objectFit = 'cover';
          galleryItem.appendChild(newVideo);
        }

        if (label) {
          const newLabel = document.createElement('p');
          newLabel.textContent = label.textContent;
          newLabel.style.margin = '4px 0 0 0';
          newLabel.style.fontSize = '12px';
          newLabel.style.textAlign = 'center';
          galleryItem.appendChild(newLabel);
        }

        galleryScroll.appendChild(galleryItem);
      });

      this.galleryParticipantsCount = participants.length;
    },

    // 退出屏幕共享模式，恢复网格布局
    // 退出屏幕共享模式，恢复网格布局
    exitScreenShareMode() {
      const container = document.getElementById('videoContainer');
      if (!container) return;

      // 移除浮动摄像头
      if (this.floatingCameraContainer) {
        // 【关键修改】直接移动 video 元素回容器，而不是克隆
        const videoElement = this.floatingCameraContainer.querySelector('.floating-content video');
        const label = this.floatingCameraContainer.querySelector('.floating-content p');

        if (videoElement) {
          // 创建新的容器元素
          const newItemDiv = document.createElement('div');
          newItemDiv.className = 'video-item';
          newItemDiv.setAttribute('data-is-local', 'true');
          newItemDiv.setAttribute('data-track-sid', 'local');

          // 移动 video 元素
          newItemDiv.appendChild(videoElement);
          // 恢复 video 样式（网格模式）
          videoElement.style.width = '';
          videoElement.style.height = '';
          videoElement.style.objectFit = 'cover';

          // 处理标签
          const newLabel = label ? label.cloneNode(true) : document.createElement('p');
          if (!label) newLabel.textContent = '我 (你)';
          newLabel.style.margin = '';
          newLabel.style.fontSize = '';
          newLabel.style.textAlign = '';
          newItemDiv.appendChild(newLabel);

          container.appendChild(newItemDiv);
        }

        this.floatingCameraContainer.remove();
        this.floatingCameraContainer = null;
        this.floatingInitialized = false;
      }

      // 恢复屏幕共享视频为普通网格项（如果存在）
      const screenShareItem = this.screenShareVideoElement;
      if (screenShareItem) {
        screenShareItem.classList.remove('fullscreen-video');
        screenShareItem.style.position = '';
        screenShareItem.style.top = '';
        screenShareItem.style.left = '';
        screenShareItem.style.width = '';
        screenShareItem.style.height = '';
        screenShareItem.style.zIndex = '';

        const screenVideo = screenShareItem.querySelector('video');
        if (screenVideo) {
          screenVideo.style.objectFit = 'cover';
        }

        container.appendChild(screenShareItem);
      }

      // 清空画廊并恢复其他参与者视频（此处原有逻辑不变，但注意视频也是通过 track.attach 绑定的，不需要克隆）
      // 为了保持轨道，也应该直接移动而不是克隆。但为了简化，暂时保持原有克隆逻辑（因为其他参与者的视频轨道在移动后可能也需要重新 attach）
      // 如果其他参与者视频也出现黑屏，可以采用同样的移动方式。这里先按原逻辑处理。
      const galleryScroll = document.querySelector('#galleryContainer .gallery-scroll');
      if (galleryScroll) {
        const galleryItems = galleryScroll.querySelectorAll('.gallery-item');
        galleryItems.forEach(item => {
          const video = item.querySelector('video');
          const label = item.querySelector('p');

          const newItemDiv = document.createElement('div');
          newItemDiv.className = 'video-item';

          if (video) {
            // 直接移动 video 元素
            newItemDiv.appendChild(video);
          }
          if (label) {
            const newLabel = label.cloneNode(true);
            newItemDiv.appendChild(newLabel);
          }

          container.appendChild(newItemDiv);
        });
        galleryScroll.innerHTML = '';
      }

      // 重新整理网格布局（简单刷新样式）
      this.$nextTick(() => {
        const containerDiv = document.getElementById('videoContainer');
        if (containerDiv) {
          containerDiv.classList.add('grid-mode');
        }
      });
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
      container.appendChild(itemDiv);

      // 如果已经处于共享模式，需要立即调整布局
      if (this.screenShareActive) {
        this.$nextTick(() => {
          this.enterScreenShareMode();
        });
      }
    },

    setupRoomEvents() {
      const self = this;

      this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('📺 订阅轨道:', participant.identity, track.kind);
        if (track.kind === Track.Kind.Video && participant.identity !== (this.room && this.room.localParticipant && this.room.localParticipant.identity)) {
          const videoEl = document.createElement('video');
          videoEl.autoplay = true;
          videoEl.playsInline = true;
          track.attach(videoEl);

          const container = document.createElement('div');
          container.className = 'video-item';
          container.dataset.trackSid = track.sid;
          container.setAttribute('data-participant-id', participant.identity);

          const label = document.createElement('p');
          label.textContent = participant.identity;

          container.appendChild(videoEl);
          container.appendChild(label);

          if (this.screenShareActive) {
            // 共享模式下，新参与者添加到画廊
            const galleryScroll = document.querySelector('#galleryContainer .gallery-scroll');
            if (galleryScroll) {
              const galleryItem = document.createElement('div');
              galleryItem.className = 'gallery-item';
              galleryItem.setAttribute('data-track-sid', track.sid);

              const newVideo = videoEl.cloneNode(true);
              const newLabel = label.cloneNode(true);
              galleryItem.appendChild(newVideo);
              galleryItem.appendChild(newLabel);
              galleryScroll.appendChild(galleryItem);
              this.galleryParticipantsCount++;
            }
          } else {
            document.getElementById('videoContainer').appendChild(container);
          }
        } else if (track.kind === Track.Kind.Audio) {
          track.attach();
        }
      });

      this.room.on(RoomEvent.TrackUnsubscribed, (track) => {
        const el = document.querySelector(`.video-item[data-track-sid="${track.sid}"]`);
        if (el) el.remove();

        // 如果是在共享模式下，也从画廊中移除
        const galleryItem = document.querySelector(`.gallery-item[data-track-sid="${track.sid}"]`);
        if (galleryItem) {
          galleryItem.remove();
          this.galleryParticipantsCount--;
        }

        track.detach();
      });

      this.room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('✅ 参与者加入:', participant.identity);
      });

      this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('❌ 参与者离开:', participant.identity);
        // 从画廊中移除该参与者的所有视频
        const items = document.querySelectorAll(`.gallery-item[data-participant-id="${participant.identity}"]`);
        items.forEach(item => item.remove());
        this.galleryParticipantsCount = document.querySelectorAll('.gallery-item').length;
      });

      this.room.on(RoomEvent.Disconnected, () => {
        console.log('👋 房间已断开');
        document.getElementById('videoContainer').innerHTML = '';
        self.roomName = '未连接';
        // 清理浮动窗口
        if (self.floatingCameraContainer) {
          self.floatingCameraContainer.remove();
          self.floatingCameraContainer = null;
        }
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
      container.appendChild(itemDiv);
      console.log('✅ 已创建本地占位符（带重试按钮）');
    },

    disconnectRoom() {
      if (this.localCameraTrack) this.localCameraTrack = null;
      if (this.localMicrophoneTrack) this.localMicrophoneTrack = null;
      if (this.screenShareActive) this.stopScreenShare();
      if (this.floatingCameraContainer) {
        this.floatingCameraContainer.remove();
        this.floatingCameraContainer = null;
      }
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

/* 普通网格模式 */
.video-container.grid-mode {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  padding: 15px;
  width: 100%;
  position: relative;
}

/* 全屏共享模式 */
.video-container.fullscreen-mode {
  position: relative;
  width: 100%;
  height: calc(100vh - 140px);
  background: #000;
  overflow: hidden;
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

/* 画廊容器样式 */
.gallery-container {
  position: fixed;
  bottom: 80px;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  padding: 10px;
  z-index: 100;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.gallery-title {
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  margin-bottom: 8px;
}

.gallery-scroll {
  display: flex;
  overflow-x: auto;
  gap: 10px;
  padding: 8px;
  scrollbar-width: thin;
}

.gallery-scroll::-webkit-scrollbar {
  height: 4px;
}

.gallery-scroll::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.gallery-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.gallery-item {
  flex-shrink: 0;
  width: 160px;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s;
}

.gallery-item:hover {
  transform: scale(1.05);
}

.gallery-item video {
  width: 100%;
  height: auto;
  aspect-ratio: 16/9;
  object-fit: cover;
}

.gallery-item p {
  margin: 0;
  padding: 4px 8px;
  font-size: 11px;
  text-align: center;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
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
  z-index: 200;
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

/* 钉钉提示层样式 */
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

/* 响应式调整 */
@media (max-width: 768px) {
  .video-controls button {
    padding: 6px 12px;
    font-size: 12px;
  }
  .video-controls {
    gap: 10px;
    padding: 8px 16px;
  }

  .gallery-item {
    width: 120px;
  }

  .floating-camera {
    width: 180px !important;
    height: 135px !important;
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

  .gallery-item {
    width: 100px;
  }
}

@media (max-height: 500px) and (orientation: landscape) {
  .video-container.grid-mode {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
  .video-item video {
    aspect-ratio: 16/9;
  }
  .video-controls {
    bottom: 10px;
  }

  .gallery-container {
    bottom: 60px;
  }
}
</style>
