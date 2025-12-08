import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';

declare const require: any;
import { DataStore } from './clumsy_bird/base/dataStore';

const databus = DataStore.getInstance();

const RESOURCE_PATH = 'assets/clumsy_bird/';

export class ClumsyBirdGame implements Scene {
  name: string = 'clumsy_bird';
  private canvas: WechatMinigame.Canvas;
  private ctx: CanvasRenderingContext2D;
  private gameBridge: GameBridge | null = null;
  private sceneManager: any = null;

  // 游戏实例
  private gameInstance: any = null;
  private isRunning: boolean = false;
  private backBtn = { x: 20, y: 20, width: 100, height: 40 };

  init(): void {
    // SceneManager owns the main canvas, we don't need to create a new one here unless we wanted a buffer.
    // But Main-wrapper creates its own canvas (offscreen), so we will just use that.
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    // No need to create this.canvas, we will use gameInstance.canvas
  }

  enter(data?: any): void {
    console.log('[ClumsyBird] Game starting...');
    this.isRunning = true;
    this.startGame();
  }

  exit(): void {
    console.log('[ClumsyBird] Game exiting...');
    this.isRunning = false;
    this.stopGame();
  }

  private startGame(): void {
    try {
      // 直接使用 require 导入（微信小游戏支持）
      const MainModule = require('./clumsy_bird/main-wrapper.js');
      const Main = MainModule.Main || MainModule.default || MainModule;
      this.gameInstance = new Main();
      console.log('[ClumsyBird] Game instance created');
    } catch (error) {
      console.error('[ClumsyBird] Failed to start game:', error);
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

    // 1. Draw the game's offscreen canvas to the main context
    if (this.gameInstance && this.gameInstance.canvas) {
      // We assume the game canvas is same size as screen
      const { width, height } = ctx.canvas;
      ctx.drawImage(this.gameInstance.canvas, 0, 0, width, height);
    }

    // 2. Draw Back Button on top
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
    // Check Back Button first
    if (x >= this.backBtn.x && x <= this.backBtn.x + this.backBtn.width &&
      y >= this.backBtn.y && y <= this.backBtn.y + this.backBtn.height) {
      this.sceneManager.switchTo('menu');
      return;
    }
  }

  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
  }

  setSceneManager(manager: any): void {
    this.sceneManager = manager;
  }
}

