/**
 * 主菜单场景 - 精良的微信小游戏风格
 */
import { Scene } from '../core/SceneManager';
import { GameConfig } from '../core/types';

interface GameCard {
  config: GameConfig;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class MenuScene implements Scene {
  name: string = 'menu';
  private canvas: WechatMinigame.Canvas;
  private gameCards: GameCard[] = [];
  private scrollY: number = 0;
  private targetScrollY: number = 0;
  private touchStartY: number = 0;
  private touchStartScrollY: number = 0;
  private velocity: number = 0;
  private animationTime: number = 0;
  private isDragging: boolean = false;

  // 游戏配置列表
  private games: GameConfig[] = [
    {
      id: 'game2048',
      name: '2048',
      description: '滑动合并数字，挑战2048！',
      icon: '🎲',
      supportMultiplayer: false,
      minPlayers: 1,
      maxPlayers: 1,
      duration: 300
    },
    {
      id: 'tetris',
      name: '俄罗斯方块',
      description: '经典俄罗斯方块，手势操控更流畅！',
      icon: '🧱',
      supportMultiplayer: false,
      minPlayers: 1,
      maxPlayers: 1,
      duration: 600
    },
    {
      id: 'shooter',
      name: '空中射击',
      description: '驾驶战机消灭敌人，挑战高分！',
      icon: '✈️',
      supportMultiplayer: false,
      minPlayers: 1,
      maxPlayers: 1,
      duration: 600
    }
  ];

  init(): void {
    this.canvas = wx.createCanvas();
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.canvas.width = windowWidth;
    this.canvas.height = windowHeight;
    
    // 初始化游戏卡片位置
    this.initGameCards();
  }

  enter(): void {
    console.log('[MenuScene] Entered');
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.velocity = 0;
  }

  exit(): void {
    console.log('[MenuScene] Exited');
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;
    
    // 平滑滚动
    if (!this.isDragging) {
      // 应用速度
      this.targetScrollY += this.velocity * (deltaTime / 16);
      this.velocity *= 0.95; // 摩擦力
      
      // 限制滚动范围
      this.constrainScroll();
      
      // 平滑过渡
      this.scrollY += (this.targetScrollY - this.scrollY) * 0.2;
      
      // 停止微小移动
      if (Math.abs(this.velocity) < 0.1) {
        this.velocity = 0;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    // 清爽的渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f5f7fa');
    gradient.addColorStop(1, '#e9ecef');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 装饰性背景圆
    this.drawBackgroundCircles(ctx, width, height);

    // 顶部导航栏
    this.drawTopBar(ctx, width);

    // 绘制游戏卡片
    ctx.save();
    ctx.translate(0, this.scrollY);
    
    this.gameCards.forEach((card, index) => {
      // 只绘制可见的卡片
      const cardScreenY = card.y + this.scrollY;
      if (cardScreenY > -card.height - 100 && cardScreenY < height + 100) {
        this.drawGameCard(ctx, card, index);
      }
    });
    
    ctx.restore();
  }

  onTouchStart(x: number, y: number): void {
    this.touchStartY = y;
    this.touchStartScrollY = this.targetScrollY;
    this.velocity = 0;
    this.isDragging = true;
  }

  onTouchMove(x: number, y: number): void {
    if (!this.isDragging) return;
    
    const deltaY = y - this.touchStartY;
    this.targetScrollY = this.touchStartScrollY + deltaY;
    this.scrollY = this.targetScrollY;
    
    // 限制滚动
    this.constrainScroll();
  }

  onTouchEnd(x: number, y: number): void {
    const wasDragging = this.isDragging;
    this.isDragging = false;
    
    // 如果是滑动，不触发点击
    const deltaY = y - this.touchStartY;
    if (Math.abs(deltaY) > 5) {
      this.velocity = deltaY * 0.5;
      return;
    }
    
    // 防止滚动后立即点击
    if (wasDragging && Math.abs(this.velocity) > 1) {
      return;
    }
    
    // 检测点击了哪个游戏卡片
    const adjustedY = y - this.scrollY;
    
    for (const card of this.gameCards) {
      if (this.isPointInCard(x, adjustedY, card)) {
        this.onGameCardClick(card.config);
        break;
      }
    }
  }

  /**
   * 初始化游戏卡片
   */
  private initGameCards(): void {
    const cardWidth = this.canvas.width - 48;
    const cardHeight = 140;
    const cardMargin = 16;
    const startY = 180;

    this.gameCards = this.games.map((game, index) => ({
      config: game,
      x: 24,
      y: startY + index * (cardHeight + cardMargin),
      width: cardWidth,
      height: cardHeight
    }));
  }

  /**
   * 限制滚动范围
   */
  private constrainScroll(): void {
    const maxScroll = 20; // 可以稍微下拉
    const contentHeight = this.gameCards.length > 0 
      ? this.gameCards[this.gameCards.length - 1].y + this.gameCards[this.gameCards.length - 1].height + 100
      : this.canvas.height;
    const minScroll = Math.min(0, this.canvas.height - contentHeight - 20);
    
    if (this.targetScrollY > maxScroll) {
      this.targetScrollY = maxScroll;
      this.velocity = 0;
    } else if (this.targetScrollY < minScroll) {
      this.targetScrollY = minScroll;
      this.velocity = 0;
    }
    
    this.scrollY = Math.max(minScroll, Math.min(maxScroll, this.scrollY));
  }

  /**
   * 绘制顶部导航栏
   */
  private drawTopBar(ctx: CanvasRenderingContext2D, width: number): void {
    // 顶部白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, 160);
    
    // 底部阴影
    const shadowGradient = ctx.createLinearGradient(0, 160, 0, 170);
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGradient;
    ctx.fillRect(0, 160, width, 10);

    // 标题
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 32px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('游戏合集', width / 2, 60);

    // 副标题
    ctx.fillStyle = '#8e8e93';
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillText('选择一个游戏开始挑战', width / 2, 95);

    // 在线人数标签
    const onlineCount = Math.floor(Math.sin(this.animationTime / 5000) * 30 + 120);
    const tagWidth = 120;
    const tagHeight = 32;
    const tagX = (width - tagWidth) / 2;
    const tagY = 115;

    // 标签背景
    ctx.fillStyle = '#f0f0f0';
    this.roundRect(ctx, tagX, tagY, tagWidth, tagHeight, 16);
    ctx.fill();

    // 在线圆点
    ctx.fillStyle = '#34c759';
    ctx.beginPath();
    ctx.arc(tagX + 20, tagY + tagHeight / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // 在线人数文字
    ctx.fillStyle = '#8e8e93';
    ctx.font = '14px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${onlineCount} 人在线`, tagX + 32, tagY + tagHeight / 2 + 5);
  }

  /**
   * 绘制游戏卡片 - 微信小游戏风格
   */
  private drawGameCard(ctx: CanvasRenderingContext2D, card: GameCard, index: number): void {
    const { x, y, width, height, config } = card;
    
    // 卡片背景
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    
    this.roundRect(ctx, x, y, width, height, 16);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 左侧图标区域
    const iconSize = 64;
    const iconX = x + 20;
    const iconY = y + (height - iconSize) / 2;
    
    // 图标背景
    const iconBgColors = [
      { start: '#667eea', end: '#764ba2' },
      { start: '#f093fb', end: '#f5576c' },
      { start: '#4facfe', end: '#00f2fe' },
      { start: '#43e97b', end: '#38f9d7' }
    ];
    const colorPair = iconBgColors[index % iconBgColors.length];
    
    const iconGradient = ctx.createLinearGradient(iconX, iconY, iconX + iconSize, iconY + iconSize);
    iconGradient.addColorStop(0, colorPair.start);
    iconGradient.addColorStop(1, colorPair.end);
    ctx.fillStyle = iconGradient;
    
    this.roundRect(ctx, iconX, iconY, iconSize, iconSize, 12);
    ctx.fill();

    // 图标
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(config.icon, iconX + iconSize / 2, iconY + iconSize / 2 + 12);

    // 右侧内容区域
    const contentX = iconX + iconSize + 16;
    const btnWidth = 80;
    const contentMaxWidth = width - (contentX - x) - btnWidth - 32; // 留出按钮空间，加大间距

    // 游戏名称
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    
    // 截断过长的文字
    let displayName = config.name;
    if (ctx.measureText(displayName).width > contentMaxWidth) {
      while (ctx.measureText(displayName + '...').width > contentMaxWidth && displayName.length > 0) {
        displayName = displayName.slice(0, -1);
      }
      displayName += '...';
    }
    ctx.fillText(displayName, contentX, y + 35);

    // 描述（截断过长文字）
    ctx.fillStyle = '#8e8e93';
    ctx.font = '13px -apple-system, sans-serif';
    let displayDesc = config.description;
    if (ctx.measureText(displayDesc).width > contentMaxWidth) {
      while (ctx.measureText(displayDesc + '...').width > contentMaxWidth && displayDesc.length > 0) {
        displayDesc = displayDesc.slice(0, -1);
      }
      displayDesc += '...';
    }
    ctx.fillText(displayDesc, contentX, y + 60);

    // 标签（底部）
    let tagX = contentX;
    const tagY = y + height - 35;
    
    if (config.supportMultiplayer) {
      this.drawTag(ctx, tagX, tagY, '联机对战', '#5856d6');
      tagX += 80;
    }
    this.drawTag(ctx, tagX, tagY, `${config.duration}秒`, '#ff9500');

    // 右侧按钮（居中）
    const btnHeight = 36;
    const btnX = x + width - btnWidth - 16;
    const btnY = y + (height - btnHeight) / 2;

    // 按钮渐变
    const btnGradient = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnHeight);
    btnGradient.addColorStop(0, colorPair.start);
    btnGradient.addColorStop(1, colorPair.end);
    ctx.fillStyle = btnGradient;
    
    this.roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 18);
    ctx.fill();

    // 按钮文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('开始', btnX + btnWidth / 2, btnY + btnHeight / 2 + 5);
  }

  /**
   * 绘制标签
   */
  private drawTag(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string): void {
    const padding = 10;
    const height = 24;
    ctx.font = '12px -apple-system, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const width = textWidth + padding * 2;

    // 背景
    ctx.fillStyle = color + '15';
    this.roundRect(ctx, x, y, width, height, 12);
    ctx.fill();

    // 边框
    ctx.strokeStyle = color + '40';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, width, height, 12);
    ctx.stroke();

    // 文字
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(text, x + padding, y + height / 2 + 4);
  }

  /**
   * 绘制背景装饰圆
   */
  private drawBackgroundCircles(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const circles = [
      { x: width * 0.15, y: height * 0.2, r: 40, color: '#667eea15' },
      { x: width * 0.85, y: height * 0.3, r: 30, color: '#f093fb15' },
      { x: width * 0.1, y: height * 0.7, r: 35, color: '#4facfe15' },
      { x: width * 0.9, y: height * 0.8, r: 45, color: '#43e97b15' }
    ];

    circles.forEach(circle => {
      ctx.fillStyle = circle.color;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * 绘制圆角矩形
   */
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
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

  /**
   * 判断点是否在卡片内
   */
  private isPointInCard(x: number, y: number, card: GameCard): boolean {
    return x >= card.x && 
           x <= card.x + card.width && 
           y >= card.y && 
           y <= card.y + card.height;
  }

  /**
   * 游戏卡片点击
   */
  private onGameCardClick(game: GameConfig): void {
    console.log('[MenuScene] Game selected:', game.name);
    
    wx.showModal({
      title: game.name,
      content: '选择游戏模式',
      showCancel: true,
      cancelText: '单机模式',
      confirmText: '联机对战',
      success: (res) => {
        if (res.confirm) {
          // 联机模式
          (this as any).__sceneManager.switchTo('lobby', { gameType: game.id });
        } else if (res.cancel) {
          // 单机模式
          (this as any).__sceneManager.switchTo(game.id, { mode: 'single' });
        }
      }
    });
  }

  /**
   * 设置场景管理器引用
   */
  setSceneManager(manager: any): void {
    (this as any).__sceneManager = manager;
  }
}
