/**
 * 开放数据域辅助类 - 用于主域和开放数据域通信
 */
export class OpenDataHelper {
  private static openDataContext: WechatMinigame.OpenDataContext | null = null;
  private static sharedCanvas: WechatMinigame.Canvas | null = null;

  /**
   * 初始化
   */
  static init(): void {
    this.openDataContext = wx.getOpenDataContext();
    this.sharedCanvas = this.openDataContext.canvas;
    
    // 设置共享画布大小
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.sharedCanvas.width = windowWidth;
    this.sharedCanvas.height = windowHeight;
    
    console.log('[OpenDataHelper] Initialized');
  }

  /**
   * 获取好友排行榜
   */
  static fetchFriendRank(gameType: string): void {
    if (!this.openDataContext) {
      console.warn('[OpenDataHelper] Not initialized');
      return;
    }

    this.openDataContext.postMessage({
      command: 'fetchFriendRank',
      gameType: gameType
    });
  }

  /**
   * 获取群排行榜
   */
  static fetchGroupRank(gameType: string, shareTicket: string): void {
    if (!this.openDataContext) {
      console.warn('[OpenDataHelper] Not initialized');
      return;
    }

    this.openDataContext.postMessage({
      command: 'fetchGroupRank',
      gameType: gameType,
      shareTicket: shareTicket
    });
  }

  /**
   * 更新分数
   */
  static updateScore(gameType: string, score: number): void {
    if (!this.openDataContext) {
      console.warn('[OpenDataHelper] Not initialized');
      return;
    }

    this.openDataContext.postMessage({
      command: 'updateScore',
      gameType: gameType,
      score: score
    });
  }

  /**
   * 绘制排行榜到指定上下文
   */
  static draw(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    if (!this.sharedCanvas) {
      console.warn('[OpenDataHelper] Not initialized');
      return;
    }

    // 将开放数据域的画布内容绘制到主域
    ctx.drawImage(this.sharedCanvas as any, x, y, width, height);
  }

  /**
   * 显示排行榜场景
   */
  static showRankScene(gameType: string, mode: 'friend' | 'group' = 'friend'): void {
    if (mode === 'friend') {
      this.fetchFriendRank(gameType);
    }
    
    // 这里可以切换到专门的排行榜场景
    // 或者显示排行榜弹窗
    console.log('[OpenDataHelper] Show rank scene:', gameType, mode);
  }
}

