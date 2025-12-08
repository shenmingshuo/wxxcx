// 包装原项目的 Main 类，适配资源路径
import { ResourceLoader } from "./base/resourceLoader";
import { Manager } from './manager';
import { Background } from './runtime/background';
import { DataStore } from './base/dataStore';
import { Land } from './runtime/land';
import { Birds } from './player/birds';
import { StartButton } from "./player/startButton";
import { Score } from "./player/score";

// 游戏入口，初始化整个游戏
export class Main {
  constructor() {
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');
    this.dataStore = DataStore.getInstance();
    this.manager = Manager.getInstance();

    const loader = ResourceLoader.create();
    loader.onLoaded(map => this.onResourceLoaded(map));
  }

  // 资源加载完成后执行
  onResourceLoaded(map) {
    this.dataStore.canvas = this.canvas;
    this.dataStore.ctx = this.ctx;
    this.dataStore.res = map;
    this.createBackgroundMusic();

    this.init();
  }

  // 创建背景音乐
  createBackgroundMusic() {
    try {
      this.bgm = wx.createInnerAudioContext();
      this.bgm.autoplay = true;
      this.bgm.loop = true;
      this.bgm.src = 'assets/clumsy_bird/bgm.mp3';
    } catch (e) {
      console.log('[笨鸟先飞] Background music not available');
    }
  }

  init() {
    // 重置游戏
    this.manager.isGameOver = false;
    this.dataStore.put('pencils', [])
      .put('background', new Background())
      .put('land', new Land())
      .put('bird', new Birds())
      .put('startButton', new StartButton())
      .put('score', new Score());
    this.registerEvent();
    this.manager.createPencil();
    this.manager.run();
  }

  // 注册点击事件
  registerEvent() {
    // 移除之前的监听器
    if (this.touchHandler) {
      wx.offTouchStart(this.touchHandler);
    }
    // We do NOT register wx.onTouchStart here anymore.
    // The outer class will call handleTouch() instead.
  }

  // Exposed method for external control
  handleTouch() {
    if (this.manager.isGameOver) {
      console.log('游戏重新开始');
      this.init();
    } else {
      this.manager.birdsEvent();
    }
  }

  // 销毁游戏
  destroy() {
    if (this.touchHandler) {
      wx.offTouchStart(this.touchHandler);
    }
    if (this.dataStore.get('timer')) {
      cancelAnimationFrame(this.dataStore.get('timer'));
    }
    if (this.bgm) {
      this.bgm.stop();
      this.bgm.destroy();
      this.bgm = null;
    }
    this.dataStore.destroy();
  }
}

