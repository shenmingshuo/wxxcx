import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';

// 玩家类
class Player {
  game: ShooterGame;
  x: number;
  y: number;
  width: number = 120;
  height: number = 190;
  speed: number = 5;
  minY: number = 100;
  frameX: number = 0;
  frameMax: number = 37;
  image: any = null;
  life: number = 5;
  collision: number = 0;

  constructor(game: ShooterGame) {
    this.game = game;
    this.x = 25;
    this.y = game.canvas.height * 0.3;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.image && this.image.complete) {
      ctx.drawImage(
        this.image,
        this.frameX * this.width, 0,
        this.width, this.height,
        this.x, this.y,
        this.width, this.height
      );
    } else {
      // 占位符
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }

  update() {
    // 动画帧
    if (this.frameX < this.frameMax) {
      this.frameX++;
    } else {
      this.frameX = 0;
    }

    // 移动
    if (this.game.touchY > 0) {
      const targetY = this.game.touchY - this.height / 2;
      const diff = targetY - this.y;
      if (Math.abs(diff) > 5) {
        this.y += diff * 0.1;
      }
    }

    // 限制范围
    if (this.y < this.minY) this.y = this.minY;
    if (this.y + this.height > this.game.canvas.height) {
      this.y = this.game.canvas.height - this.height;
    }
  }

  hit() {
    this.collision++;
    if (this.collision >= this.life) {
      (this.game as any).gameOver();
    }
  }
}

// 子弹类
class Bullet {
  game: ShooterGame;
  x: number;
  y: number;
  width: number = 30;
  height: number = 10;
  speed: number = 8;
  markedForDeletion: boolean = false;
  image: any = null;

  constructor(game: ShooterGame, x: number, y: number) {
    this.game = game;
    this.x = x;
    this.y = y;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.image && this.image.complete) {
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }

  update() {
    this.x += this.speed;
    if (this.x > this.game.canvas.width) {
      this.markedForDeletion = true;
    }
  }
}

// 敌人基类
class Enemy {
  game: ShooterGame;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  markedForDeletion: boolean = false;
  image: any = null;
  lives: number = 1;

  constructor(game: ShooterGame) {
    this.game = game;
    this.width = 100;
    this.height = 100;
    this.x = game.canvas.width;
    this.y = Math.random() * (game.canvas.height - this.height - 100) + 100;
    this.speed = Math.random() * 2 + 1;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.image && this.image.complete) {
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = '#F44336';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }

  update() {
    this.x -= this.speed;
    if (this.x + this.width < 0) {
      this.markedForDeletion = true;
      this.game.enemyEscaped++;
    }
  }

  hit() {
    this.lives--;
    if (this.lives <= 0) {
      this.markedForDeletion = true;
      this.game.score += 10;
    }
  }
}

// 背景层类
class Layer {
  game: ShooterGame;
  image: any = null;
  x: number = 0;
  y: number = 0;
  width: number;
  height: number;
  speed: number;

  constructor(game: ShooterGame, imageSrc: string, speed: number) {
    this.game = game;
    this.width = game.canvas.width;
    this.height = game.canvas.height;
    this.speed = speed;

    // 加载图片
    const img = wx.createImage();
    img.onload = () => {
      this.image = img;
    };
    img.src = imageSrc;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.image && this.image.complete) {
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
      ctx.drawImage(this.image, this.x + this.width, this.y, this.width, this.height);
    }
  }

  update() {
    this.x -= this.speed;
    if (this.x <= -this.width) {
      this.x = 0;
    }
  }
}

// 主游戏类
export class ShooterGame implements Scene {
  name: string = 'shooter';
  canvas: WechatMinigame.Canvas;
  ctx: CanvasRenderingContext2D;
  private gameBridge: GameBridge | null = null;
  private sceneManager: any = null;

  // 游戏状态
  isPlaying: boolean = false;
  isPaused: boolean = false;
  isGameOver: boolean = false;
  score: number = 0;
  enemyEscaped: number = 0;
  maxEnemyEscape: number = 5;

  // 游戏对象
  player: Player | null = null;
  bullets: Bullet[] = [];
  enemies: Enemy[] = [];
  layers: Layer[] = [];

