/**
 * 网络管理器 - 处理 WebSocket 连接、心跳、重连
 */
import { EventEmitter } from './EventEmitter';
import { NetworkMessage, MessageType } from './types';

export class NetworkManager extends EventEmitter {
  private socket: WechatMinigame.SocketTask | null = null;
  private url: string = '';
  private connected: boolean = false;
  private reconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  
  private heartbeatInterval: number | null = null;
  private heartbeatTimeout: number | null = null;
  private heartbeatDelay: number = 30000; // 30秒
  private heartbeatTimeoutDelay: number = 10000; // 10秒超时

  constructor() {
    super();
  }

  /**
   * 连接到服务器
   */
  connect(url: string): Promise<void> {
    this.url = url;
    
    return new Promise((resolve, reject) => {
      try {
        console.log('[Network] Connecting to:', url);
        
        this.socket = wx.connectSocket({
          url: url,
          success: () => {
            console.log('[Network] Socket created');
          },
          fail: (err) => {
            console.error('[Network] Connect failed:', err);
            reject(err);
          }
        });

        this.socket.onOpen(() => {
          console.log('[Network] Connected');
          this.connected = true;
          this.reconnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connected');
          resolve();
        });

        this.socket.onMessage((res) => {
          try {
            const message: NetworkMessage = JSON.parse(res.data as string);
            this.handleMessage(message);
          } catch (error) {
            console.error('[Network] Parse message error:', error);
          }
        });

        this.socket.onClose(() => {
          console.log('[Network] Connection closed');
          this.connected = false;
          this.stopHeartbeat();
          this.emit('disconnected');
          
          // 尝试重连
          if (!this.reconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect();
          }
        });

        this.socket.onError((err) => {
          console.error('[Network] Socket error:', err);
          this.emit('error', err);
        });

      } catch (error) {
        console.error('[Network] Connect exception:', error);
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.reconnecting = false;
    this.reconnectAttempts = this.maxReconnectAttempts; // 阻止重连
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close({
        success: () => {
          console.log('[Network] Disconnected');
        }
      });
      this.socket = null;
    }
    this.connected = false;
  }

  /**
   * 发送消息
   */
  send(message: NetworkMessage): void {
    if (!this.connected || !this.socket) {
      console.warn('[Network] Not connected, message not sent:', message);
      return;
    }

    message.timestamp = Date.now();
    
    this.socket.send({
      data: JSON.stringify(message),
      success: () => {
        // console.log('[Network] Message sent:', message.type);
      },
      fail: (err) => {
        console.error('[Network] Send failed:', err);
      }
    });
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: NetworkMessage): void {
    // console.log('[Network] Received:', message.type);
    
    // 处理心跳响应
    if (message.type === MessageType.PONG) {
      this.handlePong();
      return;
    }

    // 触发对应的事件
    this.emit('message', message);
    this.emit(message.type, message.data);
  }

  /**
   * 重连
   */
  private reconnect(): void {
    if (this.reconnecting) return;
    
    this.reconnecting = true;
    this.reconnectAttempts++;
    
    console.log(`[Network] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect(this.url).catch((err) => {
        console.error('[Network] Reconnect failed:', err);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnecting = false;
          this.reconnect();
        } else {
          this.emit('reconnect_failed');
        }
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatDelay) as unknown as number;
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.heartbeatTimeout !== null) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * 发送心跳
   */
  private sendHeartbeat(): void {
    this.send({ type: MessageType.PING });
    
    // 设置超时
    this.heartbeatTimeout = setTimeout(() => {
      console.warn('[Network] Heartbeat timeout, closing connection');
      if (this.socket) {
        this.socket.close({});
      }
    }, this.heartbeatTimeoutDelay) as unknown as number;
  }

  /**
   * 处理心跳响应
   */
  private handlePong(): void {
    if (this.heartbeatTimeout !== null) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }
}

