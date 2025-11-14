/**
 * 俄罗斯方块游戏 - 手势控制版
 */
import { Scene } from '../core/SceneManager';
import { SceneManager } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';

// 方块形状定义
const SHAPES = {
  I: [
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]]
  ],
  O: [
    [[1, 1], [1, 1]]
  ],
  T: [
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0], [1, 1], [1, 0]],
    [[1, 1, 1], [0, 1, 0]],
    [[0, 1], [1, 1], [0, 1]]
  ],
  S: [
    [[0, 1, 1], [1, 1, 0]],
    [[1, 0], [1, 1], [0, 1]]
  ],
  Z: [
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1], [1, 1], [1, 0]]
  ],
  J: [
    [[1, 0, 0], [1, 1, 1]],
    [[1, 1], [1, 0], [1, 0]],
    [[1, 1, 1], [0, 0, 1]],
    [[0, 1], [0, 1], [1, 1]]
  ],
  L: [
    [[0, 0, 1], [1, 1, 1]],
    [[1, 0], [1, 0], [1, 1]],
    [[1, 1, 1], [1, 0, 0]],
    [[1, 1], [0, 1], [0, 1]]
  ]
};

const SHAPE_COLORS = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000'
};

interface Piece {
  shape: number[][];
  x: number;
  y: number;
  type: keyof typeof SHAPES;
  rotation: number;
}

export class TetrisGame implements Scene {
  name = 'tetris';
  private canvas!: WechatMinigame.Canvas;
  private sceneManager?: SceneManager;
  private gameBridge?: GameBridge;

  // 游戏配置
  private readonly COLS = 10;
  private readonly ROWS = 20;
  private readonly BLOCK_SIZE = 0; // 动态计算
  private blockSize = 0;
  private offsetX = 0;
  private offsetY = 0;

  // 游戏状态
  private board: (string | null)[][] = [];
  private currentPiece: Piece | null = null;
  private nextPiece: Piece | null = null;
  private score = 0;
  private lines = 0;
  private level = 1;
  private gameOver = false;
  private paused = false;
  private showingTutorial = true;

  // 游戏速度
  private dropInterval = 1000;
  private lastDropTime = 0;

  // 触摸控制
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private minSwipeDistance = 30;
  private tapMaxDuration = 200;

  // UI 按钮
  private backBtn = { x: 20, y: 60, width: 80, height: 40 };
  private pauseBtn = { x: 0, y: 60, width: 80, height: 40 };

  constructor() {
    this.initBoard();
  }

