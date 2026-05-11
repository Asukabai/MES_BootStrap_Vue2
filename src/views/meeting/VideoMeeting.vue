<template>
  <div class="video-meeting-container" :class="{ 'screen-sharing-mode': viewMode === 'screen-share' }">
    <!-- 钉钉环境提示层 -->
    <div v-if="isInDingTalk" class="dingtalk-overlay">
      <div class="dingtalk-card">
        <div class="dingtalk-icon">⚠️</div>
        <p><strong>钉钉环境不支持共享屏幕等权限功能</strong></p>
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
        <div class="room-info" @click="showFullRoomName">
          <span class="room-name" :title="roomName">{{ roomName }}</span>
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
                <button @click="refreshAllParticipantsStatus" class="batch-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" fill="currentColor"/>
                  </svg>
                  刷新状态
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
                    <path d="M15 8v8H5V8h10m1-2H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4V7c0-.55-.45-1-1-1z"/>
                  </svg>
                </button>
                <button @click="toggleParticipantAudio(id)" class="control-icon" :class="{ active: participant.hasAudio }" :title="participant.hasAudio ? '关闭麦克风' : '开启麦克风'">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 16c-2.21 0-4-1.79-4-4V6c0-2.21 1.79-4 4-4s4 1.79 4 4v6c0 2.21-1.79 4-4 4zm-6-4c0 3.31 2.69 6 6 6s6-2.69 6-6h-2c0 2.21-1.79 4-4 4s-4-1.79-4-4H6z"/>
                  </svg>
                </button>
                <button @click="removeParticipant(id)" class="control-icon remove-icon" title="移出会议">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
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
          <div class="main-screen" :class="{ 'fullscreen-mode': isFullscreen }" @click="toggleFullscreen">
            <!-- 本地共享的屏幕视频 -->
            <video
              v-if="activeScreenShareId === localParticipantId"
              ref="screenShareVideo"
              autoplay
              playsinline
              class="screen-video"
              :class="{ 'fullscreen-video': isFullscreen }"
            ></video>
            <!-- 远程共享的屏幕视频 -->
            <video
              v-else
              ref="remoteScreenVideo"
              autoplay
              playsinline
              class="screen-video"
              :class="{ 'fullscreen-video': isFullscreen }"
              style="width: 100%; height: 100%; object-fit: contain; video-rendering-quality: high;"
            ></video>

            <!-- 批注组件 -->
            <AnnotationCanvas
              :viewMode="viewMode"
              :isFullscreen="isFullscreen"
              :isPC="isPC"
              :room="room"
              :localParticipantId="localParticipantId"
              :isDisconnected="isDisconnected"
              ref="annotationCanvas"
              @exit-annotation="handleExitAnnotation"
              @annotation-notification="handleAnnotationNotification"
            />

            <div class="screen-share-label" :class="{ 'fullscreen-label': isFullscreen }">
              正在共享屏幕：{{ getDisplayNameById(activeScreenShareId) }}
            </div>
            <div v-if="isFullscreen" class="fullscreen-exit-hint" @click.stop="toggleFullscreen">
              点击任意处退出全屏
            </div>
            <!-- 正在批注的用户提示 -->

          </div>
          <div v-if="!isFullscreen" class="participants-sidebar">
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
                  <div v-if="!item.hasAudio" class="sidebar-audio-mute-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div v-else-if="item.isSpeaking" class="sidebar-audio-speaking-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
                    </svg>
                  </div>
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
              <div v-else-if="item.isSpeaking" class="audio-speaking-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
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

        <button v-if="isPC" @click="shareScreen" :class="['control-btn', { active: viewMode === 'screen-share' && activeScreenShareId === localParticipantId }]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="currentColor"/>
          </svg>
          <span>{{ viewMode === 'screen-share' && activeScreenShareId === localParticipantId ? '停止共享' : '共享屏幕' }}</span>
        </button>

        <button
          v-if="viewMode === 'screen-share' && isPC"
          @click="toggleAnnotationMode"
          :class="['control-btn']"
          :disabled="!activeScreenShareId"
          title="批注"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
          </svg>
          <span>批注</span>
        </button>


        <button @click="leaveRoom" class="control-btn leave-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
          <span>离开</span>
        </button>
      </div>

      <!-- 本地摄像头浮窗（已禁用） -->
      <div v-if="false" class="floating-camera" ref="floatingCamera">
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
import { Room, RoomEvent, ParticipantEvent, Track, VideoPresets, LocalVideoTrack, createLocalTracks } from 'livekit-client';
import { ActionSheet } from 'vant';
import SensorRequest from '../../utils/SensorRequest.js';
import {GetDingUserToken, key_DingTokenJWT, key_VideoMeetingToken, setNewVideoMeetingToken, isVideoMeetingTokenValid} from '../../utils/Dingding.js';
import SensorRequestPage from "../../utils/SensorRequestPage";
import SensorRequestMeeting from "../../utils/SensorRequestMeeting";
import AnnotationCanvas from '@/components/AnnotationCanvas.vue';

