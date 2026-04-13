<template>
  <div class="video-meeting-container" :class="{ 'screen-sharing-mode': viewMode === 'screen-share' }">
    <!-- 钉钉环境提示层 -->
    <div v-if="isInDingTalk" class="dingtalk-overlay">
      <div class="dingtalk-card">
        <div class="dingtalk-icon">⚠️</div>
        <p><strong>由于钉钉环境不支持共享屏幕等权限</strong></p>
        <p><strong>视频会议无法正常运行</strong></p>
        <p>1、PC端请点击下方按钮，复制会议链接打开</p>
        <p>2、移动端请点击右上方...选择默认浏览器打开</p>
        <button @click="openInBrowser" class="open-browser-btn">在浏览器中打开</button>
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

      <!-- 成员列表弹窗 -->
      <div v-if="showMemberListDialog" class="member-list-overlay" @click="hideMemberList">
        <div class="member-list-dialog" @click.stop>
          <div class="member-list-header">
            <h3>参会成员 ({{ totalParticipants }})</h3>
            <div class="header-actions">
              <div v-if="isHost" class="batch-controls">
                <button @click="toggleAllParticipants('video')" class="batch-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15 8v8H5V8h10m1-2H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4V7c0-.55-.45-1-1-1z" fill="currentColor"/>
                  </svg>
                  批量视频
                </button>
                <button @click="toggleAllParticipants('audio')" class="batch-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 16c-2.21 0-4-1.79-4-4V6c0-2.21 1.79-4 4-4s4 1.79 4 4v6c0 2.21-1.79 4-4 4zm-6-4c0 3.31 2.69 6 6 6s6-2.69 6-6h-2c0 2.21-1.79 4-4 4s-4-1.79-4-4H6z" fill="currentColor"/>
                  </svg>
                  批量音频
                </button>
              </div>
              <button @click="hideMemberList" class="close-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="member-list-content">
            <div v-for="(participant, id) in participants" :key="id" class="member-item">
              <div class="member-avatar">
                <div class="avatar-icon">{{ getDisplayNameById(id).charAt(0).toUpperCase() }}</div>
              </div>
              <div class="member-info">
                <div class="member-name">
                  {{ getDisplayNameById(id) }}{{ participant.isLocal ? ' (我)' : '' }}
                  <span v-if="participant.isHost" class="host-badge-small">主持人</span>
                </div>
                <div class="member-status">
                  <span v-if="participant.hasVideo" class="status-indicator video-on">视频开启</span>
                  <span v-else class="status-indicator video-off">视频关闭</span>
                  <span v-if="participant.hasAudio" class="status-indicator audio-on">麦克风开启</span>
                  <span v-else class="status-indicator audio-off">麦克风关闭</span>
                </div>
              </div>
              <div v-if="isHost && !participant.isLocal" class="member-controls">
                <button @click="toggleParticipantVideo(id)" class="control-icon" :class="{ active: participant.hasVideo }" :title="participant.hasVideo ? '关闭视频' : '开启视频'">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15 8v8H5V8h10m1-2H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4V7c0-.55-.45-1-1-1z" fill="currentColor"/>
                  </svg>
                </button>
                <button @click="toggleParticipantAudio(id)" class="control-icon" :class="{ active: participant.hasAudio }" :title="participant.hasAudio ? '关闭麦克风' : '开启麦克风'">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 16c-2.21 0-4-1.79-4-4V6c0-2.21 1.79-4 4-4s4 1.79 4 4v6c0 2.21-1.79 4-4 4zm-6-4c0 3.31 2.69 6 6 6s6-2.69 6-6h-2c0 2.21-1.79 4-4 4s-4-1.79-4-4H6z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主视频区域 -->
      <div class="video-area" ref="videoArea">
        <!-- 屏幕共享模式 -->
        <div v-if="viewMode === 'screen-share'" class="screen-share-layout">
          <div class="main-screen">
            <!-- 远程共享的屏幕视频 -->
            <video
              ref="remoteScreenVideo"
              autoplay
              playsinline
              class="screen-video"
              style="width: 100%; height: 100%; object-fit: contain; video-rendering-quality: high;"
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
                  :style="{ display: item.hasVideo ? 'block' : 'none' }"
                ></video>
                <div v-if="!item.hasVideo" class="sidebar-avatar-placeholder">
                  <div class="sidebar-avatar-icon">{{ getDisplayNameById(item.id).charAt(0).toUpperCase() }}</div>
                </div>
                <div class="sidebar-name">{{ getDisplayNameById(item.id) }}{{ item.isHost ? ' (主持人)' : '' }}</div>
                <div v-if="item.isHost" class="sidebar-host-badge">主持人</div>
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
                {{ getDisplayName(item) }}{{ item.isLocal ? ' (我)' : '' }}{{ item.isHost ? ' (主持人)' : '' }}
              </div>
              <div v-if="!item.hasAudio" class="audio-mute-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" fill="currentColor"/>
                </svg>
              </div>
              <div v-if="item.isHost" class="host-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2L2 7l10 5 10-5-10-5zm0 3.84L18.16 7 12 9.68 5.84 7 12 5.84zm0 12.92c-1.66 0-3-1.34-3-3 0-.73.33-1.38.84-1.81L9 13.42c-.31.41-.5.89-.5 1.4V19h6v-2.16c0-.51-.19-1-.5-1.4l-1.84-1.84c.51-.43.84-1.08.84-1.81 0-1.66-1.34-3-3-3z" fill="currentColor"/>
                </svg>
                主持人
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
import {GetDingUserToken, key_DingTokenJWT, key_VideoMeetingToken, setNewVideoMeetingToken, isVideoMeetingTokenValid} from '../../utils/Dingding.js';
import SensorRequestPage from "../../utils/SensorRequestPage";
import SensorRequestMeeting from "../../utils/SensorRequestMeeting";

