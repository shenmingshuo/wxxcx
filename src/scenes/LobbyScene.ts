/**
 * 房间大厅场景 - Redisgned with UI System
 */
import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';
import { Room, GameState, Player } from '../core/types';
import { Theme } from '../ui/Theme';
import { UIComponent } from '../ui/core/UIComponent';
import { Button } from '../ui/components/Button';
import { PlayerCard } from '../ui/components/PlayerCard';

export class LobbyScene implements Scene {
  name: string = 'lobby';
  private canvas: WechatMinigame.Canvas;
  private gameBridge: GameBridge | null = null;
  private currentRoom: Room | null = null;
  private gameType: string = '';

  // UI 组件
  private uiComponents: UIComponent[] = [];

  // 特定 UI 引用（用于更新状态）
  private createBtn: Button | null = null;
  private readyBtn: Button | null = null;
  private backBtn: Button | null = null;

  private animationTime: number = 0;

  init(): void {
    this.canvas = wx.createCanvas();
    const { windowWidth } = wx.getSystemInfoSync();

    // 初始化时这里不创建 UI，因为 UI 依赖于是否在房间内的状态
    // 我们将在 Update 或 state change 时重建/更新 UI
    // 但为了基础布局，我們可以预先创建一些
  }

  enter(data?: any): void {
    console.log('[LobbyScene] Entered', data);
    this.gameType = data?.gameType || 'reaction';
    this.currentRoom = null;
    this.rebuildUI(); // 进入时重置 UI
  }

