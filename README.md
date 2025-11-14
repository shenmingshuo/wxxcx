# 微信小游戏合集

一个支持多人联机对战的微信小游戏合集项目，包含多个小游戏玩法，支持实时PK、好友排行榜等功能。

## 🎮 功能特性

- ✨ **多游戏支持**: 集成多个小游戏（反应力PK、数字记忆等）
- 🔗 **联机对战**: 基于 WebSocket 的实时对战系统
- 🏆 **排行榜**: 支持好友/群排行榜（开放数据域）
- 📱 **断线重连**: 自动心跳检测和断线重连
- 🎨 **精美UI**: 现代化的游戏界面设计
- ⚡ **高性能**: 优化的渲染和网络通信

## 📦 项目结构

```
wxapp/
├── src/                    # 前端源码（TypeScript）
│   ├── core/              # 核心模块
│   │   ├── types.ts       # 类型定义
│   │   ├── EventEmitter.ts # 事件系统
│   │   ├── NetworkManager.ts # 网络管理
│   │   ├── SceneManager.ts # 场景管理
│   │   └── GameBridge.ts  # 游戏桥接
│   ├── scenes/            # 场景
│   │   ├── MenuScene.ts   # 主菜单
│   │   └── LobbyScene.ts  # 房间大厅
│   ├── games/             # 游戏
│   │   ├── ReactionGame.ts # 反应力游戏
│   │   └── MemoryGame.ts  # 记忆力游戏
│   ├── utils/             # 工具类
│   │   └── OpenDataHelper.ts # 开放数据域助手
│   └── game.ts            # 主入口
├── opendata/              # 开放数据域（排行榜）
│   └── index.js           # 排行榜逻辑
├── server/                # 后端服务器
│   └── src/
│       ├── types.ts       # 类型定义
│       ├── RoomManager.ts # 房间管理
│       └── server.ts      # WebSocket 服务器
├── js/                    # 编译输出（自动生成）
├── game.json              # 小游戏配置
├── project.config.json    # 项目配置
└── package.json           # 依赖管理
```

## 🚀 快速开始

### 前端（小游戏）

1. **安装依赖**

```bash
npm install
```

2. **编译 TypeScript**

```bash
npm run build
# 或者监听模式
npm run watch
```

3. **打开微信开发者工具**

- 导入项目目录（选择 `wxapp` 文件夹）
- AppID 使用测试号或实际 AppID
- 编译运行

### 后端（服务器）

1. **进入服务器目录**

```bash
cd server
```

2. **安装依赖**

```bash
npm install
```

3. **启动服务器**

```bash
# 开发模式（使用 ts-node）
npm run dev

# 生产模式
npm run build
npm start
```

服务器默认运行在 `http://localhost:3000`

4. **配置服务器地址**

编辑 `src/game.ts`，修改服务器地址：

```typescript
const serverUrl = 'wss://your-domain.com/ws';
```

### 生产部署

#### 1. 部署后端服务器

**要求**:
- Node.js 16+
- 支持 WebSocket 的服务器
- HTTPS/WSS（微信小游戏要求）

**部署步骤**:

```bash
# 1. 上传代码到服务器
cd server
npm install --production
npm run build

# 2. 使用 PM2 管理进程（推荐）
npm install -g pm2
pm2 start dist/server.js --name wxgame-server

# 3. 配置 Nginx 反向代理（处理 WSS）
```

**Nginx 配置示例**:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

#### 2. 配置微信小游戏后台

在微信公众平台 → 开发 → 开发管理 → 服务器域名中配置：

- **request 合法域名**: `https://your-domain.com`
- **socket 合法域名**: `wss://your-domain.com`

#### 3. 更新前端配置

修改 `src/game.ts` 中的服务器地址为生产环境地址。

#### 4. 编译和上传

```bash
npm run build
```

使用微信开发者工具上传代码，提交审核。

## 🎯 游戏说明

### 1. 反应力PK ⚡

**玩法**: 快速点击屏幕上移动的目标，30秒内得分越高越好。

**规则**:
- 每击中一个目标得 10 分
- 目标会随机移动和反弹
- 联机模式下实时显示对手分数

### 2. 数字记忆 🧠

**玩法**: 记住显示的数字序列，按顺序输入。

**规则**:
- 从 3 个数字开始，每关增加 1 个
- 答对继续下一关，答错游戏结束
- 每关得分 = 关卡数 × 10

## 🔧 开发指南

### 添加新游戏

1. **创建游戏类**

在 `src/games/` 创建新文件，实现 `Scene` 接口：

```typescript
import { Scene } from '../core/SceneManager';

export class YourGame implements Scene {
  name: string = 'your-game';
  
  init(): void { /* 初始化 */ }
  enter(data?: any): void { /* 进入场景 */ }
  exit(): void { /* 退出场景 */ }
  update(deltaTime: number): void { /* 更新逻辑 */ }
  render(ctx: CanvasRenderingContext2D): void { /* 渲染 */ }
  onTouchEnd(x: number, y: number): void { /* 触摸事件 */ }
}
```

2. **注册游戏**

在 `src/game.ts` 中注册：

```typescript
const yourGame = new YourGame();
yourGame.setSceneManager(this.sceneManager);
yourGame.setGameBridge(this.gameBridge);
this.sceneManager.register(yourGame);
```

3. **添加到菜单**

在 `src/scenes/MenuScene.ts` 的 `games` 数组中添加配置。

### 网络通信

使用 `GameBridge` 进行网络通信：

```typescript
// 创建房间
gameBridge.createRoom('game-type', { nickname: 'Player' });

// 上报分数
gameBridge.reportScore(100);

// 监听对手动作
gameBridge.on('game_action', (data) => {
  // 处理对手动作
});

// 游戏结束
gameBridge.gameOver(finalScore);
```

### 排行榜

使用 `OpenDataHelper` 管理排行榜：

```typescript
import { OpenDataHelper } from './utils/OpenDataHelper';

// 初始化（在游戏启动时调用一次）
OpenDataHelper.init();

// 更新分数
OpenDataHelper.updateScore('game-type', 100);

// 显示好友排行榜
OpenDataHelper.showRankScene('game-type', 'friend');
```

## 📝 技术栈

### 前端
- TypeScript
- 微信小游戏 API
- Canvas 2D

### 后端
- Node.js + TypeScript
- WebSocket (ws)
- Express

## 🐛 调试技巧

### 查看日志

```typescript
// 前端日志（微信开发者工具控制台）
console.log('[Tag] Message');

// 后端日志（终端）
console.log('[Server] Message');
```

### 测试联机

1. 在微信开发者工具中打开两个预览
2. 或使用手机扫码预览 + 开发者工具预览
3. 一个创建房间，另一个输入房间号加入

### 常见问题

**Q: 连接不上服务器？**
- 检查服务器是否启动
- 检查服务器地址是否正确
- 确认使用 `wss://`（生产环境）或 `ws://localhost:3000/`（开发环境）
- 开发模式下，在微信开发者工具中关闭「域名校验」

**Q: 排行榜不显示？**
- 确保开放数据域配置正确
- 需要真实用户授权才能获取好友数据
- 测试账号可能看不到好友数据

**Q: 游戏卡顿？**
- 检查是否有大量 console.log
- 优化渲染逻辑，避免每帧重绘所有内容
- 减少网络消息频率

## 📄 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题，请提交 Issue。