export default {
  name: 'VideoMeeting',
  components: {
    AnnotationCanvas
  },
  data() {
    return {
      meetingUrl: '',
      roomName: '未连接',
      room: null,
      wsUrl: 'wss://api-v2.sensor-smart.cn:29028',
      cameraEnabled: false,
      microphoneEnabled: false,
      // 屏幕共享相关
      localScreenTrack: null,
      screenStream: null,
      localCameraTrack: null,
      activeScreenShareId: null,
      viewMode: 'grid',
      // 参与者数据
      participants: {},
      // 音频活动状态
      audioActivity: new Map(),
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
      pendingVideoElements: null,   // 存储被自动播放策略阻止的视频元素
      audioTipShown: false,
      mediaPlayTipShown: false,     // 媒体播放提示是否已显示
      // 本地音频活动检测
      audioContext: null,
      analyser: null,
      audioStream: null,
      audioActivityInterval: null,
      // 主持人相关
      initiator: null, // 会议发起人信息
      isHost: false, // 当前用户是否为主持人
      // 连接状态
      isDisconnected: false, // 房间是否已断开
      // 成员列表弹窗
      showMemberListDialog: false,
      // 一次性密钥存储
      onceToken: null,
      // 屏幕方向检测
      isMobile: false,
      isLandscape: false,
      orientationTipClosed: false,
      // 全屏状态
      isFullscreen: false,
      // 参与者同步定时器
      participantSyncTimer: null,
      // 批注相关

    };
  },
  computed: {
    isPC() {
      return !this.isMobile;
    },


    videoItems() {
      const items = [];
      for (const [id, p] of Object.entries(this.participants)) {
        if (this.viewMode === 'screen-share' && this.activeScreenShareId === id) {
          continue;
        }
        items.push({
          id,
          name: p.name,
          displayName: p.displayName,
          isLocal: p.isLocal,
          isHost: p.isHost,
          hasVideo: p.hasVideo,
          hasAudio: p.hasAudio,
          isSpeaking: p.isSpeaking || false,
        });
      }
      return items;
    },
    sidebarParticipants() {
      if (this.viewMode !== 'screen-share') return [];
      const items = [];
      const hostItems = [];
      // 确保至少有一个参与者（本地用户）
      if (Object.keys(this.participants).length === 0 && this.localParticipantId) {
        const localParticipant = {
          id: this.localParticipantId,
          name: this.getDisplayNameById(this.localParticipantId),
          displayName: this.getDisplayNameById(this.localParticipantId),
          isLocal: true,
          isHost: this.isHost,
          hasVideo: this.cameraEnabled,
          hasAudio: this.microphoneEnabled,
          isSpeaking: (this.participants[this.localParticipantId] && this.participants[this.localParticipantId].isSpeaking) || false
        };
        if (this.isHost) {
          hostItems.push(localParticipant);
        } else {
          items.push(localParticipant);
        }
      } else {
        for (const [id, p] of Object.entries(this.participants)) {
          // 总是将主持人添加到参会者列表中，无论是否正在共享屏幕
          if (p.isHost) {
            hostItems.push({ id, name: p.name, displayName: p.displayName, isHost: p.isHost, hasVideo: p.hasVideo, hasAudio: p.hasAudio, isSpeaking: p.isSpeaking || false });
          } else {
            // 非主持人也添加到参会者列表中，无论是否正在共享屏幕
            items.push({ id, name: p.name, displayName: p.displayName, isHost: p.isHost, hasVideo: p.hasVideo, hasAudio: p.hasAudio, isSpeaking: p.isSpeaking || false });
          }
        }
      }
      // 主持人置顶
      return [...hostItems, ...items];
    },
    localVideoItem() {
      if (!this.localParticipantId) return null;
      const p = this.participants[this.localParticipantId];
      return p ? { id: p.id, name: p.name, displayName: p.displayName, isHost: p.isHost || false, hasVideo: p.hasVideo } : null;
    },
    totalParticipants() {
      return Object.keys(this.participants).length;
    },
  },
  created() {
    // 优先从路径参数获取数据，如果路径参数不存在则从查询参数获取
    const rawData = this.$route.params.data || this.$route.query.data || '';
    console.log('[VideoMeeting] 获取原始会议地址参数：', rawData);

    try {
      // ✅ 第一步：Base64 解码
      let decodedData = rawData;

      // 检查是否是 Base64 编码（包含常见 Base64 特征）
      if (rawData && /^[A-Za-z0-9+/=]+$/.test(rawData) && rawData.length > 100) {
        console.log('[VideoMeeting] 检测到 Base64 编码，开始解码...');
        // 浏览器环境使用 atob 进行 Base64 解码
        decodedData = decodeURIComponent(escape(window.atob(rawData)));
        console.log('[VideoMeeting] Base64 解码成功:', decodedData);
      } else {
        // 如果不是 Base64，尝试 URL 解码
        decodedData = decodeURIComponent(rawData);
        console.log('[VideoMeeting] URL 解码结果:', decodedData);
      }

      this.meetingUrl = decodedData;
      console.log('[VideoMeeting] 最终会议地址：', this.meetingUrl);

      // ✅ 第二步：解析 JSON 字符串为对象
      let meetingData = null;
      meetingData = typeof this.meetingUrl === 'string' ? JSON.parse(this.meetingUrl) : this.meetingUrl;
      console.log('[VideoMeeting] 解析后的会议数据：', meetingData);
      console.log('[VideoMeeting] 获取会议房间：', meetingData.room);
      console.log('[VideoMeeting] 获取会议参与者：', meetingData.user);
      this.roomName = meetingData.room || '未命名会议';

      // ✅ 第三步：获取并解析发起人信息
      const initiatorParam = this.$route.params.initiator || this.$route.query.initiator;
      if (initiatorParam) {
        try {
          this.initiator = JSON.parse(decodeURIComponent(initiatorParam));
          console.log('[VideoMeeting] 解析后的发起人信息：', this.initiator);
        } catch (e) {
          console.error('[VideoMeeting] 解析发起人信息失败:', e);
        }
      }
    } catch (error) {
      console.error('[VideoMeeting] 解析会议数据失败:', error);
      console.error('[VideoMeeting] 原始数据:', rawData);
      this.roomName = '未命名会议';
      this.$toast('会议数据格式错误');
    }
    document.title = this.roomName;
  },

  mounted() {
    this.checkDingTalkEnvironment();
    this.detectDeviceAndOrientation();

    // 添加屏幕方向变化监听
    window.addEventListener('resize', this.updateOrientation);
    // 添加全屏变化监听
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', this.handleFullscreenChange);

    if (!this.isInDingTalk) {
      console.log('[VideoMeeting] 检测到浏览器环境');
      // ✅ 检查视频会议专用的token缓存（不是钉钉登录token）
      const cachedVideoToken = localStorage.getItem(key_VideoMeetingToken);
      console.log('[VideoMeeting] 视频会议专用token缓存:', cachedVideoToken ? '存在' : '不存在');
      console.log('[VideoMeeting] 视频会议token是否有效:', isVideoMeetingTokenValid() ? '有效' : '无效');

      if (cachedVideoToken && isVideoMeetingTokenValid()) {
        // 缓存中存在有效的视频会议token，直接使用，无需调用接口
        console.log('[VideoMeeting] 使用缓存中的有效视频会议token，无需重新获取：'+ cachedVideoToken);
        // 调用MeetingInfoGetFun接口获取会议信息
        this.fetchMeetingInfo();
      } else {
        // 缓存中不存在有效的视频会议token，调用onceToken接口获取
        console.log('[VideoMeeting] 缓存中无有效视频会议token，获取一次性密钥...');
        this.isWaitingForToken = true;
        this.fetchOnceToken();
      }
    } else {
      // 钉钉环境下直接返回
      return;
    }

    // 添加用户交互监听，用于解决音频和视频自动播放限制
    const enableMediaOnInteraction = () => {
      // 处理音频元素
      if (this.pendingAudioElements && this.pendingAudioElements.size > 0) {
        this.pendingAudioElements.forEach(audioEl => {
          audioEl.play().catch(e => console.warn('用户交互后音频播放失败:', e));
        });
        this.pendingAudioElements.clear();
      }
      // 处理视频元素
      if (this.pendingVideoElements && this.pendingVideoElements.size > 0) {
        this.pendingVideoElements.forEach(videoEl => {
          videoEl.play().catch(e => console.warn('用户交互后视频播放失败:', e));
        });
        this.pendingVideoElements.clear();
        // 播放成功后提示用户
        if (!this.mediaPlayTipShown) {
          this.$toast('屏幕共享已开始', { duration: 2000 });
          this.mediaPlayTipShown = true;
        }
      }
      // 移除监听，只触发一次
      document.removeEventListener('click', enableMediaOnInteraction);
      document.removeEventListener('touchstart', enableMediaOnInteraction);
      document.removeEventListener('touchend', enableMediaOnInteraction);
      document.removeEventListener('touchmove', enableMediaOnInteraction);
    };
    // 添加多种交互事件监听，确保在移动端能够触发
    document.addEventListener('click', enableMediaOnInteraction);
    document.addEventListener('touchstart', enableMediaOnInteraction);
    document.addEventListener('touchend', enableMediaOnInteraction);
    document.addEventListener('touchmove', enableMediaOnInteraction);
    // 保存以便在 beforeDestroy 中清理
    this._enableMediaOnInteraction = enableMediaOnInteraction;
  },
  beforeDestroy() {
    this.disconnectRoom();
    // 停止本地音频活动检测
    this.stopAudioActivityDetection();
    // 清理音频元素
    this.audioElements.forEach((el) => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    this.audioElements.clear();
    // 清理交互监听
    if (this._enableMediaOnInteraction) {
      document.removeEventListener('click', this._enableMediaOnInteraction);
      document.removeEventListener('touchstart', this._enableMediaOnInteraction);
      document.removeEventListener('touchend', this._enableMediaOnInteraction);
      document.removeEventListener('touchmove', this._enableMediaOnInteraction);
    }
    // 清理屏幕方向监听
    window.removeEventListener('resize', this.updateOrientation);
    // 清理设备方向监听
    window.removeEventListener('deviceorientation', this.updateOrientation.bind(this));
    // 清理全屏事件监听
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange);
    document.body.style.overflow = '';
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

    // ==================== 批注功能 ====================


    // 处理批注通知
    handleAnnotationNotification(message) {
      console.log('批注通知:', message);
      this.$toast(message, { duration: 2000 });
    },

    // 开始批注模式
    startAnnotation() {
      if (this.$refs.annotationCanvas) {
        this.$refs.annotationCanvas.startAnnotation();
      }
    },

    // 处理收到的批注数据
    handleReceivedAnnotation(message) {
      if (this.$refs.annotationCanvas) {
        this.$refs.annotationCanvas.handleReceivedAnnotation(message);
      }
    },

    // ==================== 注册/注销参会者姓名 ====================
    registerParticipantName(participantId, name) {
      if (participantId && name) {
        this.participantNames.set(participantId, name);
        console.log(`✅ 注册参会者：${participantId} -> ${name}`);
        const p = this.participants[participantId];
        if (p && p.displayName !== name) {
          this.$set(this.participants, participantId, { ...p, displayName: name });
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
      // const currentUrl = window.location.href;
      // if (navigator.clipboard && navigator.clipboard.writeText) {
      //   navigator.clipboard.writeText(currentUrl).then(() => {
      //     this.$toast.success('会议链接已复制，请分享给参会者');
      //   }).catch(() => {
      //     prompt('请复制以下链接并分享给参会者', currentUrl);
      //   });
      // } else {
      //   prompt('请复制以下链接并分享给参会者', currentUrl);
      // }
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
            this.$set(this.participants, participantId, { ...participant, hasVideo: action === 'enable-video' });
            this.$toast(`已${action === 'enable-video' ? '开启' : '关闭'}${this.getDisplayNameById(participantId)}的视频`);
          } else if (action === 'mute-audio' || action === 'unmute-audio') {
            this.$set(this.participants, participantId, { ...participant, hasAudio: action === 'unmute-audio' });
            this.$toast(`已${action === 'unmute-audio' ? '取消静音' : '静音'}${this.getDisplayNameById(participantId)}的麦克风`);
          }
        }
        // 延迟后强制同步该参与者的状态，确保本地状态与LiveKit实际状态一致
        setTimeout(() => {
          const roomParticipant = this.room.participants.get(participantId);
          if (roomParticipant) {
            this.forceSyncParticipantTrack(roomParticipant, participantId);
          }
        }, 500);
      } catch (error) {
        console.error('发送控制消息失败:', error);
        this.$toast('控制失败，请重试');
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
              this.$set(this.participants, participantId, { ...participant, hasVideo: false });
            } else if (actionType === 'audio') {
              this.$set(this.participants, participantId, { ...participant, hasAudio: false });
            }
          }
        });
        this.$toast(`已批量${actionType === 'video' ? '关闭' : '静音'}所有参与者的${actionType === 'video' ? '视频' : '麦克风'}`);
      } catch (error) {
        console.error('发送批量控制消息失败:', error);
        this.$toast('批量控制失败，请重试');
      }
    },
    // 主持人移出参会者
    removeParticipant(participantId) {
      if (!this.isHost || this.isDisconnected) return;
      const participant = this.participants[participantId];
      if (!participant || participant.isLocal) return;

      this.$dialog
        .confirm({
          title: '确认移出',
          message: `确定要将 ${this.getDisplayNameById(participantId)} 移出会议吗？`,
          confirmButtonText: '确定',
          cancelButtonText: '取消',
        })
        .then(() => {
          // 构建移出消息
          const controlMessage = {
            type: 'moderator-request',
            target: participantId,
            action: 'remove-participant'
          };

          try {
            // 发送移出消息给目标参与者
            // 不使用destinationIdentities，而是通过message.target来指定目标
            this.room.localParticipant.publishData(
              new TextEncoder().encode(JSON.stringify(controlMessage)),
              {
                reliable: true
              }
            );
            console.log(`✅ 发送移出消息到 ${participantId}`);

            // 从本地参与者列表中移除
            this.unregisterParticipantName(participantId);
            this.$delete(this.participants, participantId);

            // 清理该参与者的音频元素
            const audioEl = this.audioElements.get(participantId);
            if (audioEl && audioEl.parentNode) {
              audioEl.parentNode.removeChild(audioEl);
              this.audioElements.delete(participantId);
            }

            this.$toast(`已将 ${this.getDisplayNameById(participantId)} 移出会议`);
          } catch (error) {
            console.error('发送移出消息失败:', error);
            this.$toast('移出失败，请重试');
          }
        });
    },
    // 刷新所有参与者的状态
    refreshAllParticipantsStatus() {
      console.log('🔄 手动刷新所有参与者状态');
      
      // 首先强制同步所有远程参与者的轨道状态
      this.forceSyncAllParticipants();
      
      // 触发 UI 更新
      this.$forceUpdate();
      
      this.$toast('成员状态已刷新', { duration: 1500 });
    },
    // 强制同步所有参与者（包括本地）
    forceSyncAllParticipants() {
      if (!this.room || this.isDisconnected) return;

      console.log('🔄 强制同步所有参与者状态');

      // 同步远程参与者
      const remoteParticipants = this.room.participants;
      if (remoteParticipants) {
        if (typeof remoteParticipants.forEach === 'function') {
          remoteParticipants.forEach((participant, participantId) => {
            this.forceSyncParticipantTrack(participant, participantId);
          });
        } else if (typeof remoteParticipants.values === 'function') {
          for (const participant of remoteParticipants.values()) {
            this.forceSyncParticipantTrack(participant, participant.identity);
          }
        }
      }
    },
    // 强制同步单个参与者的轨道状态（不考虑之前的状态）
    forceSyncParticipantTrack(participant, participantId) {
      if (!this.participants[participantId]) return;

      const p = this.participants[participantId];
      
      // 保持原有状态作为默认值
      let latestHasAudio = p.hasAudio;
      let latestAudioTrack = p.audioTrack;
      let latestHasVideo = p.hasVideo;
      let latestVideoTrack = p.videoTrack;
      
      // 标记是否有变化
      let hasChanged = false;

      participant.trackPublications.forEach((pub) => {
        if (!pub || !pub.track) return;

        const trackSource = pub.source || 'unknown';
        const isMuted = pub.isMuted;
        
        // 如果 isMuted 未定义，尝试从 track 对象获取
        let actualMuted = isMuted;
        if (actualMuted === undefined || actualMuted === null) {
          if (pub.track && typeof pub.track.isMuted !== 'undefined') {
            actualMuted = pub.track.isMuted;
          } else {
            console.log(`⚠️ ${participantId} 轨道 ${trackSource} 的 isMuted 无法确定，保持原状态`);
            return;
          }
        }

        if (pub.kind === Track.Kind.Audio) {
          const shouldBeAudioOn = !actualMuted;
          if (latestHasAudio !== shouldBeAudioOn) {
            latestHasAudio = shouldBeAudioOn;
            latestAudioTrack = pub.track;
            hasChanged = true;
            console.log(`🔊 ${participantId} 音频状态更新: hasAudio=${latestHasAudio}, isMuted=${actualMuted}`);
          }
        } else if (pub.kind === Track.Kind.Video && (trackSource === Track.Source.Camera || trackSource === 'unknown')) {
          const shouldBeVideoOn = !actualMuted;
          if (latestHasVideo !== shouldBeVideoOn) {
            latestHasVideo = shouldBeVideoOn;
            latestVideoTrack = pub.track;
            hasChanged = true;
            console.log(`📹 ${participantId} 视频状态更新: hasVideo=${latestHasVideo}, isMuted=${actualMuted}`);
          }
        }
      });

      // 只有在状态有变化时才更新
      if (hasChanged) {
        console.log(`🔄 强制更新 ${participantId}: audio ${p.hasAudio}->${latestHasAudio}, video ${p.hasVideo}->${latestHasVideo}`);
        this.$set(this.participants, participantId, { 
          ...p, 
          hasAudio: latestHasAudio, 
          audioTrack: latestAudioTrack, 
          hasVideo: latestHasVideo, 
          videoTrack: latestVideoTrack 
        });
      } else {
        console.log(`ℹ️ ${participantId} 状态无变化，无需更新`);
      }
    },


