/**
 * 贪吃蛇游戏 - 集成示例
 * 展示如何将经典游戏集成到框架中
 */
import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';

interface Position {
  x: number;
  y: number;
}

enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export class SnakeGame implements Scene {
  name: string = 'snake';
  private canvas: WechatMinigame.Canvas;
  private gameBridge: GameBridge | null = null;

  // 游戏状态
  private isPlaying: boolean = false;
  private score: number = 0;
  private gameOver: boolean = false;

  // 游戏设置
  private gridSize: number = 20;
  private gridWidth: number = 0;
  private gridHeight: number = 0;

  // 蛇
  private snake: Position[] = [];
  private direction: Direction = Direction.RIGHT;
  private nextDirection: Direction = Direction.RIGHT;

  // 食物
  private food: Position = { x: 0, y: 0 };

  // 游戏速度
  private moveInterval: number = 150; // 毫秒
  private lastMoveTime: number = 0;

  // UI
  private backBtn = { x: 20, y: 60, width: 80, height: 40 };
  private touchStartX: number = 0;
  private touchStartY: number = 0;

  init(): void {
    this.canvas = wx.createCanvas();
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.canvas.width = windowWidth;
    this.canvas.height = windowHeight;

    // 计算网格大小
    const gameAreaHeight = windowHeight - 200; // 留出顶部和底部空间
    this.gridWidth = Math.floor(windowWidth / this.gridSize);
    this.gridHeight = Math.floor(gameAreaHeight / this.gridSize);

    this.backBtn = {
      x: 20,
      y: 60,
      width: 80,
      height: 40
    };
  }

  enter(data?: any): void {
    console.log('[SnakeGame] Entered');
    this.startGame();
  }

  exit(): void {
    console.log('[SnakeGame] Exited');
    this.isPlaying = false;
  }

  update(deltaTime: number): void {
    if (!this.isPlaying || this.gameOver) return;

    const currentTime = Date.now();
    if (currentTime - this.lastMoveTime > this.moveInterval) {
      this.lastMoveTime = currentTime;
      this.moveSnake();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0f2027');
    gradient.addColorStop(0.5, '#203a43');
    gradient.addColorStop(1, '#2c5364');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 顶部信息栏
    this.drawTopBar(ctx);

    // 游戏区域偏移
    const offsetY = 130;

    // 绘制网格（可选，用于调试）
    // this.drawGrid(ctx, offsetY);

    if (this.isPlaying) {
      // 绘制食物
      this.drawFood(ctx, offsetY);

      // 绘制蛇
      this.drawSnake(ctx, offsetY);
    }

    // 游戏结束提示
    if (this.gameOver) {
      this.drawGameOver(ctx);
    }

    // 控制提示
    if (!this.gameOver) {
      this.drawControls(ctx);
    }
  }

  onTouchStart(x: number, y: number): void {
    // 返回按钮
    if (this.isPointInRect(x, y, this.backBtn)) {
      if (this.isPlaying && !this.gameOver) {
        wx.showModal({
          title: '确认退出',
          content: '游戏正在进行中，确定要退出吗？',
          success: (res) => {
            if (res.confirm) {
              (this as any).__sceneManager.switchTo('menu');
            }
          }
        });
      } else {
        (this as any).__sceneManager.switchTo('menu');
      }
      return;
    }

    // 游戏结束后重新开始
    if (this.gameOver) {
      this.startGame();
      return;
    }

    // 记录触摸起点（用于滑动控制）
    this.touchStartX = x;
    this.touchStartY = y;
  }

  onTouchEnd(x: number, y: number): void {
    if (this.gameOver || !this.isPlaying) return;

    // 计算滑动方向
    const deltaX = x - this.touchStartX;
    const deltaY = y - this.touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // 只处理明显的滑动
    if (absDeltaX < 30 && absDeltaY < 30) return;

    // 判断方向
    if (absDeltaX > absDeltaY) {
      // 水平滑动
      if (deltaX > 0 && this.direction !== Direction.LEFT) {
        this.nextDirection = Direction.RIGHT;
      } else if (deltaX < 0 && this.direction !== Direction.RIGHT) {
        this.nextDirection = Direction.LEFT;
      }
    } else {
      // 垂直滑动
      if (deltaY > 0 && this.direction !== Direction.UP) {
        this.nextDirection = Direction.DOWN;
      } else if (deltaY < 0 && this.direction !== Direction.DOWN) {
        this.nextDirection = Direction.UP;
      }
    }
  }

  /**
   * 开始游戏
   */
  private startGame(): void {
    this.isPlaying = true;
    this.gameOver = false;
    this.score = 0;
    this.direction = Direction.RIGHT;
    this.nextDirection = Direction.RIGHT;
    this.lastMoveTime = Date.now();

    // 初始化蛇（在中间位置）
    const startX = Math.floor(this.gridWidth / 2);
    const startY = Math.floor(this.gridHeight / 2);
    this.snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY }
    ];

    // 生成食物
    this.generateFood();
  }

  /**
   * 移动蛇
   */
  private moveSnake(): void {
    // 更新方向
    this.direction = this.nextDirection;

    // 计算新头部位置
    const head = this.snake[0];
    let newHead: Position;

    switch (this.direction) {
      case Direction.UP:
        newHead = { x: head.x, y: head.y - 1 };
        break;
      case Direction.DOWN:
        newHead = { x: head.x, y: head.y + 1 };
        break;
      case Direction.LEFT:
        newHead = { x: head.x - 1, y: head.y };
        break;
      case Direction.RIGHT:
        newHead = { x: head.x + 1, y: head.y };
        break;
    }

    // 检查碰撞
    if (this.checkCollision(newHead)) {
      this.endGame();
      return;
    }

    // 添加新头部
    this.snake.unshift(newHead);

    // 检查是否吃到食物
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score += 10;
      this.generateFood();
      // 加速
      if (this.moveInterval > 80) {
        this.moveInterval -= 2;
      }
      // 震动反馈
      wx.vibrateShort({ type: 'light' });
    } else {
      // 移除尾部
      this.snake.pop();
    }
  }

  /**
   * 检查碰撞
   */
  private checkCollision(pos: Position): boolean {
    // 撞墙
    if (pos.x < 0 || pos.x >= this.gridWidth || pos.y < 0 || pos.y >= this.gridHeight) {
      return true;
    }

    // 撞自己
    for (let i = 0; i < this.snake.length; i++) {
      if (this.snake[i].x === pos.x && this.snake[i].y === pos.y) {
        return true;
      }
    }

    return false;
  }

  /**
   * 生成食物
   */
  private generateFood(): void {
    let newFood: Position;
    let valid = false;

    while (!valid) {
      newFood = {
        x: Math.floor(Math.random() * this.gridWidth),
        y: Math.floor(Math.random() * this.gridHeight)
      };

      // 确保食物不在蛇身上
      valid = true;
      for (const segment of this.snake) {
        if (segment.x === newFood.x && segment.y === newFood.y) {
          valid = false;
          break;
        }
      }

      if (valid) {
        this.food = newFood;
      }
    }
  }

  /**
   * 游戏结束
   */
  private endGame(): void {
    this.gameOver = true;
    this.isPlaying = false;
    wx.vibrateShort({ type: 'heavy' });
  }

  /**
   * 绘制顶部信息栏
   */
  private drawTopBar(ctx: CanvasRenderingContext2D): void {
    const { width } = this.canvas;

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 50, width, 70);

    // 返回按钮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(this.backBtn.x + this.backBtn.height / 2, this.backBtn.y + this.backBtn.height / 2, this.backBtn.height / 2, 0, Math.PI * 2);
    ctx.arc(this.backBtn.x + this.backBtn.width - this.backBtn.height / 2, this.backBtn.y + this.backBtn.height / 2, this.backBtn.height / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(this.backBtn.x + this.backBtn.height / 2, this.backBtn.y, this.backBtn.width - this.backBtn.height, this.backBtn.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← 返回', this.backBtn.x + this.backBtn.width / 2, this.backBtn.y + this.backBtn.height / 2 + 6);

    // 分数
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`分数: ${this.score}`, width / 2, 90);

    // 长度
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`长度: ${this.snake.length}`, width / 2, 115);
  }

  /**
   * 绘制蛇
   */
  private drawSnake(ctx: CanvasRenderingContext2D, offsetY: number): void {
    this.snake.forEach((segment, index) => {
      const x = segment.x * this.gridSize;
      const y = segment.y * this.gridSize + offsetY;

      if (index === 0) {
        // 头部
        const gradient = ctx.createRadialGradient(
          x + this.gridSize / 2, y + this.gridSize / 2, 0,
          x + this.gridSize / 2, y + this.gridSize / 2, this.gridSize / 2
        );
        gradient.addColorStop(0, '#4facfe');
        gradient.addColorStop(1, '#00f2fe');
        ctx.fillStyle = gradient;
      } else {
        // 身体
        ctx.fillStyle = `rgba(79, 172, 254, ${1 - index / this.snake.length * 0.5})`;
      }

      this.roundRect(ctx, x + 2, y + 2, this.gridSize - 4, this.gridSize - 4, 4);
      ctx.fill();
    });
  }

  /**
   * 绘制食物
   */
  private drawFood(ctx: CanvasRenderingContext2D, offsetY: number): void {
    const x = this.food.x * this.gridSize;
    const y = this.food.y * this.gridSize + offsetY;

    // 发光效果
    const gradient = ctx.createRadialGradient(
      x + this.gridSize / 2, y + this.gridSize / 2, 0,
      x + this.gridSize / 2, y + this.gridSize / 2, this.gridSize
    );
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - 5, y - 5, this.gridSize + 10, this.gridSize + 10);

    // 食物本体
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(x + this.gridSize / 2, y + this.gridSize / 2, this.gridSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 绘制游戏结束
   */
  private drawGameOver(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    // 游戏结束文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', width / 2, height / 2 - 50);

    // 最终分数
    ctx.font = '24px sans-serif';
    ctx.fillText(`最终分数: ${this.score}`, width / 2, height / 2 + 10);
    ctx.fillText(`蛇的长度: ${this.snake.length}`, width / 2, height / 2 + 50);

    // 重新开始提示
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('点击屏幕重新开始', width / 2, height / 2 + 100);
  }

  /**
   * 绘制控制提示
   */
  private drawControls(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👆 滑动屏幕控制方向', width / 2, height - 20);
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
   * 判断点是否在矩形内
   */
  private isPointInRect(x: number, y: number, rect: any): boolean {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height;
  }

  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
  }

  setSceneManager(manager: any): void {
    (this as any).__sceneManager = manager;
  }
}