  setSceneManager(manager: SceneManager): void {
    this.sceneManager = manager;
  }

  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
  }

  init(): void {
    console.log('[TetrisGame] Init');
    this.canvas = wx.createCanvas();
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.canvas.width = windowWidth;
    this.canvas.height = windowHeight;

    // 计算方块大小和偏移
    const availableHeight = windowHeight - 250;
    const blockSizeByHeight = Math.floor(availableHeight / this.ROWS);
    const blockSizeByWidth = Math.floor((windowWidth - 40) / this.COLS);
    this.blockSize = Math.min(blockSizeByHeight, blockSizeByWidth);
    
    this.offsetX = (windowWidth - this.blockSize * this.COLS) / 2;
    this.offsetY = 150;

    // 更新按钮位置
    this.pauseBtn.x = windowWidth - 100;

    this.setupTouchControls();
  }

  enter(): void {
    console.log('[TetrisGame] Entered');
    this.showingTutorial = true;
    this.showTutorial();
  }

  exit(): void {
    console.log('[TetrisGame] Exited');
    this.paused = false;
    this.gameOver = false;
  }

  private showTutorial(): void {
    wx.showModal({
      title: '🎮 游戏操作说明',
      content: '👆 点击屏幕：旋转方块\n👈 左滑：向左移动\n👉 右滑：向右移动\n👇 下滑：快速下落\n\n准备好了吗？',
      confirmText: '开始游戏',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          this.showingTutorial = false;
          this.startGame();
        } else if (this.sceneManager) {
          this.sceneManager.switchTo('menu');
        }
      }
    });
  }

  private startGame(): void {
    this.initBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.gameOver = false;
    this.paused = false;
    this.dropInterval = 1000;
    this.lastDropTime = Date.now();
    
    this.spawnPiece();
    this.spawnNextPiece();
  }

  private initBoard(): void {
    this.board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(null));
  }

  private setupTouchControls(): void {
    wx.onTouchStart((e) => {
      if (e.touches.length > 0) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.touchStartTime = Date.now();
      }
    });

    wx.onTouchEnd((e) => {
      if (e.changedTouches.length === 0) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const touchDuration = Date.now() - this.touchStartTime;

      // 检查按钮点击
      if (this.isPointInRect(this.touchStartX, this.touchStartY, this.backBtn)) {
        this.handleBack();
        return;
      }

      if (this.isPointInRect(this.touchStartX, this.touchStartY, this.pauseBtn)) {
        this.togglePause();
        return;
      }

      if (this.showingTutorial || this.gameOver || this.paused) return;

      const deltaX = touchEndX - this.touchStartX;
      const deltaY = touchEndY - this.touchStartY;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // 判断是点击还是滑动
      if (touchDuration < this.tapMaxDuration && absDeltaX < 20 && absDeltaY < 20) {
        // 点击 - 旋转
        this.rotatePiece();
      } else if (absDeltaX > this.minSwipeDistance || absDeltaY > this.minSwipeDistance) {
        // 滑动
        if (absDeltaX > absDeltaY) {
          // 横向滑动
          if (deltaX > 0) {
            this.movePiece(1, 0); // 右移
          } else {
            this.movePiece(-1, 0); // 左移
          }
        } else {
          // 纵向滑动
          if (deltaY > 0) {
            this.hardDrop(); // 下滑 - 快速下落
          }
        }
      }
    });
  }

  private isPointInRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  private spawnPiece(): void {
    if (this.nextPiece) {
      this.currentPiece = this.nextPiece;
      this.currentPiece.x = Math.floor(this.COLS / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
      this.currentPiece.y = 0;
    } else {
      const types = Object.keys(SHAPES) as (keyof typeof SHAPES)[];
      const type = types[Math.floor(Math.random() * types.length)];
      this.currentPiece = {
        type,
        shape: SHAPES[type][0],
        x: Math.floor(this.COLS / 2) - Math.floor(SHAPES[type][0][0].length / 2),
        y: 0,
        rotation: 0
      };
    }

    if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape)) {
      this.gameOver = true;
      this.showGameOver();
    }
  }

  private spawnNextPiece(): void {
    const types = Object.keys(SHAPES) as (keyof typeof SHAPES)[];
    const type = types[Math.floor(Math.random() * types.length)];
    this.nextPiece = {
      type,
      shape: SHAPES[type][0],
      x: 0,
      y: 0,
      rotation: 0
    };
  }

  private movePiece(dx: number, dy: number): boolean {
    if (!this.currentPiece) return false;

    const newX = this.currentPiece.x + dx;
    const newY = this.currentPiece.y + dy;

    if (!this.checkCollision(newX, newY, this.currentPiece.shape)) {
      this.currentPiece.x = newX;
      this.currentPiece.y = newY;
      return true;
    }

    return false;
  }

  private rotatePiece(): void {
    if (!this.currentPiece) return;

    const shapes = SHAPES[this.currentPiece.type];
    const nextRotation = (this.currentPiece.rotation + 1) % shapes.length;
    const newShape = shapes[nextRotation];

    if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y, newShape)) {
      this.currentPiece.shape = newShape;
      this.currentPiece.rotation = nextRotation;
    }
  }

  private hardDrop(): void {
    if (!this.currentPiece) return;

    while (this.movePiece(0, 1)) {
      // 持续下落直到碰撞
    }
    this.lockPiece();
  }

  private checkCollision(x: number, y: number, shape: number[][]): boolean {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = x + col;
          const newY = y + row;

          if (newX < 0 || newX >= this.COLS || newY >= this.ROWS) {
            return true;
          }

          if (newY >= 0 && this.board[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private lockPiece(): void {
    if (!this.currentPiece) return;

    for (let row = 0; row < this.currentPiece.shape.length; row++) {
      for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
        if (this.currentPiece.shape[row][col]) {
          const x = this.currentPiece.x + col;
          const y = this.currentPiece.y + row;
          if (y >= 0) {
            this.board[y][x] = this.currentPiece.type;
          }
        }
      }
    }

    this.clearLines();
    this.spawnPiece();
    this.spawnNextPiece();
  }

  private clearLines(): void {
    let linesCleared = 0;

    for (let row = this.ROWS - 1; row >= 0; row--) {
      if (this.board[row].every(cell => cell !== null)) {
        this.board.splice(row, 1);
        this.board.unshift(Array(this.COLS).fill(null));
        linesCleared++;
        row++; // 检查同一行
      }
    }

    if (linesCleared > 0) {
      this.lines += linesCleared;
      this.score += [0, 100, 300, 500, 800][linesCleared] * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
    }
  }

  private togglePause(): void {
    if (this.gameOver || this.showingTutorial) return;
    this.paused = !this.paused;
  }

  private handleBack(): void {
    if (this.showingTutorial) {
      if (this.sceneManager) {
        this.sceneManager.switchTo('menu');
      }
      return;
    }

    wx.showModal({
      title: '确认退出',
      content: '确定要退出游戏吗？',
      success: (res) => {
        if (res.confirm && this.sceneManager) {
          this.sceneManager.switchTo('menu');
        }
      }
    });
  }

  private showGameOver(): void {
    wx.showModal({
      title: '游戏结束',
      content: `得分: ${this.score}\n消除行数: ${this.lines}\n等级: ${this.level}`,
      confirmText: '重新开始',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          this.startGame();
        } else if (this.sceneManager) {
          this.sceneManager.switchTo('menu');
        }
      }
    });
  }

  update(deltaTime: number): void {
    if (this.showingTutorial || this.paused || this.gameOver || !this.currentPiece) return;

    const now = Date.now();
    if (now - this.lastDropTime > this.dropInterval) {
      if (!this.movePiece(0, 1)) {
        this.lockPiece();
      }
      this.lastDropTime = now;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    // 背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    if (this.showingTutorial) {
      this.renderTutorialScreen(ctx);
      return;
    }

    // 顶部栏
    this.renderTopBar(ctx);

    // 游戏区域背景
    ctx.fillStyle = '#16213e';
    ctx.fillRect(this.offsetX, this.offsetY, this.blockSize * this.COLS, this.blockSize * this.ROWS);

    // 网格线
    ctx.strokeStyle = '#0f3460';
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(this.offsetX + i * this.blockSize, this.offsetY);
      ctx.lineTo(this.offsetX + i * this.blockSize, this.offsetY + this.blockSize * this.ROWS);
      ctx.stroke();
    }
    for (let i = 0; i <= this.ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(this.offsetX, this.offsetY + i * this.blockSize);
      ctx.lineTo(this.offsetX + this.blockSize * this.COLS, this.offsetY + i * this.blockSize);
      ctx.stroke();
    }

    // 已固定的方块
    this.renderBoard(ctx);

    // 当前方块
    if (this.currentPiece) {
      this.renderPiece(ctx, this.currentPiece);
    }

    // 下一个方块预览
    this.renderNextPiece(ctx);

    // 暂停遮罩
    if (this.paused) {
      this.renderPauseOverlay(ctx);
    }
  }

  private renderTutorialScreen(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('俄罗斯方块', width / 2, height / 2 - 100);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('等待操作提示...', width / 2, height / 2);
  }

  private renderTopBar(ctx: CanvasRenderingContext2D): void {
    const { width } = this.canvas;
    const topBarY = 50;

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, topBarY, width, 70);

    // 返回按钮
    ctx.fillStyle = '#8f7a66';
    ctx.fillRect(this.backBtn.x, this.backBtn.y, this.backBtn.width, this.backBtn.height);
    ctx.fillStyle = '#f9f6f2';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('返回', this.backBtn.x + this.backBtn.width / 2, this.backBtn.y + this.backBtn.height / 2);

    // 分数（左侧）
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`分数: ${this.score}`, 120, topBarY + 25);
    ctx.font = '14px sans-serif';
    ctx.fillText(`行数: ${this.lines} | 等级: ${this.level}`, 120, topBarY + 50);

    // 暂停按钮
    ctx.fillStyle = '#8f7a66';
    ctx.fillRect(this.pauseBtn.x, this.pauseBtn.y, this.pauseBtn.width, this.pauseBtn.height);
    ctx.fillStyle = '#f9f6f2';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.paused ? '继续' : '暂停', this.pauseBtn.x + this.pauseBtn.width / 2, this.pauseBtn.y + this.pauseBtn.height / 2);
  }

  private renderBoard(ctx: CanvasRenderingContext2D): void {
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        const cellType = this.board[row][col];
        if (cellType) {
          this.renderBlock(ctx, col, row, SHAPE_COLORS[cellType]);
        }
      }
    }
  }

  private renderPiece(ctx: CanvasRenderingContext2D, piece: Piece): void {
    const color = SHAPE_COLORS[piece.type];
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (piece.shape[row][col]) {
          this.renderBlock(ctx, piece.x + col, piece.y + row, color);
        }
      }
    }
  }

  private renderBlock(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    const px = this.offsetX + x * this.blockSize;
    const py = this.offsetY + y * this.blockSize;
    const size = this.blockSize;

    // 主体
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, size - 2, size - 2);

    // 高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(px + 2, py + 2, size - 4, size / 3);

    // 阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(px + 2, py + size - size / 3, size - 4, size / 3 - 2);
  }

  private renderNextPiece(ctx: CanvasRenderingContext2D): void {
    if (!this.nextPiece) return;

    const { width } = this.canvas;
    const boxX = width - 120;
    const boxY = this.offsetY;
    const boxSize = 100;

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(boxX, boxY, boxSize, boxSize);

    // 标题
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('下一个', boxX + boxSize / 2, boxY + 20);

    // 方块
    const shape = this.nextPiece.shape;
    const blockSize = Math.min(60 / shape.length, 60 / shape[0].length);
    const startX = boxX + (boxSize - shape[0].length * blockSize) / 2;
    const startY = boxY + 40 + (60 - shape.length * blockSize) / 2;

    ctx.fillStyle = SHAPE_COLORS[this.nextPiece.type];
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          ctx.fillRect(
            startX + col * blockSize + 1,
            startY + row * blockSize + 1,
            blockSize - 2,
            blockSize - 2
          );
        }
      }
    }
  }

  private renderPauseOverlay(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('游戏暂停', width / 2, height / 2);

    ctx.font = '16px sans-serif';
    ctx.fillText('点击"继续"按钮恢复游戏', width / 2, height / 2 + 40);
  }

  destroy(): void {
    console.log('[TetrisGame] Destroy');
  }
}

