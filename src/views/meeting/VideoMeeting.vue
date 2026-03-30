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

      <!-- 视频容器 -->
      <div
        id="videoContainer"
        class="video-container"
        :class="{
          'grid-mode': !this.screenShareActive,
          'fullscreen-mode': screenShareActive,
          'single-mode': isSingleMode
        }"
      ></div>

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
        <button @click="switchView" class="view-btn">
          🔄 切换视图
        </button>
        <button @click="showMemberList" class="member-btn">
          👥 成员列表
        </button>
        <button @click="inviteMember" class="invite-btn">
          ➕ 邀请成员
        </button>
        <button @click="leaveRoom" class="leave-btn">
          🚪 离开房间
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { Room, RoomEvent, Track, VideoPresets, LocalVideoTrack } from 'livekit-client';
import cameraOffImg from '@/assets/摄像头关闭.png';

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
      screenStream: null,
      localCameraTrack: null,
      localMicrophoneTrack: null,
      isInDingTalk: false,
      remoteParticipantsCount: 0,
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
      cameraOffImage: cameraOffImg,
      currentViewMode: 'grid', // grid: 网格视图，speaker: 演讲者视图，screen: 共享屏幕视图
      availableScreens: [], // 可用的屏幕共享列表
      selectedScreenId: null, // 当前选中的屏幕 ID
    };
  },
  computed: {
    isSingleMode() {
      return !this.screenShareActive && this.remoteParticipantsCount === 0;
    }
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
          this.$toast.fail('复制失败，请手动复制');
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
            this.updateLocalVideoUI(userName);
          }
        } else {
          loadingToast.close();
          this.$toast.fail('摄像头/麦克风不可用，仅能观看');
          this.updateLocalVideoUI(userName);
        }
      } catch (error) {
        console.error('❌ 连接失败:', error);
        loadingToast.close();

        if (error.message && error.message.includes('getUserMedia')) {
          this.$toast.fail('无法访问摄像头/麦克风，请检查浏览器权限设置');
          this.updateLocalVideoUI(userName);
        } else {
          this.$toast.fail('连接会议室失败：' + error.message);
          this.disconnectRoom();
        }
      }
    },

    updateLocalVideoUI(userName) {
      // 共享模式下，只更新浮动窗口内容，不操作 videoContainer
      if (this.screenShareActive) {
        this.updateFloatingCameraContent();
        return;
      }

      const container = document.getElementById('videoContainer');
      if (!container) return;

      const existingLocal = document.querySelector('.video-item[data-is-local="true"]');
      if (existingLocal) existingLocal.remove();

      if (this.cameraEnabled && this.localCameraTrack) {
        this.createLocalVideoElementWithTrack(userName, this.localCameraTrack);
      } else {
        this.createLocalPlaceholder(userName);
      }
    },

    // 更新共享模式下的浮动摄像头窗口内容
    updateFloatingCameraContent() {
      if (!this.floatingCameraContainer) {
        // 如果浮动窗口不存在，尝试重新创建（通常不会发生，但为了健壮）
        this.recreateFloatingCamera();
        return;
      }

      const contentDiv = this.floatingCameraContainer.querySelector('.floating-content');
      if (!contentDiv) return;

      // 清空当前内容
      contentDiv.innerHTML = '';

      if (this.cameraEnabled && this.localCameraTrack) {
        // 显示摄像头视频
        const videoEl = document.createElement('video');
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.muted = true;
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'cover';
        this.localCameraTrack.attach(videoEl);
        contentDiv.appendChild(videoEl);
      } else {
        // 显示关闭摄像头占位图片
        const img = document.createElement('img');
        img.src = this.cameraOffImage;
        img.alt = '摄像头已关闭';
        img.style.maxWidth = '90%';
        img.style.maxHeight = '90%';
        img.style.objectFit = 'contain';
        contentDiv.appendChild(img);
      }
    },

    // 重新创建浮动摄像头窗口（兜底方案）
    recreateFloatingCamera() {
      // 获取当前的本地视频元素或创建一个临时占位
      let localItem = document.querySelector('.video-item[data-is-local="true"]');
      if (!localItem) {
        const userName = (this.room && this.room.localParticipant && this.room.localParticipant.identity) || '我';
        this.createLocalPlaceholder(userName);
        localItem = document.querySelector('.video-item[data-is-local="true"]');
      }
      if (localItem) {
        this.createFloatingCamera(localItem);
        // 创建后立即更新内容以确保正确
        this.updateFloatingCameraContent();
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
          this.cameraEnabled = true;
        } catch (err) {
          cameraError = err;
          this.cameraEnabled = false;
        }

        try {
          await this.room.localParticipant.setMicrophoneEnabled(true);
          this.microphoneEnabled = true;
        } catch (err) {
          micError = err;
          this.microphoneEnabled = false;
        }

        let cameraPublication = null;
        try {
          cameraPublication = await this.waitForTrack(Track.Source.Camera, 5000);
          if (cameraPublication && cameraPublication.track) {
            this.localCameraTrack = cameraPublication.track;
          }
        } catch (waitErr) {
          console.warn('等待摄像头轨道超时', waitErr);
          this.localCameraTrack = null;
        }

        try {
          const micPublication = await this.waitForTrack(Track.Source.Microphone, 5000);
          if (micPublication && micPublication.track) {
            this.localMicrophoneTrack = micPublication.track;
          }
        } catch (waitErr) {
          console.warn('等待麦克风轨道超时', waitErr);
        }

        this.updateLocalVideoUI(userName);

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

        const userName = (this.room && this.room.localParticipant && this.room.localParticipant.identity) || '我';
        if (newEnabled) {
          try {
            const publication = await this.waitForTrack(Track.Source.Camera, 3000);
            if (publication && publication.track) {
              this.localCameraTrack = publication.track;
            }
          } catch (err) {
            console.warn('等待摄像头轨道超时', err);
            this.localCameraTrack = null;
          }
        } else {
          this.localCameraTrack = null;
        }
        // 统一刷新UI，内部会判断共享模式
        this.updateLocalVideoUI(userName);

        console.log(`摄像头已${newEnabled ? '开启' : '关闭'}`);
      } catch (err) {
        console.error('切换摄像头失败', err);
        this.$toast.fail('切换摄像头失败：' + (err.message || '未知错误'));
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
        this.$toast.fail('切换麦克风失败：' + (err.message || '未知错误'));
      }
    },

    // 切换视图功能
    switchView() {
      if (!this.room || !this.remoteParticipantsCount) {
        this.$toast.fail('当前没有其他成员的屏幕可切换');
        return;
      }

      // 获取所有远程参与者
      const participants = Array.from(this.room.participants.values());
      const remoteParticipants = participants.filter(p => p.identity !== this.room.localParticipant.identity);

      if (remoteParticipants.length === 0) {
        this.$toast.fail('当前没有其他成员');
        return;
      }

      // 收集所有可用的屏幕共享
      const screens = [];
      remoteParticipants.forEach(participant => {
        const trackPublications = participant.trackPublications;
        trackPublications.forEach(publication => {
          if (publication.isSubscribed && publication.track && publication.track.kind === 'video') {
            // 检查是否是屏幕共享轨道
            const isScreenShare = publication.source === 'SCREEN_SHARE' ||
              publication.track.name === 'screen' ||
              publication.sid.includes('screen');
            if (isScreenShare) {
              screens.push({
                participantIdentity: participant.identity,
                track: publication.track,
                sid: publication.sid,
                source: publication.source
              });
            }
          }
        });
      });

      if (screens.length === 0) {
        this.$toast.fail('当前没有成员共享屏幕');
        return;
      }

      // 循环切换到下一个屏幕
      let currentIndex = -1;
      if (this.selectedScreenId) {
        currentIndex = screens.findIndex(s => s.sid === this.selectedScreenId);
      }

      let nextIndex = currentIndex + 1;
      if (nextIndex >= screens.length) {
        nextIndex = 0; // 循环回到第一个
      }

      const targetScreen = screens[nextIndex];
      this.selectedScreenId = targetScreen.sid;

      // 显示选中的屏幕
      this.displayRemoteScreen(targetScreen);

      this.$toast.success(`已切换到 ${targetScreen.participantIdentity} 的屏幕`);
      console.log(`切换视图：${targetScreen.participantIdentity}`, targetScreen);
    },

    // 显示远程成员的屏幕
    displayRemoteScreen(screenInfo) {
      const container = document.getElementById('videoContainer');
      if (!container) return;

      // 清除现有内容
      container.innerHTML = '';

      // 创建屏幕共享视频元素
      const videoEl = document.createElement('video');
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = true;

      if (screenInfo.track) {
        screenInfo.track.attach(videoEl);
      }

      const itemDiv = document.createElement('div');
      itemDiv.className = 'video-item';
      itemDiv.setAttribute('data-is-screen-share', 'true');
      itemDiv.setAttribute('data-track-sid', screenInfo.sid);
      itemDiv.setAttribute('data-participant-id', screenInfo.participantIdentity);
      itemDiv.style.position = 'absolute';
      itemDiv.style.top = '0';
      itemDiv.style.left = '0';
      itemDiv.style.width = '100%';
      itemDiv.style.height = '100%';
      itemDiv.style.zIndex = '1';

      const label = document.createElement('p');
      label.textContent = `${screenInfo.participantIdentity} 的屏幕共享`;
      label.style.background = 'rgba(0, 0, 0, 0.7)';
      label.style.position = 'absolute';
      label.style.bottom = '0';
      label.style.left = '0';
      label.style.right = '0';
      label.style.zIndex = '2';

      itemDiv.appendChild(videoEl);
      itemDiv.appendChild(label);
      container.appendChild(itemDiv);

      const screenVideo = itemDiv.querySelector('video');
      if (screenVideo) {
        screenVideo.style.width = '100%';
        screenVideo.style.height = '100%';
        screenVideo.style.objectFit = 'contain';
      }

      // 更新视图模式
      this.currentViewMode = 'screen';
      this.screenShareActive = true;
    },

    // 显示成员列表
    showMemberList() {
      if (!this.room) {
        this.$toast.fail('未连接房间');
        return;
      }

      const participants = Array.from(this.room.participants.values());
      const localIdentity = this.room.localParticipant ? this.room.localParticipant.identity : null;
      const remoteParticipants = participants.filter(p => p.identity !== localIdentity);

      let memberListHtml = `
        <div style="padding: 20px;">
          <h3 style="margin-bottom: 15px; font-size: 18px;">参会成员 (${remoteParticipants.length + 1})</h3>
          <div style="border-top: 1px solid #eee; padding-top: 10px;">
            <div style="padding: 10px; background: #f5f5f5; border-radius: 8px; margin-bottom: 10px;">
              <span style="font-weight: 500;">👤 ${localIdentity || '我'} (我)</span>
            </div>
      `;

      remoteParticipants.forEach((participant, index) => {
        const statusIcon = participant.state === 'connected' ? '🟢' : '🔴';
        memberListHtml += `
          <div style="padding: 10px; border-bottom: 1px solid #eee; ${index === remoteParticipants.length - 1 ? '' : 'margin-bottom: 10px;'}">
            <span>${statusIcon} ${participant.identity}</span>
          </div>
        `;
      });

      memberListHtml += `</div></div>`;

      this.$dialog.alert({
        title: '成员列表',
        message: memberListHtml,
        confirmButtonText: '关闭',
        theme: 'round-button',
        allowHtml: true
      }).catch(() => {});
    },

    // 邀请成员
    inviteMember() {
      this.$toast.loading({
        message: '正在生成邀请链接...',
        forbidClick: true,
        duration: 1000
      });

      setTimeout(() => {
        const currentUrl = window.location.href;

        if (navigator.clipboard) {
          navigator.clipboard.writeText(currentUrl).then(() => {
            this.$dialog.confirm({
              title: '邀请成员',
              message: '会议链接已复制到剪贴板，您可以分享给其他人。<br><br>' +
                '<span style="color: #667eea; font-size: 12px;">提示：将链接发送给需要邀请的成员即可</span>',
              confirmButtonText: '确定',
              cancelButtonText: '取消',
              allowHtml: true
            }).then(() => {
              // 确认
            }).catch(() => {
              // 取消
            });
          }).catch(err => {
            this.$toast.fail('复制失败，请手动复制');
            prompt('请复制以下会议链接:', currentUrl);
          });
        } else {
          prompt('请复制以下会议链接:', currentUrl);
        }
      }, 1000);
    },

    // 离开房间
    leaveRoom() {
      this.$dialog.confirm({
        title: '确认离开',
        message: '确定要离开当前会议室吗？',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        theme: 'round-button'
      }).then(() => {
        this.disconnectRoom();
        this.$toast.success('已离开会议室');
        setTimeout(() => {
          this.$router.back();
        }, 1000);
      }).catch(() => {
        // 取消
      });
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

        this.screenStream = screenStream;

        screenVideoTrack.onended = () => {
          console.log('用户通过浏览器停止了屏幕共享');
          this.stopScreenShare();
        };

        this.createLocalScreenShareElement(screenStream);

        const localScreenTrack = new LocalVideoTrack(screenVideoTrack, {
          name: 'screen',
          source: Track.Source.ScreenShare,
        });

        await this.room.localParticipant.publishTrack(localScreenTrack);
        this.screenShareTrack = localScreenTrack;
        this.screenShareActive = true;

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
          this.$toast.fail('屏幕共享失败：' + error.message);
        }
      }
    },

    async stopScreenShare() {
      if (!this.screenShareTrack) return;
      try {
        await this.room.localParticipant.unpublishTrack(this.screenShareTrack);
        this.screenShareTrack.stop();
        this.screenShareTrack = null;

        if (this.screenStream) {
          this.screenStream.getTracks().forEach(track => track.stop());
          this.screenStream = null;
        }

        const screenElement = document.querySelector('.video-item[data-is-screen-share="true"]');
        if (screenElement) screenElement.remove();
        this.screenShareVideoElement = null;

        this.screenShareActive = false;

        this.exitScreenShareMode();

        console.log('✅ 屏幕共享已停止');
        this.$toast.success('屏幕共享已停止');
      } catch (err) {
        console.error('停止屏幕共享失败:', err);
        this.$toast.fail('停止屏幕共享失败');
      }
    },

    enterScreenShareMode() {
      const container = document.getElementById('videoContainer');
      if (!container) return;

      const screenShareItem = document.querySelector('.video-item[data-is-screen-share="true"]');
      if (!screenShareItem) {
        console.warn('未找到屏幕共享视频元素');
        return;
      }

      this.screenShareVideoElement = screenShareItem;

      let localCameraItem = document.querySelector('.video-item[data-is-local="true"]');
      const otherParticipants = document.querySelectorAll('.video-item:not([data-is-screen-share="true"]):not([data-is-local="true"])');

      const videoContainer = document.getElementById('videoContainer');
      videoContainer.innerHTML = '';

      videoContainer.appendChild(screenShareItem);
      screenShareItem.classList.add('fullscreen-video');
      screenShareItem.style.position = 'absolute';
      screenShareItem.style.top = '0';
      screenShareItem.style.left = '0';
      screenShareItem.style.width = '100%';
      screenShareItem.style.height = '100%';
      screenShareItem.style.zIndex = '1';

      const screenVideo = screenShareItem.querySelector('video');
      if (screenVideo) {
        screenVideo.style.width = '100%';
        screenVideo.style.height = '100%';
        screenVideo.style.objectFit = 'contain';
      }

      const createFloating = () => {
        const currentLocalItem = document.querySelector('.video-item[data-is-local="true"]');
        if (currentLocalItem && !this.floatingCameraContainer) {
          this.createFloatingCamera(currentLocalItem);
        } else if (!currentLocalItem && !this.floatingCameraContainer) {
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
      } else if (this.floatingCameraContainer) {
        // 如果浮窗已存在，更新其内容
        this.updateFloatingCameraContent();
      }

      this.updateGallery(otherParticipants);
      this.galleryParticipantsCount = otherParticipants.length;
    },

    createFloatingCamera(cameraElement) {
      if (this.floatingCameraContainer) return;

      const floatingDiv = document.createElement('div');
      floatingDiv.className = 'floating-camera';
      floatingDiv.setAttribute('data-floating', 'true');

      const dragHandle = document.createElement('div');
      dragHandle.className = 'floating-drag-handle';
      dragHandle.innerHTML = '📷 我的摄像头 <span class="resize-hint">(拖动移动)</span>';

      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'floating-resize-handle';
      resizeHandle.innerHTML = '↘';

      const contentDiv = document.createElement('div');
      contentDiv.className = 'floating-content';

      const videoElement = cameraElement.querySelector('video');
      const isPlaceholder = cameraElement.classList.contains('placeholder');

      if (videoElement && !isPlaceholder) {
        contentDiv.appendChild(videoElement);
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        if (videoElement.paused) videoElement.play();
      } else {
        // 摄像头关闭时显示图片
        const img = document.createElement('img');
        img.src = this.cameraOffImage;
        img.alt = '摄像头已关闭';
        img.style.maxWidth = '90%';
        img.style.maxHeight = '90%';
        img.style.objectFit = 'contain';
        contentDiv.appendChild(img);
      }

      floatingDiv.appendChild(dragHandle);
      floatingDiv.appendChild(contentDiv);
      floatingDiv.appendChild(resizeHandle);

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
      contentDiv.style.alignItems = 'center';
      contentDiv.style.justifyContent = 'center';

      document.body.appendChild(floatingDiv);
      this.floatingCameraContainer = floatingDiv;

      if (cameraElement && cameraElement.parentNode) {
        cameraElement.remove();
      }

      this.initDragging(floatingDiv, dragHandle);
      this.initResizing(floatingDiv, resizeHandle);
      this.floatingInitialized = true;
    },

    initDragging(element, handle) {
      let startX, startY, startLeft, startTop;

      const onMouseMove = (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

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

    initResizing(element, handle) {
      let startX, startY, startWidth, startHeight;

      const onMouseMove = (e) => {
        if (!this.isResizing) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newWidth = startWidth + dx;
        let newHeight = startHeight + dy;

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

    updateGallery(participants) {
      const galleryScroll = document.querySelector('#galleryContainer .gallery-scroll');
      if (!galleryScroll) return;

      galleryScroll.innerHTML = '';

      participants.forEach((participant, index) => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.setAttribute('data-original-id', participant.getAttribute('data-track-sid') || `participant-${index}`);

        const video = participant.querySelector('video');
        const isPlaceholder = participant.classList.contains('placeholder');

        if (video && !isPlaceholder) {
          const newVideo = video.cloneNode(true);
          newVideo.style.width = '100%';
          newVideo.style.height = 'auto';
          newVideo.style.objectFit = 'cover';
          galleryItem.appendChild(newVideo);
        } else {
          // 画廊占位符显示图片
          const img = document.createElement('img');
          img.src = this.cameraOffImage;
          img.alt = '摄像头已关闭';
          img.style.maxWidth = '60%';
          img.style.maxHeight = '60%';
          img.style.objectFit = 'contain';
          galleryItem.appendChild(img);
        }

        galleryScroll.appendChild(galleryItem);
      });

      this.galleryParticipantsCount = participants.length;
    },

    exitScreenShareMode() {
      const container = document.getElementById('videoContainer');
      if (!container) return;

      if (this.floatingCameraContainer) {
        const videoElement = this.floatingCameraContainer.querySelector('.floating-content video');
        const imgElement = this.floatingCameraContainer.querySelector('.floating-content img');
        const label = this.floatingCameraContainer.querySelector('.floating-content p');

        if (videoElement) {
          const newItemDiv = document.createElement('div');
          newItemDiv.className = 'video-item';
          newItemDiv.setAttribute('data-is-local', 'true');
          newItemDiv.setAttribute('data-track-sid', 'local');

          newItemDiv.appendChild(videoElement);
          videoElement.style.width = '';
          videoElement.style.height = '';
          videoElement.style.objectFit = 'cover';

          const newLabel = label ? label.cloneNode(true) : document.createElement('p');
          if (!label) newLabel.textContent = '我 (你)';
          newLabel.style.margin = '';
          newLabel.style.fontSize = '';
          newLabel.style.textAlign = '';
          newItemDiv.appendChild(newLabel);

          container.appendChild(newItemDiv);
        } else if (imgElement) {
          const userName = (this.room && this.room.localParticipant && this.room.localParticipant.identity) || '我';
          this.createLocalPlaceholder(userName);
        }

        this.floatingCameraContainer.remove();
        this.floatingCameraContainer = null;
        this.floatingInitialized = false;
      }

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

      const galleryScroll = document.querySelector('#galleryContainer .gallery-scroll');
      if (galleryScroll) {
        const galleryItems = galleryScroll.querySelectorAll('.gallery-item');
        galleryItems.forEach(item => {
          const video = item.querySelector('video');
          const img = item.querySelector('img');
          const label = item.querySelector('p');

          const newItemDiv = document.createElement('div');
          newItemDiv.className = 'video-item';

          if (video) {
            newItemDiv.appendChild(video);
          } else if (img) {
            const newImg = img.cloneNode(true);
            newItemDiv.appendChild(newImg);
            newItemDiv.classList.add('placeholder');
          }

          if (label) {
            const newLabel = label.cloneNode(true);
            newItemDiv.appendChild(newLabel);
          }

          container.appendChild(newItemDiv);
        });
        galleryScroll.innerHTML = '';
      }

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
            const galleryScroll = document.querySelector('#galleryContainer .gallery-scroll');
            if (galleryScroll) {
              const galleryItem = document.createElement('div');
              galleryItem.className = 'gallery-item';
              galleryItem.setAttribute('data-track-sid', track.sid);
              galleryItem.setAttribute('data-participant-id', participant.identity);

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
          this.updateRemoteParticipantsCount();
        } else if (track.kind === Track.Kind.Audio) {
          track.attach();
        }
      });

      this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('📺 取消订阅轨道:', participant.identity, track.kind);
        if (track.kind === Track.Kind.Video && participant.identity !== (this.room && this.room.localParticipant && this.room.localParticipant.identity)) {
          const el = document.querySelector(`.video-item[data-track-sid="${track.sid}"]`);
          if (el) el.remove();

          const galleryItem = document.querySelector(`.gallery-item[data-track-sid="${track.sid}"]`);
          if (galleryItem) {
            galleryItem.remove();
            this.galleryParticipantsCount--;
          }

          this.createRemotePlaceholder(participant.identity, track.sid);

          track.detach();
          this.updateRemoteParticipantsCount();
        } else if (track.kind === Track.Kind.Video && participant.identity === (this.room && this.room.localParticipant && this.room.localParticipant.identity)) {
          const userName = participant.identity || '我';
          this.localCameraTrack = null;
          this.updateLocalVideoUI(userName);
        }
      });

      this.room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('✅ 参与者加入:', participant.identity);
        this.updateRemoteParticipantsCount();
      });

      this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('❌ 参与者离开:', participant.identity);
        const items = document.querySelectorAll(`.gallery-item[data-participant-id="${participant.identity}"], .video-item[data-participant-id="${participant.identity}"]`);
        items.forEach(item => item.remove());
        this.galleryParticipantsCount = document.querySelectorAll('.gallery-item').length;
        this.updateRemoteParticipantsCount();
      });

      this.room.on(RoomEvent.Disconnected, () => {
        console.log('👋 房间已断开');
        document.getElementById('videoContainer').innerHTML = '';
        self.roomName = '未连接';
        if (self.floatingCameraContainer) {
          self.floatingCameraContainer.remove();
          self.floatingCameraContainer = null;
        }
        self.remoteParticipantsCount = 0;
      });
    },

    createRemotePlaceholder(participantIdentity, trackSid) {
      if (document.querySelector(`.video-placeholder[data-participant-id="${participantIdentity}"]`)) return;

      const container = document.getElementById('videoContainer');
      if (!container) return;

      const itemDiv = document.createElement('div');
      itemDiv.className = 'video-item placeholder';
      itemDiv.setAttribute('data-participant-id', participantIdentity);
      itemDiv.setAttribute('data-track-sid', trackSid + '-placeholder');

      const img = document.createElement('img');
      img.src = this.cameraOffImage;
      img.alt = '摄像头已关闭';
      img.style.maxWidth = '60%';
      img.style.maxHeight = '60%';
      img.style.objectFit = 'contain';
      itemDiv.appendChild(img);

      if (this.screenShareActive) {
        const galleryScroll = document.querySelector('#galleryContainer .gallery-scroll');
        if (galleryScroll) {
          const galleryItem = document.createElement('div');
          galleryItem.className = 'gallery-item placeholder';
          galleryItem.setAttribute('data-participant-id', participantIdentity);

          const img2 = document.createElement('img');
          img2.src = this.cameraOffImage;
          img2.alt = '摄像头已关闭';
          img2.style.maxWidth = '60%';
          img2.style.maxHeight = '60%';
          img2.style.objectFit = 'contain';
          galleryItem.appendChild(img2);

          galleryScroll.appendChild(galleryItem);
          this.galleryParticipantsCount++;
          return;
        }
      }

      container.appendChild(itemDiv);
    },

    updateRemoteParticipantsCount() {
      if (!this.room) return;
      const participants = Array.from(this.room.participants.values());
      const remoteParticipants = participants.filter(p => p.identity !== this.room.localParticipant.identity);
      this.remoteParticipantsCount = remoteParticipants.length;
    },

    createLocalPlaceholder(userName) {
      const container = document.getElementById('videoContainer');
      if (!container) return;
      if (document.querySelector('.video-item[data-is-local="true"]')) return;

      const itemDiv = document.createElement('div');
      itemDiv.className = 'video-item placeholder';
      itemDiv.setAttribute('data-is-local', 'true');

      const img = document.createElement('img');
      img.src = this.cameraOffImage;
      img.alt = '摄像头已关闭';
      img.style.maxWidth = '80%';
      img.style.maxHeight = '80%';
      img.style.objectFit = 'contain';
      itemDiv.appendChild(img);

      container.appendChild(itemDiv);
      console.log('✅ 已创建本地占位符（仅图片）');
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

.video-container.grid-mode {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  padding: 12px;
  width: 100%;
  position: relative;
}

.video-container.single-mode {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 140px);
  padding: 15px;
}