// ==================== Token获取 ====================
    /**
     * 使用一次性密钥获取长时间token（并加入房间）
     * @param {string} onceToken - 一次性密钥
     * @param {function} callback - 获取token后的回调函数
     */
    fetchOnceToken() {
      console.log('[VideoMeeting] 开始从URL参数中获取一次性密钥...');
      try {
        // 从URL参数中获取一次性密钥
        const onceToken = this.$route.query.onceToken;
        console.log('[VideoMeeting] 从URL参数中获取到一次性密钥:', onceToken);
        if (!onceToken || typeof onceToken !== 'string') {
          this.$toast.fail('获取一次性密钥失败');
          return;
        }
        this.onceToken = onceToken; // 存储一次性密钥
        // 使用一次性密钥获取长时间token
        this.fetchLongTokenByOnce(onceToken, () => {
          // 获取长时间token成功后，调用MeetingInfoGetFun接口获取会议信息
          this.fetchMeetingInfo();
        });
      } catch (error) {
        console.error('[VideoMeeting] 处理一次性密钥失败:', error);
        this.$toast.fail('获取会议信息失败');
      }
    },

    fetchMeetingInfo() {
      console.log('[VideoMeeting] 开始调用MeetingInfoGetFun接口获取会议信息...');
      // 构建请求体
      const requestBody = {
        "Week_Display": "",
        "Meeting_Name": this.roomName,
        "Meeting_Type": "",
        "Meeting_Address": "",
        "Meeting_Initiator": {
          "Person_DingID": "",
          "Person_Phone": "",
          "Person_Name": "",
          "Person_Department": ""
        }
      };

      SensorRequestMeeting.MeetingInfoGetFunPage(
        JSON.stringify(requestBody),
        (respData) => {
          try {
            console.log('[VideoMeeting] 获取会议信息成功，响应:', respData);
            // 解析响应数据
            const meetingInfo = typeof respData === 'string' ? JSON.parse(respData) : respData;
            console.log('[VideoMeeting] 解析后的会议信息:', meetingInfo);

            // 保存主持人信息（仅当路由中未获取到发起人信息时）
            if (!this.initiator && meetingInfo && Array.isArray(meetingInfo) && meetingInfo.length > 0) {
              this.initiator = meetingInfo[0].Meeting_Initiator;
              console.log('[VideoMeeting] 从API获取到主持人信息:', this.initiator);
            } else if (this.initiator) {
              console.log('[VideoMeeting] 使用路由中获取的发起人信息:', this.initiator);
            }

            // 加入房间
            this.parseAndJoinRoom();
          } catch (parseError) {
            console.error('[VideoMeeting] 解析会议信息失败:', parseError);
            this.$toast.fail('数据解析失败');
            // 即使解析失败，也尝试加入房间
            this.parseAndJoinRoom();
          }
        },
        (error) => {
          console.error('[VideoMeeting] 获取会议信息失败:', error);
          this.$toast.fail('获取会议信息失败');
          // 即使获取失败，也尝试加入房间
          this.parseAndJoinRoom();
        }
      );
    },

    fetchLongTokenByOnce(onceToken, callback) {
      console.log('[VideoMeeting] 开始调用Ding_GetTokenByOnce接口...');
      console.log('[VideoMeeting] 一次性密钥:', onceToken);

      SensorRequestPage.Ding_GetTokenByOnce(
        onceToken,
        (longToken) => {
          try {
            console.log('[VideoMeeting] 获取长时间token成功:', longToken);

            if (longToken && typeof longToken === 'string') {
              // ✅ 保存到视频会议专用的token存储中
              setNewVideoMeetingToken(longToken);
              console.log('[VideoMeeting] 已保存长时间token到localStorage（视频会议专用）')
              // // 也存储到钉钉token存储中
              // localStorage.setItem(key_DingTokenJWT, longToken);
              this.$toast('身份验证成功');
              // 调用回调函数
              if (callback) {
                callback();
              } else {
                // 直接加入房间
                this.parseAndJoinRoom();
              }
            } else {
              console.error('[VideoMeeting] 返回的token格式不正确:', longToken);
              this.$toast('获取token失败');
              if (callback) {
                callback();
              }
            }
          } catch (error) {
            console.error('[VideoMeeting] 处理长时间token失败:', error);
            this.$toast('token处理失败');
            if (callback) {
              callback();
            }
          }
        },
        (error) => {
          console.error('[VideoMeeting] 获取长时间token失败:', error);
          this.$toast('身份验证失败，请重新进入会议');
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
          this.$toast('链接已复制，请打开浏览器访问');
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
        this.$toast('会议数据解析失败');
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
          audioActivityDetection: {
            enabled: true,
            interval: 100,
          },
        });
        console.log('🔊 音频活动检测配置: LiveKit 2.18.0版本默认启用');
        console.log('   注意: 此版本API与预期不同，将使用默认配置');

        // 检查Room配置
        console.log('🔍 Room配置检查:');
        console.log(`   room.config: ${JSON.stringify(this.room.config)}`);
        this.setupRoomEvents();
        await this.room.connect(this.wsUrl, token, { name: userName });
        this.roomName = this.room.name;

        this.localParticipantId = this.room.localParticipant.identity;
        this.registerParticipantName(this.localParticipantId, userName);

        // 判断当前用户是否为主持人 - 支持通过姓名或钉钉ID判断
        console.log('🔍 检查主持人身份:', {
          userName: userName,
          initiator: this.initiator,
          localParticipantIdentity: this.room.localParticipant.identity
        });
        if (this.initiator && (userName === this.initiator.Person_Name || this.room.localParticipant.identity === this.initiator.Person_DingID)) {
          this.isHost = true;
          console.log('[VideoMeeting] 当前用户为主持人:', userName);
        } else {
          this.isHost = false;
          console.log('[VideoMeeting] 当前用户不是主持人:', userName);
        }

        this.$set(this.participants, this.localParticipantId, {
          id: this.localParticipantId,
          name: userName,
          displayName: userName,
          isLocal: true,
          isHost: this.isHost,
          hasVideo: false,
          hasAudio: false,
          isSpeaking: false,
          videoTrack: null,
          audioTrack: null,
        });
        this.audioActivity.set(this.localParticipantId, false);
        console.log('👤 本地参与者信息:', this.participants[this.localParticipantId]);

        await this.enableMedia();

        this.syncRemoteParticipantTracks();

        loadingToast.close();
        if (this.isHost) {
          this.$toast(userName + '已进入会议室（主持人）');
        } else {
          this.$toast(userName + '已进入会议室');
        }
        // 提示用户麦克风和摄像头已自动关闭
        this.$toast('麦克风和摄像头已自动关闭，需要时请手动打开', { duration: 3000 });
        // 检查 sessionStorage 中的屏幕共享状态
        this.checkScreenSharingState();
        // 启动参与者同步定时器
        this.startParticipantSync();
      } catch (error) {
        console.error('连接失败:', error);
        loadingToast.close();
        this.$toast('连接失败：' + (error.message || '未知错误'));
      }
    },

    async enableMedia() {
      if (this.isDisconnected) {
        console.log('[enableMedia] 房间已断开，跳过媒体初始化');
        return;
      }
      try {
        // 初始状态：禁用摄像头和麦克风
        this.cameraEnabled = false;
        this.microphoneEnabled = false;

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

        // 更新本地视频状态 - 默认禁用
        if (cameraPub && cameraPub.track) {
          this.localCameraTrack = cameraPub.track;
          // 默认禁用摄像头
          await this.room.localParticipant.setCameraEnabled(false);
          this.updateParticipantVideo(this.localParticipantId, false, this.localCameraTrack);
          this.cameraEnabled = false;
        } else {
          this.localCameraTrack = null;
          this.updateParticipantVideo(this.localParticipantId, false, null);
          this.cameraEnabled = false;
        }

        // 更新本地音频状态 - 默认禁用
        if (micPub && micPub.track) {
          // 默认禁用麦克风
          await this.room.localParticipant.setMicrophoneEnabled(false);
          this.updateParticipantAudio(this.localParticipantId, false);
          this.microphoneEnabled = false;
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
        this.$toast(errorMsg);
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
      console.log(`📹 更新视频状态: ${participantId}, hasVideo=${hasVideo}, track=${track ? '有轨道' : '无轨道'}, isHost=${p.isHost}, isLocal=${p.isLocal}`);
      const newParticipant = {
        ...p,
        hasVideo,
        videoTrack: track,
      };
      this.$set(this.participants, participantId, newParticipant);

      // 移除强制刷新，依赖Vue的响应式更新机制
      // 强制刷新会导致视频元素重新渲染，引起卡顿

      if (hasVideo && track) {
        // 同时更新主视频区域和侧边栏的视频
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

        // 确保侧边栏视频元素也被更新，无论是否正在共享屏幕
        const sidebarEl = this.sidebarVideoRefs.get(participantId);
        console.log(`🔍 侧边栏视频元素检查: ${participantId}, 元素存在=${!!sidebarEl}`);
        if (sidebarEl) {
          if (sidebarEl.srcObject) sidebarEl.srcObject = null;
          // 确保侧边栏视频元素显示设置
          sidebarEl.style.width = '100%';
          sidebarEl.style.height = '100%';
          sidebarEl.style.objectFit = 'cover';
          sidebarEl.style.videoRenderingQuality = 'high';
          sidebarEl.style.transform = 'translateZ(0)';
          track.attach(sidebarEl);
          console.log(`✅ 已将视频轨道附加到侧边栏 ${participantId}`);
        } else {
          console.warn(`⚠️ 未找到侧边栏视频元素: ${participantId}`);
          // 尝试在DOM中查找侧边栏视频元素
          this.$nextTick(() => {
            const sidebarVideoElements = document.querySelectorAll('.sidebar-video');
            console.log(`📋 找到 ${sidebarVideoElements.length} 个侧边栏视频元素`);
            sidebarVideoElements.forEach((el, index) => {
              console.log(`📋 侧边栏视频元素 ${index}:`, el);
            });
          });
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
          console.log(`🖥️ 已清空 ${participantId} 的侧边栏视频元素 srcObject`);
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
        this.$set(this.participants, participantId, { ...p, hasAudio });
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
        // 只有在元素真正变化时才更新引用
        const existingEl = this.sidebarVideoRefs.get(id);
        if (existingEl !== el) {
          console.log(`🔗 setSidebarVideoRef: 注册侧边栏视频元素 ${id}`);
          this.sidebarVideoRefs.set(id, el);
          console.log(`📋 当前侧边栏视频元素数量: ${this.sidebarVideoRefs.size}`);
          console.log(`📋 所有侧边栏视频元素ID: ${Array.from(this.sidebarVideoRefs.keys()).join(', ')}`);
          // 检查本地参与者的视频轨道
          if (id === this.localParticipantId && this.cameraEnabled && this.localCameraTrack) {
            console.log(`📹 为本地参与者 ${id} 附加摄像头轨道`);
            if (el.srcObject) el.srcObject = null;
            // 确保侧边栏视频元素显示设置
            el.style.width = '100%';
            el.style.height = '100%';
            el.style.objectFit = 'cover';
            el.style.videoRenderingQuality = 'high';
            el.style.transform = 'translateZ(0)';
            this.localCameraTrack.attach(el);
            console.log(`✅ setSidebarVideoRef: 为本地参与者 ${id} 附加摄像头轨道`);
          } else {
            const p = this.participants[id];
            if (p && p.hasVideo && p.videoTrack) {
              if (el.srcObject) el.srcObject = null;
              // 确保侧边栏视频元素显示设置
              el.style.width = '100%';
              el.style.height = '100%';
              el.style.objectFit = 'cover';
              el.style.videoRenderingQuality = 'high';
              el.style.transform = 'translateZ(0)';
              p.videoTrack.attach(el);
              console.log(`✅ setSidebarVideoRef: 为 ${id} 附加视频轨道`);
            } else if (p) {
              console.log(`ℹ️ setSidebarVideoRef: ${id} 没有视频轨道，hasVideo=${p.hasVideo}`);
            }
          }
        }
      } else {
        // 只有在元素存在时才删除引用
        if (this.sidebarVideoRefs.has(id)) {
          console.log(`🔗 setSidebarVideoRef: 移除侧边栏视频元素 ${id}`);
          this.sidebarVideoRefs.delete(id);
        }
      }
    },

    // ==================== 房间事件 ====================
    setupRoomEvents() {
      const room = this.room;
      if (!room) {
        console.warn('setupRoomEvents: room is null');
        return;
      }

      // 音频活动检测在LiveKit 2.x版本中默认启用
      console.log('🔊 音频活动检测配置: LiveKit 2.x版本默认启用');

      room.on(RoomEvent.Connected, () => {
        console.log('✅ 房间连接成功');

        // 检查并配置音频活动检测
        console.log('🔊 连接成功后检查音频活动检测配置:');
        console.log(`   room.audio: ${JSON.stringify(room.audio)}`);
        console.log(`   room.getAudioActivityDetection: ${typeof room.getAudioActivityDetection}`);
        console.log(`   room.setAudioActivityDetection: ${typeof room.setAudioActivityDetection}`);

        // 尝试启用音频活动检测
        if (typeof room.setAudioActivityDetection === 'function') {
          room.setAudioActivityDetection(true);
          console.log('✅ 已调用 setAudioActivityDetection(true)');
        } else if (room.audio && room.audio.activityDetection) {
          console.log('✅ 音频活动检测已在初始化时配置');
        } else {
          console.warn('⚠️ 未找到音频活动检测配置方法');
        }

        // 同步远程参与者轨道状态
        this.syncRemoteParticipantTracks();

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
                isSpeaking: false,
                videoTrack: null,
                audioTrack: null,
              });
              this.audioActivity.set(participant.identity, false);
              console.log(`👤 发现参与者：${participant.identity}, name: ${displayName}${isParticipantHost ? ' (主持人)' : ''}`);
              if (!participant.name || participant.name.trim() === '' || participant.name === participant.identity) {
                this.fetchAndRegisterName(participant.identity, participant.name);
              }
            }
            
            // 为所有远程参与者添加轨道状态变化监听（包括已存在的）
            if (!participant.isLocal) {
              this.setupParticipantTrackListeners(participant);
            }
          }
        }
        
        // 启动定期同步机制，作为事件监听的补充
        this.startParticipantSync();
        // 启动轨道状态同步定时器（更频繁，用于同步参与者自己操作麦克风/摄像头的状态）
        this.startTrackStatusSync();
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

        // 如果是原始主持人加入，确保取消其他参与者的主持人权限
        if (isParticipantHost) {
          // 更新所有参与者的主持人状态，确保只有原始主持人是主持人
          Object.keys(this.participants).forEach(id => {
            const p = this.participants[id];
            p.isHost = false;
            this.$set(this.participants, id, { ...p, isHost: false });
          });

          // 页面加载时不发送主持人变更通知，避免显示不必要的提示
          // 只有在真正的主持人移交时才发送通知
        }

        this.registerParticipantName(participant.identity, displayName);
        this.$set(this.participants, participant.identity, {
          id: participant.identity,
          name: displayName,
          displayName: displayName,
          isLocal: false,
          isHost: isParticipantHost,
          hasVideo: false,
          hasAudio: false,
          isSpeaking: false,
          videoTrack: null,
          audioTrack: null,
        });
        this.audioActivity.set(participant.identity, false);
        if (!participant.name || participant.name.trim() !== '' && participant.name === participant.identity) {
          this.fetchAndRegisterName(participant.identity, participant.name);
        }

        // 立即同步远程参与者的轨道状态
        setTimeout(() => {
          this.syncRemoteParticipantTracks();
        }, 100);

        // 为远程参与者添加轨道状态变化监听
        if (!participant.isLocal) {
          this.setupParticipantTrackListeners(participant);
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
        console.log(`📡 TrackSubscribed: ${participantId}, kind=${track.kind}, source=${track.source}, isLocal=${participant.isLocal}`);
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
            isLocal: participant.isLocal,
            isHost: isParticipantHost,
            hasVideo: false,
            hasAudio: false,
            isSpeaking: false,
            videoTrack: null,
            audioTrack: null,
          });
          this.audioActivity.set(participantId, false);
          console.log(`👤 新增参与者: ${participantId}, isHost=${isParticipantHost}, isLocal=${participant.isLocal}`);
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
              // 多次尝试绑定，确保视频元素完全渲染
              const bindScreenTrack = (attempt = 0) => {
                let screenVideoEl = null;
                if (participantId === this.localParticipantId) {
                  screenVideoEl = this.$refs.screenShareVideo;
                } else {
                  screenVideoEl = this.$refs.remoteScreenVideo;
                }

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

                  // 尝试播放视频，处理自动播放限制
                  if (screenVideoEl.paused) {
                    screenVideoEl.play().catch(err => {
                      console.warn('视频自动播放被阻止:', err.message);
                      // 标记为需要用户交互后播放
                      if (!this.pendingVideoElements) this.pendingVideoElements = new Set();
                      this.pendingVideoElements.add(screenVideoEl);
                    });
                  }

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

                    // 尝试播放视频
                    if (videoEl.paused) {
                      videoEl.play().catch(err => {
                        console.warn('视频自动播放被阻止:', err.message);
                        if (!this.pendingVideoElements) this.pendingVideoElements = new Set();
                        this.pendingVideoElements.add(videoEl);
                      });
                    }
                    console.log(`✅ 已通过DOM查询将屏幕共享轨道附加到视频元素`);
                  } else if (attempt < 5) {
                    // 最多尝试5次，每次间隔200ms
                    console.log(`⏳ 第${attempt + 1}次尝试绑定屏幕共享轨道`);
                    setTimeout(() => bindScreenTrack(attempt + 1), 200);
                  }
                }
              };

              // 开始绑定屏幕共享轨道
              bindScreenTrack();

              // 确保本地参与者（主持人）的摄像头轨道在侧边栏中显示
              if (participantId === this.localParticipantId && this.cameraEnabled && this.localCameraTrack) {
                console.log('📹 屏幕共享开始后，确保主持人摄像头轨道在侧边栏显示');
                this.updateParticipantVideo(this.localParticipantId, true, this.localCameraTrack);
              }
            });
          });
        } else if (track.kind === Track.Kind.Video) {
          // 获取轨道的实际静音状态，如果无法确定，假设轨道是激活的（hasVideo=true）
          let isTrackMuted = true; // 默认假设是静音的（保守估计）
          if (participant && participant.getTrackPublication) {
            const videoPub = participant.getTrackPublication(Track.Source.Camera);
            if (videoPub && typeof videoPub.isMuted !== 'undefined') {
              isTrackMuted = videoPub.isMuted;
            }
          }
          // 如果还是无法确定，从 track 本身获取
          if (isTrackMuted === true && track && typeof track.isMuted !== 'undefined') {
            isTrackMuted = track.isMuted;
          }
          // 如果仍然无法确定（undefined），假设轨道已发布且未静音
          const hasVideo = isTrackMuted === false ? true : (typeof isTrackMuted === 'undefined' ? true : false);
          console.log('🎥 接收到视频轨道，来自:', participantId, 'isLocal:', participant.isLocal, 'isMuted:', isTrackMuted, 'hasVideo:', hasVideo);
          this.updateParticipantVideo(participantId, hasVideo, track);
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
          // 获取轨道的实际静音状态，如果无法确定，假设轨道是激活的（hasAudio=true）
          let isTrackMuted = true; // 默认假设是静音的（保守估计）
          if (participant && participant.getTrackPublication) {
            const audioPub = participant.getTrackPublication(Track.Source.Microphone);
            if (audioPub && typeof audioPub.isMuted !== 'undefined') {
              isTrackMuted = audioPub.isMuted;
            }
          }
          // 如果还是无法确定，从 track 本身获取
          if (isTrackMuted === true && track && typeof track.isMuted !== 'undefined') {
            isTrackMuted = track.isMuted;
          }
          // 如果仍然无法确定（undefined），假设轨道已发布且未静音
          const hasAudio = isTrackMuted === false ? true : (typeof isTrackMuted === 'undefined' ? true : false);
          console.log(`🎧 TrackSubscribed - 接收到远程音频轨道: ${participantId}, isLocal=${participant.isLocal}, isMuted=${isTrackMuted}, hasAudio=${hasAudio}`);
          this.updateParticipantAudio(participantId, hasAudio);
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
          console.log(`✅ 远程音频轨道处理完成: ${participantId}, hasAudio=${this.participants[participantId] ? this.participants[participantId].hasAudio : 'undefined'}`);
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

      // 轨道静音/取消静音处理 - 全局监听
      room.on(RoomEvent.TrackMuted, (publication, participant) => {
        if (!participant || !publication) return;
        const participantId = participant.identity;
        console.log(`🔇 RoomEvent.TrackMuted: ${participantId}, kind=${publication.kind}, source=${publication.source}, isMuted=${publication.isMuted}`);
        if (publication.kind === Track.Kind.Audio) {
          this.updateParticipantAudio(participantId, false);
        } else if (publication.kind === Track.Kind.Video && (publication.source === Track.Source.Camera || publication.source === 'unknown')) {
          this.updateParticipantVideo(participantId, false, null);
        }
      });

      room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
        if (!participant || !publication) return;
        const participantId = participant.identity;
        console.log(`🔊 RoomEvent.TrackUnmuted: ${participantId}, kind=${publication.kind}, source=${publication.source}, isMuted=${publication.isMuted}`);
        if (publication.kind === Track.Kind.Audio) {
          this.updateParticipantAudio(participantId, true);
        } else if (publication.kind === Track.Kind.Video && (publication.source === Track.Source.Camera || publication.source === 'unknown')) {
          if (publication.track) {
            this.updateParticipantVideo(participantId, true, publication.track);
          }
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

      // 音频活动检测事件（ActiveSpeakersChanged）
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        console.log(`🎤 ActiveSpeakersChanged 事件触发: 说话的参与者 ${speakers.length} 人`);

        // 首先重置所有参与者的 isSpeaking 为 false
        Object.keys(this.participants).forEach(participantId => {
          const p = this.participants[participantId];
          if (p && p.isSpeaking) {
            this.$set(this.participants, participantId, { ...p, isSpeaking: false });
          }
        });

        // 然后设置正在说话的参与者的 isSpeaking 为 true
        speakers.forEach(speaker => {
          const participantId = speaker.identity;
          if (this.participants[participantId]) {
            const p = this.participants[participantId];
            console.log(`   说话的参与者: ${participantId} (${this.getDisplayNameById(participantId)})`);

            // 如果检测到音频活动，说明参与者确实有音频输入，更新 hasAudio 和 isSpeaking
            if (!p.hasAudio) {
              console.log(`   检测到音频活动但 hasAudio=false，自动修正 hasAudio 状态`);
              this.$set(this.participants, participantId, { ...p, hasAudio: true, isSpeaking: true });
            } else {
              this.$set(this.participants, participantId, { ...p, isSpeaking: true });
            }
          }
        });
      });

      // 检查Room对象是否有音频活动检测相关的属性或方法
      console.log('🔊 检查Room对象音频活动检测相关属性:');
      console.log(`   room.audio: ${JSON.stringify(room.audio)}`);
      console.log(`   room.getAudioActivityDetection: ${typeof room.getAudioActivityDetection}`);
      console.log(`   room.setAudioActivityDetection: ${typeof room.setAudioActivityDetection}`);

      // 数据消息接收事件
      room.on(RoomEvent.DataReceived, (payload, participant, kind) => {
        try {
          const message = JSON.parse(new TextDecoder().decode(payload));
          console.log('📨 收到数据消息:', message, '来自:', participant && participant.identity);
          if (message.type === 'annotation') {
            if (message.participantId !== this.localParticipantId) {
              console.log('📝 收到来自', message.participantName, '的批注数据:', message.data);
              this.handleReceivedAnnotation(message);
            }
          } else if (message.type === 'moderator-request') {
            // 检查是否是发给自己的请求
            if (message.target === 'all' || message.target === this.localParticipantId) {
              console.log('🎯 收到主持人控制请求:', message.action);
              switch (message.action) {
                case 'disable-video':
                  if (this.cameraEnabled) {
                    this.toggleCamera();
                    this.$toast('主持人已关闭您的视频');
                  }
                  break;
                case 'enable-video':
                  if (!this.cameraEnabled) {
                    this.toggleCamera();
                    this.$toast('主持人已开启您的视频');
                  }
                  break;
                case 'mute-audio':
                  if (this.microphoneEnabled) {
                    this.toggleMicrophone();
                    this.$toast('主持人已将您静音');
                  }
                  break;
                case 'unmute-audio':
                  if (!this.microphoneEnabled) {
                    this.toggleMicrophone();
                    this.$toast('主持人已取消您的静音');
                  }
                  break;
                case 'remove-participant':
                  this.$toast('您已被主持人移出会议');
                  setTimeout(() => {
                    this.disconnectRoom();
                    this.$router.back();
                  }, 1000);
                  break;
                case 'end-meeting':
                  this.$toast('主持人已结束会议');
                  setTimeout(() => {
                    this.disconnectRoom();
                    this.$router.back();
                  }, 1000);
                  break;
                case 'transfer-host':
                  // 接收主持人权限
                  this.isHost = true;
                  // 更新本地参与者的主持人状态
                  if (this.participants[this.localParticipantId]) {
                    const p = this.participants[this.localParticipantId];
                    this.$set(this.participants, this.localParticipantId, { ...p, isHost: true });
                  }
                  this.$toast('您已成为新的主持人');
                  break;
                case 'host-changed':
                  // 主持人变更通知
                  this.$toast(`主持人已变更为 ${message.newHostName}`);
                  // 更新本地参与者列表中的主持人状态
                  Object.keys(this.participants).forEach(id => {
                    const p = this.participants[id];
                    p.isHost = id === message.newHostId;
                    this.$set(this.participants, id, p);
                  });
                  // 更新本地isHost变量
                  this.isHost = this.localParticipantId === message.newHostId;
                  break;
              }
            }
          }
        } catch (error) {
          console.warn('解析数据消息失败:', error);
        }
      });
    },
    // 为远程参与者设置轨道状态变化监听
    setupParticipantTrackListeners(participant) {
      if (!participant || participant.isLocal) return;

      const participantId = participant.identity;
      
      // 移除已存在的监听器，避免重复注册
      participant.removeAllListeners(ParticipantEvent.TrackMuted);
      participant.removeAllListeners(ParticipantEvent.TrackUnmuted);

      participant.on(ParticipantEvent.TrackMuted, (publication) => {
        if (!publication || !publication.track) return;
        console.log(`🔇 RemoteParticipant TrackMuted: ${participantId}, kind=${publication.track.kind}, isMuted=${publication.isMuted}`);
        // 直接设置状态，不依赖缓存值
        if (publication.track.kind === Track.Kind.Audio) {
          this.updateParticipantAudio(participantId, false);
        } else if (publication.track.kind === Track.Kind.Video) {
          this.updateParticipantVideo(participantId, false, null);
        }
        // 延迟后同步，确保状态更新到最新
        setTimeout(() => {
          this.forceSyncParticipantTrack(participant, participantId);
        }, 100);
      });

      participant.on(ParticipantEvent.TrackUnmuted, (publication) => {
        if (!publication || !publication.track) return;
        console.log(`🔊 RemoteParticipant TrackUnmuted: ${participantId}, kind=${publication.track.kind}, isMuted=${publication.isMuted}`);
        // 直接设置状态，不依赖缓存值
        if (publication.track.kind === Track.Kind.Audio) {
          this.updateParticipantAudio(participantId, true);
        } else if (publication.track.kind === Track.Kind.Video) {
          this.updateParticipantVideo(participantId, true, publication.track);
        }
        // 延迟后同步，确保状态更新到最新
        setTimeout(() => {
          this.forceSyncParticipantTrack(participant, participantId);
        }, 100);
      });

      console.log(`✅ 已为 ${participantId} 设置轨道状态监听`);
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
        // 显示加载提示
        const loadingToast = this.$toast.loading({ message: newEnabled ? '正在开启摄像头...' : '正在关闭摄像头...', forbidClick: true, duration: 0 });

        await this.room.localParticipant.setCameraEnabled(newEnabled);
        this.cameraEnabled = newEnabled;

        if (newEnabled) {
          // 等待摄像头轨道准备就绪，减少超时时间以加快响应
          const pub = await this.waitForTrack(Track.Source.Camera, 2000);
          this.localCameraTrack = (pub && pub.track) || null;
          this.updateParticipantVideo(this.localParticipantId, !!this.localCameraTrack, this.localCameraTrack);
        } else {
          this.localCameraTrack = null;
          this.updateParticipantVideo(this.localParticipantId, false, null);
        }
        if (this.viewMode === 'screen-share') this.$nextTick(() => this.bindLocalCameraToFloating());

        // 关闭加载提示
        loadingToast.close();
        this.$toast(newEnabled ? '摄像头已开启' : '摄像头已关闭');
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
        this.$toast(errorMsg);
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
        // 显示加载提示
        const loadingToast = this.$toast.loading({ message: newEnabled ? '正在开启麦克风...' : '正在关闭麦克风...', forbidClick: true, duration: 0 });

        await this.room.localParticipant.setMicrophoneEnabled(newEnabled);
        this.microphoneEnabled = newEnabled;
        this.updateParticipantAudio(this.localParticipantId, newEnabled);

        // 检查本地音频轨道状态
        console.log(`🎤 麦克风状态更新: ${newEnabled ? '开启' : '关闭'}`);

        // 检查所有本地轨道
        const tracks = Array.from(this.room.localParticipant.trackPublications.values());
        console.log(`   本地轨道数量: ${tracks.length}`);
        tracks.forEach((pub, index) => {
          console.log(`   轨道 ${index}: kind=${pub.kind}, source=${pub.source}, isMuted=${pub.isMuted}, track=${pub.track ? '存在' : '不存在'}`);
        });

        // 尝试通过source获取音频轨道
        const audioTrackBySource = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
        console.log(`   通过source获取音频轨道: ${audioTrackBySource ? '存在' : '不存在'}`);
        if (audioTrackBySource && audioTrackBySource.track) {
          console.log(`   音频轨道状态: enabled=${audioTrackBySource.track.enabled}, muted=${audioTrackBySource.isMuted}`);
        }

        // 检查Room对象的音频活动检测配置
        console.log('🔊 检查Room音频活动检测配置:');
        console.log(`   room.config: ${JSON.stringify(this.room.config)}`);
        console.log(`   room.audio: ${JSON.stringify(this.room.audio)}`);

        // 手动触发音频活动检测测试
        if (newEnabled) {
          console.log('🔊 手动测试音频活动检测:');
          console.log('   请开始讲话，观察控制台是否有音频活动变化日志');
        }

        // 启动或停止本地音频活动检测
        if (newEnabled) {
          // 延迟启动，确保音频轨道已准备就绪
          setTimeout(() => {
            this.startAudioActivityDetection();
          }, 500);
        } else {
          this.stopAudioActivityDetection();
        }

        // 关闭加载提示
        loadingToast.close();
        this.$toast(newEnabled ? '麦克风已开启' : '麦克风已关闭');
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
        this.$toast(errorMsg);
        // 重置状态
        this.microphoneEnabled = false;
        this.updateParticipantAudio(this.localParticipantId, false);
      }
    },

    /**
     * 共享屏幕 - 优化画质和比例
     */
    async shareScreen() {
      // 移动端不支持共享屏幕
      if (!this.isPC) {
        this.$toast('移动端不支持共享屏幕功能');
        return;
      }
      console.log('🚀 开始共享屏幕');
      console.log('📋 当前状态:', {
        localParticipantId: this.localParticipantId,
        activeScreenShareId: this.activeScreenShareId,
        viewMode: this.viewMode,
        cameraEnabled: this.cameraEnabled,
        localCameraTrack: !!this.localCameraTrack,
        isHost: this.isHost
      });
      if (!this.room || !this.room.localParticipant) return;
      // 如果已经在共享屏幕，则停止
      if (this.activeScreenShareId === this.localParticipantId) {
        console.log('🛑 已经在共享屏幕，停止共享');
        await this.stopScreenShare();
        return;
      }
      try {
        // 获取屏幕流，并请求高分辨率
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor',
            width: { ideal: 1920, max: 3840 },
            height: { ideal: 1080, max: 2160 },
            frameRate: { ideal: 30, max: 60 },
            // 关键：要求最高质量的视频
            aspectRatio: { ideal: 16/9 },
          },
          audio: false,
        });
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) throw new Error('无法获取屏幕视频轨道');
        this.screenStream = stream;
        videoTrack.onended = () => this.stopScreenShare();

        // 获取屏幕轨道的真实分辨率（用于编码）
        const settings = videoTrack.getSettings();
        const width = settings.width || 1920;
        const height = settings.height || 1080;
        // 根据分辨率动态设置最大比特率（保证清晰度）
        const maxBitrate = Math.min(10000000, Math.max(3000000, (width * height) / 0.25)); // 约3~10 Mbps
        console.log(`📺 屏幕共享分辨率: ${width}x${height}, 编码比特率: ${maxBitrate} bps`);

        // 创建本地屏幕共享轨道
        const localScreenTrack = new LocalVideoTrack(videoTrack, {
          name: 'screen',
          source: Track.Source.ScreenShare,
        });

        // 发布轨道时指定高质量编码参数 - LiveKit 2.18.0 最佳实践
        await this.room.localParticipant.publishTrack(localScreenTrack, {
          name: 'screen',
          source: Track.Source.ScreenShare,
          videoEncoding: {
            maxBitrate: Math.min(30000000, Math.max(8000000, (width * height) / 0.1)), // 进一步提高比特率上限和下限
            maxFramerate: 30,
            priority: 'high',
          },
          // 关键：屏幕共享优先保持分辨率，而不是帧率
          degradationPreference: 'maintain-resolution',
          // 禁用 simulcast 以避免质量降级
          simulcast: false,
          // 确保轨道被所有参与者订阅
          stopSubscriptions: false,
          // 确保轨道以最高质量发布
          videoQuality: 'high',
        });

        console.log('📡 屏幕共享轨道已发布');
        this.localScreenTrack = localScreenTrack;
        this.activeScreenShareId = this.localParticipantId;
        this.viewMode = 'screen-share';

        // 存储屏幕共享状态到 sessionStorage
        sessionStorage.setItem('videoMeeting_screenSharing', JSON.stringify({
          active: true,
          shareId: this.localParticipantId,
          timestamp: Date.now()
        }));

        console.log('🔄 切换到屏幕共享模式');



        // 本地预览：直接使用原始流，确保清晰
        this.$nextTick(() => {
          const screenVideo = this.$refs.screenShareVideo;
          if (screenVideo) {
            if (screenVideo.srcObject) screenVideo.srcObject = null;
            screenVideo.srcObject = stream;
            // 优化显示设置，确保清晰度
            screenVideo.style.width = '100%';
            screenVideo.style.height = '100%';
            screenVideo.style.objectFit = 'contain';
            screenVideo.style.videoRenderingQuality = 'high';
            screenVideo.style.transform = 'translateZ(0)'; // 启用硬件加速
            console.log('✅ 屏幕共享视频元素已设置');
          }
        });
        // 确保主持人的摄像头轨道在侧边栏中显示
        this.$nextTick(() => {
          if (this.cameraEnabled && this.localCameraTrack) {
            // 只调用一次updateParticipantVideo，避免重复操作导致卡顿
            this.updateParticipantVideo(this.localParticipantId, true, this.localCameraTrack);
          }
        });
        this.$toast('屏幕共享已开始');
      } catch (error) {
        console.error('屏幕共享失败:', error);
        if (error.name === 'NotAllowedError') {
          this.$toast('用户取消了屏幕共享或权限被拒绝');
        } else if (error.name === 'NotFoundError') {
          this.$toast('未找到可共享的屏幕或窗口');
        } else {
          this.$toast('屏幕共享失败：' + (error.message || '未知错误'));
        }
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



      // 清除 sessionStorage 中的屏幕共享状态
      sessionStorage.removeItem('videoMeeting_screenSharing');

      this.$toast('屏幕共享已停止');
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

    // ==================== 批注功能 ====================
    toggleAnnotationMode() {
      if (!this.activeScreenShareId) {
        this.$toast('当前没有共享屏幕，无法使用批注功能');
        return;
      }
      if (this.$refs.annotationCanvas) {
        // 检查当前是否已经在批注模式中
        if (this.$refs.annotationCanvas.isAnnotating) {
          this.$refs.annotationCanvas.exitAnnotationMode();
        } else {
          this.$refs.annotationCanvas.startAnnotation();
        }
      }
    },

    handleExitAnnotation() {
      console.log('处理从批注模式退出');
      // 确保批注模式已完全退出
      if (this.$refs.annotationCanvas) {
        // 1. 确保批注模式状态已更新
        this.$refs.annotationCanvas.isAnnotating = false;

        // 2. 发送通知给用户
        this.$toast('已退出批注模式', { duration: 2000 });

        // 3. 清理批注相关状态
        if (this.$refs.annotationCanvas.annotationCanvas) {
          // 可选：清除画布内容
          const ctx = this.$refs.annotationCanvas.annotationCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, this.$refs.annotationCanvas.annotationCanvas.width, this.$refs.annotationCanvas.annotationCanvas.height);
          }
        }

        // 4. 通知其他参会者当前用户已退出批注模式
        if (this.room && this.localParticipantId) {
          try {
            const exitMessage = {
              type: 'annotation',
              participantId: this.localParticipantId,
              participantName: this.getDisplayNameById(this.localParticipantId),
              timestamp: Date.now(),
              data: {
                type: 'exit-annotation'
              }
            };
            this.room.localParticipant.publishData(
              new TextEncoder().encode(JSON.stringify(exitMessage)),
              { reliable: true }
            );
            console.log('已通知其他参会者退出批注模式');
          } catch (error) {
            console.error('发送退出批注模式通知失败:', error);
          }
        }
        console.log('批注模式已成功退出');
      }
    },

    leaveRoom() {
      // 所有用户都直接离开会议，不进行主持人权限移交
      this.$dialog
        .confirm({
          title: '确认离开',
          message: '确定要离开当前会议室吗？',
          confirmButtonText: '确定',
          cancelButtonText: '取消',
        })
        .then(() => {
          this.disconnectRoom();
          this.$toast('已离开会议室');
          setTimeout(() => this.$router.back(), 1000);
        });
    },

    disconnectRoom() {
      this.isDisconnected = true;
      // 停止参与者同步定时器
      this.stopParticipantSync();
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

    // ==================== 屏幕方向检测 ====================
    detectDeviceAndOrientation() {
      // 检测是否为移动端设备
      this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      // 检测屏幕方向
      this.updateOrientation();
      // 监听设备方向变化
      if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', this.updateOrientation.bind(this));
      }
      if (window.ScreenOrientation && window.ScreenOrientation.prototype.lock) {
        console.log('设备支持屏幕方向锁定');
      }
    },
    updateOrientation() {
      // 检测屏幕方向
      const newLandscape = window.innerWidth > window.innerHeight;
      // 只有在方向真正改变时才执行操作
      if (newLandscape !== this.isLandscape) {
        this.isLandscape = newLandscape;
        // 屏幕方向变化时，重新绑定视频元素
        if (this.activeScreenShareId) {
          this.$nextTick(() => {
            this.$forceUpdate();
            console.log('🔄 屏幕方向变化，重新绑定视频元素');
            // 再次等待模板完全渲染后重新绑定轨道
            this.$nextTick(() => {
              this.rebindScreenShareTrack();
            });
          });
        }
      }
    },

    /**
     * 重新绑定屏幕共享轨道
     */
    rebindScreenShareTrack() {
      if (!this.activeScreenShareId) return;

      // 查找屏幕共享轨道
      let screenTrack = null;

      // 检查本地屏幕共享
      if (this.activeScreenShareId === this.localParticipantId && this.localScreenTrack) {
        screenTrack = this.localScreenTrack;
      } else {
        // 检查远程屏幕共享
        if (this.room && this.room.participants) {
          for (const participant of this.room.participants.values()) {
            if (participant.identity === this.activeScreenShareId) {
              const screenPub = participant.getTrackPublication(Track.Source.ScreenShare);
              if (screenPub && screenPub.track) {
                screenTrack = screenPub.track;
                break;
              }
            }
          }
        }
      }

      if (screenTrack) {
        console.log('🔄 重新绑定屏幕共享轨道');
        // 绑定到视频元素
        let screenVideoEl = null;
        if (this.activeScreenShareId === this.localParticipantId) {
          screenVideoEl = this.$refs.screenShareVideo;
        } else {
          screenVideoEl = this.$refs.remoteScreenVideo;
        }

        if (screenVideoEl) {
          // 重置视频元素状态
          if (screenVideoEl.srcObject) screenVideoEl.srcObject = null;

          // 确保视频元素大小合适，优化显示设置
          screenVideoEl.style.width = '100%';
          screenVideoEl.style.height = '100%';
          screenVideoEl.style.objectFit = 'contain';
          screenVideoEl.style.videoRenderingQuality = 'high';
          screenVideoEl.style.transform = 'translateZ(0)';

          // 附加轨道到视频元素
          screenTrack.attach(screenVideoEl);

          // 尝试播放视频
          if (screenVideoEl.paused) {
            screenVideoEl.play().catch(err => {
              console.warn('视频自动播放被阻止:', err.message);
              if (!this.pendingVideoElements) this.pendingVideoElements = new Set();
              this.pendingVideoElements.add(screenVideoEl);
            });
          }

          console.log('✅ 屏幕共享轨道重新绑定成功');
        }
      }
    },

    // ==================== 全屏功能 ====================
    toggleFullscreen() {
      if (this.isFullscreen) {
        this.exitFullscreen();
      } else {
        this.enterFullscreen();
      }
    },
    async enterFullscreen() {
      const mainScreen = this.$refs.videoArea && this.$refs.videoArea.querySelector('.main-screen');
      if (!mainScreen) return;
      try {
        if (mainScreen.requestFullscreen) {
          await mainScreen.requestFullscreen();
        } else if (mainScreen.webkitRequestFullscreen) {
          await mainScreen.webkitRequestFullscreen();
        } else if (mainScreen.mozRequestFullScreen) {
          await mainScreen.mozRequestFullScreen();
        } else if (mainScreen.msRequestFullscreen) {
          await mainScreen.msRequestFullscreen();
        }
        this.isFullscreen = true;
        document.body.style.overflow = 'hidden';
      } catch (error) {
        console.warn('进入全屏失败:', error);
        this.isFullscreen = true;
      }
    },
    async exitFullscreen() {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      } catch (error) {
        console.warn('退出全屏失败:', error);
      }
      this.isFullscreen = false;
      document.body.style.overflow = '';
    },
    handleFullscreenChange() {
      if (!document.fullscreenElement && !document.webkitFullscreenElement &&
        !document.mozFullScreenElement && !document.msFullscreenElement) {
        this.isFullscreen = false;
        document.body.style.overflow = '';
      }
    },
    showFullRoomName() {
      this.$toast(this.roomName);
    },
    syncRemoteParticipantTracks() {
      if (!this.room || this.isDisconnected) return;

      console.log('🔄 同步远程参与者轨道状态');

      const remoteParticipants = this.room.participants;
      if (!remoteParticipants) return;

      // LiveKit room.participants 是 Map，forEach 回调参数是 (participant, participantId)
      if (typeof remoteParticipants.forEach === 'function') {
        remoteParticipants.forEach((participant, participantId) => {
          this.syncParticipantTrack(participant, participantId);
        });
      } else if (typeof remoteParticipants.values === 'function') {
        for (const participant of remoteParticipants.values()) {
          this.syncParticipantTrack(participant, participant.identity);
        }
      }
    },
    syncParticipantTrack(participant, participantId) {
      if (!this.participants[participantId]) return;

      const p = this.participants[participantId];
      let updated = false;
      let newHasAudio = p.hasAudio;
      let newAudioTrack = p.audioTrack;
      let newHasVideo = p.hasVideo;
      let newVideoTrack = p.videoTrack;

      participant.trackPublications.forEach((pub) => {
        if (!pub || !pub.track) return;

        const trackSource = pub.source || 'unknown';
        const isMuted = pub.isMuted;
        
        // 如果 isMuted 未定义，尝试从 track 对象获取
        let actualMuted = isMuted;
        if (actualMuted === undefined || actualMuted === null) {
          if (pub.track && typeof pub.track.isMuted !== 'undefined') {
            actualMuted = pub.track.isMuted;
          } else {
            return;
          }
        }

        if (pub.kind === Track.Kind.Audio) {
          const shouldBeAudioOn = !actualMuted;
          if (newHasAudio !== shouldBeAudioOn) {
            newHasAudio = shouldBeAudioOn;
            newAudioTrack = pub.track;
            updated = true;
            console.log(`🔊 同步远程音频状态: ${participantId}, source=${trackSource}, hasAudio=${newHasAudio}, isMuted=${actualMuted}`);
          }
        } else if (pub.kind === Track.Kind.Video && (trackSource === Track.Source.Camera || trackSource === 'unknown')) {
          const shouldBeVideoOn = !actualMuted;
          if (newHasVideo !== shouldBeVideoOn) {
            newHasVideo = shouldBeVideoOn;
            newVideoTrack = pub.track;
            updated = true;
            console.log(`📹 同步远程视频状态: ${participantId}, source=${trackSource}, hasVideo=${newHasVideo}, isMuted=${actualMuted}`);
          }
        }
      });

      if (updated) {
        this.$set(this.participants, participantId, { ...p, hasAudio: newHasAudio, audioTrack: newAudioTrack, hasVideo: newHasVideo, videoTrack: newVideoTrack });
      }
    },
    startParticipantSync() {
      // Clear any existing timer
      if (this.participantSyncTimer) {
        clearInterval(this.participantSyncTimer);
      }

      // Start new timer - sync every 5 minutes (300000 ms)
      this.participantSyncTimer = setInterval(() => {
        this.syncParticipants();
      }, 300000);
      console.log('✅ 启动参与者同步定时器，每5分钟同步一次');
    },
    // 启动轨道状态同步定时器（更频繁）
    startTrackStatusSync() {
      // Clear any existing timer
      if (this.trackStatusSyncTimer) {
        clearInterval(this.trackStatusSyncTimer);
      }

      // Start new timer - sync every 3 seconds (3000 ms)
      this.trackStatusSyncTimer = setInterval(() => {
        this.syncRemoteParticipantTracks();
      }, 3000);
      console.log('✅ 启动轨道状态同步定时器，每3秒同步一次');
    },
    syncParticipants() {
      if (!this.room || this.isDisconnected) return;

      console.log('🔄 开始同步参与者列表');

      // Get current participants from LiveKit room
      const currentParticipants = this.room.participants;
      const participantIds = new Set();

      // Add local participant
      participantIds.add(this.localParticipantId);

      // Add remote participants
      let remoteParticipantCount = 0;
      if (currentParticipants && typeof currentParticipants.values === 'function') {
        for (const participant of currentParticipants.values()) {
          participantIds.add(participant.identity);
          remoteParticipantCount++;
        }
      }

      console.log(`ℹ️ 同步前状态: 本地参与者ID: ${this.localParticipantId}, 远程参与者数量: ${remoteParticipantCount}, 本地存储参与者数量: ${Object.keys(this.participants).length}`);

      // Compare with local participants
      const localIds = new Set(Object.keys(this.participants));
      const newIds = [...participantIds].filter(id => !localIds.has(id));

      console.log(`🔍 参与者同步结果: 新增 ${newIds.length} 人`);

      // 只添加新参与者，不主动移除参与者
      // 参与者移除应该通过ParticipantDisconnected事件来处理，而不是通过同步
      console.log('⚠️ 同步时只添加新参与者，不移除参与者，避免错误移除');

      // Add new participants
      newIds.forEach(id => {
        if (id !== this.localParticipantId) {
          const participant = currentParticipants.get(id);
          if (participant) {
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
            console.log(`👤 同步添加参与者：${participant.identity}, name: ${displayName}${isParticipantHost ? ' (主持人)' : ''}`);
            if (!participant.name || participant.name.trim() === '' || participant.name === participant.identity) {
              this.fetchAndRegisterName(participant.identity, participant.name);
            }
          }
        }
      });

      this.syncRemoteParticipantTracks();
    },
    stopParticipantSync() {
      if (this.participantSyncTimer) {
        clearInterval(this.participantSyncTimer);
        this.participantSyncTimer = null;
        console.log('🛑 停止参与者同步定时器');
      }
      if (this.trackStatusSyncTimer) {
        clearInterval(this.trackStatusSyncTimer);
        this.trackStatusSyncTimer = null;
        console.log('🛑 停止轨道状态同步定时器');
      }
    },

    // ==================== 本地音频活动检测 ====================
    /**
     * 初始化本地音频分析器
     */
    initAudioAnalyzer() {
      try {
        if (this.audioContext) {
          this.audioContext.close();
        }
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        console.log('✅ 本地音频分析器初始化成功');
      } catch (error) {
        console.error('❌ 初始化音频分析器失败:', error);
      }
    },

    /**
     * 开始本地音频活动检测
     */
    startAudioActivityDetection() {
      if (!this.microphoneEnabled) {
        console.log('🔊 麦克风未开启，跳过本地音频活动检测');
        return;
      }

      // 获取本地音频轨道
      const audioTrack = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (!audioTrack || !audioTrack.track) {
        console.warn('⚠️ 无法获取本地音频轨道');
        console.log(`   room.localParticipant: ${this.room.localParticipant ? '存在' : '不存在'}`);
        console.log(`   getTrackPublication(Microphone): ${audioTrack ? '存在' : '不存在'}`);
        return;
      }

      try {
        // 停止之前的检测
        this.stopAudioActivityDetection();

        // 初始化音频分析器
        this.initAudioAnalyzer();

        // 获取媒体流
        this.audioStream = audioTrack.track.mediaStream;
        console.log('🔊 本地音频流:', this.audioStream);
        
        const audioSource = this.audioContext.createMediaStreamSource(this.audioStream);
        audioSource.connect(this.analyser);

        // 开始检测，增加间隔时间以减少性能开销
        this.audioActivityInterval = setInterval(() => {
          this.detectAudioActivity();
        }, 200);

        console.log('✅ 本地音频活动检测已启动');
      } catch (error) {
        console.error('❌ 启动音频活动检测失败:', error);
      }
    },

    /**
     * 停止本地音频活动检测
     */
    stopAudioActivityDetection() {
      if (this.audioActivityInterval) {
        clearInterval(this.audioActivityInterval);
        this.audioActivityInterval = null;
      }
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
        this.analyser = null;
      }
      this.audioStream = null;
      console.log('🛑 本地音频活动检测已停止');
    },

    /**
     * 检测音频活动
     */
    detectAudioActivity() {
      if (!this.analyser) return;

      try {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        // 计算音频能量
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // 检测是否有音频活动
        const isSpeaking = average > 20; // 阈值可调整

        // 更新本地参与者的isSpeaking状态（已移除本地检测，使用LiveKit内置检测）
        if (this.participants[this.localParticipantId]) {
          const p = this.participants[this.localParticipantId];
          if (p.isSpeaking !== isSpeaking) {
            this.$set(this.participants, this.localParticipantId, { ...p, isSpeaking });
            console.log(`🎤 本地音频活动检测: ${isSpeaking ? '正在发言' : '静音'}`);
          }
        }
      } catch (error) {
        console.error('❌ 检测音频活动失败:', error);
      }
    },

    /**
     * 检查 sessionStorage 中的屏幕共享状态
     */
    checkScreenSharingState() {
      try {
        const storedState = sessionStorage.getItem('videoMeeting_screenSharing');
        if (storedState) {
          // 清除之前的屏幕共享状态，避免自动恢复
          sessionStorage.removeItem('videoMeeting_screenSharing');
        }
      } catch (error) {
        console.warn('检查屏幕共享状态失败:', error);
        sessionStorage.removeItem('videoMeeting_screenSharing');
      }
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* Mobile device adjustments */
@media (max-width: 768px) {
  .room-name {
    max-width: 150px;
    font-size: 16px;
  }
}

/* Small mobile devices */
@media (max-width: 480px) {
  .room-name {
    max-width: 120px;
    font-size: 14px;
  }
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

.sidebar-audio-mute-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff4d4f;
  z-index: 2;
}

.sidebar-audio-speaking-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 2;
  animation: pulse 1.5s infinite;
  box-shadow: 0 0 8px rgba(82, 196, 26, 0.7);
}

