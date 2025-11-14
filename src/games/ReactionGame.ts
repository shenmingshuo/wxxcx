/**
 * 反应力PK游戏 - 点击移动的目标
 */
import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';
import { Room } from '../core/types';

interface Target {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
}

export class ReactionGame implements Scene {
  name: string = 'reaction';
  private canvas: WechatMinigame.Canvas;
  private gameBridge: GameBridge | null = null;
  private mode: 'single' | 'multiplayer' = 'single';
  private room: Room | null = null;

  // 游戏状态
  private isPlaying: boolean = false;
  private score: number = 0;
  private timeLeft: number = 30; // 30秒
  private startTime: number = 0;

  // 目标
  private targets: Target[] = [];
  private maxTargets: number = 3;

  // 对手信息
  private opponentScore: number = 0;

  // UI
  private backBtn: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 };

  init(): void {
    this.canvas = wx.createCanvas();
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.canvas.width = windowWidth;
    this.canvas.height = windowHeight;

    // 返回按钮位置（避开灵动岛）
    this.backBtn = {
      x: 20,
      y: 60,  // 往下移动
      width: 80,
      height: 40
    };
  }

  enter(data?: any): void {
    console.log('[ReactionGame] Entered', data);
    this.mode = data?.mode || 'single';
    this.room = data?.room || null;

    // 重置游戏状态
    this.score = 0;
    this.opponentScore = 0;
    this.timeLeft = 30;
    this.targets = [];
    this.isPlaying = true;
    this.startTime = Date.now();

    // 创建初始目标
    for (let i = 0; i < this.maxTargets; i++) {
      this.spawnTarget();
    }

    // 监听对手动作
    if (this.mode === 'multiplayer' && this.gameBridge) {
      this.gameBridge.on('game_action', (data: any) => {
        if (data.action?.type === 'score_update') {
          this.opponentScore = data.action.score;
        }
      });

      this.gameBridge.on('game_over', (result: any) => {
        this.isPlaying = false;
        this.showResult(result);
      });
    }
  }

  exit(): void {
    console.log('[ReactionGame] Exited');
    this.isPlaying = false;
  }

  update(deltaTime: number): void {
    if (!this.isPlaying) return;

    // 更新时间
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.timeLeft = Math.max(0, 30 - elapsed);

    // 时间到，游戏结束
    if (this.timeLeft <= 0) {
      this.endGame();
      return;
    }

    // 更新目标位置
    this.targets.forEach(target => {
      target.x += target.vx;
      target.y += target.vy;

      // 边界反弹
      if (target.x - target.radius < 0 || target.x + target.radius > this.canvas.width) {
        target.vx *= -1;
      }
      if (target.y - target.radius < 100 || target.y + target.radius > this.canvas.height - 100) {
        target.vy *= -1;
      }
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    // 背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // 顶部信息栏（包含返回按钮和分数）
    this.renderTopBar(ctx);

    if (this.isPlaying) {
      // 绘制目标
      this.targets.forEach(target => {
        this.drawTarget(ctx, target);
      });
    }

    // 对手分数（联机模式）
    if (this.mode === 'multiplayer') {
      this.renderOpponentScore(ctx);
    }
  }

  onTouchEnd(x: number, y: number): void {
    // 返回按钮（始终可用）
    if (this.isPointInRect(x, y, this.backBtn)) {
      if (this.isPlaying) {
        // 游戏进行中，弹出确认
        wx.showModal({
          title: '确认退出',
          content: '游戏正在进行中，确定要退出吗？',
          success: (res) => {
            if (res.confirm) {
              this.isPlaying = false;
              const sceneName = this.mode === 'multiplayer' ? 'lobby' : 'menu';
              (this as any).__sceneManager.switchTo(sceneName);
            }
          }
        });
      } else {
        const sceneName = this.mode === 'multiplayer' ? 'lobby' : 'menu';
        (this as any).__sceneManager.switchTo(sceneName);
      }
      return;
    }

    if (!this.isPlaying) {
      return;
    }

    // 检测是否点中目标
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const target = this.targets[i];
      const distance = Math.sqrt((x - target.x) ** 2 + (y - target.y) ** 2);
      
      if (distance <= target.radius) {
        // 命中
        this.score += 10;
        this.targets.splice(i, 1);
        this.spawnTarget();

        // 上报分数（联机模式）
        if (this.mode === 'multiplayer' && this.gameBridge) {
          this.gameBridge.reportScore(this.score);
        }

        // 反馈
        wx.vibrateShort({ type: 'light' });
        break;
      }
    }
  }

  /**
   * 渲染顶部信息栏
   */
  private renderTopBar(ctx: CanvasRenderingContext2D): void {
    const { width } = this.canvas;

    // 背景（避开灵动岛区域，从更下方开始）
    const topBarHeight = 70;
    const topBarY = 50;  // 往下移，避开灵动岛
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, topBarY, width, topBarHeight);

    // 返回按钮
    this.drawBackButton(ctx);

    // 分数（中间）
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`分数: ${this.score}`, width / 2, topBarY + 40);

    // 时间（右侧）
    ctx.textAlign = 'right';
    const timeColor = this.timeLeft <= 5 ? '#ff6b6b' : '#ffffff';
    ctx.fillStyle = timeColor;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`⏱ ${Math.ceil(this.timeLeft)}秒`, width - 20, topBarY + 40);
  }

  /**
   * 渲染对手分数
   */
  private renderOpponentScore(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, height - 80, width, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`对手分数: ${this.opponentScore}`, 20, height - 40);

    // 领先/落后提示
    const diff = this.score - this.opponentScore;
    if (diff > 0) {
      ctx.fillStyle = '#4caf50';
      ctx.textAlign = 'right';
      ctx.fillText(`领先 ${diff} 分`, width - 20, height - 40);
    } else if (diff < 0) {
      ctx.fillStyle = '#ff6b6b';
      ctx.textAlign = 'right';
      ctx.fillText(`落后 ${Math.abs(diff)} 分`, width - 20, height - 40);
    }
  }

  /**
   * 绘制目标
   */
  private drawTarget(ctx: CanvasRenderingContext2D, target: Target): void {
    // 外圈发光效果
    ctx.shadowColor = target.color;
    ctx.shadowBlur = 20;
    
    ctx.fillStyle = target.color;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fill();

    // 内圈
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 生成新目标
   */
  private spawnTarget(): void {
    const margin = 50;
    const radius = 30 + Math.random() * 20;
    
    const target: Target = {
      x: margin + Math.random() * (this.canvas.width - margin * 2),
      y: 150 + Math.random() * (this.canvas.height - 300),
      radius: radius,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      color: this.getRandomColor()
    };

    this.targets.push(target);
  }

  /**
   * 获取随机颜色
   */
  private getRandomColor(): string {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 结束游戏
   */
  private endGame(): void {
    this.isPlaying = false;

    // 上报最终分数
    if (this.mode === 'multiplayer' && this.gameBridge) {
      this.gameBridge.gameOver(this.score);
    } else {
      // 单机模式直接显示结果
      setTimeout(() => {
        this.showResult({
          gameType: 'reaction',
          players: [{ id: 'local', score: this.score, rank: 1 }],
          duration: 30,
          timestamp: Date.now()
        });
      }, 500);
    }
  }

  /**
   * 显示结果
   */
  private showResult(result: any): void {
    const localPlayer = result.players.find((p: any) => p.id === 'local' || p.rank === 1);
    const message = this.mode === 'multiplayer' 
      ? (localPlayer?.rank === 1 ? '🎉 你赢了！' : '😢 下次加油！')
      : '游戏结束！';

    wx.showModal({
      title: message,
      content: `最终分数: ${this.score}`,
      showCancel: false,
      confirmText: '返回',
      success: () => {
        const sceneName = this.mode === 'multiplayer' ? 'lobby' : 'menu';
        (this as any).__sceneManager.switchTo(sceneName);
      }
    });
  }

  /**
   * 绘制返回按钮
   */
  private drawBackButton(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = this.backBtn;
    
    // 半透明背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(x + height / 2, y + height / 2, height / 2, 0, Math.PI * 2);
    ctx.arc(x + width - height / 2, y + height / 2, height / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + height / 2, y, width - height, height);

    // 文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← 返回', x + width / 2, y + height / 2 + 6);
  }

  /**
   * 绘制按钮
   */
  private drawButton(ctx: CanvasRenderingContext2D, rect: { x: number; y: number; width: number; height: number }, text: string, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, rect.x + rect.width / 2, rect.y + rect.height / 2 + 5);
  }

  /**
   * 判断点是否在矩形内
   */
  private isPointInRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  /**
   * 设置游戏桥接器
   */
  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
  }

  /**
   * 设置场景管理器
   */
  setSceneManager(manager: any): void {
    (this as any).__sceneManager = manager;
  }
}

