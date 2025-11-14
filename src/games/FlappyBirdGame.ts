import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';

// 游戏状态
enum GameState {
  READY,
  PLAYING,
  GAME_OVER
}

// 小鸟类
class Bird {
  game: FlappyBirdGame;
  x: number;
  y: number;
  width: number = 50;
  height: number = 40;
  
  // 物理参数
  velocity: number = 0;
  gravity: number = 0.5;
  jumpStrength: number = -9;
  rotation: number = 0;
  
  image: any = null;
  frameX: number = 0;
  frameCount: number = 3;
  frameTimer: number = 0;
  frameInterval: number = 5;
  
  // 精灵图中的小鸟位置（黄色小鸟）
  spriteX: number = 3;
  spriteY: number = 491;

  constructor(game: FlappyBirdGame) {
    this.game = game;
    this.x = 80;
    this.y = game.canvas.height / 2;
  }

  flap() {
    this.velocity = this.jumpStrength;
  }

  update() {
    // 应用重力
    this.velocity += this.gravity;
    this.y += this.velocity;

    // 旋转角度（根据速度）
    if (this.velocity >= 0) {
      this.rotation = Math.min(Math.PI / 2, this.velocity * 0.1);
    } else {
      this.rotation = Math.max(-Math.PI / 4, this.velocity * 0.1);
    }

    // 限制在屏幕内
    if (this.y < 0) {
      this.y = 0;
      this.velocity = 0;
    }
    
    // 动画帧
    this.frameTimer++;
    if (this.frameTimer >= this.frameInterval) {
      this.frameTimer = 0;
      this.frameX = (this.frameX + 1) % this.frameCount;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation);

    if (this.image && this.image.complete) {
      // 从精灵图中提取小鸟（3帧动画）
      ctx.drawImage(
        this.image,
        this.spriteX + this.frameX * 34, this.spriteY,
        34, 24,
        -this.width / 2, -this.height / 2,
        this.width, this.height
      );
    } else {
      // 占位符
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    ctx.restore();
  }

  reset() {
    this.y = this.game.canvas.height / 2;
    this.velocity = 0;
    this.rotation = 0;
  }
}

// 管道类
class Pipe {
  game: FlappyBirdGame;
  x: number;
  width: number = 80;
  gap: number = 150;
  topHeight: number;
  bottomY: number;
  passed: boolean = false;
  speed: number = 2;
  
  topImage: any = null;
  bottomImage: any = null;

  constructor(game: FlappyBirdGame, x: number) {
    this.game = game;
    this.x = x;
    // 随机高度
    const minHeight = 50;
    const maxHeight = game.canvas.height - this.gap - 100;
    this.topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    this.bottomY = this.topHeight + this.gap;
  }

  update() {
    this.x -= this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // 上管道
    ctx.fillStyle = '#5AB552';
    ctx.fillRect(this.x, 0, this.width, this.topHeight);
    
    // 管道顶部装饰
    ctx.fillStyle = '#6FCA61';
    ctx.fillRect(this.x - 5, this.topHeight - 30, this.width + 10, 30);

    // 下管道
    ctx.fillStyle = '#5AB552';
    ctx.fillRect(this.x, this.bottomY, this.width, this.game.canvas.height - this.bottomY);
    
    // 管道顶部装饰
    ctx.fillStyle = '#6FCA61';
    ctx.fillRect(this.x - 5, this.bottomY, this.width + 10, 30);
  }

  isOffScreen(): boolean {
    return this.x + this.width < 0;
  }

  collidesWith(bird: Bird): boolean {
    const birdLeft = bird.x;
    const birdRight = bird.x + bird.width;
    const birdTop = bird.y;
    const birdBottom = bird.y + bird.height;

    const pipeLeft = this.x;
    const pipeRight = this.x + this.width;

    // 检查水平重叠
    if (birdRight > pipeLeft && birdLeft < pipeRight) {
      // 检查垂直碰撞
      if (birdTop < this.topHeight || birdBottom > this.bottomY) {
        return true;
      }
    }

    return false;
  }
}

// 背景类
class Background {
  game: FlappyBirdGame;
  x: number = 0;
  speed: number = 1;
  image: any = null;

  constructor(game: FlappyBirdGame) {
    this.game = game;
  }