  // 控制
  touchY: number = 0;
  lastShootTime: number = 0;
  shootInterval: number = 300; // 毫秒

  // 敌人生成
  lastEnemyTime: number = 0;
  enemyInterval: number = 2000; // 毫秒

  // UI 元素
  private backBtn = { x: 20, y: 60, width: 100, height: 50 };
  private pauseBtn = { x: 0, y: 0, width: 80, height: 80 };

  init(): void {
    this.canvas = wx.createCanvas();
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.canvas.width = windowWidth;
    this.canvas.height = windowHeight;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    // 暂停按钮位置（右上角）
    this.pauseBtn.x = this.canvas.width - this.pauseBtn.width - 20;
    this.pauseBtn.y = 60;

    // 初始化游戏
    this.initGame();
  }

  enter(data?: any): void {
    this.isPlaying = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.score = 0;
    this.enemyEscaped = 0;
    this.initGame();
  }

  exit(): void {
    this.isPlaying = false;
    this.bullets = [];
    this.enemies = [];
  }

  update(deltaTime: number): void {
    if (!this.isPlaying || this.isPaused || this.isGameOver) return;

    const now = Date.now();

    // 更新背景
    this.layers.forEach(layer => layer.update());

    // 更新玩家
    if (this.player) {
      this.player.update();
    }

    // 自动射击
    if (now - this.lastShootTime > this.shootInterval) {
      this.shoot();
      this.lastShootTime = now;
    }

    // 更新子弹
    this.bullets.forEach(bullet => bullet.update());
    this.bullets = this.bullets.filter(bullet => !bullet.markedForDeletion);

    // 生成敌人
    if (now - this.lastEnemyTime > this.enemyInterval) {
      this.spawnEnemy();
      this.lastEnemyTime = now;
    }

    // 更新敌人
    this.enemies.forEach(enemy => enemy.update());
    this.enemies = this.enemies.filter(enemy => !enemy.markedForDeletion);

    // 碰撞检测
    this.checkCollisions();

    // 检查游戏结束
    if (this.enemyEscaped >= this.maxEnemyEscape) {
      this.gameOver();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    // 绘制背景
    this.layers.forEach(layer => layer.draw(ctx));

    if (this.isPlaying && !this.isGameOver) {
      // 绘制玩家
      if (this.player) {
        this.player.draw(ctx);
      }

      // 绘制子弹
      this.bullets.forEach(bullet => bullet.draw(ctx));

      // 绘制敌人
      this.enemies.forEach(enemy => enemy.draw(ctx));

      // 绘制 UI
      this.drawUI(ctx);

      // 暂停界面
      if (this.isPaused) {
        this.drawPauseScreen(ctx);
      }
    } else if (this.isGameOver) {
      this.drawGameOverScreen(ctx);
    }
  }

  onTouchStart(x: number, y: number): void {
    // 返回按钮
    if (this.isPointInRect(x, y, this.backBtn)) {
      this.sceneManager.switchTo('menu');
      return;
    }

    // 暂停按钮
    if (this.isPlaying && !this.isGameOver && this.isPointInRect(x, y, this.pauseBtn)) {
      this.isPaused = !this.isPaused;
      return;
    }

    // 游戏结束后重新开始
    if (this.isGameOver) {
      this.enter();
      return;
    }
  }

  onTouchMove(x: number, y: number): void {
    if (this.isPlaying && !this.isPaused && !this.isGameOver) {
      this.touchY = y;
    }
  }

  onTouchEnd(x: number, y: number): void {
    // 可以在这里添加触摸结束的逻辑
  }

  private initGame(): void {
    // 创建玩家
    this.player = new Player(this);

    // 加载玩家图片
    const playerImg = wx.createImage();
    playerImg.onload = () => {
      if (this.player) this.player.image = playerImg;
    };
    playerImg.src = 'assets/shooter/player.png';

    // 清空数组
    this.bullets = [];
    this.enemies = [];
    this.layers = [];

    // 创建背景层（视差滚动）
    for (let i = 1; i <= 4; i++) {
      this.layers.push(new Layer(this, `assets/shooter/layer${i}.png`, i * 0.5));
    }

    // 重置时间
    this.lastShootTime = Date.now();
    this.lastEnemyTime = Date.now();
  }

  private shoot(): void {
    if (this.player) {
      const bullet = new Bullet(
        this,
        this.player.x + this.player.width,
        this.player.y + this.player.height / 2
      );

      // 加载子弹图片
      const bulletImg = wx.createImage();
      bulletImg.onload = () => {
        bullet.image = bulletImg;
      };
      bulletImg.src = 'assets/shooter/bullet.png';

      this.bullets.push(bullet);
    }
  }

  private spawnEnemy(): void {
    const enemy = new Enemy(this);

    // 随机选择敌人类型
    const types = ['enemy1', 'enemy2', 'drone'];
    const type = types[Math.floor(Math.random() * types.length)];

    const enemyImg = wx.createImage();
    enemyImg.onload = () => {
      enemy.image = enemyImg;
    };
    enemyImg.src = `assets/shooter/${type}.png`;

    this.enemies.push(enemy);
  }

  private checkCollisions(): void {
    // 子弹与敌人碰撞
    this.bullets.forEach(bullet => {
      this.enemies.forEach(enemy => {
        if (!bullet.markedForDeletion && !enemy.markedForDeletion) {
          if (this.checkCollision(bullet, enemy)) {
            bullet.markedForDeletion = true;
            enemy.hit();
          }
        }
      });
    });

    // 玩家与敌人碰撞
    if (this.player) {
      this.enemies.forEach(enemy => {
        if (!enemy.markedForDeletion) {
          if (this.checkCollision(this.player!, enemy)) {
            enemy.markedForDeletion = true;
            this.player!.hit();
          }
        }
      });
    }
  }

  private checkCollision(rect1: any, rect2: any): boolean {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  private drawUI(ctx: CanvasRenderingContext2D): void {
    const topBarHeight = 90;
    const padding = 20;

    // 顶部栏背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, this.canvas.width, topBarHeight);

    // 返回按钮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(this.backBtn.x, this.backBtn.y, this.backBtn.width, this.backBtn.height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.backBtn.x, this.backBtn.y, this.backBtn.width, this.backBtn.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('返回', this.backBtn.x + this.backBtn.width / 2, this.backBtn.y + this.backBtn.height / 2);

    // 分数
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`分数: ${this.score}`, this.backBtn.x + this.backBtn.width + 30, 85);

    // 生命值
    ctx.fillStyle = '#F44336';
    if (this.player) {
      const lives = this.player.life - this.player.collision;
      ctx.fillText(`❤️ ${lives}`, this.canvas.width / 2 - 50, 85);
    }

    // 逃脱敌人
    ctx.fillStyle = '#FF9800';
    ctx.fillText(`逃脱: ${this.enemyEscaped}/${this.maxEnemyEscape}`, this.canvas.width / 2 + 80, 85);

    // 暂停按钮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(this.pauseBtn.x, this.pauseBtn.y, this.pauseBtn.width, this.pauseBtn.height);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(this.pauseBtn.x, this.pauseBtn.y, this.pauseBtn.width, this.pauseBtn.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.isPaused ? '▶' : '⏸', this.pauseBtn.x + this.pauseBtn.width / 2, this.pauseBtn.y + this.pauseBtn.height / 2);
  }

  private drawPauseScreen(ctx: CanvasRenderingContext2D): void {
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 暂停文字
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏暂停', this.canvas.width / 2, this.canvas.height / 2 - 50);

    ctx.font = '24px Arial';
    ctx.fillText('点击暂停按钮继续', this.canvas.width / 2, this.canvas.height / 2 + 20);
  }

  private drawGameOverScreen(ctx: CanvasRenderingContext2D): void {
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 游戏结束文字
    ctx.fillStyle = '#F44336';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 100);

    // 最终分数
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(`最终分数: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);

    // 提示
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.fillText('点击屏幕重新开始', this.canvas.width / 2, this.canvas.height / 2 + 80);
  }

  private gameOver(): void {
    this.isGameOver = true;
    this.isPlaying = false;
  }

  private isPointInRect(x: number, y: number, rect: any): boolean {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height;
  }

  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
  }

  setSceneManager(manager: any): void {
    this.sceneManager = manager;
  }
}

