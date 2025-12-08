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
  // UI Components
  private backBtn = { x: 0, y: 50, width: 80, height: 36 }; // Will be updated in init
  private isGameOver: boolean = false;
  private score: number = 0;

  // Modal Buttons
  private restartBtn = { x: 0, y: 0, width: 200, height: 60 };
  private exitBtn = { x: 0, y: 0, width: 200, height: 60 };

  init(): void {
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    // Move Back Button to Right Side
    this.backBtn.x = windowWidth - 100;

    // Setup Modal Buttons
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;

    this.restartBtn.x = centerX - 100;
    this.restartBtn.y = centerY + 20;

    this.exitBtn.x = centerX - 100;
    this.exitBtn.y = centerY + 100;
  }

  enter(data?: any): void {
    console.log('[ClumsyBird] Game starting...');
    this.isRunning = true;
    this.isGameOver = false;
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
    // Sync game state
    if (this.gameInstance && this.gameInstance.manager) {
      this.isGameOver = this.gameInstance.manager.isGameOver;

      // Sync score if possible
      if (this.gameInstance.dataStore) {
        const scoreObj = this.gameInstance.dataStore.get('score');
        if (scoreObj) {
          this.score = scoreObj.scoreNumber;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isRunning) return;

    // 1. Draw the game's offscreen canvas to the main context
    if (this.gameInstance && this.gameInstance.canvas) {
      const { width, height } = ctx.canvas;
      ctx.drawImage(this.gameInstance.canvas, 0, 0, width, height);
    }

    // 2. Draw UI
    if (this.isGameOver) {
      this.drawGameOverModal(ctx);
    } else {
      this.drawBackButton(ctx);
    }
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
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('返回', this.backBtn.x + this.backBtn.width / 2, this.backBtn.y + this.backBtn.height / 2);
    ctx.restore();
  }

  private drawGameOverModal(ctx: CanvasRenderingContext2D): void {
    const { width, height } = ctx.canvas;

    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', width / 2, height / 2 - 80);

    // Score
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`得分: ${this.score}`, width / 2, height / 2 - 30);

    // Restart Button
    this.drawButton(ctx, this.restartBtn, '再玩一次', '#4CAF50');

    // Exit Button
    this.drawButton(ctx, this.exitBtn, '返回主页', '#F44336');
  }

  private drawButton(ctx: CanvasRenderingContext2D, rect: any, text: string, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  onTouchStart(x: number, y: number): void {
    // If Game Over, handle modal clicks
    if (this.isGameOver) {
      // Restart
      if (this.checkClick(x, y, this.restartBtn)) {
        if (this.gameInstance) {
          this.gameInstance.init(); // Restart game
          this.isGameOver = false; // Reset local state immediately
        }
        return;
      }
      // Exit
      if (this.checkClick(x, y, this.exitBtn)) {
        this.sceneManager.switchTo('menu');
        return;
      }
      return;
    }

    // If Playing
    // Check Back Button
    if (this.checkClick(x, y, this.backBtn)) {
      this.sceneManager.switchTo('menu');
      return;
    }

    // Configurable Game Input
    if (this.gameInstance && this.gameInstance.handleTouch) {
      this.gameInstance.handleTouch();
    }
  }

  private checkClick(x: number, y: number, rect: any): boolean {
    return x >= rect.x && x <= rect.x + rect.width &&
      y >= rect.y && y <= rect.y + rect.height;
  }

  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
  }

  setSceneManager(manager: any): void {
    this.sceneManager = manager;
  }
}

