/**
 * 主菜单场景 - Dark Gaming Theme & Particle System
 */
import { Scene } from '../core/SceneManager';
import { GameConfig } from '../core/types';
import { GameBridge } from '../core/GameBridge';
import { Theme } from '../ui/Theme';
import { UIComponent } from '../ui/core/UIComponent';
import { GameCard } from '../ui/components/GameCard';


// 简单的粒子类
class Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;

  constructor(width: number, height: number) {
    this.reset(width, height, true);
  }

  reset(width: number, height: number, randomY: boolean = false) {
    this.x = Math.random() * width;
    this.y = randomY ? Math.random() * height : -10;
    this.size = Math.random() * 2 + 0.5;
    this.speed = Math.random() * 0.5 + 0.1;
    this.opacity = Math.random() * 0.5 + 0.1;
  }

  update(height: number) {
    this.y += this.speed;
    if (this.y > height) {
      this.y = -10;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class MenuScene implements Scene {
  name: string = 'menu';
  private canvas: WechatMinigame.Canvas;

  // UI 核心
  private uiComponents: UIComponent[] = [];

  // 滚动系统
  private scrollY: number = 0;
  private targetScrollY: number = 0;
  private touchStartY: number = 0;
  private touchStartScrollY: number = 0;
  private velocity: number = 0;
  private isDragging: boolean = false;

  // 视觉效果
  private animationTime: number = 0;
  private stars: Star[] = [];

  // 游戏配置
  private games: GameConfig[] = [
    {
      id: 'watermelon',
      name: '合成大西瓜',
      description: '合成水果，挑战最大西瓜！',
      icon: 'assets/icons/icon_watermelon.png',
      supportMultiplayer: false,
      minPlayers: 1,
      maxPlayers: 1,
      duration: 300
    },
    {
      id: 'game2048',
      name: '2048',
      description: '霓虹赛博数字迷阵',
      icon: 'assets/icons/icon_2048.png',
      supportMultiplayer: false,
      minPlayers: 1,
      maxPlayers: 1,
      duration: 300
    },
    {
      id: 'tetris',
      name: '俄罗斯方块',
      description: '经典玩法的未来重构',
      icon: 'assets/icons/icon_tetris.png',
      supportMultiplayer: false,
      minPlayers: 1,
      maxPlayers: 1,
      duration: 600
    },
    {
      id: 'clumsy_bird',
      name: '笨鸟先飞',
      description: '经典复刻版',
      iconType: 'image',
      iconValue: 'assets/icons/icon_clumsy.png',
      color: '#87CEEB',
      supportMultiplayer: false,
      minPlayers: 1,
      maxPlayers: 1,
      duration: 300
    },
    {
      id: 'gobang',
      name: '五子棋',
      description: '黑白之道，方寸之间',
      iconType: 'emoji', // Using emoji for now, looks clean for Gobang
      iconValue: '⚫',
      color: '#DEB887', // Wood color
      supportMultiplayer: false,
      minPlayers: 1,
      maxPlayers: 1,
      duration: 300
    },
    {
      id: 'sniper_pve',
      name: '你狙我躲 · PVE',
      description: '单人练习版：墙后躲藏 + 三发狙击',
      iconType: 'emoji',
      iconValue: '🎯',
      color: '#1E88E5',
      supportMultiplayer: false,
      minPlayers: 1,
      maxPlayers: 1,
      duration: 180
    }
  ];

  init(): void {
    this.canvas = wx.createCanvas();
    const { windowWidth } = wx.getSystemInfoSync();

    // 初始化 UI 组件
    this.initUI(windowWidth);

    // 初始化星星
    const { windowHeight } = wx.getSystemInfoSync();
    for (let i = 0; i < 50; i++) {
      this.stars.push(new Star(windowWidth, windowHeight));
    }
  }

  private initUI(screenWidth: number): void {
    const cardWidth = screenWidth - 40; // 左右各20 margin
    const cardHeight = 160; // 更高的 Hero Card
    const cardMargin = 24;
    const startY = 140; // TopBar 高度之后

    // 创建游戏卡片
    this.games.forEach((game, index) => {
      const y = startY + index * (cardHeight + cardMargin);
      const card = new GameCard(game, 20, y, cardWidth, cardHeight);

      card.onClick = () => {
        if (Math.abs(this.velocity) > 1) return;
        this.onGameCardClick(game);
      };

      this.uiComponents.push(card);
    });
  }

  enter(): void {
    console.log('[MenuScene] Entered');
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.velocity = 0;
    this.isDragging = false;
  }

  exit(): void {
    console.log('[MenuScene] Exited');
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // 更新背景星星
    const { windowHeight } = wx.getSystemInfoSync();
    this.stars.forEach(star => star.update(windowHeight));

    // 滚动物理模拟
    if (!this.isDragging) {
      this.targetScrollY += this.velocity * (deltaTime / 16);
      this.velocity *= 0.95;

      this.constrainScroll();
      this.scrollY += (this.targetScrollY - this.scrollY) * 0.2;

      if (Math.abs(this.velocity) < 0.1) this.velocity = 0;
    }

    this.uiComponents.forEach(comp => comp.update(deltaTime));
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    // 1. 绘制背景 (Dark Space)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, Theme.colors.background.gradientStart);
    bgGradient.addColorStop(0.5, Theme.colors.background.gradientMiddle);
    bgGradient.addColorStop(1, Theme.colors.background.gradientEnd);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. 绘制星星
    this.stars.forEach(star => star.render(ctx));

    // 绘制装饰性光晕 (顶部)
    ctx.save();
    const glow = ctx.createRadialGradient(width / 2, -100, 0, width / 2, 0, 400);
    glow.addColorStop(0, 'rgba(0, 242, 254, 0.2)'); // Light Blue
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height / 2);
    ctx.restore();

    // 3. 绘制内容
    ctx.save();
    ctx.translate(0, this.scrollY);

    this.uiComponents.forEach(comp => {
      const compScreenY = comp.y + this.scrollY;
      if (compScreenY > -comp.height - 100 && compScreenY < height + 100) {
        comp.render(ctx);
      }
    });

    ctx.restore();

    // 4. 绘制顶部导航栏 (透明/模糊)
    this.drawTopBar(ctx, width);
  }

  private drawTopBar(ctx: CanvasRenderingContext2D, width: number): void {
    const height = 120;

    // 渐变背景 (淡出)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, Theme.colors.background.gradientStart); // 实体色遮挡
    gradient.addColorStop(0.8, 'rgba(15, 12, 41, 0.9)');
    gradient.addColorStop(1, 'rgba(15, 12, 41, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 标题
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // 霓虹效果标题
    ctx.shadowColor = Theme.colors.primary.main;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 900 36px sans-serif'; // 斜体更动感
    ctx.fillText('ARCADE', 24, 60);
    ctx.shadowBlur = 0;

    ctx.font = '36px sans-serif';
    ctx.fillStyle = Theme.colors.primary.main;
    ctx.fillText('ZONE', 180, 60);

    // 在线人数
    const onlineCount = Math.floor(Math.sin(this.animationTime / 5000) * 30 + 120);
    const tagText = `● ${onlineCount} ONLINE`;

    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = Theme.colors.status.success;
    ctx.shadowColor = Theme.colors.status.success;
    ctx.shadowBlur = 5;
    ctx.fillText(tagText, width - 24, 60);
    ctx.shadowBlur = 0;
  }

  // --- 交互处理 (保持逻辑不变) ---

  onTouchStart(x: number, y: number): void {
    console.log(`[MenuScene] Touch Start: ${x}, ${y}`);
    this.isDragging = false;
    this.touchStartY = y;
    this.touchStartScrollY = this.targetScrollY;
    this.velocity = 0;

    const scrollY = y - this.scrollY;

    if (y < 120) {
      console.log('[MenuScene] Ignored touch in TopBar area');
      return; // TopBar area
    }

    let handled = false;
    for (let i = this.uiComponents.length - 1; i >= 0; i--) {
      // console.log(`[MenuScene] Testing hit for component ${i}`);
      if (this.uiComponents[i].handleTouchStart(x, scrollY)) {
        console.log(`[MenuScene] Hit component ${i}`);
        handled = true;
        break;
      }
    }

    if (!handled) {
      this.isDragging = true;
    }
  }

  onTouchMove(x: number, y: number): void {
    const deltaY = y - this.touchStartY;
    if (Math.abs(deltaY) > 5 && !this.isDragging) {
      this.isDragging = true;
      console.log('[MenuScene] Started dragging');
    }

    if (this.isDragging) {
      this.targetScrollY = this.touchStartScrollY + deltaY;
      this.scrollY = this.targetScrollY;
      this.constrainScroll();
    }
  }

  onTouchEnd(x: number, y: number): void {
    console.log(`[MenuScene] Touch End: ${x}, ${y}, dragging=${this.isDragging}`);
    if (this.isDragging) {
      const deltaY = y - this.touchStartY;
      this.velocity = deltaY * 1.5;
      this.isDragging = false;
      return;
    }

    const scrollY = y - this.scrollY;
    for (let i = this.uiComponents.length - 1; i >= 0; i--) {
      if (this.uiComponents[i].handleTouchEnd(x, scrollY)) {
        console.log(`[MenuScene] Component ${i} handled touch end`);
        break;
      }
    }
  }

  private constrainScroll(): void {
    const bottomPadding = 50;
    let contentHeight = 0;
    if (this.uiComponents.length > 0) {
      const lastComp = this.uiComponents[this.uiComponents.length - 1];
      contentHeight = lastComp.y + lastComp.height + bottomPadding;
    }
    const minScroll = Math.min(0, this.canvas.height - contentHeight);
    const maxScroll = 0;
    if (this.targetScrollY > maxScroll) this.targetScrollY = maxScroll;
    if (this.targetScrollY < minScroll) this.targetScrollY = minScroll;
  }

  private onGameCardClick(game: GameConfig): void {
    console.log(`[MenuScene] Card clicked: ${game.name} (${game.id})`);

    wx.showModal({
      title: game.name,
      content: 'Ready to Start?',
      showCancel: true,
      cancelText: '单人',
      confirmText: '多人',
      confirmColor: Theme.colors.primary.main,
      success: (res) => {
        if (res.confirm) {
          (this as any).__sceneManager.switchTo('lobby', { gameType: game.id });
        } else if (res.cancel) {
          // If Gobang, ask for difficulty
          if (game.id === 'gobang') {
            this.showDifficultySelection(game.id);
          } else {
            (this as any).__sceneManager.switchTo(game.id, { mode: 'single' });
          }
        }
      },
      fail: (err) => {
        console.error('[MenuScene] ShowModal failed:', err);
      }
    });
  }

  private showDifficultySelection(gameId: string): void {
    wx.showActionSheet({
      itemList: ['简单 (Easy)', '普通 (Medium)', '困难 (Hard)'],
      success: (res) => {
        const levels = ['easy', 'medium', 'hard'];
        const difficulty = levels[res.tapIndex];
        (this as any).__sceneManager.switchTo(gameId, { mode: 'single', difficulty });
      },
      fail: (res) => {
        console.log(res.errMsg);
      }
    });
  }

  setGameBridge(bridge: GameBridge): void { }
  setSceneManager(manager: any): void { (this as any).__sceneManager = manager; }
}