  update() {
    this.x -= this.speed;
    if (this.x <= -this.game.canvas.width) {
      this.x = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { width, height } = this.game.canvas;
    
    // 天空渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#4EC0CA');
    gradient.addColorStop(1, '#DDF0F3');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 可以在这里添加云朵等装饰
  }
}

// 地面类
class Ground {
  game: FlappyBirdGame;
  x: number = 0;
  height: number = 100;
  speed: number = 2;
  image: any = null;

  constructor(game: FlappyBirdGame) {
    this.game = game;
  }

  update() {
    this.x -= this.speed;
    if (this.x <= -this.game.canvas.width) {
      this.x = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { width, height } = this.game.canvas;
    const y = height - this.height;

    // 绘制地面
    ctx.fillStyle = '#DED895';
    ctx.fillRect(0, y, width, this.height);

    // 草地效果
    ctx.fillStyle = '#B4D27D';
    for (let i = 0; i < width; i += 10) {
      ctx.fillRect(this.x + i, y, 8, 10);
      ctx.fillRect(this.x + i + width, y, 8, 10);
    }

    // 土壤层
    ctx.fillStyle = '#C88A4C';
    ctx.fillRect(0, y + 20, width, this.height - 20);
  }

  collidesWith(bird: Bird): boolean {
    return bird.y + bird.height >= this.game.canvas.height - this.height;
  }
}

// 主游戏类
export class FlappyBirdGame implements Scene {
  name: string = 'flappybird';
  canvas: WechatMinigame.Canvas;
  ctx: CanvasRenderingContext2D;
  private gameBridge: GameBridge | null = null;
  private sceneManager: any = null;

  // 游戏状态
  gameState: GameState = GameState.READY;
  score: number = 0;
  bestScore: number = 0;
  frames: number = 0;

  // 游戏对象
  bird: Bird;
  pipes: Pipe[] = [];
  background: Background;
  ground: Ground;

  // 管道生成
  pipeSpawnTimer: number = 0;
  pipeSpawnInterval: number = 90; // 帧数

  // UI 元素
  private backBtn = { x: 20, y: 60, width: 100, height: 50 };

  init(): void {
    this.canvas = wx.createCanvas();
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.canvas.width = windowWidth;
    this.canvas.height = windowHeight;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    // 从本地存储读取最佳分数
    try {
      const savedScore = wx.getStorageSync('flappybird_best_score');
      if (savedScore) {
        this.bestScore = parseInt(savedScore);
      }
    } catch (e) {
      console.log('Failed to load best score');
    }

    // 初始化游戏对象
    this.bird = new Bird(this);
    this.background = new Background(this);
    this.ground = new Ground(this);

    // 加载精灵图
    const spriteSheet = wx.createImage();
    spriteSheet.onload = () => {
      this.bird.image = spriteSheet;
    };
    spriteSheet.src = 'assets/flappybird/sprite_sheet.png';
  }

  enter(data?: any): void {
    this.gameState = GameState.READY;
    this.score = 0;
    this.frames = 0;
    this.pipes = [];
    this.pipeSpawnTimer = 0;
    this.bird.reset();
  }

  exit(): void {
    this.pipes = [];
  }