.video-container.single-mode .video-item {
  width: 100%;
  max-width: 900px;
  aspect-ratio: 16/9;
  max-height: calc(100vh - 180px);
  border-radius: 16px;
  margin: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.video-container.single-mode .video-item video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 16px;
  background: #000;
}

.video-container.single-mode .video-item .placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background-color: #2d2d2d;
}

.video-container.single-mode .video-item .placeholder img {
  max-width: 60%;
  max-height: 60%;
  object-fit: contain;
}

.video-container.single-mode .video-item p {
  background: rgba(0, 0, 0, 0.7);
  font-size: 16px;
  padding: 12px;
  font-weight: 500;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 0 0 16px 16px;
}

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
  display: flex;
  flex-direction: column;
  aspect-ratio: 16/9;
}

.video-item video {
  width: 100%;
  height: 100%;
  display: block;
  background: #1e1e1e;
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
  z-index: 2;
}

.video-item.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2d2d2d;
  width: 100%;
  height: 100%;
}

.video-item.placeholder img {
  display: block;
  max-width: 60%;
  max-height: 60%;
  object-fit: contain;
}

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
  width: 140px;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
}

.gallery-item:hover {
  transform: scale(1.05);
}

.gallery-item video,
.gallery-item img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  background: #000;
}

.gallery-item p {
  margin: 0;
  padding: 4px 8px;
  font-size: 11px;
  text-align: center;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  position: static;
}