export default {
  name: 'VideoMeetingMobile',
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
      // Token获取状态
      isWaitingForToken: false,
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
      // 主持人相关
      initiator: null, // 会议发起人信息
      isHost: false, // 当前用户是否为主持人
      // 连接状态
      isDisconnected: false, // 房间是否已断开
      // 成员列表弹窗
      showMemberListDialog: false,
      // 一次性密钥存储
      onceToken: null,
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
          isHost: p.isHost,
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
          items.push({ id, name: p.name, displayName: p.displayName, isHost: p.isHost, hasVideo: p.hasVideo });
        }
      }
      return items;
    },
    localVideoItem() {
      if (!this.localParticipantId) return null;
      const p = this.participants[this.localParticipantId];
      return p ? { id: p.id, name: p.name, displayName: p.displayName, isHost: p.isHost, hasVideo: p.hasVideo } : null;
    },
    totalParticipants() {
      return Object.keys(this.participants).length;
    },
  },
  created() {
    const rawData = this.$route.query.data || '';
    console.log('[VideoMeetingMobile] 获取原始会议地址参数：', rawData);

    try {
      // ✅ 第一步：Base64 解码
      let decodedData = rawData;

      // 检查是否是 Base64 编码（包含常见 Base64 特征）
      if (rawData && /^[A-Za-z0-9+/=]+$/.test(rawData) && rawData.length > 100) {
        console.log('[VideoMeetingMobile] 检测到 Base64 编码，开始解码...');
        // 浏览器环境使用 atob 进行 Base64 解码
        decodedData = decodeURIComponent(escape(window.atob(rawData)));
        console.log('[VideoMeetingMobile] Base64 解码成功:', decodedData);
      } else {
        // 如果不是 Base64，尝试 URL 解码
        decodedData = decodeURIComponent(rawData);
        console.log('[VideoMeetingMobile] URL 解码结果:', decodedData);
      }

      this.meetingUrl = decodedData;
      console.log('[VideoMeetingMobile] 最终会议地址：', this.meetingUrl);

      // ✅ 第二步：解析 JSON 字符串为对象
      let meetingData = null;
      meetingData = typeof this.meetingUrl === 'string' ? JSON.parse(this.meetingUrl) : this.meetingUrl;
      console.log('[VideoMeetingMobile] 解析后的会议数据：', meetingData);
      console.log('[VideoMeetingMobile] 获取会议房间：', meetingData.room);
      console.log('[VideoMeetingMobile] 获取会议参与者：', meetingData.user);
      this.roomName = meetingData.room || '未命名会议';

      // ✅ 第三步：获取并解析发起人信息
      const initiatorParam = this.$route.query.initiator;
      if (initiatorParam) {
        try {
          this.initiator = JSON.parse(decodeURIComponent(initiatorParam));
          console.log('[VideoMeetingMobile] 解析后的发起人信息：', this.initiator);
        } catch (e) {
          console.error('[VideoMeetingMobile] 解析发起人信息失败:', e);
        }
      }
    } catch (error) {
      console.error('[VideoMeetingMobile] 解析会议数据失败:', error);
      console.error('[VideoMeetingMobile] 原始数据:', this.$route.query.data);
      this.roomName = '未命名会议';
      this.$toast.fail('会议数据格式错误');
    }
    document.title = this.roomName;
  },

  mounted() {
    this.checkDingTalkEnvironment();

    if (!this.isInDingTalk) {
      const urlToken = this.$route.query.token;
      const onceToken = this.$route.query.onceToken;
      this.onceToken = onceToken; // 存储一次性密钥，用于token过期时重新获取
      console.log('[VideoMeetingMobile] 检测到浏览器环境');
      console.log('[VideoMeetingMobile] URL中的token参数:', urlToken);
      console.log('[VideoMeetingMobile] URL中的一次性密钥:', onceToken);
      // ✅ 检查视频会议专用的token缓存（不是钉钉登录token）
      const cachedVideoToken = localStorage.getItem(key_VideoMeetingToken);
      console.log('[VideoMeetingMobile] 视频会议专用token缓存:', cachedVideoToken ? '存在' : '不存在');
      console.log('[VideoMeetingMobile] 视频会议token是否有效:', isVideoMeetingTokenValid() ? '有效' : '无效');
      if (cachedVideoToken && isVideoMeetingTokenValid()) {
        // 缓存中存在有效的视频会议token，直接使用，无需调用接口
        console.log('[VideoMeetingMobile] 使用缓存中的有效视频会议token，无需重新获取：'+ cachedVideoToken);
        // 直接加入房间
        this.parseAndJoinRoom();
      } else if (onceToken && typeof onceToken === 'string') {
        // 缓存中不存在视频会议token，但URL中有一次性密钥，调用接口获取长时间token
        console.log('[VideoMeetingMobile] 缓存中无视频会议token，使用一次性密钥获取长时间token...');
        this.isWaitingForToken = true;
        this.fetchLongTokenByOnce(onceToken);
      } else {
        console.warn('[VideoMeetingMobile] 未找到有效的token或一次性密钥');
        this.$toast.fail('缺少身份验证信息');
        setTimeout(() => this.leaveRoom(), 1500);
      }
    } else {
      // 钉钉环境下直接返回
      return;
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
          const handleTokenExpired = () => {
            console.log(`🔄 视频会议 - token过期，重新获取token`);
            if (this.onceToken) {
              console.log(`🔄 视频会议 - 使用存储的一次性密钥重新获取token`);
              this.fetchLongTokenByOnce(this.onceToken, () => {
                // 重新尝试获取人员信息
                SensorRequestMeeting.PersonGetFunMeeting(
                  JSON.stringify(param),
                  (respData) => {
                    console.log(`📋 视频会议 - 获取到人员信息：${personDingID}`, respData);
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
                          console.log(`✅ 视频会议 - 成功获取姓名：${personInfo.Person_DingID} -> ${personName}`);
                        } else if (data && data.Person_Name) {
                          personName = data.Person_Name;
                        }
                      } catch (error) {
                        console.warn('视频会议 - 解析人员信息失败:', error);
                      }
                    }
                    resolve(personName);
                  },
                  (error) => {
                    console.warn(`❌视频会议 -  获取人员信息失败：${personDingID}`, error);
                    resolve(personDingID);
                  }
                );
              });
            } else {
              console.warn(`❌ 视频会议 - 没有一次性密钥，无法重新获取token`);
              resolve(personDingID);
            }
          };
          SensorRequestMeeting.PersonGetFunMeeting(
            JSON.stringify(param),
            (respData) => {
              console.log(`📋 视频会议 - 获取到人员信息：${personDingID}`, respData);
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
                    console.log(`✅ 视频会议 - 成功获取姓名：${personInfo.Person_DingID} -> ${personName}`);
                  } else if (data && data.Person_Name) {
                    personName = data.Person_Name;
                  }
                } catch (error) {
                  console.warn('视频会议 - 解析人员信息失败:', error);
                }
              }
              resolve(personName);
            },
            (error) => {
              console.warn(`❌视频会议 -  获取人员信息失败：${personDingID}`, error);
              resolve(personDingID);
            },
            handleTokenExpired
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

    // ==================== 成员列表管理 ====================
    showMemberList() {
      this.showMemberListDialog = true;
    },
    hideMemberList() {
      this.showMemberListDialog = false;
    },
    inviteMember() {
      this.$toast('功能正在开发中...');
    },
    // 主持人控制其他成员的视频
    toggleParticipantVideo(participantId) {
      if (!this.isHost || this.isDisconnected) return;
      const participant = this.participants[participantId];
      if (!participant || participant.isLocal) return;

      const action = participant.hasVideo ? 'disable-video' : 'enable-video';
      this.sendControlMessage(participantId, action);
    },
    // 主持人控制其他成员的音频
    toggleParticipantAudio(participantId) {
      if (!this.isHost || this.isDisconnected) return;
      const participant = this.participants[participantId];
      if (!participant || participant.isLocal) return;

      const action = participant.hasAudio ? 'mute-audio' : 'unmute-audio';
      this.sendControlMessage(participantId, action);
    },
    // 发送控制消息
    sendControlMessage(participantId, action) {
      if (!this.room || this.isDisconnected) return;

      // 构建控制消息
      const controlMessage = {
        type: 'moderator-request',
        target: participantId,
        action: action
      };

      try {
        // 发送数据消息给目标参与者
        // 使用LiveKit SDK的publishData方法发送控制指令（v2.18.0版本）
        this.room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify(controlMessage)),
          {
            destinationIdentities: [participantId],
            reliable: true
          }
        );
        console.log(`✅ 发送控制消息: ${action} 到 ${participantId}`);
        // 同时更新本地状态
        const participant = this.participants[participantId];
        if (participant) {
          if (action === 'disable-video' || action === 'enable-video') {
            participant.hasVideo = action === 'enable-video';
            this.$set(this.participants, participantId, participant);
            this.$toast.success(`已${action === 'enable-video' ? '开启' : '关闭'}${this.getDisplayNameById(participantId)}的视频`);
          } else if (action === 'mute-audio' || action === 'unmute-audio') {
            participant.hasAudio = action === 'unmute-audio';
            this.$set(this.participants, participantId, participant);
            this.$toast.success(`已${action === 'unmute-audio' ? '取消静音' : '静音'}${this.getDisplayNameById(participantId)}的麦克风`);
          }
        }
      } catch (error) {
        console.error('发送控制消息失败:', error);
        this.$toast.fail('控制失败，请重试');
      }
    },
    // 批量控制所有参与者
    toggleAllParticipants(actionType) {
      if (!this.isHost || this.isDisconnected) return;

      // 构建批量控制消息
      const controlMessage = {
        type: 'moderator-request',
        target: 'all',
        action: actionType === 'video' ? 'disable-video' : 'mute-audio'
      };
      try {
        // 发送批量控制消息给所有参与者
        this.room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify(controlMessage)),
          {
            destinationIdentities: Object.keys(this.participants).filter(id => !this.participants[id].isLocal),
            reliable: true
          }
        );
        console.log(`✅ 发送批量控制消息: ${controlMessage.action} 到所有参与者`);
        // 同时更新本地状态
        Object.keys(this.participants).forEach(participantId => {
          const participant = this.participants[participantId];
          if (!participant.isLocal) {
            if (actionType === 'video') {
              participant.hasVideo = false;
              this.$set(this.participants, participantId, participant);
            } else if (actionType === 'audio') {
              participant.hasAudio = false;
              this.$set(this.participants, participantId, participant);
            }
          }
        });
        this.$toast.success(`已批量${actionType === 'video' ? '关闭' : '静音'}所有参与者的${actionType === 'video' ? '视频' : '麦克风'}`);
      } catch (error) {
        console.error('发送批量控制消息失败:', error);
        this.$toast.fail('批量控制失败，请重试');
      }
    },