  update(deltaTime: number): void {
    this.frames++;

    // 背景和地面始终更新
    this.background.update();
    this.ground.update();

    if (this.gameState === GameState.READY) {
      // 准备状态，小鸟上下浮动
      this.bird.y = this.canvas.height / 2 + Math.sin(this.frames * 0.05) * 20;
    } 
    else if (this.gameState === GameState.PLAYING) {
      // 更新小鸟
      this.bird.update();

      // 生成管道
      this.pipeSpawnTimer++;
      if (this.pipeSpawnTimer >= this.pipeSpawnInterval) {
        this.pipes.push(new Pipe(this, this.canvas.width));
        this.pipeSpawnTimer = 0;
      }

      // 更新管道
      for (let i = this.pipes.length - 1; i >= 0; i--) {
        const pipe = this.pipes[i];
        pipe.update();

        // 计分
        if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
          pipe.passed = true;
          this.score++;
        }

        // 碰撞检测
        if (pipe.collidesWith(this.bird)) {
          this.gameOver();
        }

        // 移除离开屏幕的管道
        if (pipe.isOffScreen()) {
          this.pipes.splice(i, 1);
        }
      }

      // 地面碰撞
      if (this.ground.collidesWith(this.bird)) {
        this.gameOver();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    // 绘制背景
    this.background.draw(ctx);

    // 绘制管道
    this.pipes.forEach(pipe => pipe.draw(ctx));

    // 绘制地面
    this.ground.draw(ctx);

    // 绘制小鸟
    this.bird.draw(ctx);

    // 绘制 UI
    this.drawUI(ctx);

    // 绘制状态特定的 UI
    if (this.gameState === GameState.READY) {
      this.drawReadyScreen(ctx);
    } else if (this.gameState === GameState.GAME_OVER) {
      this.drawGameOverScreen(ctx);
    }
  }

  onTouchStart(x: number, y: number): void {
    // 返回按钮
    if (this.isPointInRect(x, y, this.backBtn)) {
      this.sceneManager.switchTo('menu');
      return;
    }

    // 游戏逻辑
    if (this.gameState === GameState.READY) {
      this.gameState = GameState.PLAYING;
      this.bird.flap();
    } 
    else if (this.gameState === GameState.PLAYING) {
      this.bird.flap();
    } 
    else if (this.gameState === GameState.GAME_OVER) {
      // 点击重新开始
      this.enter();
    }
  }

  private drawUI(ctx: CanvasRenderingContext2D): void {
    const topBarHeight = 90;

    // 顶部栏背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
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

    // 显示分数（游戏中）
    if (this.gameState === GameState.PLAYING) {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.font = 'bold 64px Arial';
      ctx.textAlign = 'center';
      ctx.strokeText(this.score.toString(), this.canvas.width / 2, 120);
      ctx.fillText(this.score.toString(), this.canvas.width / 2, 120);
    }
  }

  private drawReadyScreen(ctx: CanvasRenderingContext2D): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // 半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 标题
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.strokeText('Flappy Bird', centerX, centerY - 100);
    ctx.fillText('Flappy Bird', centerX, centerY - 100);

    // 提示
    ctx.font = 'bold 32px Arial';
    ctx.lineWidth = 4;
    ctx.strokeText('点击屏幕开始', centerX, centerY + 20);
    ctx.fillText('点击屏幕开始', centerX, centerY + 20);

    // 说明
    ctx.font = '24px Arial';
    ctx.lineWidth = 3;
    ctx.strokeText('点击让小鸟飞起来', centerX, centerY + 80);
    ctx.fillText('点击让小鸟飞起来', centerX, centerY + 80);
    
    ctx.strokeText('避开管道，挑战高分！', centerX, centerY + 120);
    ctx.fillText('避开管道，挑战高分！', centerX, centerY + 120);
  }

  private drawGameOverScreen(ctx: CanvasRenderingContext2D): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // 半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 游戏结束
    ctx.fillStyle = '#F44336';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    ctx.font = 'bold 64px Arial';
    ctx.textAlign = 'center';
    ctx.strokeText('游戏结束', centerX, centerY - 120);
    ctx.fillText('游戏结束', centerX, centerY - 120);

    // 分数卡片背景
    const cardWidth = 320;
    const cardHeight = 180;
    const cardX = centerX - cardWidth / 2;
    const cardY = centerY - 60;

    ctx.fillStyle = '#FFE7A0';
    ctx.strokeStyle = '#B8945F';
    ctx.lineWidth = 4;
    this.roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 15);
    ctx.fill();
    ctx.stroke();

    // 分数
    ctx.fillStyle = '#333';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('分数:', cardX + 40, cardY + 60);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = '#F44336';
    ctx.fillText(this.score.toString(), cardX + cardWidth - 40, cardY + 60);

    // 最佳分数
    ctx.textAlign = 'left';
    ctx.fillStyle = '#333';
    ctx.fillText('最佳:', cardX + 40, cardY + 120);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(this.bestScore.toString(), cardX + cardWidth - 40, cardY + 120);

    // 提示
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.strokeText('点击屏幕重新开始', centerX, centerY + 180);
    ctx.fillText('点击屏幕重新开始', centerX, centerY + 180);
  }

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

  private gameOver(): void {
    this.gameState = GameState.GAME_OVER;

    // 更新最佳分数
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        wx.setStorageSync('flappybird_best_score', this.bestScore.toString());
      } catch (e) {
        console.log('Failed to save best score');
      }
    }
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