  exit(): void {
    console.log('[LobbyScene] Exited');
    if (this.gameBridge && this.currentRoom) {
      this.gameBridge.leaveRoom();
    }
    this.uiComponents = [];
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // 更新 UI 动画
    this.uiComponents.forEach(c => c.update(deltaTime));

    // 更新房间状态逻辑
    if (this.gameBridge) {
      const prevRoomState = this.currentRoom ? JSON.stringify(this.currentRoom) : '';
      this.currentRoom = this.gameBridge.getCurrentRoom();
      const currRoomState = this.currentRoom ? JSON.stringify(this.currentRoom) : '';

      // 简单的状态变更检测，触发 UI 更新
      // 实际上应该用事件监听，gameBridge.on('room_update')
      // 这里为了保险 check 一下，或者只在 room_update 回调里调用 rebuildUI

      // 如果游戏已开始，切换到游戏场景
      if (this.currentRoom && this.currentRoom.state === GameState.PLAYING) {
        (this as any).__sceneManager.switchTo(this.gameType, {
          mode: 'multiplayer',
          room: this.currentRoom
        });
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    // 1. 绘制背景
    this.drawBackground(ctx, width, height);

    // 2. 绘制 UI
    this.uiComponents.forEach(c => c.render(ctx));

    // 3. 绘制额外文本（如标题等，如果不用 Label 组件的话）
    this.drawOverlayText(ctx, width, height);
  }

  // --- UI 构建 ---

  private rebuildUI(): void {
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.uiComponents = []; // 清空

    // 1. 返回按钮 (始终存在)
    this.backBtn = new Button('返回', 20, 50, 80, 36, 'ghost');
    this.backBtn.radius = 18;
    this.backBtn.fontSize = 14;
    this.backBtn.onClick = () => {
      (this as any).__sceneManager.switchTo('menu');
    };
    this.uiComponents.push(this.backBtn);

    // 2. 根据状态构建
    if (!this.currentRoom) {
      this.buildCreateRoomUI(windowWidth, windowHeight);
    } else {
      this.buildRoomUI(windowWidth, windowHeight);
    }
  }

  private buildCreateRoomUI(width: number, height: number): void {
    const btnWidth = 220;
    const btnHeight = 56;

    this.createBtn = new Button(
      '创建房间',
      (width - btnWidth) / 2,
      height / 2 + 50,
      btnWidth,
      btnHeight,
      'primary'
    );
    this.createBtn.onClick = () => this.createRoom();

    this.uiComponents.push(this.createBtn);
  }

  private buildRoomUI(width: number, height: number): void {
    if (!this.currentRoom) return;

    // 玩家列表
    const startY = 180;
    const padding = 20;
    const cardHeight = 90;

    this.currentRoom.players.forEach((player, index) => {
      const isLocal = this.gameBridge?.getLocalPlayer()?.id === player.id;
      const card = new PlayerCard(
        player,
        padding,
        startY + index * (cardHeight + 16),
        width - padding * 2,
        cardHeight,
        isLocal
      );
      this.uiComponents.push(card);
    });

    // 准备按钮 (底部)
    const localPlayer = this.gameBridge?.getLocalPlayer();
    if (localPlayer) {
      const btnWidth = 200;
      const btnHeight = 50;
      const btnText = localPlayer.isReady ? '取消准备' : '准备';
      const btnVariant = localPlayer.isReady ? 'secondary' : 'primary';

      this.readyBtn = new Button(
        btnText,
        (width - btnWidth) / 2,
        height - 120,
        btnWidth,
        btnHeight,
        btnVariant
      );

      this.readyBtn.onClick = () => this.toggleReady();
      this.uiComponents.push(this.readyBtn);
    }
  }

  // --- 交互处理 ---

  onTouchStart(x: number, y: number): void {
    // 倒序检测
    for (let i = this.uiComponents.length - 1; i >= 0; i--) {
      if (this.uiComponents[i].handleTouchStart(x, y)) {
        break;
      }
    }
  }

  onTouchEnd(x: number, y: number): void {
    for (let i = this.uiComponents.length - 1; i >= 0; i--) {
      if (this.uiComponents[i].handleTouchEnd(x, y)) {
        break;
      }
    }
  }

  onTouchMove(x: number, y: number): void {
    for (let i = this.uiComponents.length - 1; i >= 0; i--) {
      if (this.uiComponents[i].handleTouchMove(x, y)) break;
    }
  }

  // --- 业务逻辑 ---

  private createRoom(): void {
    if (!this.gameBridge) return;

    wx.getUserInfo({
      success: (res) => {
        this.gameBridge!.createRoom(this.gameType, {
          nickname: res.userInfo.nickName,
          avatar: res.userInfo.avatarUrl
        });
      },
      fail: () => {
        const randomName = '玩家' + Math.floor(Math.random() * 1000);
        this.gameBridge!.createRoom(this.gameType, {
          nickname: randomName
        });
      }
    });
    // 注意：createRoom 后 server 会返回 room_update，那时会触发 rebuildUI
  }

  private toggleReady(): void {
    if (!this.gameBridge) return;
    this.gameBridge.ready();
    // 状态更新会通过 room_update 回调更新 UI
  }

  // --- 渲染辅助 ---

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // 同样使用 Theme 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, Theme.colors.background.gradientStart);
    gradient.addColorStop(0.5, Theme.colors.background.gradientMiddle);
    gradient.addColorStop(1, Theme.colors.background.gradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 简单的背景图案
    ctx.strokeStyle = Theme.colors.border.light;
    ctx.lineWidth = 1;

    // 绘制网格
    ctx.beginPath();
    const gridSize = 40;
    const offset = (this.animationTime / 50) % gridSize;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = offset; y <= height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.globalAlpha = 0.05;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  private drawOverlayText(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // 标题
    if (!this.currentRoom) {
      ctx.fillStyle = Theme.colors.text.primary;
      ctx.font = `bold ${Theme.fonts.size.h1}px ${Theme.fonts.default}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('联机对战', width / 2, height / 2 - 20);

      ctx.fillStyle = Theme.colors.text.secondary;
      ctx.font = `${Theme.fonts.size.body}px ${Theme.fonts.default}`;
      ctx.textBaseline = 'top';
      ctx.fillText('创建或加入房间开始游戏', width / 2, height / 2 - 10);
    } else {
      ctx.fillStyle = Theme.colors.text.primary;
      ctx.font = `bold ${Theme.fonts.size.h2}px ${Theme.fonts.default}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`房间号: ${this.currentRoom.id}`, width / 2, 100);

      // 倒计时
      if (this.currentRoom.state === GameState.READY && this.currentRoom.countdown !== undefined) {
        ctx.save();
        ctx.fillStyle = Theme.colors.status.error;
        ctx.font = 'bold 80px sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 10;
        ctx.fillText(`${this.currentRoom.countdown}`, width / 2, height / 2);
        ctx.restore();
      }

      // 等待提示
      if (this.currentRoom.players.length < this.currentRoom.maxPlayers && this.currentRoom.state !== GameState.PLAYING) {
        ctx.fillStyle = Theme.colors.text.disabled;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('等待其他玩家加入...', width / 2, height - 180);
      }
    }
  }

  // --- 接口实现 ---

  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
    bridge.on('room_update', (room: Room) => {
      this.currentRoom = room;
      this.rebuildUI(); // 收到更新必须重建 UI 以反映最新状态（如 ready 状态变更）
    });
  }

  setSceneManager(manager: any): void {
    (this as any).__sceneManager = manager;
  }
}
