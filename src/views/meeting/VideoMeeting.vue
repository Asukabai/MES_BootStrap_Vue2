<template>
  <!-- 模板部分与之前完全相同，此处省略重复内容（保持原样） -->
  <div class="video-meeting-container" :class="{ 'screen-sharing-mode': screenShareActive }">
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
        <div v-if="activeScreenShare" class="screen-share-view">
          <div class="screen-share-content">
            <video ref="screenShareVideo" autoplay playsinline class="screen-video"></video>
            <div class="screen-share-label">正在共享屏幕</div>
          </div>
        </div>

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

        <button @click="shareScreen" :class="['control-btn', { active: screenShareActive }]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="currentColor"/>
          </svg>
          <span>{{ screenShareActive ? '停止共享' : '共享屏幕' }}</span>
        </button>

        <button @click="leaveRoom" class="control-btn leave-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
          <span>离开</span>
        </button>
      </div>

      <!-- 画廊容器 -->
      <div v-if="screenShareActive && galleryItems.length" class="gallery-dock">
        <div class="gallery-scroll">
          <div
            v-for="item in galleryItems"
            :key="item.id"
            class="gallery-item"
            @click="switchToParticipant(item)"
          >
            <video :ref="(el) => setGalleryVideoRef(item.id, el)" autoplay playsinline class="gallery-video"></video>
            <div class="gallery-name">{{ getDisplayNameById(item.id) }}</div>
          </div>
        </div>
      </div>

      <!-- 本地摄像头浮窗 -->
      <div v-if="screenShareActive && localVideoItem" class="floating-camera" ref="floatingCamera">
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
      screenShareActive: false,
      screenShareTrack: null,
      screenStream: null,
      localCameraTrack: null,
      activeScreenShare: false,
      remoteScreenTrack: null,
      participants: {},
      localParticipantId: null,
      isInDingTalk: false,
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
      videoRefs: new Map(),
      galleryVideoRefs: new Map(),
      currentViewMode: 'grid',
      // ✅ 新增：参会者姓名映射表（前端内存管理）
      participantNames: new Map(),
      // ✅ 新增：正在请求姓名的缓存，避免重复请求
      fetchingNames: new Set(),
      requireLogin: false, // ✅ 新增：是否需要登录验证
    };
  },
  computed: {
    videoItems() {
      const items = [];
      for (const [id, p] of Object.entries(this.participants)) {
        if (this.screenShareActive && this.activeScreenShare === id) continue;
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
    galleryItems() {
      if (!this.screenShareActive) return [];
      const items = [];
      for (const [id, p] of Object.entries(this.participants)) {
        if (!p.isLocal && id !== this.activeScreenShare) {
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
    // ✅ 检查是否在钉钉内，如果不在且没有 token，需要登录验证
    if (!this.isInDingTalk) {
      // ✅ 优先从 URL 参数获取 token
      const urlToken = this.$route.query.token;
      console.log('[VideoMeeting] 检测到浏览器环境，尝试从 URL 获取 token： '+ urlToken);
      const userToken = urlToken || localStorage.getItem(key_DingTokenJWT);
      if (!userToken) {
        console.log('[VideoMeeting] 检测到浏览器环境且无 token，跳转到登录页');
        this.requireLogin = true;
        const department = this.$route.params.department;
        // 跳转到登录验证页面，并带上会议参数
        this.$router.replace({
          path: `/${department}/phone-login`,
          query: {
            meetingUrl: this.$route.query.meetingUrl,
            meetingName: this.$route.query.meetingName,
            token: urlToken // ✅ 传递 URL 中的 token
          }
        });
        return;
      }
      // ✅ 如果使用的是 URL 中的 token，保存到 localStorage
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
  },
  beforeDestroy() {
    this.disconnectRoom();
    document.title = '工作助手';
  },
  methods: {
    // ==================== 辅助显示名称 ====================
    getDisplayName(item) {
      // ✅ 优先从映射表获取姓名
      const mappedName = this.participantNames.get(item.id);
      if (mappedName) return mappedName;

      if (item.displayName) return item.displayName;
      if (item.name && item.name !== item.id) return item.name;
      return item.id;
    },

    getDisplayNameById(participantId) {
      // ✅ 优先从映射表获取姓名
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

        // ✅ 同步更新 participants 中的 displayName
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

    // ✅ 新增：从后端获取人员姓名
    async fetchPersonName(personDingID) {
      // 如果已经在请求中，直接返回
      if (this.fetchingNames.has(personDingID)) {
        return null;
      }

      // 检查是否已经缓存过
      const cachedName = this.participantNames.get(personDingID);
      if (cachedName && cachedName !== personDingID) {
        return cachedName;
      }

      try {
        this.fetchingNames.add(personDingID);

        // 构造请求参数
        const param = {
          Person_DingID: personDingID
        };
        // 调用后端接口获取人员信息
        return await new Promise((resolve, reject) => {
          SensorRequest.PersonGetFun(JSON.stringify(param),
            (respData) => {
              console.log(`📋 获取到人员信息：${personDingID}`, respData);
              let personName = personDingID; // 默认返回 DingID
              // ✅ 修改：根据后端返回的数组格式解析姓名
              if (respData) {
                try {
                  // 如果 respData 是字符串，尝试解析为 JSON
                  const data = typeof respData === 'string' ? JSON.parse(respData) : respData;
                  // 如果是数组，取第一个元素
                  if (Array.isArray(data) && data.length > 0) {
                    const personInfo = data[0];
                    // 优先使用 Person_Name 字段
                    if (personInfo.Person_Name) {
                      personName = personInfo.Person_Name;
                    } else if (personInfo.name) {
                      personName = personInfo.name;
                    }
                    console.log(`✅ 成功获取姓名：${personInfo.Person_DingID} -> ${personName}`);
                  } else if (data && data.Person_Name) {
                    // 如果不是数组而是单个对象
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
              resolve(personDingID); // 失败时返回 DingID
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

    // ✅ 修改：异步获取并注册姓名
    async fetchAndRegisterName(participantId, currentName) {
      // 如果当前 name 不为空且不等于 identity，直接使用
      if (currentName && currentName.trim() !== '' && currentName !== participantId) {
        this.registerParticipantName(participantId, currentName);
        return;
      }

      // 否则调用后端接口获取真实姓名
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
          audioCaptureDefaults: { echoCancellation: true, noiseCancellation: true, autoGainControl: true }
        });
        this.setupRoomEvents();
        await this.room.connect(this.wsUrl, token, { name: userName });
        this.roomName = this.room.name;

        this.localParticipantId = this.room.localParticipant.identity;

        // ✅ 关键：注册自己的姓名到映射表
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
          audio: { echoCancellation: true, noiseCancellation: true, autoGainControl: true }
        });
        const publications = await Promise.all(
          tracks.map(track => this.room.localParticipant.publishTrack(track))
        );
        const cameraPub = publications.find(pub => pub.track && pub.track.kind === Track.Kind.Video);
        const micPub = publications.find(pub => pub.track && pub.track.kind === Track.Kind.Audio);
        if (cameraPub && cameraPub.track) {
          this.localCameraTrack = cameraPub.track;
          this.updateParticipantVideo(this.localParticipantId, true, this.localCameraTrack);
        }
        if (micPub && micPub.track) this.updateParticipantAudio(this.localParticipantId, true);
        this.cameraEnabled = true;
        this.microphoneEnabled = true;
        if (this.screenShareActive) this.$nextTick(() => this.bindLocalCameraToFloating());
      } catch (error) {
        console.warn('媒体初始化失败:', error);
        this.$toast.fail('无法访问摄像头/麦克风：' + (error.message || '请检查权限设置'));
        this.updateParticipantVideo(this.localParticipantId, false, null);
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
      if (!p) return;
      p.hasVideo = hasVideo;
      p.videoTrack = track;
      this.$set(this.participants, participantId, p);

      const videoEl = this.videoRefs.get(participantId);
      if (videoEl) {
        if (hasVideo && track) {
          if (videoEl.srcObject) videoEl.srcObject = null;
          track.attach(videoEl);
        } else if (!hasVideo && videoEl.srcObject) {
          videoEl.srcObject = null;
        }
      } else {
        this.$nextTick(() => {
          const fallbackEl = document.querySelector(`video[data-participant-id="${participantId}"]`);
          if (fallbackEl) {
            if (hasVideo && track) {
              if (fallbackEl.srcObject) fallbackEl.srcObject = null;
              track.attach(fallbackEl);
            } else if (!hasVideo && fallbackEl.srcObject) {
              fallbackEl.srcObject = null;
            }
          }
        });
      }
    },

    updateParticipantAudio(participantId, hasAudio) {
      const p = this.participants[participantId];
      if (p) {
        p.hasAudio = hasAudio;
        this.$set(this.participants, participantId, p);
      }
    },

    setVideoRef(id, el) {
      if (el) {
        this.videoRefs.set(id, el);
        const p = this.participants[id];
        if (p && p.videoTrack && el && el.srcObject !== p.videoTrack.mediaStream) {
          p.videoTrack.attach(el);
        }
      } else {
        this.videoRefs.delete(id);
      }
    },

    setGalleryVideoRef(id, el) {
      if (el) this.galleryVideoRefs.set(id, el);
      else this.galleryVideoRefs.delete(id);
      const p = this.participants[id];
      if (p && p.videoTrack && el) p.videoTrack.attach(el);
    },

    // ==================== 房间事件（带后端接口调用） ====================
    setupRoomEvents() {
      const room = this.room;
      if (!room) {
        console.warn('setupRoomEvents: room is null');
        return;
      }
      // 连接成功
      room.on(RoomEvent.Connected, () => {
        console.log('✅ 房间连接成功');
        // ✅ 遍历已连接的参与者，直接使用他们的 name 属性
        if (room.participants && typeof room.participants.values === 'function') {
          for (const participant of room.participants.values()) {
            if (!this.participants[participant.identity]) {
              // ✅ 先使用现有的 name，后续可能会通过后端接口更新
              let displayName = participant.identity;

              if (participant.name && participant.name.trim() !== '' && participant.name !== participant.identity) {
                displayName = participant.name;
              }
              // ✅ 注册到映射表
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
              // ✅ 如果 name 为空或等于 identity，异步获取真实姓名
              if (!participant.name || participant.name.trim() === '' || participant.name === participant.identity) {
                this.fetchAndRegisterName(participant.identity, participant.name);
              }
            }
          }
        }
      });

      // 新参与者加入
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('👤 新参与者加入:', participant.identity, ', name:', participant.name);

        // ✅ 先使用现有的 name，后续可能会通过后端接口更新
        let displayName = participant.identity;

        if (participant.name && participant.name.trim() !== '' && participant.name !== participant.identity) {
          displayName = participant.name;
        }

        // ✅ 注册到映射表
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

        // ✅ 如果 name 为空或等于 identity，异步获取真实姓名
        if (!participant.name || participant.name.trim() === '' || participant.name === participant.identity) {
          this.fetchAndRegisterName(participant.identity, participant.name);
        }
      });

      // 参与者断开 - 清除姓名映射
      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('👋 参与者离开:', participant.identity);
        // ✅ 从内存中清除该参会者的姓名信息
        this.unregisterParticipantName(participant.identity);
        this.$delete(this.participants, participant.identity);
        if (this.activeScreenShare === participant.identity) this.activeScreenShare = false;
      });

      // 房间断开 - 清除所有姓名映射
      room.on(RoomEvent.Disconnected, () => {
        console.log('🔌 房间已断开');
        Object.keys(this.participants).forEach(key => {
          this.unregisterParticipantName(key);
          this.$delete(this.participants, key);
        });
        this.activeScreenShare = false;
        this.roomName = '未连接';
      });

      // 轨道订阅
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        const participantId = participant.identity;
        if (!this.participants[participantId]) {
          let displayName = participantId;

          if (participant.name && participant.name.trim() !== '' && participant.name !== participantId) {
            displayName = participant.name;
          }

          // ✅ 注册到映射表
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

          // ✅ 如果 name 为空或等于 identity，异步获取真实姓名
          if (!participant.name || participant.name.trim() === '' || participant.name === participantId) {
            this.fetchAndRegisterName(participantId, participant.name);
          }
        }
        if (track.kind === Track.Kind.Video) {
          this.updateParticipantVideo(participantId, true, track);
        } else if (track.kind === Track.Kind.Audio) {
          this.updateParticipantAudio(participantId, true);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        const participantId = participant.identity;
        if (track.kind === Track.Kind.Video) {
          this.updateParticipantVideo(participantId, false, null);
        } else if (track.kind === Track.Kind.Audio) {
          this.updateParticipantAudio(participantId, false);
        }
      });
    },

    // ==================== 控制方法 ====================
    async toggleCamera() {
      if (!this.room || !this.room.localParticipant) return;
      const newEnabled = !this.cameraEnabled;
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
        if (this.screenShareActive) this.$nextTick(() => this.bindLocalCameraToFloating());
      } catch (err) {
        this.$toast.fail('切换摄像头失败');
      }
    },

    async toggleMicrophone() {
      if (!this.room || !this.room.localParticipant) return;
      const newEnabled = !this.microphoneEnabled;
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
      if (this.screenShareActive) {
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
        this.screenShareTrack = localScreenTrack;
        this.screenShareActive = true;
        this.activeScreenShare = this.localParticipantId;

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
      if (this.screenShareTrack) {
        await this.room.localParticipant.unpublishTrack(this.screenShareTrack);
        this.screenShareTrack.stop();
        this.screenShareTrack = null;
      }
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(t => t.stop());
        this.screenStream = null;
      }
      this.screenShareActive = false;
      if (this.activeScreenShare === this.localParticipantId) this.activeScreenShare = false;
      this.$toast.success('屏幕共享已停止');
    },

    bindLocalCameraToFloating() {
      if (!this.screenShareActive) return;
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

    switchToParticipant(item) {
      // 可扩展
    },

    showMemberList() {
      const members = Object.values(this.participants).map(p => ({
        name: this.getDisplayNameById(p.id),
        isLocal: p.isLocal,
      }));
      let html = '<div style="padding: 12px;"><div style="max-height: 400px; overflow-y: auto;">';
      members.forEach(m => {
        html += `<div style="padding: 8px 0; border-bottom: 1px solid #eee;">${m.isLocal ? '👤 ' : '👥 '}${m.name}${m.isLocal ? ' (我)' : ''}</div>`;
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
      this.$dialog.confirm({
        title: '确认离开',
        message: '确定要离开当前会议室吗？',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      }).then(() => {
        this.disconnectRoom();
        this.$toast.success('已离开会议室');
        setTimeout(() => this.$router.back(), 1000);
      });
    },

    disconnectRoom() {
      if (this.screenShareActive) this.stopScreenShare();
      if (this.room) {
        this.room.disconnect();
        this.room = null;
      }
      // ✅ 清除所有参会者姓名映射
      Object.keys(this.participants).forEach(key => {
        this.unregisterParticipantName(key);
        this.$delete(this.participants, key);
      });
      this.activeScreenShare = false;
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

/* 腾讯会议风格布局 */
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
.screen-share-view {
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}
.screen-share-content {
  width: 100%;
  height: 100%;
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

/* 视频网格 */
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

/* 画廊容器（共享模式下） */
.gallery-dock {
  position: fixed;
  bottom: 90px;
  right: 16px;
  width: 280px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 8px;
  z-index: 200;
}
.gallery-scroll {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}
.gallery-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}
.gallery-item:hover {
  background: rgba(255, 255, 255, 0.2);
}
.gallery-video {
  width: 48px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
  background: #2d2d3a;
}
.gallery-name {
  font-size: 12px;
  color: #fff;
  flex: 1;
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
  .gallery-dock {
    width: 240px;
    bottom: 80px;
    right: 8px;
  }
  .floating-camera {
    width: 180px;
    height: 135px;
    bottom: 80px;
    right: 8px;
  }
}
</style>
