/**
 * 房间大厅场景 - 创建/加入房间
 */
import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';
import { Room, GameState, Player } from '../core/types';

export class LobbyScene implements Scene {
  name: string = 'lobby';
  private canvas: WechatMinigame.Canvas;
  private gameBridge: GameBridge | null = null;
  private currentRoom: Room | null = null;
  private gameType: string = '';
  private createRoomBtn: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 };
  private readyBtn: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 };
  private backBtn: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 };

  init(): void {
    this.canvas = wx.createCanvas();
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.canvas.width = windowWidth;
    this.canvas.height = windowHeight;

    // 初始化按钮位置
    const btnWidth = 200;
    const btnHeight = 50;
    this.createRoomBtn = {
      x: (this.canvas.width - btnWidth) / 2,
      y: this.canvas.height / 2 - 30,
      width: btnWidth,
      height: btnHeight
    };

    this.readyBtn = {
      x: (this.canvas.width - btnWidth) / 2,
      y: this.canvas.height - 120,
      width: btnWidth,
      height: btnHeight
    };

    this.backBtn = {
      x: 20,
      y: 20,
      width: 80,
      height: 40
    };
  }

  enter(data?: any): void {
    console.log('[LobbyScene] Entered', data);
    this.gameType = data?.gameType || 'reaction';
    this.currentRoom = null;
  }

  exit(): void {
    console.log('[LobbyScene] Exited');
    // 离开房间
    if (this.gameBridge && this.currentRoom) {
      this.gameBridge.leaveRoom();
    }
  }

  update(deltaTime: number): void {
    // 更新房间状态
    if (this.gameBridge) {
      this.currentRoom = this.gameBridge.getCurrentRoom();
      
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

    // 背景
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // 返回按钮
    this.drawButton(ctx, this.backBtn, '← 返回', '#666666');

    if (!this.currentRoom) {
      // 未创建房间 - 显示创建房间界面
      this.renderCreateRoom(ctx);
    } else {
      // 已在房间 - 显示房间信息
      this.renderRoom(ctx);
    }
  }

  onTouchEnd(x: number, y: number): void {
    // 返回按钮
    if (this.isPointInRect(x, y, this.backBtn)) {
      (this as any).__sceneManager.switchTo('menu');
      return;
    }

    if (!this.currentRoom) {
      // 创建房间按钮
      if (this.isPointInRect(x, y, this.createRoomBtn)) {
        this.createRoom();
      }
    } else {
      // 准备按钮
      if (this.isPointInRect(x, y, this.readyBtn)) {
        this.ready();
      }
    }
  }

  /**
   * 渲染创建房间界面
   */
  private renderCreateRoom(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('联机对战', width / 2, 100);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('创建房间后，邀请好友加入对战', width / 2, 140);

    // 创建房间按钮
    this.drawButton(ctx, this.createRoomBtn, '创建房间', '#667eea');

    // 提示
    ctx.fillStyle = '#999999';
    ctx.font = '14px sans-serif';
    ctx.fillText('或输入房间号加入', width / 2, height / 2 + 80);
  }

  /**
   * 渲染房间界面
   */
  private renderRoom(ctx: CanvasRenderingContext2D): void {
    if (!this.currentRoom) return;

    const { width, height } = this.canvas;

    // 房间号
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`房间号: ${this.currentRoom.id}`, width / 2, 100);

    // 玩家列表
    const startY = 180;
    const playerHeight = 100;

    this.currentRoom.players.forEach((player, index) => {
      this.drawPlayerCard(ctx, player, 20, startY + index * (playerHeight + 20), width - 40, playerHeight);
    });

    // 等待其他玩家
    if (this.currentRoom.players.length < this.currentRoom.maxPlayers) {
      ctx.fillStyle = '#999999';
      ctx.font = '16px sans-serif';
      ctx.fillText('等待其他玩家加入...', width / 2, startY + this.currentRoom.players.length * (playerHeight + 20) + 50);
    }

    // 准备按钮
    const localPlayer = this.gameBridge?.getLocalPlayer();
    if (localPlayer) {
      const btnText = localPlayer.isReady ? '已准备' : '准备';
      const btnColor = localPlayer.isReady ? '#999999' : '#667eea';
      this.drawButton(ctx, this.readyBtn, btnText, btnColor);
    }

    // 开始倒计时
    if (this.currentRoom.state === GameState.READY && this.currentRoom.countdown !== undefined) {
      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText(`${this.currentRoom.countdown}`, width / 2, height / 2);
    }
  }

  /**
   * 绘制玩家卡片
   */
  private drawPlayerCard(ctx: CanvasRenderingContext2D, player: Player, x: number, y: number, width: number, height: number): void {
    // 背景
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 5;
    this.roundRect(ctx, x, y, width, height, 10);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 头像占位符
    ctx.fillStyle = '#667eea';
    ctx.beginPath();
    ctx.arc(x + 50, y + height / 2, 30, 0, Math.PI * 2);
    ctx.fill();

    // 昵称
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(player.nickname, x + 100, y + height / 2 - 10);

    // 状态
    ctx.fillStyle = player.isReady ? '#4caf50' : '#999999';
    ctx.font = '14px sans-serif';
    ctx.fillText(player.isReady ? '已准备' : '未准备', x + 100, y + height / 2 + 15);
  }

  /**
   * 绘制按钮
   */
  private drawButton(ctx: CanvasRenderingContext2D, rect: { x: number; y: number; width: number; height: number }, text: string, color: string): void {
    ctx.fillStyle = color;
    this.roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, rect.x + rect.width / 2, rect.y + rect.height / 2 + 6);
  }

  /**
   * 绘制圆角矩形
   */
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * 判断点是否在矩形内
   */
  private isPointInRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  /**
   * 创建房间
   */
  private createRoom(): void {
    if (!this.gameBridge) return;

    // 获取用户信息
    wx.getUserInfo({
      success: (res) => {
        this.gameBridge!.createRoom(this.gameType, {
          nickname: res.userInfo.nickName,
          avatar: res.userInfo.avatarUrl
        });
      },
      fail: () => {
        // 使用默认昵称
        this.gameBridge!.createRoom(this.gameType, {
          nickname: '玩家' + Math.floor(Math.random() * 1000)
        });
      }
    });
  }

  /**
   * 准备
   */
  private ready(): void {
    if (!this.gameBridge) return;
    
    const localPlayer = this.gameBridge.getLocalPlayer();
    if (localPlayer && !localPlayer.isReady) {
      this.gameBridge.ready();
    }
  }

  /**
   * 设置游戏桥接器
   */
  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
    
    // 监听房间更新
    bridge.on('room_update', (room: Room) => {
      this.currentRoom = room;
    });
  }

  /**
   * 设置场景管理器
   */
  setSceneManager(manager: any): void {
    (this as any).__sceneManager = manager;
  }
}

