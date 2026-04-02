<template>
  <div class="video-meeting-container" :class="{ 'screen-sharing-mode': viewMode === 'screen-share' }">
    <!-- 钉钉环境提示层 -->
    <div v-if="isInDingTalk" class="dingtalk-overlay">
      <div class="dingtalk-card">
        <div class="dingtalk-icon">⚠️</div>
        <h3>检测到当前在钉钉内打开</h3>
        <p>由于钉钉小程序不支持摄像头/麦克风权限，视频会议无法正常运行。</p>
        <p>请点击下方按钮，在系统浏览器中打开，即可正常加入会议。</p>
        <button @click="openInBrowser" class="open-browser-btn">在浏览器中打开</button>
        <button @click="copyLinkAndExit" class="copy-link-btn">复制链接并退出</button>
      </div>
    </div>
    <!-- 正常视频会议界面 -->
    <div v-else class="meeting-main">
      <!-- 顶部标题栏 -->
      <div class="meeting-header">
        <div class="room-info">
          <span class="room-name">{{ roomName }}</span>
          <span class="member-count">{{ totalParticipants }}人</span>
        </div>
        <div class="header-actions">
          <button @click="showMemberList" class="icon-btn" title="成员列表">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
            </svg>
          </button>
          <button @click="inviteMember" class="icon-btn" title="邀请">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M16 8c0-2.21-1.79-4-4-4S8 5.79 8 8s1.79 4 4 4 4-1.79 4-4zm-7 6c-2.21 0-8 1.79-8 4v2h16v-2c0-2.21-5.79-4-8-4h-4z" fill="currentColor"/>
              <path d="M20 12v-3h-2v3h-3v2h3v3h2v-3h3v-2z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 主视频区域 -->
      <div class="video-area" ref="videoArea">
        <!-- 屏幕共享模式 -->
        <div v-if="viewMode === 'screen-share'" class="screen-share-layout">
          <div class="main-screen">
            <!-- 本地共享的屏幕视频 -->
            <video
              v-if="activeScreenShareId === localParticipantId"
              ref="screenShareVideo"
              autoplay
              playsinline
              class="screen-video"
            ></video>
            <!-- 远程共享的屏幕视频 -->
            <video
              v-else
              ref="remoteScreenVideo"
              autoplay
              playsinline
              class="screen-video"
            ></video>
            <div class="screen-share-label">
              正在共享屏幕：{{ getDisplayNameById(activeScreenShareId) }}
            </div>
          </div>
          <div class="participants-sidebar">
            <div class="sidebar-title">参会者 ({{ totalParticipants }})</div>
            <div class="sidebar-videos">
              <div
                v-for="item in sidebarParticipants"
                :key="item.id"
                class="sidebar-item"
                @click="switchToParticipant(item.id)"
              >
                <div class="sidebar-video-wrapper">
                  <video
                    :ref="(el) => setSidebarVideoRef(item.id, el)"
                    autoplay
                    playsinline
                    class="sidebar-video"
                  ></video>
                  <div class="sidebar-name">{{ getDisplayNameById(item.id) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 网格模式（原有布局） -->
        <div v-else :class="['video-grid', { 'single-mode': videoItems.length === 1 }]">
          <div
            v-for="item in videoItems"
            :key="item.id"
            class="video-card"
            :class="{ 'is-local': item.isLocal, 'muted': !item.hasVideo }"
          >
            <div class="video-wrapper">
              <video
                :ref="(el) => setVideoRef(item.id, el)"
                :data-participant-id="item.id"
                autoplay
                playsinline
                :muted="item.isLocal"
                class="participant-video"
                :style="{ display: item.hasVideo ? 'block' : 'none' }"
              ></video>
              <div v-if="!item.hasVideo" class="avatar-placeholder">
                <div class="avatar-icon">{{ getDisplayName(item).charAt(0).toUpperCase() }}</div>
              </div>
              <div class="participant-name">
                {{ getDisplayName(item) }}{{ item.isLocal ? ' (我)' : '' }}
              </div>
              <div v-if="!item.hasAudio" class="audio-mute-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" fill="currentColor"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部工具栏 -->
      <div class="control-bar">
        <button @click="toggleMicrophone" :class="['control-btn', { active: microphoneEnabled }]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 16c-2.21 0-4-1.79-4-4V6c0-2.21 1.79-4 4-4s4 1.79 4 4v6c0 2.21-1.79 4-4 4zm-6-4c0 3.31 2.69 6 6 6s6-2.69 6-6h-2c0 2.21-1.79 4-4 4s-4-1.79-4-4H6z" fill="currentColor"/>
          </svg>
          <span>{{ microphoneEnabled ? '静音' : '取消静音' }}</span>
        </button>

        <button @click="toggleCamera" :class="['control-btn', { active: cameraEnabled }]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 8v8H5V8h10m1-2H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4V7c0-.55-.45-1-1-1z" fill="currentColor"/>
          </svg>
          <span>{{ cameraEnabled ? '关闭视频' : '开启视频' }}</span>
        </button>

        <button @click="shareScreen" :class="['control-btn', { active: viewMode === 'screen-share' && activeScreenShareId === localParticipantId }]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="currentColor"/>
          </svg>
          <span>{{ viewMode === 'screen-share' && activeScreenShareId === localParticipantId ? '停止共享' : '共享屏幕' }}</span>
        </button>

        <button @click="leaveRoom" class="control-btn leave-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
          <span>离开</span>
        </button>
      </div>

      <!-- 本地摄像头浮窗（仅在屏幕共享模式下显示） -->
      <div v-if="viewMode === 'screen-share' && localVideoItem" class="floating-camera" ref="floatingCamera">
        <div class="floating-header" @mousedown="startDrag">
          <span>我的视频</span>
          <button @click="toggleCamera" class="float-cam-btn">
            {{ cameraEnabled ? '📷' : '📷❌' }}
          </button>
        </div>
        <div class="floating-content">
          <video ref="floatingVideo" autoplay playsinline muted class="floating-video"></video>
          <div v-if="!cameraEnabled" class="floating-placeholder">
            <div class="avatar-icon-small">{{ getDisplayNameById(localParticipantId).charAt(0).toUpperCase() }}</div>
          </div>
        </div>
        <div class="floating-resize" @mousedown="startResize"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { Room, RoomEvent, Track, VideoPresets, LocalVideoTrack, createLocalTracks } from 'livekit-client';
import SensorRequest from '../../utils/SensorRequest.js';
import { key_DingTokenJWT } from '../../utils/Dingding.js';

export default {
  name: 'VideoMeeting',
  data() {
    return {
      meetingUrl: '',
      roomName: '未连接',
      room: null,
      wsUrl: 'wss://api-v2.sensor-smart.cn:29028',
      cameraEnabled: true,
      microphoneEnabled: true,
      // 屏幕共享相关
      localScreenTrack: null,
      screenStream: null,
      localCameraTrack: null,
      activeScreenShareId: null,
      viewMode: 'grid',
      // 参与者数据
      participants: {},
      localParticipantId: null,
      isInDingTalk: false,
      // 拖拽缩放
      isDragging: false,
      isResizing: false,
      dragStartX: 0,
      dragStartY: 0,
      dragStartLeft: 0,
      dragStartTop: 0,
      resizeStartX: 0,
      resizeStartY: 0,
      resizeStartWidth: 0,
      resizeStartHeight: 0,
      // 视频元素引用
      videoRefs: new Map(),
      sidebarVideoRefs: new Map(),
      participantNames: new Map(),
      fetchingNames: new Set(),
      requireLogin: false,
      // 音频元素管理
      audioElements: new Map(),
      pendingAudioElements: null,   // 存储被自动播放策略阻止的音频元素
      audioTipShown: false,
    };
  },
  computed: {
    videoItems() {
      const items = [];
      for (const [id, p] of Object.entries(this.participants)) {
        if (this.viewMode === 'screen-share' && this.activeScreenShareId === id) continue;
        items.push({
          id,
          name: p.name,
          displayName: p.displayName,
          isLocal: p.isLocal,
          hasVideo: p.hasVideo,
          hasAudio: p.hasAudio,
        });
      }
      return items;
    },
    sidebarParticipants() {
      if (this.viewMode !== 'screen-share') return [];
      const items = [];
      for (const [id, p] of Object.entries(this.participants)) {
        if (id !== this.activeScreenShareId) {
          items.push({ id, name: p.name, displayName: p.displayName });
        }
      }
      return items;
    },
    localVideoItem() {
      if (!this.localParticipantId) return null;
      const p = this.participants[this.localParticipantId];
      return p ? { id: p.id, name: p.name, displayName: p.displayName, hasVideo: p.hasVideo } : null;
    },
    totalParticipants() {
      return Object.keys(this.participants).length;
    },
  },
  created() {
    this.meetingUrl = decodeURIComponent(this.$route.query.meetingUrl || '');
    this.roomName = decodeURIComponent(this.$route.query.meetingName || '未命名会议');
    document.title = this.roomName;
  },
  mounted() {
    this.checkDingTalkEnvironment();
    if (!this.isInDingTalk) {
      const urlToken = this.$route.query.token;
      localStorage.setItem(key_DingTokenJWT, urlToken);
      console.log('[VideoMeeting] 检测到浏览器环境，尝试从 URL 获取 token：', urlToken);
      const userToken = urlToken || localStorage.getItem(key_DingTokenJWT);
      if (!userToken) {
        console.log('[VideoMeeting] 检测到浏览器环境且无 token，跳转到登录页');
        this.requireLogin = true;
        const department = this.$route.params.department;
        this.$router.replace({
          path: `/${department}/phone-login`,
          query: {
            meetingUrl: this.$route.query.meetingUrl,
            meetingName: this.$route.query.meetingName,
            token: urlToken,
          },
        });
        return;
      }
      if (urlToken && !localStorage.getItem(key_DingTokenJWT)) {
        localStorage.setItem(key_DingTokenJWT, urlToken);
        console.log('[VideoMeeting] 已保存 URL token 到 localStorage');
      }
    }
    if (this.isInDingTalk) return;
    if (this.meetingUrl) {
      this.parseAndJoinRoom();
    } else {
      this.$toast.fail('缺少会议链接参数');
      setTimeout(() => this.leaveRoom(), 1500);
    }

    // 添加用户交互监听，用于解决音频自动播放限制
    const enableAudioOnInteraction = () => {
      if (this.pendingAudioElements && this.pendingAudioElements.size > 0) {
        this.pendingAudioElements.forEach(audioEl => {
          audioEl.play().catch(e => console.warn('用户交互后播放失败:', e));
        });
        this.pendingAudioElements.clear();
      }
      // 移除监听，只触发一次
      document.removeEventListener('click', enableAudioOnInteraction);
      document.removeEventListener('touchstart', enableAudioOnInteraction);
    };
    document.addEventListener('click', enableAudioOnInteraction);
    document.addEventListener('touchstart', enableAudioOnInteraction);
    // 保存以便在 beforeDestroy 中清理
    this._enableAudioOnInteraction = enableAudioOnInteraction;
  },
  beforeDestroy() {
    this.disconnectRoom();
    // 清理音频元素
    this.audioElements.forEach((el) => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    this.audioElements.clear();
    // 清理交互监听
    if (this._enableAudioOnInteraction) {
      document.removeEventListener('click', this._enableAudioOnInteraction);
      document.removeEventListener('touchstart', this._enableAudioOnInteraction);
    }
    document.title = '工作助手';
  },
  methods: {
    // ==================== 辅助显示名称 ====================
    getDisplayName(item) {
      const mappedName = this.participantNames.get(item.id);
      if (mappedName) return mappedName;
      if (item.displayName) return item.displayName;
      if (item.name && item.name !== item.id) return item.name;
      return item.id;
    },
    getDisplayNameById(participantId) {
      const mappedName = this.participantNames.get(participantId);
      if (mappedName) return mappedName;
      const p = this.participants[participantId];
      if (!p) return participantId;
      if (p.displayName) return p.displayName;
      if (p.name && p.name !== participantId) return p.name;
      return participantId;
    },

    // ==================== 注册/注销参会者姓名 ====================
    registerParticipantName(participantId, name) {
      if (participantId && name) {
        this.participantNames.set(participantId, name);
        console.log(`✅ 注册参会者：${participantId} -> ${name}`);
        const p = this.participants[participantId];
        if (p && p.displayName !== name) {
          p.displayName = name;
          this.$set(this.participants, participantId, p);
        }
      }
    },
    unregisterParticipantName(participantId) {
      if (participantId) {
        const deleted = this.participantNames.delete(participantId);
        if (deleted) {
          console.log(`❌ 注销参会者：${participantId}`);
        }
      }
    },

    async fetchPersonName(personDingID) {
      if (this.fetchingNames.has(personDingID)) return null;
      const cachedName = this.participantNames.get(personDingID);
      if (cachedName && cachedName !== personDingID) return cachedName;
      try {
        this.fetchingNames.add(personDingID);
        const param = { Person_DingID: personDingID };
        return await new Promise((resolve, reject) => {
          SensorRequest.PersonGetFun(
            JSON.stringify(param),
            (respData) => {
              console.log(`📋 获取到人员信息：${personDingID}`, respData);
              let personName = personDingID;
              if (respData) {
                try {
                  const data = typeof respData === 'string' ? JSON.parse(respData) : respData;
                  if (Array.isArray(data) && data.length > 0) {
                    const personInfo = data[0];
                    if (personInfo.Person_Name) {
                      personName = personInfo.Person_Name;
                    } else if (personInfo.name) {
                      personName = personInfo.name;
                    }
                    console.log(`✅ 成功获取姓名：${personInfo.Person_DingID} -> ${personName}`);
                  } else if (data && data.Person_Name) {
                    personName = data.Person_Name;
                  }
                } catch (error) {
                  console.warn('解析人员信息失败:', error);
                }
              }
              resolve(personName);
            },
            (error) => {
              console.warn(`❌ 获取人员信息失败：${personDingID}`, error);
              resolve(personDingID);
            }
          );
        });
      } catch (error) {
        console.error('获取人员信息异常:', error);
        return personDingID;
      } finally {
        this.fetchingNames.delete(personDingID);
      }
    },

    async fetchAndRegisterName(participantId, currentName) {
      if (currentName && currentName.trim() !== '' && currentName !== participantId) {
        this.registerParticipantName(participantId, currentName);
        return;
      }
      const realName = await this.fetchPersonName(participantId);
      this.registerParticipantName(participantId, realName);
    },

    // ==================== 钉钉环境 ====================
    checkDingTalkEnvironment() {
      const ua = navigator.userAgent.toLowerCase();
      this.isInDingTalk = ua.includes('dingtalk') || typeof window.dd !== 'undefined';
    },
    openInBrowser() {
      const currentUrl = window.location.href;
      if (window.dd && window.dd.biz && window.dd.biz.util && window.dd.biz.util.openLink) {
        window.dd.biz.util.openLink({ url: currentUrl });
      } else {
        this.fallbackOpenLink(currentUrl);
      }
    },
    fallbackOpenLink(url) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          this.$toast.success('链接已复制，请打开浏览器访问');
        }).catch(() => {
          prompt('请复制以下链接到浏览器中打开', url);
        });
      } else {
        prompt('请复制以下链接到浏览器中打开', url);
      }
    },
    copyLinkAndExit() {
      const currentUrl = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentUrl).then(() => {
          this.$toast.success('链接已复制，请打开浏览器访问');
          setTimeout(() => this.leaveRoom(), 1000);
        }).catch(() => {
          prompt('请复制以下链接到浏览器中打开', currentUrl);
          this.leaveRoom();
        });
      } else {
        prompt('请复制以下链接到浏览器中打开', currentUrl);
        this.leaveRoom();
      }
    },

    // ==================== 房间连接 ====================
    parseAndJoinRoom() {
      try {
        const url = new URL(this.meetingUrl);
        const dataParam = new URLSearchParams(url.search).get('data');
        if (!dataParam) throw new Error('缺少 data 参数');
        const decodedData = JSON.parse(decodeURIComponent(dataParam));
        this.joinRoom(decodedData.room, decodedData.user || '参会者', decodedData.token);
      } catch (error) {
        console.error('解析会议链接失败:', error);
        this.$toast.fail('会议链接解析失败');
      }
    },
    async joinRoom(roomName, userName, token) {
      console.log('加入会议室:', roomName, userName);
      const loadingToast = this.$toast.loading({ message: '正在加入会议室...', forbidClick: true, duration: 0 });
      try {
        this.room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: { resolution: VideoPresets.h540 },
          audioCaptureDefaults: { echoCancellation: true, noiseCancellation: true, autoGainControl: true },
        });
        this.setupRoomEvents();
        await this.room.connect(this.wsUrl, token, { name: userName });
        this.roomName = this.room.name;

        this.localParticipantId = this.room.localParticipant.identity;
        this.registerParticipantName(this.localParticipantId, userName);

        this.$set(this.participants, this.localParticipantId, {
          id: this.localParticipantId,
          name: userName,
          displayName: userName,
          isLocal: true,
          hasVideo: false,
          hasAudio: false,
          videoTrack: null,
          audioTrack: null,
        });

        await this.enableMedia();

        loadingToast.close();
        this.$toast.success(userName + '已进入会议室');
      } catch (error) {
        console.error('连接失败:', error);
        loadingToast.close();
        this.$toast.fail('连接失败：' + (error.message || '未知错误'));
      }
    },

    async enableMedia() {
      try {
        const tracks = await createLocalTracks({
          video: { resolution: VideoPresets.h540, facingMode: 'user' },
          audio: { echoCancellation: true, noiseCancellation: true, autoGainControl: true },
        });
        const publications = await Promise.all(tracks.map((track) => this.room.localParticipant.publishTrack(track)));

        // 检查音视频轨道
        const cameraPub = publications.find((pub) => pub && pub.track && pub.track.kind === Track.Kind.Video);
        const micPub = publications.find((pub) => pub && pub.track && pub.track.kind === Track.Kind.Audio);

        // 更新本地视频状态
        if (cameraPub && cameraPub.track) {
          this.localCameraTrack = cameraPub.track;
          this.updateParticipantVideo(this.localParticipantId, true, this.localCameraTrack);
          this.cameraEnabled = true;
        } else {
          this.localCameraTrack = null;
          this.updateParticipantVideo(this.localParticipantId, false, null);
          this.cameraEnabled = false;
        }

        // 更新本地音频状态
        if (micPub && micPub.track) {
          this.updateParticipantAudio(this.localParticipantId, true);
          this.microphoneEnabled = true;
          // 诊断：检查本地音频轨道是否有效
          const audioStream = micPub.track.mediaStream;
          if (audioStream) {
            const audioTracks = audioStream.getAudioTracks();
            if (audioTracks.length > 0) {
              console.log('🎤 本地音频轨道信息:', audioTracks[0].label, 'enabled:', audioTracks[0].enabled);
            } else {
              console.warn('⚠️ 本地音频轨道 mediaStream 中无音频轨道');
            }
          } else {
            console.warn('⚠️ 本地音频轨道 mediaStream 为空');
          }
        } else {
          this.updateParticipantAudio(this.localParticipantId, false);
          this.microphoneEnabled = false;
          console.warn('⚠️ 未找到本地音频轨道发布');
        }

        if (this.viewMode === 'screen-share') this.$nextTick(() => this.bindLocalCameraToFloating());
      } catch (error) {
        console.warn('媒体初始化失败:', error);
        this.$toast.fail('无法访问摄像头/麦克风：' + (error.message || '请检查权限设置'));
        this.updateParticipantVideo(this.localParticipantId, false, null);
        this.updateParticipantAudio(this.localParticipantId, false);
        this.cameraEnabled = false;
        this.microphoneEnabled = false;
      }
    },

    waitForTrack(source, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const check = () => {
          const pub = this.room.localParticipant.getTrackPublication(source);
          if (pub && pub.track) resolve(pub);
          else if (Date.now() - startTime > timeout) reject(new Error(`等待轨道 ${source} 超时`));
          else setTimeout(check, 100);
        };
        check();
      });
    },

    // ==================== 参与者管理 ====================
    updateParticipantVideo(participantId, hasVideo, track) {
      const p = this.participants[participantId];
      if (!p) {
        console.warn(`updateParticipantVideo: 参与者 ${participantId} 不存在`);
        return;
      }
      console.log(`📹 更新视频状态: ${participantId}, hasVideo=${hasVideo}, track=${track ? '有轨道' : '无轨道'}`);
      const newParticipant = {
        ...p,
        hasVideo,
        videoTrack: track,
      };
      this.$set(this.participants, participantId, newParticipant);

      this.$nextTick(() => {
        this.$forceUpdate();
        console.log(`🔄 强制刷新视图，参与者 ${participantId} hasVideo=${hasVideo}`);
      });

      if (hasVideo && track) {
        const videoEl = this.videoRefs.get(participantId);
        if (videoEl) {
          if (videoEl.srcObject) videoEl.srcObject = null;
          track.attach(videoEl);
          console.log(`✅ 已将视频轨道附加到 ${participantId}`);
        } else {
          this.$nextTick(() => {
            const fallbackEl = document.querySelector(`video[data-participant-id="${participantId}"]`);
            if (fallbackEl && track) {
              track.attach(fallbackEl);
              console.log(`✅ (fallback) 已将视频轨道附加到 ${participantId}`);
            }
          });
        }
        // 同时更新侧边栏的视频
        const sidebarEl = this.sidebarVideoRefs.get(participantId);
        if (sidebarEl && sidebarEl.srcObject !== track.mediaStream) {
          if (sidebarEl.srcObject) sidebarEl.srcObject = null;
          track.attach(sidebarEl);
        }
      } else if (!hasVideo) {
        const videoEl = this.videoRefs.get(participantId);
        if (videoEl && videoEl.srcObject) {
          videoEl.srcObject = null;
          console.log(`🖥️ 已清空 ${participantId} 的视频元素 srcObject`);
        }
        const sidebarEl = this.sidebarVideoRefs.get(participantId);
        if (sidebarEl && sidebarEl.srcObject) {
          sidebarEl.srcObject = null;
        }
      }
    },

    updateParticipantAudio(participantId, hasAudio) {
      const p = this.participants[participantId];
      if (p) {
        p.hasAudio = hasAudio;
        this.$set(this.participants, participantId, p);
        console.log(`🎤 更新音频状态: ${participantId}, hasAudio=${hasAudio}`);
      }
    },

    setVideoRef(id, el) {
      if (el) {
        this.videoRefs.set(id, el);
        const p = this.participants[id];
        if (p && p.hasVideo && p.videoTrack && el.srcObject !== p.videoTrack.mediaStream) {
          p.videoTrack.attach(el);
          console.log(`🔗 setVideoRef: 为 ${id} 附加轨道`);
        }
      } else {
        this.videoRefs.delete(id);
      }
    },

    setSidebarVideoRef(id, el) {
      if (el) {
        this.sidebarVideoRefs.set(id, el);
        const p = this.participants[id];
        if (p && p.hasVideo && p.videoTrack && el.srcObject !== p.videoTrack.mediaStream) {
          p.videoTrack.attach(el);
        }
      } else {
        this.sidebarVideoRefs.delete(id);
      }
    },

    // ==================== 房间事件 ====================
    setupRoomEvents() {
      const room = this.room;
      if (!room) {
        console.warn('setupRoomEvents: room is null');
        return;
      }

      room.on(RoomEvent.Connected, () => {
        console.log('✅ 房间连接成功');
        if (room.participants && typeof room.participants.values === 'function') {
          for (const participant of room.participants.values()) {
            if (!this.participants[participant.identity]) {
              let displayName = participant.identity;
              if (participant.name && participant.name.trim() !== '' && participant.name !== participant.identity) {
                displayName = participant.name;
              }
              this.registerParticipantName(participant.identity, displayName);
              this.$set(this.participants, participant.identity, {
                id: participant.identity,
                name: displayName,
                displayName: displayName,
                isLocal: false,
                hasVideo: false,
                hasAudio: false,
                videoTrack: null,
                audioTrack: null,
              });
              console.log(`👤 发现参与者：${participant.identity}, name: ${displayName}`);
              if (!participant.name || participant.name.trim() === '' || participant.name === participant.identity) {
                this.fetchAndRegisterName(participant.identity, participant.name);
              }
            }
          }
        }
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('👤 新参与者加入:', participant.identity, ', name:', participant.name);
        let displayName = participant.identity;
        if (participant.name && participant.name.trim() !== '' && participant.name !== participant.identity) {
          displayName = participant.name;
        }
        this.registerParticipantName(participant.identity, displayName);
        this.$set(this.participants, participant.identity, {
          id: participant.identity,
          name: displayName,
          displayName: displayName,
          isLocal: false,
          hasVideo: false,
          hasAudio: false,
          videoTrack: null,
          audioTrack: null,
        });
        if (!participant.name || participant.name.trim() === '' || participant.name === participant.identity) {
          this.fetchAndRegisterName(participant.identity, participant.name);
        }
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('👋 参与者离开:', participant.identity);
        this.unregisterParticipantName(participant.identity);
        this.$delete(this.participants, participant.identity);
        if (this.activeScreenShareId === participant.identity) {
          this.activeScreenShareId = null;
          this.viewMode = 'grid';
        }
        // 清理该参与者的音频元素
        const audioEl = this.audioElements.get(participant.identity);
        if (audioEl && audioEl.parentNode) {
          audioEl.parentNode.removeChild(audioEl);
          this.audioElements.delete(participant.identity);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('🔌 房间已断开');
        Object.keys(this.participants).forEach((key) => {
          this.unregisterParticipantName(key);
          this.$delete(this.participants, key);
        });
        this.activeScreenShareId = null;
        this.viewMode = 'grid';
        this.roomName = '未连接';
      });

      // 轨道订阅：区分屏幕共享轨道和普通轨道
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (!participant) {
          console.warn('TrackSubscribed: participant is undefined');
          return;
        }
        const participantId = participant.identity;
        console.log(`📡 TrackSubscribed: ${participantId}, kind=${track.kind}, source=${track.source}`);
        if (!this.participants[participantId]) {
          let displayName = participantId;
          if (participant.name && participant.name.trim() !== '' && participant.name !== participantId) {
            displayName = participant.name;
          }
          this.registerParticipantName(participantId, displayName);
          this.$set(this.participants, participantId, {
            id: participantId,
            name: displayName,
            displayName: displayName,
            isLocal: false,
            hasVideo: false,
            hasAudio: false,
            videoTrack: null,
            audioTrack: null,
          });
          if (!participant.name || participant.name.trim() === '' || participant.name === participantId) {
            this.fetchAndRegisterName(participantId, participant.name);
          }
        }

        // 屏幕共享轨道处理
        if (track.source === Track.Source.ScreenShare) {
          console.log('📺 接收到屏幕共享轨道，来自:', participantId);
          this.activeScreenShareId = participantId;
          this.viewMode = 'screen-share';
          // 绑定到主区域的 video 元素
          this.$nextTick(() => {
            let screenVideoEl = null;
            if (participantId === this.localParticipantId) {
              screenVideoEl = this.$refs.screenShareVideo;
            } else {
              screenVideoEl = this.$refs.remoteScreenVideo;
            }
            if (screenVideoEl) {
              if (screenVideoEl.srcObject) screenVideoEl.srcObject = null;
              track.attach(screenVideoEl);
            }
          });
        } else if (track.kind === Track.Kind.Video) {
          this.updateParticipantVideo(participantId, true, track);
        } else if (track.kind === Track.Kind.Audio) {
          // 处理远程音频：创建隐藏的 audio 元素并播放
          this.updateParticipantAudio(participantId, true);
          let audioEl = this.audioElements.get(participantId);
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.id = `audio-${participantId}`;
            audioEl.autoplay = true;
            audioEl.style.display = 'none';
            document.body.appendChild(audioEl);
            this.audioElements.set(participantId, audioEl);
          }
          // 附加轨道
          if (audioEl.srcObject !== track.mediaStream) {
            if (audioEl.srcObject) audioEl.srcObject = null;
            track.attach(audioEl);
          }
          // 尝试播放，处理自动播放策略
          audioEl.play().then(() => {
            console.log(`✅ 音频播放成功: ${participantId}`);
          }).catch(err => {
            console.warn(`⚠️ 音频播放被阻止 (${participantId}):`, err.message);
            if (!this.pendingAudioElements) this.pendingAudioElements = new Set();
            this.pendingAudioElements.add(audioEl);
            if (!this.audioTipShown) {
              this.audioTipShown = true;
              this.$toast.info('点击页面任意位置即可听到声音', { duration: 3000 });
            }
          });
        }
      });

      // 轨道取消订阅
      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        if (!participant) {
          console.warn('TrackUnsubscribed: participant is undefined');
          return;
        }
        const participantId = participant.identity;
        console.log(`❌ TrackUnsubscribed: ${participantId}, kind=${track.kind}, source=${track.source}`);
        if (track.source === Track.Source.ScreenShare) {
          console.log('🛑 屏幕共享已停止，来自:', participantId);
          if (this.activeScreenShareId === participantId) {
            this.activeScreenShareId = null;
            this.viewMode = 'grid';
            // 清理视频元素
            const screenVideoEl = this.$refs.remoteScreenVideo || this.$refs.screenShareVideo;
            if (screenVideoEl && screenVideoEl.srcObject) {
              screenVideoEl.srcObject = null;
            }
          }
        } else if (track.kind === Track.Kind.Video) {
          this.updateParticipantVideo(participantId, false, null);
        } else if (track.kind === Track.Kind.Audio) {
          this.updateParticipantAudio(participantId, false);
          // 清理音频元素
          const audioEl = this.audioElements.get(participantId);
          if (audioEl) {
            if (audioEl.srcObject) audioEl.srcObject = null;
            // 可以选择保留元素，但清除轨道后不再需要
          }
        }
      });

      // 轨道静音/取消静音处理
      room.on(RoomEvent.TrackMuted, (track, publication, participant) => {
        if (!participant) return;
        const participantId = participant.identity;
        console.log(`🔇 TrackMuted: ${participantId}, kind=${track.kind}`);
        if (track.kind === Track.Kind.Video) {
          this.updateParticipantVideo(participantId, false, null);
        } else if (track.kind === Track.Kind.Audio) {
          this.updateParticipantAudio(participantId, false);
        }
      });

      room.on(RoomEvent.TrackUnmuted, (track, publication, participant) => {
        if (!participant) return;
        const participantId = participant.identity;
        console.log(`🔊 TrackUnmuted: ${participantId}, kind=${track.kind}`);
        if (track.kind === Track.Kind.Video) {
          const videoTrack = participant.getTrack(Track.Source.Camera);
          if (videoTrack && videoTrack.track) {
            this.updateParticipantVideo(participantId, true, videoTrack.track);
          } else {
            console.warn(`TrackUnmuted 但无法获取视频轨道: ${participantId}`);
          }
        } else if (track.kind === Track.Kind.Audio) {
          this.updateParticipantAudio(participantId, true);
        }
      });
    },

    // ==================== 控制方法 ====================
    async toggleCamera() {
      if (!this.room || !this.room.localParticipant) return;
      const newEnabled = !this.cameraEnabled;
      console.log(`🎥 切换摄像头: 当前状态=${this.cameraEnabled}, 目标状态=${newEnabled}`);
      try {
        await this.room.localParticipant.setCameraEnabled(newEnabled);
        this.cameraEnabled = newEnabled;

        if (newEnabled) {
          const pub = await this.waitForTrack(Track.Source.Camera, 3000);
          this.localCameraTrack = (pub && pub.track) || null;
          this.updateParticipantVideo(this.localParticipantId, !!this.localCameraTrack, this.localCameraTrack);
        } else {
          this.localCameraTrack = null;
          this.updateParticipantVideo(this.localParticipantId, false, null);
        }
        if (this.viewMode === 'screen-share') this.$nextTick(() => this.bindLocalCameraToFloating());
      } catch (err) {
        console.error('切换摄像头失败:', err);
        this.$toast.fail('切换摄像头失败');
      }
    },

    async toggleMicrophone() {
      if (!this.room || !this.room.localParticipant) return;
      const newEnabled = !this.microphoneEnabled;
      console.log(`🎤 切换麦克风: ${this.microphoneEnabled} -> ${newEnabled}`);
      try {
        await this.room.localParticipant.setMicrophoneEnabled(newEnabled);
        this.microphoneEnabled = newEnabled;
        this.updateParticipantAudio(this.localParticipantId, newEnabled);
      } catch (err) {
        this.$toast.fail('切换麦克风失败');
      }
    },

    async shareScreen() {
      if (!this.room || !this.room.localParticipant) return;
      if (this.activeScreenShareId === this.localParticipantId) {
        await this.stopScreenShare();
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) throw new Error('无法获取屏幕视频轨道');
        this.screenStream = stream;
        videoTrack.onended = () => this.stopScreenShare();

        const localScreenTrack = new LocalVideoTrack(videoTrack, {
          name: 'screen',
          source: Track.Source.ScreenShare,
        });
        await this.room.localParticipant.publishTrack(localScreenTrack);
        this.localScreenTrack = localScreenTrack;
        this.activeScreenShareId = this.localParticipantId;
        this.viewMode = 'screen-share';

        this.$nextTick(() => {
          const screenVideo = this.$refs.screenShareVideo;
          if (screenVideo) screenVideo.srcObject = stream;
        });
        this.$nextTick(() => this.bindLocalCameraToFloating());
        this.$toast.success('屏幕共享已开始');
      } catch (error) {
        console.error('屏幕共享失败:', error);
        this.$toast.fail('屏幕共享失败');
      }
    },

    async stopScreenShare() {
      if (this.localScreenTrack) {
        await this.room.localParticipant.unpublishTrack(this.localScreenTrack);
        this.localScreenTrack.stop();
        this.localScreenTrack = null;
      }
      if (this.screenStream) {
        this.screenStream.getTracks().forEach((t) => t.stop());
        this.screenStream = null;
      }
      this.activeScreenShareId = null;
      this.viewMode = 'grid';
      this.$toast.success('屏幕共享已停止');
    },

    bindLocalCameraToFloating() {
      if (this.viewMode !== 'screen-share') return;
      const floatingVideoEl = this.$refs.floatingVideo;
      if (!floatingVideoEl) return;
      if (this.cameraEnabled && this.localCameraTrack) {
        const currentStream = floatingVideoEl.srcObject;
        const trackStream = this.localCameraTrack.mediaStream;
        if (currentStream !== trackStream) {
          if (currentStream) floatingVideoEl.srcObject = null;
          this.localCameraTrack.attach(floatingVideoEl);
        }
      } else if (floatingVideoEl.srcObject) {
        floatingVideoEl.srcObject = null;
      }
    },

    switchToParticipant(participantId) {
      console.log('切换到参与者:', participantId);
    },

    showMemberList() {
      const members = Object.values(this.participants).map((p) => ({
        name: this.getDisplayNameById(p.id),
        isLocal: p.isLocal,
      }));
      let html = '<div style="padding: 12px;"><div style="max-height: 400px; overflow-y: auto;">';
      members.forEach((m) => {
        html += `<div style="padding: 8px 0; border-bottom: 1px solid #eee;">${m.isLocal ? '👤 ' : '👥 '}${m.name}${
          m.isLocal ? ' (我)' : ''
        }</div>`;
      });
      html += '</div></div>';
      this.$dialog.alert({ title: '成员列表', message: html, confirmButtonText: '关闭', allowHtml: true });
    },

    inviteMember() {
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          this.$dialog.alert({ title: '邀请成员', message: '会议链接已复制，可分享给其他人' });
        }).catch(() => {
          prompt('请复制以下会议链接:', url);
        });
      } else {
        prompt('请复制以下会议链接:', url);
      }
    },

    leaveRoom() {
      this.$dialog
        .confirm({
          title: '确认离开',
          message: '确定要离开当前会议室吗？',
          confirmButtonText: '确定',
          cancelButtonText: '取消',
        })
        .then(() => {
          this.disconnectRoom();
          this.$toast.success('已离开会议室');
          setTimeout(() => this.$router.back(), 1000);
        });
    },

    disconnectRoom() {
      if (this.activeScreenShareId === this.localParticipantId) this.stopScreenShare();
      if (this.room) {
        this.room.disconnect();
        this.room = null;
      }
      Object.keys(this.participants).forEach((key) => {
        this.unregisterParticipantName(key);
        this.$delete(this.participants, key);
      });
      this.activeScreenShareId = null;
      this.viewMode = 'grid';
    },

    // ==================== 浮动窗口拖拽/缩放 ====================
    startDrag(e) {
      if (!this.$refs.floatingCamera) return;
      this.isDragging = true;
      const rect = this.$refs.floatingCamera.getBoundingClientRect();
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragStartLeft = rect.left;
      this.dragStartTop = rect.top;
      document.addEventListener('mousemove', this.onDrag);
      document.addEventListener('mouseup', this.stopDrag);
    },
    onDrag(e) {
      if (!this.isDragging || !this.$refs.floatingCamera) return;
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      let left = this.dragStartLeft + dx;
      let top = this.dragStartTop + dy;
      left = Math.max(0, Math.min(window.innerWidth - this.$refs.floatingCamera.offsetWidth, left));
      top = Math.max(0, Math.min(window.innerHeight - this.$refs.floatingCamera.offsetHeight, top));
      this.$refs.floatingCamera.style.left = left + 'px';
      this.$refs.floatingCamera.style.top = top + 'px';
      this.$refs.floatingCamera.style.right = 'auto';
      this.$refs.floatingCamera.style.bottom = 'auto';
    },
    stopDrag() {
      this.isDragging = false;
      document.removeEventListener('mousemove', this.onDrag);
      document.removeEventListener('mouseup', this.stopDrag);
    },
    startResize(e) {
      e.stopPropagation();
      if (!this.$refs.floatingCamera) return;
      this.isResizing = true;
      this.resizeStartX = e.clientX;
      this.resizeStartY = e.clientY;
      this.resizeStartWidth = this.$refs.floatingCamera.offsetWidth;
      this.resizeStartHeight = this.$refs.floatingCamera.offsetHeight;
      document.addEventListener('mousemove', this.onResize);
      document.addEventListener('mouseup', this.stopResize);
    },
    onResize(e) {
      if (!this.isResizing || !this.$refs.floatingCamera) return;
      const dx = e.clientX - this.resizeStartX;
      const dy = e.clientY - this.resizeStartY;
      let w = this.resizeStartWidth + dx;
      let h = this.resizeStartHeight + dy;
      w = Math.max(200, Math.min(400, w));
      h = Math.max(150, Math.min(300, h));
      this.$refs.floatingCamera.style.width = w + 'px';
      this.$refs.floatingCamera.style.height = h + 'px';
    },
    stopResize() {
      this.isResizing = false;
      document.removeEventListener('mousemove', this.onResize);
      document.removeEventListener('mouseup', this.stopResize);
    },
  },
};
</script>