.video-controls {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  padding: 8px 15px;
  border-radius: 50px;
  z-index: 200;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  flex-wrap: wrap;
  justify-content: center;
  max-width: 95%;
}

.video-controls button {
  background: #fff;
  border: none;
  border-radius: 40px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;
  color: #333;
  white-space: nowrap;
}

.video-controls button.active {
  background: #3f83f8;
  color: white;
}

.video-controls button:active {
  transform: scale(0.95);
}

.video-controls .view-btn {
  background: #3f83f8;
  color: white;
}

.video-controls .member-btn {
  background: #3f83f8;
  color: white;
}

.video-controls .invite-btn {
  background: #3f83f8;
  color: white;
}

.video-controls .leave-btn {
  background: #3f83f8;
  color: white;
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

.floating-camera {
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.floating-camera:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
}

.floating-drag-handle {
  cursor: move;
}

.floating-resize-handle {
  cursor: nw-resize;
}

.floating-content {
  overflow: hidden;
  background: #1e1e1e;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.floating-content video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.floating-content img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}

@media (max-width: 768px) {
  .video-container.grid-mode {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 10px;
  }

  .video-container.single-mode {
    height: calc(100vh - 120px);
    padding: 10px;
  }

  .video-container.single-mode .video-item {
    max-width: 100%;
    max-height: calc(100vh - 160px);
  }

  .video-controls button {
    padding: 5px 10px;
    font-size: 11px;
  }

  .video-controls {
    gap: 6px;
    padding: 6px 12px;
    bottom: 15px;
  }

  .gallery-item {
    width: 120px;
  }

  .gallery-item video,
  .gallery-item img {
    height: 85px;
  }

  .floating-camera {
    width: 180px !important;
    height: 135px !important;
  }
}

@media (max-width: 480px) {
  .video-header h2 {
    font-size: 16px;
  }

  .video-container.grid-mode {
    gap: 8px;
    padding: 8px;
  }

  .video-item {
    min-height: 180px;
  }

  .video-controls {
    gap: 4px;
    padding: 5px 10px;
    bottom: 10px;
    max-width: 98%;
  }

  .video-controls button {
    padding: 4px 8px;
    font-size: 10px;
    gap: 4px;
  }

  .gallery-item {
    width: 100px;
  }

  .gallery-item video,
  .gallery-item img {
    height: 70px;
  }

  .gallery-item p {
    font-size: 10px;
    padding: 3px 6px;
  }

  .floating-camera {
    width: 160px !important;
    height: 120px !important;
  }
}

@media (max-height: 500px) and (orientation: landscape) {
  .video-container.grid-mode {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 8px;
  }

  .video-item {
    min-height: 150px;
  }

  .video-controls {
    bottom: 10px;
  }

  .gallery-container {
    bottom: 60px;
  }

  .video-container.single-mode {
    height: calc(100vh - 100px);
  }

  .video-container.single-mode .video-item {
    max-height: calc(100vh - 130px);
  }
}
</style>
