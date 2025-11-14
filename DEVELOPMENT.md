# 开发指南

本文档详细说明如何开发和扩展微信小游戏合集。

## 🏗️ 架构设计

### 核心架构

```
┌─────────────────────────────────────────┐
│           Scene Manager                  │  场景管理器
│  (管理场景切换、渲染循环、事件分发)       │
└──────────────┬──────────────────────────┘
               │
     ┌─────────┴─────────┐
     │                   │
┌────▼─────┐      ┌─────▼────┐
│  Scenes  │      │  Games   │  各种场景和游戏
└────┬─────┘      └─────┬────┘
     │                   │
     └─────────┬─────────┘
               │
     ┌─────────▼─────────┐
     │   Game Bridge     │  游戏桥接层
     └─────────┬─────────┘
               │
     ┌─────────▼─────────┐
     │ Network Manager   │  网络通信层
     └─────────┬─────────┘
               │
               ▼
        WebSocket Server    后端服务器
```

### 模块说明

#### 1. SceneManager（场景管理器）

负责：
- 管理所有场景的注册和切换
- 运行游戏主循环（更新、渲染）
- 分发触摸事件到当前场景

```typescript
const sceneManager = new SceneManager(canvas);
sceneManager.register(scene);
sceneManager.switchTo('scene-name', data);
sceneManager.start();
```

#### 2. NetworkManager（网络管理器）

负责：
- WebSocket 连接管理
- 消息收发
- 心跳检测
- 断线重连

```typescript
const network = new NetworkManager();
await network.connect('wss://server.com/ws');
network.send({ type: 'message', data: {} });
network.on('message', handleMessage);
```

#### 3. GameBridge（游戏桥接器）

负责：
- 连接游戏逻辑和网络层
- 房间管理
- 玩家状态同步

```typescript
const bridge = new GameBridge(networkManager);
bridge.createRoom('game-type', playerInfo);
bridge.on('game_start', handleGameStart);
```

## 🎮 添加新游戏

### 第 1 步：创建游戏类

在 `src/games/` 创建新文件，例如 `MyGame.ts`：

```typescript
import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';

export class MyGame implements Scene {
  name: string = 'my-game';
  private canvas: WechatMinigame.Canvas;
  private gameBridge: GameBridge | null = null;
  private mode: 'single' | 'multiplayer' = 'single';

  init(): void {
    // 初始化 Canvas
    this.canvas = wx.createCanvas();
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.canvas.width = windowWidth;
    this.canvas.height = windowHeight;
    
    // 初始化游戏资源
  }

  enter(data?: any): void {
    // 进入场景时调用
    this.mode = data?.mode || 'single';
    // 重置游戏状态
  }

  exit(): void {
    // 退出场景时调用
    // 清理资源
  }

  update(deltaTime: number): void {
    // 每帧更新游戏逻辑
    // deltaTime: 距离上一帧的毫秒数
  }

  render(ctx: CanvasRenderingContext2D): void {
    // 渲染游戏画面
    const { width, height } = this.canvas;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制游戏内容
  }

  onTouchStart?(x: number, y: number): void {
    // 处理触摸开始
  }

  onTouchMove?(x: number, y: number): void {
    // 处理触摸移动
  }

  onTouchEnd?(x: number, y: number): void {
    // 处理触摸结束
  }

  // 必需的设置方法
  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
  }

  setSceneManager(manager: any): void {
    (this as any).__sceneManager = manager;
  }
}
```

### 第 2 步：注册游戏

在 `src/game.ts` 中注册：

```typescript
import { MyGame } from './games/MyGame';

// 在 registerScenes() 方法中添加
const myGame = new MyGame();
myGame.setSceneManager(this.sceneManager);
myGame.setGameBridge(this.gameBridge);
this.sceneManager.register(myGame);
```

### 第 3 步：添加到菜单

在 `src/scenes/MenuScene.ts` 中添加游戏配置：

```typescript
private games: GameConfig[] = [
  // ... 其他游戏
  {
    id: 'my-game',
    name: '🎯 我的游戏',
    description: '游戏描述',
    icon: '🎮',
    supportMultiplayer: true,
    minPlayers: 1,
    maxPlayers: 2,
    duration: 60
  }
];
```

### 第 4 步：实现联机功能（可选）

如果支持联机，监听网络事件：

