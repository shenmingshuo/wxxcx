/**
 * 房间管理器
 */
import { Room, Player, GameState, MessageType, GameResult } from './types';
import { WebSocket } from 'ws';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerRoomMap: Map<string, string> = new Map(); // playerId -> roomId

  /**
   * 创建房间
   */
  createRoom(gameType: string, player: Player): Room {
    const roomId = this.generateRoomId();
    
    const room: Room = {
      id: roomId,
      gameType: gameType,
      players: [player],
      maxPlayers: 2,
      state: GameState.WAITING,
      createdAt: Date.now()
    };

    this.rooms.set(roomId, room);
    this.playerRoomMap.set(player.id, roomId);

    console.log(`[RoomManager] Room created: ${roomId} (${gameType})`);
    return room;
  }

  /**
   * 加入房间
   */
  joinRoom(roomId: string, player: Player): Room | null {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      console.warn(`[RoomManager] Room not found: ${roomId}`);
      return null;
    }

    if (room.players.length >= room.maxPlayers) {
      console.warn(`[RoomManager] Room full: ${roomId}`);
      return null;
    }

    if (room.state !== GameState.WAITING) {
      console.warn(`[RoomManager] Room not in waiting state: ${roomId}`);
      return null;
    }

    room.players.push(player);
    this.playerRoomMap.set(player.id, roomId);

    console.log(`[RoomManager] Player ${player.nickname} joined room ${roomId}`);
    return room;
  }

  /**
   * 离开房间
   */
  leaveRoom(playerId: string): Room | null {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    // 移除玩家
    room.players = room.players.filter(p => p.id !== playerId);
    this.playerRoomMap.delete(playerId);

    console.log(`[RoomManager] Player ${playerId} left room ${roomId}`);

    // 如果房间空了，删除房间
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      console.log(`[RoomManager] Room deleted: ${roomId}`);
      return null;
    }

    return room;
  }

  /**
   * 玩家准备
   */
  playerReady(playerId: string): Room | null {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return null;

    player.isReady = true;
    console.log(`[RoomManager] Player ${player.nickname} is ready`);

    // 检查是否所有玩家都准备好了
    if (this.allPlayersReady(room)) {
      this.startGame(room);
    }

    return room;
  }

  /**
   * 更新玩家分数
   */
  updatePlayerScore(playerId: string, score: number): Room | null {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return null;

    player.score = score;
    return room;
  }

  /**
   * 游戏结束
   */
  gameOver(playerId: string, finalScore: number): GameResult | null {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.score = finalScore;
    }

    room.state = GameState.FINISHED;

    // 计算排名
    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
    
    const result: GameResult = {
      gameType: room.gameType,
      players: sortedPlayers.map((p, index) => ({
        id: p.id,
        score: p.score,
        rank: index + 1
      })),
      duration: Math.floor((Date.now() - room.createdAt) / 1000),
      timestamp: Date.now()
    };

    console.log(`[RoomManager] Game over in room ${roomId}`, result);

    // 游戏结束后，延迟删除房间
    setTimeout(() => {
      this.rooms.delete(roomId);
      room.players.forEach(p => this.playerRoomMap.delete(p.id));
      console.log(`[RoomManager] Room cleaned up: ${roomId}`);
    }, 10000);

    return result;
  }

  /**
   * 获取房间
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * 获取玩家所在房间
   */
  getPlayerRoom(playerId: string): Room | null {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  /**
   * 检查所有玩家是否准备好
   */
  private allPlayersReady(room: Room): boolean {
    return room.players.length >= 2 && room.players.every(p => p.isReady);
  }

  /**
   * 开始游戏
   */
  private startGame(room: Room): void {
    room.state = GameState.READY;
    console.log(`[RoomManager] Starting game in room ${room.id}`);

    // 3秒倒计时
    let countdown = 3;
    room.countdown = countdown;
    
    const countdownInterval = setInterval(() => {
      countdown--;
      room.countdown = countdown;

      if (countdown <= 0) {
        clearInterval(countdownInterval);
        room.state = GameState.PLAYING;
        room.countdown = undefined;
        
        // 广播游戏开始
        this.broadcastToRoom(room, {
          type: MessageType.START_GAME,
          data: { startTime: Date.now() }
        });
      } else {
        // 广播倒计时更新
        this.broadcastToRoom(room, {
          type: MessageType.ROOM_UPDATE,
          data: this.getRoomData(room)
        });
      }
    }, 1000);
  }

  /**
   * 广播消息到房间
   */
  broadcastToRoom(room: Room, message: any): void {
    const data = JSON.stringify(message);
    room.players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(data);
      }
    });
  }

  /**
   * 获取房间数据（用于发送给客户端）
   */
  getRoomData(room: Room): any {
    return {
      id: room.id,
      gameType: room.gameType,
      players: room.players.map(p => ({
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        score: p.score,
        isReady: p.isReady
      })),
      maxPlayers: room.maxPlayers,
      state: room.state,
      countdown: room.countdown
    };
  }

  /**
   * 生成房间ID
   */
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * 清理超时房间
   */
  cleanupStaleRooms(): void {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30分钟

    this.rooms.forEach((room, roomId) => {
      if (now - room.createdAt > timeout) {
        console.log(`[RoomManager] Cleaning up stale room: ${roomId}`);
        room.players.forEach(p => this.playerRoomMap.delete(p.id));
        this.rooms.delete(roomId);
      }
    });
  }
}

