/**
 * 服务器类型定义
 */
import { WebSocket } from 'ws';

export enum GameState {
  IDLE = 'idle',
  WAITING = 'waiting',
  READY = 'ready',
  PLAYING = 'playing',
  FINISHED = 'finished'
}

export enum MessageType {
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

export interface Player {
  id: string;
  nickname: string;
  avatar?: string;
  score: number;
  isReady: boolean;
  ws: WebSocket;
  lastPing: number;
}

export interface Room {
  id: string;
  gameType: string;
  players: Player[];
  maxPlayers: number;
  state: GameState;
  countdown?: number;
  createdAt: number;
}

export interface NetworkMessage {
  type: MessageType;
  data?: any;
  timestamp?: number;
}

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

