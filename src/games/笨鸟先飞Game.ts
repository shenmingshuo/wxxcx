import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';

declare const require: any;

export class 笨鸟先飞Game implements Scene {
  name: string = '笨鸟先飞';
  private canvas: WechatMinigame.Canvas;
  private ctx: CanvasRenderingContext2D;
  private gameBridge: GameBridge | null = null;
  private sceneManager: any = null;

  // 游戏实例
  private gameInstance: any = null;
  private isRunning: boolean = false;
  private backBtn = { x: 20, y: 20, width: 100, height: 40 };

  init(): void {
    this.canvas = wx.createCanvas();
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.canvas.width = windowWidth;
    this.canvas.height = windowHeight;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
  }

  enter(data?: any): void {
    console.log('[笨鸟先飞] Game starting...');
    this.isRunning = true;
    this.startGame();
  }

  exit(): void {
    console.log('[笨鸟先飞] Game exiting...');
    this.isRunning = false;
    this.stopGame();
  }

  private startGame(): void {
    try {
      // 直接使用 require 导入（微信小游戏支持）
      const MainModule = require('./笨鸟先飞/main-wrapper.js');
      const Main = MainModule.Main || MainModule.default || MainModule;
      this.gameInstance = new Main();
      console.log('[笨鸟先飞] Game instance created');
    } catch (error) {
      console.error('[笨鸟先飞] Failed to start game:', error);
      wx.showToast({
        title: '游戏加载失败',
        icon: 'none',
        duration: 2000
      });
    }
  }

  private stopGame(): void {
    if (this.gameInstance && this.gameInstance.destroy) {
      this.gameInstance.destroy();
    }
    this.gameInstance = null;
  }

  update(deltaTime: number): void {
    // 游戏逻辑由原项目的 requestAnimationFrame 控制
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isRunning) return;

    // 绘制返回按钮
    this.drawBackButton(ctx);
  }

  private drawBackButton(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    // 半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(this.backBtn.x, this.backBtn.y, this.backBtn.width, this.backBtn.height);
    
    // 边框
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.backBtn.x, this.backBtn.y, this.backBtn.width, this.backBtn.height);
    
    // 文字
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('返回', this.backBtn.x + this.backBtn.width / 2, this.backBtn.y + this.backBtn.height / 2);
    
    ctx.restore();
  }

  onTouchStart(x: number, y: number): void {
    // 检查返回按钮
    if (x >= this.backBtn.x && x <= this.backBtn.x + this.backBtn.width &&
        y >= this.backBtn.y && y <= this.backBtn.y + this.backBtn.height) {
      this.sceneManager.switchTo('menu');
      return;
    }

    // 其他点击由原游戏处理（已经注册了 wx.onTouchStart）
  }

  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
  }

  setSceneManager(manager: any): void {
    this.sceneManager = manager;
  }
}

