/**
 * 游戏桥接器 - 连接游戏逻辑和网络/房间系统
 */
import { EventEmitter } from './EventEmitter';
import { NetworkManager } from './NetworkManager';
import { MessageType, GameState, Room, Player, GameResult } from './types';

export class GameBridge extends EventEmitter {
  private network: NetworkManager;
  private currentRoom: Room | null = null;
  private localPlayer: Player | null = null;

  constructor(network: NetworkManager) {
    super();
    this.network = network;
    this.setupNetworkListeners();
  }

  /**
   * 创建房间
   */
  createRoom(gameType: string, playerInfo: { nickname: string; avatar?: string }): void {
    this.localPlayer = {
      id: '',
      nickname: playerInfo.nickname,
      avatar: playerInfo.avatar,
      score: 0,
      isReady: false
    };

    this.network.send({
      type: MessageType.CREATE_ROOM,
      data: { gameType, player: this.localPlayer }
    });
  }

  /**
   * 加入房间
   */
  joinRoom(roomId: string, playerInfo: { nickname: string; avatar?: string }): void {
    this.localPlayer = {
      id: '',
      nickname: playerInfo.nickname,
      avatar: playerInfo.avatar,
      score: 0,
      isReady: false
    };

    this.network.send({
      type: MessageType.JOIN_ROOM,
      data: { roomId, player: this.localPlayer }
    });
  }

  /**
   * 离开房间
   */
  leaveRoom(): void {
    if (!this.currentRoom) return;

    this.network.send({
      type: MessageType.LEAVE_ROOM,
      data: { roomId: this.currentRoom.id }
    });

    this.currentRoom = null;
    this.localPlayer = null;
  }

  /**
   * 准备
   */
  ready(): void {
    if (!this.currentRoom || !this.localPlayer) return;

    this.localPlayer.isReady = true;
    this.network.send({
      type: MessageType.READY,
      data: { roomId: this.currentRoom.id }
    });
  }

  /**
   * 发送游戏动作
   */
  sendGameAction(action: any): void {
    if (!this.currentRoom) return;

    this.network.send({
      type: MessageType.GAME_ACTION,
      data: {
        roomId: this.currentRoom.id,
        action
      }
    });
  }

  /**
   * 上报分数
   */
  reportScore(score: number): void {
    if (!this.currentRoom || !this.localPlayer) return;

    this.localPlayer.score = score;
    this.sendGameAction({ type: 'score_update', score });
  }

  /**
   * 游戏结束
   */
  gameOver(finalScore: number): void {
    if (!this.currentRoom || !this.localPlayer) return;

    this.localPlayer.score = finalScore;
    this.network.send({
      type: MessageType.GAME_OVER,
      data: {
        roomId: this.currentRoom.id,
        score: finalScore
      }
    });
  }

  /**
   * 获取当前房间
   */
  getCurrentRoom(): Room | null {
    return this.currentRoom;
  }

  /**
   * 获取本地玩家
   */
  getLocalPlayer(): Player | null {
    return this.localPlayer;
  }

  /**
   * 获取对手
   */
  getOpponent(): Player | null {
    if (!this.currentRoom || !this.localPlayer) return null;

    return this.currentRoom.players.find(p => p.id !== this.localPlayer!.id) || null;
  }

  /**
   * 设置网络监听器
   */
  private setupNetworkListeners(): void {
    // 房间更新
    this.network.on(MessageType.ROOM_UPDATE, (room: Room) => {
      this.currentRoom = room;
      
      // 更新本地玩家信息
      if (this.localPlayer) {
        const player = room.players.find(p => p.id === this.localPlayer!.id);
        if (player) {
          this.localPlayer = player;
        }
      }
      
      this.emit('room_update', room);
    });

    // 游戏开始
    this.network.on(MessageType.START_GAME, (data: any) => {
      if (this.currentRoom) {
        this.currentRoom.state = GameState.PLAYING;
      }
      this.emit('game_start', data);
    });

    // 游戏动作
    this.network.on(MessageType.GAME_ACTION, (data: any) => {
      this.emit('game_action', data);
    });

    // 游戏结束
    this.network.on(MessageType.GAME_OVER, (result: GameResult) => {
      if (this.currentRoom) {
        this.currentRoom.state = GameState.FINISHED;
      }
      this.emit('game_over', result);
    });

    // 错误
    this.network.on(MessageType.ERROR, (error: any) => {
      console.error('[GameBridge] Error:', error);
      this.emit('error', error);
    });
  }
}

