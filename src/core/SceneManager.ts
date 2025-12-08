/**
 * 场景管理器 - 管理不同场景的切换
 */
import { EventEmitter } from './EventEmitter';

export interface Scene {
  name: string;
  init(): void;
  enter(): void;
  exit(): void;
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  onTouchStart?(x: number, y: number): void;
  onTouchMove?(x: number, y: number): void;
  onTouchEnd?(x: number, y: number): void;
}

export class SceneManager extends EventEmitter {
  private scenes: Map<string, Scene> = new Map();
  private currentScene: Scene | null = null;
  private canvas: WechatMinigame.Canvas;
  private ctx: CanvasRenderingContext2D;
  private lastTime: number = 0;
  private running: boolean = false;

  constructor(canvas: WechatMinigame.Canvas) {
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    // 设置触摸事件
    this.setupTouchEvents();
  }

  /**
   * 注册场景
   */
  register(scene: Scene): void {
    this.scenes.set(scene.name, scene);
    scene.init();
    console.log(`[SceneManager] Registered scene: ${scene.name}`);
  }

  /**
   * 切换场景
   */
  switchTo(sceneName: string, data?: any): void {
    const newScene = this.scenes.get(sceneName);
    if (!newScene) {
      console.error(`[SceneManager] Scene not found: ${sceneName}`);
      return;
    }

    console.log(`[SceneManager] Switching to: ${sceneName}`);

    // 退出当前场景
    if (this.currentScene) {
      this.currentScene.exit();
    }

    // 进入新场景
    this.currentScene = newScene;
    this.currentScene.enter();

    this.emit('scene_changed', sceneName, data);
  }

  /**
   * 启动游戏循环
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.lastTime = Date.now();
    this.gameLoop();
    console.log('[SceneManager] Game loop started');
  }

  /**
   * 停止游戏循环
   */
  stop(): void {
    this.running = false;
    console.log('[SceneManager] Game loop stopped');
  }

  /**
   * 获取 Canvas 上下文
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * 获取 Canvas
   */
  getCanvas(): WechatMinigame.Canvas {
    return this.canvas;
  }

  /**
   * 游戏主循环
   */
  private gameLoop(): void {
    if (!this.running) return;

    const now = Date.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    // 更新当前场景
    if (this.currentScene) {
      this.currentScene.update(deltaTime);
    }

    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 渲染当前场景
    if (this.currentScene) {
      this.currentScene.render(this.ctx);
    }

    // 继续循环
    requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * 设置触摸事件
   */
  private setupTouchEvents(): void {
    wx.onTouchStart((event) => {
      if (!this.currentScene || !this.currentScene.onTouchStart) return;

      const touch = event.touches[0];
      console.log(`[SceneManager] Touch Start: ${touch.clientX}, ${touch.clientY}`);
      this.currentScene.onTouchStart(touch.clientX, touch.clientY);
    });

    wx.onTouchMove((event) => {
      if (!this.currentScene || !this.currentScene.onTouchMove) return;

      const touch = event.touches[0];
      this.currentScene.onTouchMove(touch.clientX, touch.clientY);
    });

    wx.onTouchEnd((event) => {
      if (!this.currentScene || !this.currentScene.onTouchEnd) return;

      const touch = event.changedTouches[0];
      console.log(`[SceneManager] Touch End: ${touch.clientX}, ${touch.clientY}`);
      this.currentScene.onTouchEnd(touch.clientX, touch.clientY);
    });
  }
}