<style scoped>
/* 原有样式保留，新增屏幕共享布局样式 */
* {
  box-sizing: border-box;
}

.video-meeting-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #1a1a2e;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.meeting-main {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1f2c;
}

/* 顶部栏 */
.meeting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  z-index: 100;
}
.room-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.room-name {
  font-size: 18px;
  font-weight: 500;
  color: #fff;
}
.member-count {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: 20px;
}
.header-actions {
  display: flex;
  gap: 12px;
}
.icon-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  transition: background 0.2s;
}
.icon-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 视频区域 */
.video-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  padding: 16px;
}

/* 屏幕共享布局：主区域 + 右侧边栏 */
.screen-share-layout {
  display: flex;
  width: 100%;
  height: 100%;
  gap: 16px;
}
.main-screen {
  flex: 1;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}
.screen-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}
.screen-share-label {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  backdrop-filter: blur(4px);
}
.participants-sidebar {
  width: 260px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebar-title {
  padding: 12px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}
.sidebar-videos {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sidebar-item {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}
.sidebar-item:hover {
  background: rgba(255, 255, 255, 0.2);
}
.sidebar-video-wrapper {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #2d2d3a;
  border-radius: 6px;
  overflow: hidden;
}
.sidebar-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sidebar-name {
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(0, 0, 0, 0.6);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  color: #fff;
  backdrop-filter: blur(4px);
}

/* 原有网格样式保持不变 */
.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 4px;
}
.video-grid.single-mode {
  display: flex;
  justify-content: center;
  align-items: center;
}
.video-grid.single-mode .video-card {
  max-width: 800px;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
}
.video-card {
  background: #2d2d3a;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  aspect-ratio: 16 / 9;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.video-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}
.participant-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #1e1e2a;
}
.avatar-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.avatar-icon {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 500;
  color: #fff;
}
.avatar-icon-small {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 500;
  color: #fff;
}
.participant-name {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  color: #fff;
  backdrop-filter: blur(4px);
  z-index: 2;
}
.audio-mute-badge {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff4d4f;
  z-index: 2;
}

/* 底部工具栏 */
.control-bar {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 20px 24px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  z-index: 100;
}
.control-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 40px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}
.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.02);
}
.control-btn.active {
  background: #3b82f6;
  color: #fff;
}
.leave-btn {
  background: #ef4444;
}
.leave-btn:hover {
  background: #dc2626;
}