```typescript
// 在 enter() 方法中
if (this.mode === 'multiplayer' && this.gameBridge) {
  // 监听游戏开始
  this.gameBridge.on('game_start', (data) => {
    this.startGame();
  });

  // 监听对手动作
  this.gameBridge.on('game_action', (data) => {
    this.handleOpponentAction(data);
  });

  // 监听游戏结束
  this.gameBridge.on('game_over', (result) => {
    this.showResult(result);
  });
}

// 上报分数
this.gameBridge.reportScore(score);

// 发送自定义动作
this.gameBridge.sendGameAction({
  type: 'custom-action',
  data: {}
});

// 游戏结束
this.gameBridge.gameOver(finalScore);
```

## 🎨 UI 开发技巧

### 1. 绘制圆角矩形

```typescript
private roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
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
```

### 2. 绘制渐变背景

```typescript
const gradient = ctx.createLinearGradient(0, 0, 0, height);
gradient.addColorStop(0, '#667eea');
gradient.addColorStop(1, '#764ba2');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);
```

### 3. 绘制阴影

```typescript
ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
ctx.shadowBlur = 10;
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 4;
// 绘制内容
ctx.shadowBlur = 0; // 记得重置
```

### 4. 按钮点击检测

```typescript
interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
}

private isPointInRect(x: number, y: number, rect: Button): boolean {
  return x >= rect.x && 
         x <= rect.x + rect.width && 
         y >= rect.y && 
         y <= rect.y + rect.height;
}

// 使用
onTouchEnd(x: number, y: number): void {
  if (this.isPointInRect(x, y, this.myButton)) {
    // 按钮被点击
  }
}
```

### 5. 圆形按钮点击检测

```typescript
private isPointInCircle(
  x: number,
  y: number,
  cx: number,
  cy: number,
  radius: number
): boolean {
  const distance = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  return distance <= radius;
}
```

## 🌐 网络通信

### 消息类型

```typescript
enum MessageType {
  CREATE_ROOM = 'create_room',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  ROOM_UPDATE = 'room_update',
  READY = 'ready',
  START_GAME = 'start_game',
  GAME_ACTION = 'game_action',
  GAME_OVER = 'game_over',
  PING = 'ping',
  PONG = 'pong',
  ERROR = 'error'
}
```

### 发送消息

```typescript
networkManager.send({
  type: MessageType.GAME_ACTION,
  data: {
    action: {
      type: 'player-move',
      x: 100,
      y: 200
    }
  }
});
```

### 接收消息

```typescript
networkManager.on(MessageType.GAME_ACTION, (data) => {
  console.log('Received action:', data);
});
```

## 🏆 排行榜集成

### 初始化

在游戏启动时调用一次：

```typescript
import { OpenDataHelper } from './utils/OpenDataHelper';

OpenDataHelper.init();
```

### 更新分数

```typescript
// 游戏结束时
OpenDataHelper.updateScore('game-type', finalScore);
```

### 显示排行榜

```typescript
// 显示好友排行榜
OpenDataHelper.showRankScene('game-type', 'friend');

// 显示群排行榜（需要 shareTicket）
OpenDataHelper.showRankScene('game-type', 'group');
```

### 在场景中绘制排行榜

```typescript
render(ctx: CanvasRenderingContext2D): void {
  // 绘制排行榜到指定区域
  OpenDataHelper.draw(ctx, x, y, width, height);
}
```

## 🐛 调试技巧

### 1. 日志分类

```typescript
console.log('[Game] Normal log');
console.warn('[Game] Warning');
console.error('[Game] Error');
```

### 2. 性能监控

```typescript
const startTime = Date.now();
// 执行代码
const elapsed = Date.now() - startTime;
console.log(`[Perf] Operation took ${elapsed}ms`);
```

### 3. 调试网络

在微信开发者工具中：
- 工具 → 调试微信开发者工具
- Network 标签查看 WebSocket 消息

### 4. 真机调试

```typescript
// 使用 vConsole（微信自带）
wx.showModal({
  title: 'Debug',
  content: JSON.stringify(debugData)
});
```

## ⚡ 性能优化

### 1. 减少绘制

```typescript
// 只在需要时重绘
private dirty: boolean = true;

update(deltaTime: number): void {
  if (someCondition) {
    this.dirty = true;
  }
}

render(ctx: CanvasRenderingContext2D): void {
  if (!this.dirty) return;
  
  // 绘制
  this.dirty = false;
}
```