// ==================== Token获取 ====================
    /**
     * 使用一次性密钥获取长时间token（并加入房间）
     * @param {string} onceToken - 一次性密钥
     * @param {function} callback - 获取token后的回调函数
     */
    fetchLongTokenByOnce(onceToken, callback) {
      console.log('[VideoMeetingMobile] 开始调用Ding_GetTokenByOnce接口...');
      console.log('[VideoMeetingMobile] 一次性密钥:', onceToken);

      SensorRequestPage.Ding_GetTokenByOnce(
        onceToken,
        (longToken) => {
          try {
            console.log('[VideoMeetingMobile] 获取长时间token成功:', longToken);

            if (longToken && typeof longToken === 'string') {
              // ✅ 保存到视频会议专用的token存储中
              setNewVideoMeetingToken(longToken);
              console.log('[VideoMeetingMobile] 已保存长时间token到localStorage（视频会议专用）')
              this.$toast.success('身份验证成功');
              // 调用回调函数
              if (callback) {
                callback();
              } else {
                // 直接加入房间
                this.parseAndJoinRoom();
              }
            } else {
              console.error('[VideoMeetingMobile] 返回的token格式不正确:', longToken);
              this.$toast.fail('获取token失败');
              if (callback) {
                callback();
              }
            }
          } catch (error) {
            console.error('[VideoMeetingMobile] 处理长时间token失败:', error);
            this.$toast.fail('token处理失败');
            if (callback) {
              callback();
            }
          }
        },
        (error) => {
          console.error('[VideoMeetingMobile] 获取长时间token失败:', error);
          this.$toast.fail('身份验证失败，请重新进入会议');
          if (callback) {
            callback();
          }
        }
      );
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

    // ==================== 房间连接 ====================
    parseAndJoinRoom() {
      try { // this.meetingUrl 现在是 JSON 字符串格式
        const meetingData = typeof this.meetingUrl === 'string' ? JSON.parse(this.meetingUrl) : this.meetingUrl;
        console.log('解析会议数据:', meetingData);
        if (!meetingData.token || !meetingData.room) {
          throw new Error('会议数据缺少必要字段');
        }
        this.joinRoom(meetingData.room, meetingData.user || '参会者', meetingData.token);
      } catch (error) {
        console.error('解析会议数据失败:', error);
        this.$toast.fail('会议数据解析失败');
      }
    },
    async joinRoom(roomName, userName, token) {
      console.log('连接解析-加入会议室房间名称:', roomName, userName);
      console.log('连接解析-加入会议室token:', token);
      // 重置连接状态
      this.isDisconnected = false;
      const loadingToast = this.$toast.loading({ message: '正在加入会议室...', forbidClick: true, duration: 0 });
      try {
        this.room = new Room({
          adaptiveStream: false, // 禁用自适应流，确保屏幕共享始终保持高质量
          dynacast: true,
          videoCaptureDefaults: { resolution: VideoPresets.h720 },
          audioCaptureDefaults: { echoCancellation: true, noiseCancellation: true, autoGainControl: true },
          networkQuality: {
            enabled: true,
            interval: 1000,
          },
          videoSubscription: {
            quality: 'high',
            maxWidth: 3840, // 提高最大宽度以支持4K屏幕共享
            maxHeight: 2160, // 提高最大高度以支持4K屏幕共享
            maxFrameRate: 30,
          },
        });
        this.setupRoomEvents();
        await this.room.connect(this.wsUrl, token, { name: userName });
        this.roomName = this.room.name;

        this.localParticipantId = this.room.localParticipant.identity;
        this.registerParticipantName(this.localParticipantId, userName);

        // 判断当前用户是否为主持人 - 支持通过姓名或钉钉ID判断
        if (this.initiator && (userName === this.initiator.Person_Name || this.room.localParticipant.identity === this.initiator.Person_DingID)) {
          this.isHost = true;
          console.log('[VideoMeetingMobile] 当前用户为主持人:', userName);
        }

        this.$set(this.participants, this.localParticipantId, {
          id: this.localParticipantId,
          name: userName,
          displayName: userName,
          isLocal: true,
          isHost: this.isHost,
          hasVideo: false,
          hasAudio: false,
          videoTrack: null,
          audioTrack: null,
        });

        await this.enableMedia();

        loadingToast.close();
        if (this.isHost) {
          this.$toast.success(userName + '已进入会议室（主持人）');
        } else {
          this.$toast.success(userName + '已进入会议室');
        }
      } catch (error) {
        console.error('连接失败:', error);
        loadingToast.close();
        this.$toast.fail('连接失败：' + (error.message || '未知错误'));
      }
    },

    async enableMedia() {
      if (this.isDisconnected) {
        console.log('[enableMedia] 房间已断开，跳过媒体初始化');
        return;
      }
      try {
        const tracks = await createLocalTracks({
          video: { resolution: VideoPresets.h540, facingMode: 'user' },
          audio: { echoCancellation: true, noiseCancellation: true, autoGainControl: true },
        });
        // 检查是否在获取轨道期间房间已断开
        if (this.isDisconnected) {
          console.log('[enableMedia] 获取轨道期间房间已断开，停止发布');
          tracks.forEach(track => track.stop());
          return;
        }
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
        let errorMsg = '无法访问摄像头/麦克风';
        if (error.name === 'NotReadableError') {
          errorMsg = '摄像头/麦克风被其他应用占用，请关闭其他使用摄像头的程序后刷新页面重试';
        } else if (error.name === 'NotAllowedError') {
          errorMsg = '摄像头/麦克风权限被拒绝，请在浏览器设置中允许访问';
        } else if (error.name === 'NotFoundError') {
          errorMsg = '未找到摄像头或麦克风设备';
        } else if (error.name === 'OverconstrainedError') {
          errorMsg = '设备不支持请求的分辨率，请尝试降低视频质量';
        }
        this.$toast.fail(errorMsg);
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
      if (this.isDisconnected) {
        console.log(`[updateParticipantVideo] 房间已断开，忽略更新: ${participantId}`);
        return;
      }
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
          // 确保视频元素显示设置
          videoEl.style.width = '100%';
          videoEl.style.height = '100%';
          videoEl.style.objectFit = 'contain';
          videoEl.style.videoRenderingQuality = 'high';
          videoEl.style.transform = 'translateZ(0)';
          track.attach(videoEl);
          console.log(`✅ 已将视频轨道附加到 ${participantId}`);
        } else {
          this.$nextTick(() => {
            const fallbackEl = document.querySelector(`video[data-participant-id="${participantId}"]`);
            if (fallbackEl && track) {
              // 确保视频元素显示设置
              fallbackEl.style.width = '100%';
              fallbackEl.style.height = '100%';
              fallbackEl.style.objectFit = 'contain';
              fallbackEl.style.videoRenderingQuality = 'high';
              fallbackEl.style.transform = 'translateZ(0)';
              track.attach(fallbackEl);
              console.log(`✅ (fallback) 已将视频轨道附加到 ${participantId}`);
            }
          });
        }
        // 同时更新侧边栏的视频
        const sidebarEl = this.sidebarVideoRefs.get(participantId);
        if (sidebarEl && sidebarEl.srcObject !== track.mediaStream) {
          if (sidebarEl.srcObject) sidebarEl.srcObject = null;
          // 确保侧边栏视频元素显示设置
          sidebarEl.style.width = '100%';
          sidebarEl.style.height = '100%';
          sidebarEl.style.objectFit = 'cover';
          sidebarEl.style.videoRenderingQuality = 'high';
          sidebarEl.style.transform = 'translateZ(0)';
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
      if (this.isDisconnected) {
        console.log(`[updateParticipantAudio] 房间已断开，忽略更新: ${participantId}`);
        return;
      }
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
              // 检查是否是主持人 - 支持通过姓名或钉钉ID判断
              const isParticipantHost = this.initiator && (
                displayName === this.initiator.Person_Name ||
                participant.identity === this.initiator.Person_DingID
              );
              this.registerParticipantName(participant.identity, displayName);
              this.$set(this.participants, participant.identity, {
                id: participant.identity,
                name: displayName,
                displayName: displayName,
                isLocal: false,
                isHost: isParticipantHost,
                hasVideo: false,
                hasAudio: false,
                videoTrack: null,
                audioTrack: null,
              });
              console.log(`👤 发现参与者：${participant.identity}, name: ${displayName}${isParticipantHost ? ' (主持人)' : ''}`);
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
        // 检查是否是主持人 - 支持通过姓名或钉钉ID判断
        const isParticipantHost = this.initiator && (
          displayName === this.initiator.Person_Name ||
          participant.identity === this.initiator.Person_DingID
        );
        this.registerParticipantName(participant.identity, displayName);
        this.$set(this.participants, participant.identity, {
          id: participant.identity,
          name: displayName,
          displayName: displayName,
          isLocal: false,
          isHost: isParticipantHost,
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
          // 检查是否是主持人 - 支持通过姓名或钉钉ID判断
          const isParticipantHost = this.initiator && (
            displayName === this.initiator.Person_Name ||
            participantId === this.initiator.Person_DingID
          );
          this.registerParticipantName(participantId, displayName);
          this.$set(this.participants, participantId, {
            id: participantId,
            name: displayName,
            displayName: displayName,
            isLocal: false,
            isHost: isParticipantHost,
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
        if (track.source === Track.Source.ScreenShare || (track.kind === Track.Kind.Video && track.source === 'unknown')) {
            console.log('📺 接收到屏幕共享轨道，来自:', participantId, 'source:', track.source);
            // 先更新状态
            this.activeScreenShareId = participantId;
            this.viewMode = 'screen-share';

            // 等待模板渲染完成后再绑定视频元素
            this.$nextTick(() => {
              // 强制刷新确保视图更新
              this.$forceUpdate();
              console.log('🔄 强制刷新视图，切换到屏幕共享模式');

              // 再次等待模板完全渲染
              this.$nextTick(() => {
                let screenVideoEl = null;
                screenVideoEl = this.$refs.remoteScreenVideo;
                if (screenVideoEl) {
                  // 重置视频元素状态
                  if (screenVideoEl.srcObject) screenVideoEl.srcObject = null;

                  // 确保视频元素大小合适，优化显示设置
                  screenVideoEl.style.width = '100%';
                  screenVideoEl.style.height = '100%';
                  screenVideoEl.style.objectFit = 'contain';
                  screenVideoEl.style.videoRenderingQuality = 'high';
                  screenVideoEl.style.transform = 'translateZ(0)'; // 启用硬件加速
                  screenVideoEl.style.imageRendering = 'crisp-edges'; // 保持像素清晰，比pixelated效果更好
                  screenVideoEl.style.webkitTransform = 'translateZ(0)'; // 兼容性处理
                  screenVideoEl.style.mozTransform = 'translateZ(0)'; // 兼容性处理
                  screenVideoEl.style.msTransform = 'translateZ(0)'; // 兼容性处理
                  screenVideoEl.style.willChange = 'transform'; // 提示浏览器优化
                  screenVideoEl.style.backfaceVisibility = 'hidden'; // 提高渲染性能
                  screenVideoEl.style.perspective = '1000px'; // 增强3D渲染效果
                  screenVideoEl.style.perspectiveOrigin = 'center center'; // 增强3D渲染效果

                  // 确保轨道质量
                  if (track.videoDimensions) {
                    console.log(`📊 屏幕共享轨道尺寸: ${track.videoDimensions.width}x${track.videoDimensions.height}`);
                  }

                  // 检查轨道的发布信息
                  if (track.publication) {
                    console.log(`📢 轨道发布信息:`, track.publication);
                    // 确保订阅最高质量
                    if (track.publication.setQuality) {
                      track.publication.setQuality('high').catch(err => {
                        console.warn('设置轨道质量失败:', err);
                      });
                    }
                  }

                  // 附加轨道到视频元素
                  track.attach(screenVideoEl);

                  // 检查实际附加的流质量
                  const videoTracks = track.mediaStream.getVideoTracks();
                  if (videoTracks.length > 0) {
                    const videoTrack = videoTracks[0];
                    if (videoTrack.getSettings) {
                      const settings = videoTrack.getSettings();
                      console.log(`✅ 已将屏幕共享轨道附加到视频元素，视频轨道信息: width=${settings.width}, height=${settings.height}, frameRate=${settings.frameRate}`);
                    }
                  }
                } else {
                  console.warn('❌ 未找到屏幕共享视频元素，尝试使用DOM查询');
                  // 备选方案：直接通过DOM查询获取视频元素
                  const videoElements = document.querySelectorAll('.screen-video');
                  if (videoElements.length > 0) {
                    const videoEl = videoElements[0];
                    if (videoEl.srcObject) videoEl.srcObject = null;
                    // 确保视频元素大小合适，优化显示设置
                    videoEl.style.width = '100%';
                    videoEl.style.height = '100%';
                    videoEl.style.objectFit = 'contain';
                    videoEl.style.videoRenderingQuality = 'high';
                    videoEl.style.transform = 'translateZ(0)'; // 启用硬件加速
                    videoEl.style.imageRendering = 'crisp-edges'; // 保持像素清晰，比pixelated效果更好
                    videoEl.style.webkitTransform = 'translateZ(0)'; // 兼容性处理
                    videoEl.style.mozTransform = 'translateZ(0)'; // 兼容性处理
                    videoEl.style.msTransform = 'translateZ(0)'; // 兼容性处理
                    videoEl.style.willChange = 'transform'; // 提示浏览器优化
                    videoEl.style.backfaceVisibility = 'hidden'; // 提高渲染性能
                    videoEl.style.perspective = '1000px'; // 增强3D渲染效果
                    videoEl.style.perspectiveOrigin = 'center center'; // 增强3D渲染效果
                    track.attach(videoEl);
                    console.log(`✅ 已通过DOM查询将屏幕共享轨道附加到视频元素`);
                  }
                }
              });
            });
        } else if (track.kind === Track.Kind.Video) {
          this.updateParticipantVideo(participantId, true, track);
          // 确保侧边栏视频元素也被更新
          this.$nextTick(() => {
            const sidebarEl = this.sidebarVideoRefs.get(participantId);
            if (sidebarEl && track) {
              if (sidebarEl.srcObject) sidebarEl.srcObject = null;
              track.attach(sidebarEl);
              console.log(`✅ 已将视频轨道附加到侧边栏 ${participantId}`);
            }
          });
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
            const screenVideoEl = this.$refs.remoteScreenVideo;
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

      // 网络质量变化事件
      room.on(RoomEvent.NetworkQualityChanged, (quality) => {
        console.log(`📶 网络质量变化:`, quality);
        if (quality.downlinkQuality < 3) {
          console.warn(`⚠️ 网络质量较差，可能影响屏幕共享画质`);
          // 可以在这里添加网络质量警告提示
        }
      });

      // 数据消息接收事件
      room.on(RoomEvent.DataReceived, (payload, participant, kind) => {
        if (!participant) return;
        try {
          const message = JSON.parse(new TextDecoder().decode(payload));
          console.log('📨 收到数据消息:', message, '来自:', participant && participant.identity);
          if (message.type === 'moderator-request') {
            // 检查是否是发给自己的请求
            if (message.target === 'all' || message.target === this.localParticipantId) {
              console.log('🎯 收到主持人控制请求:', message.action);
              switch (message.action) {
                case 'disable-video':
                  if (this.cameraEnabled) {
                    this.toggleCamera();
                    this.$toast.info('主持人已关闭您的视频');
                  }
                  break;
                case 'enable-video':
                  if (!this.cameraEnabled) {
                    this.toggleCamera();
                    this.$toast.info('主持人已开启您的视频');
                  }
                  break;
                case 'mute-audio':
                  if (this.microphoneEnabled) {
                    this.toggleMicrophone();
                    this.$toast.info('主持人已将您静音');
                  }
                  break;
                case 'unmute-audio':
                  if (!this.microphoneEnabled) {
                    this.toggleMicrophone();
                    this.$toast.info('主持人已取消您的静音');
                  }
                  break;
              }
            }
          }
        } catch (error) {
          console.warn('解析数据消息失败:', error);
        }
      });
    },

    // ==================== 控制方法 ====================
    async toggleCamera() {
      if (!this.room || !this.room.localParticipant || this.isDisconnected) {
        console.log('[toggleCamera] 房间未连接或已断开，无法切换摄像头');
        return;
      }
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
        let errorMsg = '切换摄像头失败';
        if (err.name === 'NotReadableError') {
          errorMsg = '摄像头被其他应用占用，请关闭其他使用摄像头的程序后重试';
        } else if (err.name === 'NotAllowedError') {
          errorMsg = '摄像头权限被拒绝，请在浏览器设置中允许访问摄像头';
        } else if (err.name === 'NotFoundError') {
          errorMsg = '未找到摄像头设备';
        }
        this.$toast.fail(errorMsg);
        // 重置状态
        this.cameraEnabled = false;
        this.updateParticipantVideo(this.localParticipantId, false, null);
      }
    },

    async toggleMicrophone() {
      if (!this.room || !this.room.localParticipant || this.isDisconnected) {
        console.log('[toggleMicrophone] 房间未连接或已断开，无法切换麦克风');
        return;
      }
      const newEnabled = !this.microphoneEnabled;
      console.log(`🎤 切换麦克风: ${this.microphoneEnabled} -> ${newEnabled}`);
      try {
        await this.room.localParticipant.setMicrophoneEnabled(newEnabled);
        this.microphoneEnabled = newEnabled;
        this.updateParticipantAudio(this.localParticipantId, newEnabled);
      } catch (err) {
        console.error('切换麦克风失败:', err);
        let errorMsg = '切换麦克风失败';
        if (err.name === 'NotReadableError') {
          errorMsg = '麦克风被其他应用占用';
        } else if (err.name === 'NotAllowedError') {
          errorMsg = '麦克风权限被拒绝';
        } else if (err.name === 'NotFoundError') {
          errorMsg = '未找到麦克风设备';
        }
        this.$toast.fail(errorMsg);
        // 重置状态
        this.microphoneEnabled = false;
        this.updateParticipantAudio(this.localParticipantId, false);
      }
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
      this.isDisconnected = true;
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
      this.localParticipantId = null;
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
/* 原有样式保持不变，未做任何修改，确保功能完整 */
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
.sidebar-avatar-placeholder {
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
.sidebar-avatar-icon {
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
  z-index: 2;
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

.host-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(255, 215, 0, 0.8);
  border-radius: 12px;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #000;
  font-weight: 500;
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
    width: 140px;
  }
  .floating-camera {
    width: 160px;
    height: 120px;
    bottom: 80px;
    right: 8px;
  }
  /* 移动端屏幕共享模式优化 */
  .screen-share-layout {
    flex-direction: column;
  }
  .main-screen {
    flex: 1;
    min-height: 60vh;
  }
  .participants-sidebar {
    width: 100%;
    max-height: 200px;
    flex-direction: row;
  }
  .sidebar-videos {
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 8px 0;
  }
  .sidebar-item {
    min-width: 120px;
    max-width: 120px;
  }
  .sidebar-video-wrapper {
    aspect-ratio: 16 / 9;
  }
  .screen-video {
    object-fit: contain;
    width: 100%;
    height: 100%;
  }
}

/* 成员列表弹窗样式 */
.member-list-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.member-list-dialog {
  background-color: #1a1a1a;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.member-list-header {
  background-color: #2a2a2a;
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #333;
}

.member-list-header h3 {
  margin: 0;
  font-size: 18px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-controls {
  display: flex;
  gap: 8px;
}

.batch-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  color: white;
  transition: all 0.3s ease;
}

.batch-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.member-list-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 10px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border-radius: 8px;
  transition: background-color 0.3s ease;
  margin-bottom: 10px;
}

.member-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.member-avatar {
  flex-shrink: 0;
}

.member-info {
  flex: 1;
}

.member-name {
  font-size: 16px;
  font-weight: bold;
  color: white;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 8px;
  position: static;
  background: none;
  padding: 0;
  backdrop-filter: none;
}

.host-badge-small {
  background-color: rgba(255, 193, 7, 0.8);
  color: black;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
}

.member-status {
  display: flex;
  gap: 10px;
  font-size: 14px;
}

.status-indicator {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.status-indicator.video-on {
  background-color: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.status-indicator.video-off {
  background-color: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
}

.status-indicator.audio-on {
  background-color: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.status-indicator.audio-off {
  background-color: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
}

.member-controls {
  display: flex;
  gap: 10px;
}

.control-icon {
  background: none;
  border: none;
  color: #9e9e9e;
  font-size: 18px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.control-icon:hover {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.control-icon.active {
  color: #3f83f8;
}
</style>