/* 移动端屏幕共享优化 */
@media (max-width: 768px) {
  .screen-share-layout {
    gap: 8px;
  }
  .video-area {
    padding: 8px;
  }
  .main-screen {
    border-radius: 8px;
  }
  .screen-video {
    background: #000;
  }
  .sidebar-videos {
    padding: 6px;
    gap: 8px;
  }
  .sidebar-video-wrapper {
    aspect-ratio: 16 / 9;
  }
  .screen-share-label {
    font-size: 10px;
    padding: 4px 8px;
    bottom: 8px;
    left: 8px;
    background: rgba(0, 0, 0, 0.8);
  }
  .floating-camera {
    z-index: 200;
  }
}

/* 小屏幕手机屏幕共享优化 */
@media (max-width: 480px) {
  .video-area {
    padding: 4px;
  }
  .screen-share-layout {
    gap: 4px;
  }
  .sidebar-video-wrapper {
    aspect-ratio: 16 / 9;
  }
  .sidebar-avatar-icon {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
  .sidebar-name {
    font-size: 8px;
    padding: 2px 6px;
  }
  .screen-share-label {
    font-size: 8px;
    padding: 3px 6px;
  }
  /* 确保视频元素在小屏幕上正确显示 */
  .screen-video {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
  }
}

/* 横屏模式屏幕共享优化 */
@media (orientation: landscape) {
  .screen-share-layout {
    flex-direction: row;
  }
  .participants-sidebar {
    width: 200px;
  }
  .sidebar-video-wrapper {
    aspect-ratio: 16 / 9;
  }
}

/* 全屏模式样式 */
.fullscreen-mode {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 9999 !important;
  background: #000 !important;
  border-radius: 0 !important;
}

.fullscreen-video {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
}

.fullscreen-label {
  font-size: 14px !important;
  padding: 8px 16px !important;
  bottom: 20px !important;
  left: 20px !important;
}

.fullscreen-exit-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 16px 32px;
  border-radius: 12px;
  font-size: 16px;
  pointer-events: auto;
  z-index: 10000;
  animation: fadeInOut 3s ease-in-out forwards;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}

