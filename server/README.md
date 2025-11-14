# 游戏服务器

基于 Node.js + WebSocket 的实时游戏服务器。

## 功能

- ✅ WebSocket 实时通信
- ✅ 房间管理系统
- ✅ 玩家匹配
- ✅ 游戏状态同步
- ✅ 自动清理机制
- ✅ 心跳检测

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 生产模式

```bash
npm run build
npm start
```

## API

### HTTP 端点

#### GET /health

健康检查

**响应**:
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

#### GET /stats

服务器统计

**响应**:
```json
{
  "connectedPlayers": 10,
  "timestamp": 1234567890
}
```

### WebSocket 消息

#### 创建房间

```json
{
  "type": "create_room",
  "data": {
    "gameType": "reaction",
    "player": {
      "nickname": "玩家1",
      "avatar": "https://..."
    }
  }
}
```

#### 加入房间

```json
{
  "type": "join_room",
  "data": {
    "roomId": "ABC123",
    "player": {
      "nickname": "玩家2",
      "avatar": "https://..."
    }
  }
}
```

#### 准备

```json
{
  "type": "ready",
  "data": {
    "roomId": "ABC123"
  }
}
```

#### 游戏动作

```json
{
  "type": "game_action",
  "data": {
    "roomId": "ABC123",
    "action": {
      "type": "score_update",
      "score": 100
    }
  }
}
```

#### 游戏结束

```json
{
  "type": "game_over",
  "data": {
    "roomId": "ABC123",
    "score": 100
  }
}
```

## 配置

### 环境变量

```bash
PORT=3000              # 服务器端口
NODE_ENV=production    # 环境
LOG_LEVEL=info         # 日志级别
```

### 房间配置

在 `src/RoomManager.ts` 中：

```typescript
maxPlayers: 2          // 最大玩家数
timeout: 30 * 60 * 1000  // 房间超时（30分钟）
```

## 架构

```
server/
├── src/
│   ├── types.ts          # 类型定义
│   ├── RoomManager.ts    # 房间管理
│   └── server.ts         # 主服务器
├── dist/                 # 编译输出
└── package.json
```

## 部署

参考项目根目录的 [DEPLOYMENT.md](../DEPLOYMENT.md)

## 监控

### PM2

```bash
pm2 status
pm2 logs wxgame-server
pm2 monit
```

### 日志

服务器会输出详细日志：

```
[Server] Player connected: player_123
[RoomManager] Room created: ABC123 (reaction)
[RoomManager] Player joined room ABC123
[RoomManager] Starting game in room ABC123
[Server] Game over in room ABC123
```

## 性能

- 单实例支持 1000+ 并发连接
- 内存占用约 50-100MB
- CPU 使用率低于 10%（正常负载）

## 扩展

### 添加数据库

```typescript
// 安装 PostgreSQL 客户端
npm install pg

// 创建数据库连接
import { Pool } from 'pg';
const pool = new Pool({
  host: 'localhost',
  database: 'wxgame',
  user: 'postgres',
  password: 'password'
});

// 保存游戏结果
async function saveGameResult(result: GameResult) {
  await pool.query(
    'INSERT INTO game_results (game_type, player_id, score) VALUES ($1, $2, $3)',
    [result.gameType, result.playerId, result.score]
  );
}
```

### 添加 Redis

```typescript
// 安装 Redis 客户端
npm install redis

// 创建 Redis 连接
import { createClient } from 'redis';
const redis = createClient();
await redis.connect();

// 缓存房间信息
await redis.set(`room:${roomId}`, JSON.stringify(room));
```

## 安全

- 实现速率限制
- 验证消息格式
- 防止作弊检测
- 定期清理过期数据

## 许可

MIT