/* 浮动摄像头窗口 */
.floating-camera {
  position: fixed;
  bottom: 100px;
  right: 20px;
  width: 240px;
  height: 180px;
  background: #1e1f2c;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 300;
  cursor: default;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.floating-header {
  background: rgba(0, 0, 0, 0.7);
  padding: 6px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  font-size: 12px;
  cursor: move;
}
.float-cam-btn {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}
.floating-content {
  height: calc(100% - 32px);
  position: relative;
  background: #2d2d3a;
}
.floating-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.floating-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.floating-resize {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nw-resize;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px 0 0 0;
}

/* 钉钉提示层 */
.dingtalk-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.dingtalk-card {
  background: #fff;
  border-radius: 24px;
  width: 90%;
  max-width: 340px;
  padding: 28px 24px;
  text-align: center;
}
.dingtalk-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
.dingtalk-card h3 {
  font-size: 20px;
  margin: 0 0 12px;
}
.dingtalk-card p {
  font-size: 14px;
  color: #666;
  margin: 8px 0;
}
.open-browser-btn, .copy-link-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  margin-top: 12px;
  cursor: pointer;
}
.open-browser-btn {
  background: #3b82f6;
  color: #fff;
}
.copy-link-btn {
  background: #f0f0f0;
  color: #333;
}

/* 响应式 */
@media (max-width: 768px) {
  .video-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .control-btn span {
    display: none;
  }
  .control-btn {
    padding: 10px;
  }
  .participants-sidebar {
    width: 200px;
  }
  .floating-camera {
    width: 180px;
    height: 135px;
    bottom: 80px;
    right: 8px;
  }
}
</style>