.fullscreen-mode .fullscreen-exit-hint {
  opacity: 0;
  pointer-events: none;
}

.fullscreen-mode:active .fullscreen-exit-hint {
  opacity: 1;
  pointer-events: auto;
}

/* 移动端全屏适配 */
@media (max-width: 768px) {
  .fullscreen-label {
    font-size: 12px !important;
    padding: 6px 12px !important;
    bottom: 16px !important;
    left: 16px !important;
  }
  .fullscreen-exit-hint {
    font-size: 14px;
    padding: 12px 24px;
  }
}

/* 小屏幕手机全屏适配 */
@media (max-width: 480px) {
  .fullscreen-label {
    font-size: 10px !important;
    padding: 4px 8px !important;
    bottom: 12px !important;
    left: 12px !important;
  }
  .fullscreen-exit-hint {
    font-size: 12px;
    padding: 10px 20px;
  }
}

/* 横屏模式全屏适配 */
@media (orientation: landscape) {
  .fullscreen-mode .screen-share-layout {
    height: 100vh;
  }
}

/* 竖屏模式全屏适配 */
@media (orientation: portrait) {
  .fullscreen-mode .screen-share-layout {
    height: 100vh;
  }
  .fullscreen-mode .main-screen {
    flex: 1;
  }
}

