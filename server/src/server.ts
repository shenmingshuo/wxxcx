/**
 * WebSocket 游戏服务器
 */
import WebSocket, { WebSocketServer } from 'ws';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { RoomManager } from './RoomManager';
import { Player, NetworkMessage, MessageType } from './types';

const PORT = process.env.PORT || 3000;
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// 中间件
app.use(cors());
app.use(express.json());

// 房间管理器
const roomManager = new RoomManager();

// 玩家连接映射
const players: Map<WebSocket, Player> = new Map();

// HTTP API
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/stats', (req, res) => {
  res.json({
    connectedPlayers: players.size,
    timestamp: Date.now()
  });
});

// WebSocket 连接处理
wss.on('connection', (ws: WebSocket) => {
  const playerId = generatePlayerId();
  console.log(`[Server] Player connected: ${playerId}`);

  // 创建玩家对象（先不加入players，等收到第一条消息时再添加）
  let player: Player | null = null;

  ws.on('message', (data: Buffer) => {
    try {
      const message: NetworkMessage = JSON.parse(data.toString());
      handleMessage(ws, message, playerId);
    } catch (error) {
      console.error('[Server] Parse message error:', error);
      sendError(ws, 'Invalid message format');
    }
  });

  ws.on('close', () => {
    console.log(`[Server] Player disconnected: ${playerId}`);
    
    // 移除玩家
    players.delete(ws);
    
    // 离开房间
    const room = roomManager.leaveRoom(playerId);
    if (room) {
      roomManager.broadcastToRoom(room, {
        type: MessageType.ROOM_UPDATE,
        data: roomManager.getRoomData(room)
      });
    }
  });

  ws.on('error', (error) => {
    console.error('[Server] WebSocket error:', error);
  });
});

/**
 * 处理消息
 */
function handleMessage(ws: WebSocket, message: NetworkMessage, playerId: string): void {
  console.log(`[Server] Message from ${playerId}:`, message.type);

  switch (message.type) {
    case MessageType.PING:
      handlePing(ws, playerId);
      break;

    case MessageType.CREATE_ROOM:
      handleCreateRoom(ws, message.data, playerId);
      break;

    case MessageType.JOIN_ROOM:
      handleJoinRoom(ws, message.data, playerId);
      break;

    case MessageType.LEAVE_ROOM:
      handleLeaveRoom(ws, message.data, playerId);
      break;

    case MessageType.READY:
      handleReady(ws, message.data, playerId);
      break;

    case MessageType.GAME_ACTION:
      handleGameAction(ws, message.data, playerId);
      break;

    case MessageType.GAME_OVER:
      handleGameOver(ws, message.data, playerId);
      break;

    default:
      console.warn('[Server] Unknown message type:', message.type);
  }
}

/**
 * 处理心跳
 */
function handlePing(ws: WebSocket, playerId: string): void {
  const player = players.get(ws);
  if (player) {
    player.lastPing = Date.now();
  }
  
  send(ws, { type: MessageType.PONG });
}

/**
 * 处理创建房间
 */
function handleCreateRoom(ws: WebSocket, data: any, playerId: string): void {
  const playerData = data.player;
  
  const player: Player = {
    id: playerId,
    nickname: playerData.nickname,
    avatar: playerData.avatar,
    score: 0,
    isReady: false,
    ws: ws,
    lastPing: Date.now()
  };

  players.set(ws, player);
  
  const room = roomManager.createRoom(data.gameType, player);
  
  send(ws, {
    type: MessageType.ROOM_UPDATE,
    data: roomManager.getRoomData(room)
  });
}

/**
 * 处理加入房间
 */
function handleJoinRoom(ws: WebSocket, data: any, playerId: string): void {
  const playerData = data.player;
  
  const player: Player = {
    id: playerId,
    nickname: playerData.nickname,
    avatar: playerData.avatar,
    score: 0,
    isReady: false,
    ws: ws,
    lastPing: Date.now()
  };

  players.set(ws, player);
  
  const room = roomManager.joinRoom(data.roomId, player);
  
  if (!room) {
    sendError(ws, 'Failed to join room');
    return;
  }

  // 通知所有玩家
  roomManager.broadcastToRoom(room, {
    type: MessageType.ROOM_UPDATE,
    data: roomManager.getRoomData(room)
  });
}

/**
 * 处理离开房间
 */
function handleLeaveRoom(ws: WebSocket, data: any, playerId: string): void {
  const room = roomManager.leaveRoom(playerId);
  
  if (room) {
    roomManager.broadcastToRoom(room, {
      type: MessageType.ROOM_UPDATE,
      data: roomManager.getRoomData(room)
    });
  }

  players.delete(ws);
}

/**
 * 处理准备
 */
function handleReady(ws: WebSocket, data: any, playerId: string): void {
  const room = roomManager.playerReady(playerId);
  
  if (!room) {
    sendError(ws, 'Room not found');
    return;
  }

  // 通知所有玩家
  roomManager.broadcastToRoom(room, {
    type: MessageType.ROOM_UPDATE,
    data: roomManager.getRoomData(room)
  });
}

/**
 * 处理游戏动作
 */
function handleGameAction(ws: WebSocket, data: any, playerId: string): void {
  const room = roomManager.getPlayerRoom(playerId);
  
  if (!room) {
    sendError(ws, 'Room not found');
    return;
  }

  // 更新分数
  if (data.action?.type === 'score_update') {
    roomManager.updatePlayerScore(playerId, data.action.score);
  }

  // 转发给房间内其他玩家
  room.players.forEach(player => {
    if (player.id !== playerId && player.ws.readyState === WebSocket.OPEN) {
      send(player.ws, {
        type: MessageType.GAME_ACTION,
        data: { playerId, action: data.action }
      });
    }
  });
}

/**
 * 处理游戏结束
 */
function handleGameOver(ws: WebSocket, data: any, playerId: string): void {
  const result = roomManager.gameOver(playerId, data.score);
  
  if (!result) {
    sendError(ws, 'Room not found');
    return;
  }

  const room = roomManager.getPlayerRoom(playerId);
  if (room) {
    // 通知所有玩家游戏结果
    roomManager.broadcastToRoom(room, {
      type: MessageType.GAME_OVER,
      data: result
    });
  }
}

/**
 * 发送消息
 */
function send(ws: WebSocket, message: NetworkMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    message.timestamp = Date.now();
    ws.send(JSON.stringify(message));
  }
}

/**
 * 发送错误
 */
function sendError(ws: WebSocket, error: string): void {
  send(ws, {
    type: MessageType.ERROR,
    data: { error }
  });
}

/**
 * 生成玩家ID
 */
function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 定期清理
 */
setInterval(() => {
  // 清理超时房间
  roomManager.cleanupStaleRooms();
  
  // 清理断线玩家（超过60秒未心跳）
  const now = Date.now();
  players.forEach((player, ws) => {
    if (now - player.lastPing > 60000) {
      console.log(`[Server] Cleaning up inactive player: ${player.id}`);
      ws.close();
    }
  });
}, 60000); // 每分钟执行一次

// 启动服务器
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] WebSocket ready`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, closing server...');
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