### 2. 对象池

```typescript
class ObjectPool<T> {
  private pool: T[] = [];
  
  constructor(private factory: () => T) {}
  
  get(): T {
    return this.pool.pop() || this.factory();
  }
  
  recycle(obj: T): void {
    this.pool.push(obj);
  }
}

// 使用
const bulletPool = new ObjectPool(() => ({ x: 0, y: 0, active: false }));
```

### 3. 减少网络消息

```typescript
// 不要每帧发送
private lastSendTime: number = 0;
private sendInterval: number = 100; // 100ms

update(deltaTime: number): void {
  const now = Date.now();
  if (now - this.lastSendTime > this.sendInterval) {
    this.gameBridge.reportScore(this.score);
    this.lastSendTime = now;
  }
}
```

### 4. 离屏 Canvas（预渲染）

```typescript
// 创建离屏 Canvas
const offscreenCanvas = wx.createCanvas();
offscreenCanvas.width = 200;
offscreenCanvas.height = 200;
const offCtx = offscreenCanvas.getContext('2d');

// 预渲染复杂内容
function prerenderComplexShape() {
  offCtx.clearRect(0, 0, 200, 200);
  // 绘制复杂图形
}

// 在主 Canvas 中使用
render(ctx: CanvasRenderingContext2D): void {
  ctx.drawImage(offscreenCanvas, x, y);
}
```

## 🧪 测试

### 单元测试（可选）

```typescript
// 安装 Jest
npm install --save-dev jest @types/jest ts-jest

// 配置 jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
};

// 编写测试
describe('RoomManager', () => {
  it('should create room', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('test', player);
    expect(room.id).toBeDefined();
  });
});
```

### 手动测试清单

- [ ] 单机模式正常运行
- [ ] 创建房间成功
- [ ] 加入房间成功
- [ ] 准备和开始流程正常
- [ ] 游戏过程流畅
- [ ] 分数同步正常
- [ ] 结算正确
- [ ] 断线重连有效
- [ ] 排行榜显示正常
- [ ] 各种异常情况处理正常

## 📚 最佳实践

### 1. 代码组织

```typescript
// 使用命名空间组织相关功能
namespace GameUtils {
  export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
```

### 2. 错误处理

```typescript
try {
  // 可能出错的代码
} catch (error) {
  console.error('[Game] Error:', error);
  wx.showToast({
    title: '操作失败',
    icon: 'error'
  });
}
```

### 3. 资源管理

```typescript
class ResourceManager {
  private images: Map<string, any> = new Map();
  
  loadImage(key: string, url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const img = wx.createImage();
      img.src = url;
      img.onload = () => {
        this.images.set(key, img);
        resolve(img);
      };
      img.onerror = reject;
    });
  }
  
  getImage(key: string): any {
    return this.images.get(key);
  }
}
```

### 4. 配置管理

```typescript
// src/config.ts
export const Config = {
  SERVER_URL: 'wss://your-server.com/ws',
  GAME_DURATION: 30,
  MAX_PLAYERS: 2,
  HEARTBEAT_INTERVAL: 30000,
};
```

## 🔍 常见问题

### Q: 如何调整游戏难度？

修改游戏类中的相关参数，如速度、时间等。

### Q: 如何添加音效？

```typescript
// 创建音频
const audio = wx.createInnerAudioContext();
audio.src = 'audio/bgm.mp3';
audio.play();
```

### Q: 如何实现排行榜？

参考本文档的「排行榜集成」章节。

### Q: 如何处理不同屏幕尺寸？

```typescript
const { windowWidth, windowHeight } = wx.getSystemInfoSync();
// 使用相对位置和尺寸
const buttonX = windowWidth * 0.5;
const buttonY = windowHeight * 0.8;
```

## 📖 参考资源

- [微信小游戏官方文档](https://developers.weixin.qq.com/minigame/dev/guide/)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [WebSocket 协议](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)

## 💡 进阶功能建议

1. **数据持久化**: 使用数据库存储用户数据
2. **成就系统**: 添加成就和奖励
3. **社交分享**: 集成微信分享功能
4. **内购系统**: 道具商店和支付
5. **AI 对手**: 单机模式的 AI
6. **回放系统**: 录制和回放游戏过程
7. **聊天功能**: 房间内聊天
8. **观战模式**: 观看他人对战

---

Happy Coding! 🚀