/* 竖屏模式屏幕共享优化 */
@media (orientation: portrait) {
  .screen-share-layout {
    flex-direction: column;
  }
  .participants-sidebar {
    width: 100%;
    max-height: 160px;
  }
  .sidebar-videos {
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
  }
  .sidebar-item {
    flex: 0 0 120px;
  }
  .sidebar-video-wrapper {
    aspect-ratio: 16 / 9;
  }
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

.audio-speaking-badge {
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
  color: white;
  z-index: 2;
  animation: pulse 1.5s infinite;
  box-shadow: 0 0 10px rgba(82, 196, 26, 0.7);
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
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

/* 横屏提示层 */
.orientation-overlay {
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
.orientation-card {
  background: #fff;
  border-radius: 24px;
  width: 90%;
  max-width: 340px;
  padding: 28px 24px;
  text-align: center;
}
.orientation-icon {
  font-size: 48px;
  margin-bottom: 16px;
  transform: rotate(90deg);
  display: inline-block;
}
.orientation-card h3 {
  font-size: 20px;
  margin: 0 0 12px;
  color: #333;
}
.orientation-card p {
  font-size: 14px;
  color: #666;
  margin: 8px 0 24px;
}
.close-orientation-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}
.close-orientation-btn:hover {
  background: #2563eb;
}

/* 响应式设计 - 移动端适配 */
/* 基础移动端适配 */
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
  .meeting-header {
    padding: 8px 16px;
  }
  .room-name {
    font-size: 16px;
  }
  .member-count {
    font-size: 12px;
    padding: 3px 8px;
  }
  .video-area {
    padding: 8px;
  }
  .control-bar {
    padding: 12px 16px;
    gap: 12px;
  }
  .member-list-dialog {
    width: 95%;
    max-height: 90vh;
  }
  .member-item {
    padding: 12px;
    gap: 10px;
  }
  .screen-share-layout {
    flex-direction: column;
  }
  .participants-sidebar {
    width: 100%;
    max-height: 200px;
  }
}

/* 小屏幕手机适配 */
@media (max-width: 480px) {
  .floating-camera {
    width: 140px;
    height: 105px;
    bottom: 70px;
    right: 6px;
  }
  .control-btn {
    padding: 8px;
  }
  .control-bar {
    gap: 8px;
  }
  .icon-btn {
    width: 32px;
    height: 32px;
  }
  .screen-share-label {
    font-size: 10px;
    padding: 4px 8px;
  }
}

/* 横屏模式适配 */
@media (orientation: landscape) {
  .video-grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
  .floating-camera {
    width: 160px;
    height: 120px;
    bottom: 80px;
    right: 12px;
  }
  .screen-share-layout {
    flex-direction: row;
  }
  .participants-sidebar {
    width: 200px;
    max-height: none;
  }
}

/* 竖屏模式适配 */
@media (orientation: portrait) {
  .screen-share-layout {
    flex-direction: column;
  }
  .participants-sidebar {
    width: 100%;
    max-height: 180px;
  }
  .main-screen {
    flex: 1;
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

/* 音频活动指示器样式 */
.audio-speaking-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: #4CAF50;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 1s infinite;
}

.sidebar-audio-speaking-badge {
  position: absolute;
  bottom: 5px;
  right: 5px;
  background-color: #4CAF50;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
}

/* 批注画布样式 */
.annotation-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: auto;
}

.annotation-canvas.fullscreen-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
}

