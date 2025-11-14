/**
 * 数字记忆PK游戏 - 记住数字序列
 */
import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';
import { Room } from '../core/types';

enum GamePhase {
  SHOW = 'show',      // 显示数字
  INPUT = 'input',    // 玩家输入
  RESULT = 'result'   // 显示结果
}

export class MemoryGame implements Scene {
  name: string = 'memory';
  private canvas: WechatMinigame.Canvas;
  private gameBridge: GameBridge | null = null;
  private mode: 'single' | 'multiplayer' = 'single';
  private room: Room | null = null;

  // 游戏状态
  private isPlaying: boolean = false;
  private phase: GamePhase = GamePhase.SHOW;
  private level: number = 1;
  private score: number = 0;
  
  // 数字序列
  private sequence: number[] = [];
  private userInput: number[] = [];
  private showIndex: number = 0;
  private showTimer: number = 0;

  // 对手信息
  private opponentScore: number = 0;

  // UI
  private buttons: Array<{ num: number; x: number; y: number; size: number }> = [];
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

    // 初始化数字按钮 (0-9)
    this.initButtons();
  }

  enter(data?: any): void {
    console.log('[MemoryGame] Entered', data);
    this.mode = data?.mode || 'single';
    this.room = data?.room || null;

    // 重置游戏状态
    this.score = 0;
    this.opponentScore = 0;
    this.level = 1;
    this.sequence = [];
    this.userInput = [];
    this.isPlaying = true;
    this.phase = GamePhase.SHOW;
    this.showIndex = 0;
    this.showTimer = 0;

    // 生成第一个序列
    this.generateSequence();

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
    console.log('[MemoryGame] Exited');
    this.isPlaying = false;
  }

  update(deltaTime: number): void {
    if (!this.isPlaying) return;

    // 显示阶段 - 逐个显示数字
    if (this.phase === GamePhase.SHOW) {
      this.showTimer += deltaTime;
      
      if (this.showTimer >= 1000) { // 每秒显示一个数字
        this.showTimer = 0;
        this.showIndex++;
        
        if (this.showIndex > this.sequence.length) {
          // 显示完毕，进入输入阶段
          this.phase = GamePhase.INPUT;
          this.showIndex = 0;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#2c3e50');
    gradient.addColorStop(1, '#3498db');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 顶部信息（包含返回按钮）
    this.renderTopBar(ctx);

    if (this.isPlaying) {
      if (this.phase === GamePhase.SHOW) {
        this.renderShowPhase(ctx);
      } else if (this.phase === GamePhase.INPUT) {
        this.renderInputPhase(ctx);
      } else if (this.phase === GamePhase.RESULT) {
        this.renderResultPhase(ctx);
      }
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

    // 输入阶段 - 检测数字按钮点击
    if (this.phase === GamePhase.INPUT) {
      for (const btn of this.buttons) {
        const distance = Math.sqrt((x - btn.x) ** 2 + (y - btn.y) ** 2);
        if (distance <= btn.size / 2) {
          this.onNumberClick(btn.num);
          break;
        }
      }
    } else if (this.phase === GamePhase.RESULT) {
      // 点击继续下一关
      this.nextLevel();
    }
  }

  /**
   * 初始化数字按钮
   */
  private initButtons(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2 + 100;
    const radius = 120;
    const buttonSize = 60;

    for (let i = 0; i < 10; i++) {
      const angle = (i * 36 - 90) * Math.PI / 180;
      this.buttons.push({
        num: i,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        size: buttonSize
      });
    }
  }

  /**
   * 生成数字序列
   */
  private generateSequence(): void {
    this.sequence = [];
    const length = 3 + this.level; // 从3个数字开始，每关增加1个
    
    for (let i = 0; i < length; i++) {
      this.sequence.push(Math.floor(Math.random() * 10));
    }
    
    console.log('[MemoryGame] Sequence:', this.sequence);
  }

  /**
   * 渲染顶部信息栏
   */
  private renderTopBar(ctx: CanvasRenderingContext2D): void {
    const { width } = this.canvas;

    // 背景（避开灵动岛）
    const topBarHeight = 70;
    const topBarY = 50;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, topBarY, width, topBarHeight);

    // 返回按钮
    this.drawBackButton(ctx);

    // 关卡和分数（右侧）
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`关卡: ${this.level}`, width - 20, topBarY + 25);
    ctx.fillText(`分数: ${this.score}`, width - 20, topBarY + 55);
  }

  /**
   * 渲染显示阶段
   */
  private renderShowPhase(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('记住这些数字！', width / 2, 120);

    // 显示当前数字
    if (this.showIndex > 0 && this.showIndex <= this.sequence.length) {
      const num = this.sequence[this.showIndex - 1];
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 120px sans-serif';
      ctx.fillText(num.toString(), width / 2, height / 2);
    }

    // 进度
    ctx.font = '16px sans-serif';
    ctx.fillText(`${this.showIndex} / ${this.sequence.length}`, width / 2, height / 2 + 80);
  }

  /**
   * 渲染输入阶段
   */
  private renderInputPhase(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('按顺序输入数字', width / 2, 120);

    // 显示已输入的数字
    if (this.userInput.length > 0) {
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(this.userInput.join(' '), width / 2, height / 2 - 80);
    }

    // 绘制数字按钮
    this.buttons.forEach(btn => {
      this.drawNumberButton(ctx, btn);
    });
  }

  /**
   * 渲染结果阶段
   */
  private renderResultPhase(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    const isCorrect = this.checkAnswer();
    
    ctx.fillStyle = isCorrect ? '#4caf50' : '#ff6b6b';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isCorrect ? '✓ 正确！' : '✗ 错误', width / 2, height / 2 - 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`正确答案: ${this.sequence.join(' ')}`, width / 2, height / 2 + 20);
    ctx.fillText(`你的答案: ${this.userInput.join(' ')}`, width / 2, height / 2 + 60);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText('点击屏幕继续', width / 2, height / 2 + 120);
  }

  /**
   * 渲染对手分数
   */
  private renderOpponentScore(ctx: CanvasRenderingContext2D): void {
    const { width } = this.canvas;

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`对手: Lv${Math.floor(this.opponentScore / 10) + 1}`, width - 20, 35);
    ctx.fillText(`分数: ${this.opponentScore}`, width - 20, 65);
  }

  /**
   * 绘制数字按钮
   */
  private drawNumberButton(ctx: CanvasRenderingContext2D, btn: { num: number; x: number; y: number; size: number }): void {
    // 按钮背景
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 数字
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(btn.num.toString(), btn.x, btn.y + 10);
  }

  /**
   * 数字点击
   */
  private onNumberClick(num: number): void {
    this.userInput.push(num);
    
    wx.vibrateShort({ type: 'light' });

    // 检查输入是否完成
    if (this.userInput.length === this.sequence.length) {
      this.phase = GamePhase.RESULT;
      
      // 检查答案
      const isCorrect = this.checkAnswer();
      if (isCorrect) {
        this.score += this.level * 10;
        
        // 上报分数
        if (this.mode === 'multiplayer' && this.gameBridge) {
          this.gameBridge.reportScore(this.score);
        }
      }
    }
  }

  /**
   * 检查答案
   */
  private checkAnswer(): boolean {
    if (this.userInput.length !== this.sequence.length) return false;
    
    for (let i = 0; i < this.sequence.length; i++) {
      if (this.userInput[i] !== this.sequence[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * 下一关
   */
  private nextLevel(): void {
    const isCorrect = this.checkAnswer();
    
    if (isCorrect) {
      // 继续下一关
      this.level++;
      this.userInput = [];
      this.phase = GamePhase.SHOW;
      this.showIndex = 0;
      this.showTimer = 0;
      this.generateSequence();
    } else {
      // 游戏结束
      this.endGame();
    }
  }

  /**
   * 结束游戏
   */
  private endGame(): void {
    this.isPlaying = false;

    if (this.mode === 'multiplayer' && this.gameBridge) {
      this.gameBridge.gameOver(this.score);
    } else {
      setTimeout(() => {
        this.showResult({
          gameType: 'memory',
          players: [{ id: 'local', score: this.score, rank: 1 }],
          duration: 0,
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
      content: `最高关卡: ${this.level}\n最终分数: ${this.score}`,
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

