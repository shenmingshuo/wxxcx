/**
 * 核心类型定义
 */

// 游戏状态
export enum GameState {
  IDLE = 'idle',
  WAITING = 'waiting',
  READY = 'ready',
  PLAYING = 'playing',
  FINISHED = 'finished'
}

// 网络消息类型
export enum MessageType {
  // 房间相关
  CREATE_ROOM = 'create_room',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  ROOM_UPDATE = 'room_update',
  
  // 游戏流程
  READY = 'ready',
  START_GAME = 'start_game',
  GAME_ACTION = 'game_action',
  GAME_OVER = 'game_over',
  
  // 连接相关
  PING = 'ping',
  PONG = 'pong',
  ERROR = 'error'
}

// 玩家信息
export interface Player {
  id: string;
  nickname: string;
  avatar?: string;
  score: number;
  isReady: boolean;
}

// 房间信息
export interface Room {
  id: string;
  gameType: string;
  players: Player[];
  maxPlayers: number;
  state: GameState;
  countdown?: number;
}

// 网络消息
export interface NetworkMessage {
  type: MessageType;
  data?: any;
  timestamp?: number;
}

// 游戏配置
export interface GameConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  supportMultiplayer: boolean;
  minPlayers: number;
  maxPlayers: number;
  duration: number; // 游戏时长（秒）
}

// 游戏结果
export interface GameResult {
  gameType: string;
  players: Array<{
    id: string;
    score: number;
    rank: number;
  }>;
  duration: number;
  timestamp: number;
}