/* 批注工具栏样式 */
.annotation-toolbar {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 30, 30, 0.95);
  border-radius: 12px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 20;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.annotation-toolbar.collapsed {
  padding: 8px;
  min-width: 52px;
  justify-content: center;
}

.annotation-toolbar .collapse-only {
  display: flex;
  align-items: center;
  justify-content: center;
}

.annotation-toolbar .toolbar-content {
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s ease;
}

.annotation-toolbar .collapse-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 正在批注的用户提示 */
.annotating-users-hint {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(30, 30, 30, 0.95);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  z-index: 15;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 768px) {
  .annotating-users-hint {
    top: 60px;
    right: 12px;
    font-size: 11px;
    padding: 4px 8px;
    max-width: 200px;
  }
}

.annotation-tool-group,
.annotation-color-group,
.annotation-size-group,
.annotation-action-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.annotation-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
}

.annotation-tool-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
}

.annotation-tool-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.annotation-tool-btn.active {
  background: #3b82f6;
  color: #fff;
}

.annotation-color-btn {
  width: 24px;
  height: 24px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.annotation-color-btn:hover {
  transform: scale(1.15);
  border-color: rgba(255, 255, 255, 0.5);
}

.annotation-color-btn.active {
  border-color: #fff;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
}

.annotation-size-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.annotation-size-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.annotation-size-btn.active {
  background: rgba(59, 130, 246, 0.3);
}

.size-dot {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
}

.annotation-action-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
}

.annotation-action-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.annotation-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.annotation-action-btn.close-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .annotation-toolbar {
    padding: 6px 12px;
    gap: 8px;
    flex-wrap: wrap;
    max-width: 90%;
    justify-content: center;
  }

  .annotation-tool-btn,
  .annotation-action-btn {
    width: 32px;
    height: 32px;
  }

  .annotation-color-btn {
    width: 20px;
    height: 20px;
  }

  .annotation-size-btn {
    width: 28px;
    height: 28px;
  }
}
</style>
