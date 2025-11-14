# 集成现有游戏指南

## 方法 1：集成纯 Canvas 游戏

### 示例：集成一个打砖块游戏

假设你在 GitHub 找到了一个打砖块游戏，代码类似这样：

```javascript
// 原始游戏代码
class BreakoutGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ball = { x: 100, y: 100, dx: 2, dy: 2 };
    // ...
  }
  
  update() {
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;
    // ...
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // 绘制球、砖块等
  }
}
```

### 适配步骤

#### 1. 创建新游戏文件

在 `src/games/` 创建 `BreakoutGame.ts`：

```typescript
import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';

export class BreakoutGame implements Scene {
  name: string = 'breakout';
  private canvas: WechatMinigame.Canvas;
  private ctx: CanvasRenderingContext2D;
  private gameBridge: GameBridge | null = null;
  
  // 游戏状态
  private isPlaying: boolean = false;
  private score: number = 0;
  
  // 从原始代码复制游戏逻辑
  private ball: { x: number; y: number; dx: number; dy: number };
  private paddle: { x: number; y: number; width: number; height: number };
  private bricks: any[] = [];
  
  // 返回按钮
  private backBtn = { x: 20, y: 60, width: 80, height: 40 };

  init(): void {
    this.canvas = wx.createCanvas();
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.canvas.width = windowWidth;
    this.canvas.height = windowHeight;
    this.ctx = this.canvas.getContext('2d');
    
    // 初始化游戏对象
    this.initGame();
  }

  enter(data?: any): void {
    this.isPlaying = true;
    this.score = 0;
    this.initGame();
  }

  exit(): void {
    this.isPlaying = false;
  }

  update(deltaTime: number): void {
    if (!this.isPlaying) return;
    
    // === 复制原始游戏的 update 逻辑 ===
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;
    
    // 碰撞检测等...
    // ...
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;
    
    // 背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // 返回按钮和分数
    this.drawUI(ctx);
    
    if (this.isPlaying) {
      // === 复制原始游戏的 draw 逻辑 ===
      // 绘制球
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // 绘制挡板、砖块等...
      // ...
    }
  }

  onTouchStart(x: number, y: number): void {
    // 返回按钮
    if (this.isPointInRect(x, y, this.backBtn)) {
      (this as any).__sceneManager.switchTo('menu');
      return;
    }
  }

  onTouchMove(x: number, y: number): void {
    // 控制挡板移动
    if (this.isPlaying) {
      this.paddle.x = x - this.paddle.width / 2;
    }
  }

  private initGame(): void {
    // 初始化游戏对象
    this.ball = { x: 200, y: 300, dx: 3, dy: -3 };
    this.paddle = { x: 150, y: 500, width: 80, height: 10 };
    // 初始化砖块...
  }

  private drawUI(ctx: CanvasRenderingContext2D): void {
    // 绘制返回按钮和分数
    // ...
  }

  private isPointInRect(x: number, y: number, rect: any): boolean {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height;
  }

  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
  }

  setSceneManager(manager: any): void {
    (this as any).__sceneManager = manager;
  }
}
```

#### 2. 注册游戏

在 `src/game.ts` 中注册：

```typescript
import { BreakoutGame } from './games/BreakoutGame';

// 在 registerScenes() 方法中
const breakoutGame = new BreakoutGame();
breakoutGame.setSceneManager(this.sceneManager);
breakoutGame.setGameBridge(this.gameBridge);
this.sceneManager.register(breakoutGame);
```

#### 3. 添加到菜单

在 `src/scenes/MenuScene.ts` 的 `games` 数组中添加：

```typescript
{
  id: 'breakout',
  name: '打砖块',
  description: '经典的打砖块游戏！',
  icon: '🧱',
  supportMultiplayer: false,
  minPlayers: 1,
  maxPlayers: 1,
  duration: 180
}
```

---

## 方法 2：集成 Cocos Creator 游戏

如果游戏是用 Cocos Creator 开发的：

1. 导出微信小游戏
2. 复制资源和代码到我们的项目
3. 通过场景切换集成

---

## 方法 3：集成第三方库游戏（如 Phaser）

如果使用了游戏引擎库，需要：

1. 安装依赖：`npm install phaser`
2. 适配到微信小游戏环境
3. 处理资源加载

---

## 实际示例：我来帮你集成一个游戏

### 例子：集成一个简单的贪吃蛇游戏

我现在就给你创建一个完整的贪吃蛇游戏作为示例！

