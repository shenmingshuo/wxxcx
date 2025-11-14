import { Scene } from '../core/SceneManager';
import { SceneManager } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';

interface Position {
  row: number;
  col: number;
}

interface Tile {
  value: number;
  row: number;
  col: number;
  isNew?: boolean;
  isMerged?: boolean;
}

export class Game2048 implements Scene {
  public name = 'game2048';
  private canvas!: WechatMinigame.Canvas;
  private sceneManager?: SceneManager;
  private gameBridge?: GameBridge;

  private board: number[][];
  private score: number = 0;
  private status: 'idle' | 'playing' | 'win' | 'lose' = 'idle';
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchEndX: number = 0;
  private touchEndY: number = 0;
  private minSwipeDistance: number = 50;
  private backBtn: { x: number; y: number; width: number; height: number } | null = null;
  private restartBtn: { x: number; y: number; width: number; height: number } | null = null;

  // 颜色配置
  private colors: { [key: number]: { bg: string; text: string } } = {
    0: { bg: '#cdc1b4', text: '#776e65' },
    2: { bg: '#eee4da', text: '#776e65' },
    4: { bg: '#ede0c8', text: '#776e65' },
    8: { bg: '#f2b179', text: '#f9f6f2' },
    16: { bg: '#f59563', text: '#f9f6f2' },
    32: { bg: '#f67c5f', text: '#f9f6f2' },
    64: { bg: '#f65e3b', text: '#f9f6f2' },
    128: { bg: '#edcf72', text: '#f9f6f2' },
    256: { bg: '#edcc61', text: '#f9f6f2' },
    512: { bg: '#edc850', text: '#f9f6f2' },
    1024: { bg: '#edc53f', text: '#f9f6f2' },
    2048: { bg: '#edc22e', text: '#f9f6f2' },
  };

  constructor() {
    this.board = this.createEmptyBoard();
  }

  setSceneManager(manager: SceneManager): void {
    this.sceneManager = manager;
  }

  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
  }

  private createEmptyBoard(): number[][] {
    return Array(4)
      .fill(0)
      .map(() => Array(4).fill(0));
  }

  init(): void {
    console.log('[Game2048] Init');
    this.canvas = wx.createCanvas();
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.canvas.width = windowWidth;
    this.canvas.height = windowHeight;
    
    this.setupTouchControls();
    this.initButtons();
  }

  enter(): void {
    console.log('[Game2048] Entered');
    if (this.status === 'idle' || this.status === 'lose') {
      this.restart();
    }
  }

  exit(): void {
    console.log('[Game2048] Exited');
  }

  private initButtons(): void {
    const { width, height } = this.canvas;
    const topBarY = 50;

    // 返回按钮（左上）
    this.backBtn = {
      x: 20,
      y: topBarY + 15,
      width: 80,
      height: 40,
    };

    // 重启按钮（右上）
    this.restartBtn = {
      x: width - 100,
      y: topBarY + 15,
      width: 80,
      height: 40,
    };
  }

  private setupTouchControls(): void {
    wx.onTouchStart((e) => {
      if (e.touches.length > 0) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      }
    });

    wx.onTouchEnd((e) => {
      if (e.changedTouches.length > 0) {
        this.touchEndX = e.changedTouches[0].clientX;
        this.touchEndY = e.changedTouches[0].clientY;
        this.handleSwipe();
      }
    });
  }

  private handleSwipe(): void {
    // 检查按钮点击
    if (this.isPointInRect(this.touchStartX, this.touchStartY, this.backBtn!)) {
      this.confirmExit();
      return;
    }

    if (this.isPointInRect(this.touchStartX, this.touchStartY, this.restartBtn!)) {
      this.confirmRestart();
      return;
    }

    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // 如果移动距离太小，忽略
    if (absDeltaX < this.minSwipeDistance && absDeltaY < this.minSwipeDistance) {
      return;
    }

    if (this.status !== 'playing') {
      return;
    }

    // 判断滑动方向
    if (absDeltaX > absDeltaY) {
      // 横向滑动
      if (deltaX > 0) {
        this.moveRight();
      } else {
        this.moveLeft();
      }
    } else {
      // 纵向滑动
      if (deltaY > 0) {
        this.moveDown();
      } else {
        this.moveUp();
      }
    }
  }

  private isPointInRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  private confirmExit(): void {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出游戏吗？',
      success: (res) => {
        if (res.confirm && this.sceneManager) {
          this.sceneManager.switchTo('menu');
        }
      },
    });
  }

  private confirmRestart(): void {
    wx.showModal({
      title: '重新开始',
      content: '确定要重新开始游戏吗？',
      success: (res) => {
        if (res.confirm) {
          this.restart();
        }
      },
    });
  }

  private restart(): void {
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.status = 'playing';
    this.addRandomTile();
    this.addRandomTile();
  }

  private addRandomTile(): void {
    const emptyCells: Position[] = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (this.board[row][col] === 0) {
          emptyCells.push({ row, col });
        }
      }
    }

    if (emptyCells.length > 0) {
      const randomIndex = Math.floor(Math.random() * emptyCells.length);
      const { row, col } = emptyCells[randomIndex];
      // 10% 概率生成 4，90% 概率生成 2
      this.board[row][col] = Math.random() < 0.1 ? 4 : 2;
    }
  }

  private moveLeft(): void {
    let moved = false;
    for (let row = 0; row < 4; row++) {
      const newRow = this.mergeLine(this.board[row]);
      if (JSON.stringify(newRow) !== JSON.stringify(this.board[row])) {
        moved = true;
        this.board[row] = newRow;
      }
    }
    if (moved) {
      this.addRandomTile();
      this.checkGameState();
    }
  }

  private moveRight(): void {
    let moved = false;
    for (let row = 0; row < 4; row++) {
      const reversed = [...this.board[row]].reverse();
      const newRow = this.mergeLine(reversed).reverse();
      if (JSON.stringify(newRow) !== JSON.stringify(this.board[row])) {
        moved = true;
        this.board[row] = newRow;
      }
    }
    if (moved) {
      this.addRandomTile();
      this.checkGameState();
    }
  }

  private moveUp(): void {
    let moved = false;
    for (let col = 0; col < 4; col++) {
      const column = this.board.map((row) => row[col]);
      const newColumn = this.mergeLine(column);
      if (JSON.stringify(newColumn) !== JSON.stringify(column)) {
        moved = true;
        for (let row = 0; row < 4; row++) {
          this.board[row][col] = newColumn[row];
        }
      }
    }
    if (moved) {
      this.addRandomTile();
      this.checkGameState();
    }
  }

  private moveDown(): void {
    let moved = false;
    for (let col = 0; col < 4; col++) {
      const column = this.board.map((row) => row[col]);
      const reversed = [...column].reverse();
      const newColumn = this.mergeLine(reversed).reverse();
      if (JSON.stringify(newColumn) !== JSON.stringify(column)) {
        moved = true;
        for (let row = 0; row < 4; row++) {
          this.board[row][col] = newColumn[row];
        }
      }
    }
    if (moved) {
      this.addRandomTile();
      this.checkGameState();
    }
  }

  private mergeLine(line: number[]): number[] {
    // 移除0
    const filtered = line.filter((val) => val !== 0);
    const merged: number[] = [];
    let i = 0;

    while (i < filtered.length) {
      if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
        // 合并相同的数字
        const mergedValue = filtered[i] * 2;
        merged.push(mergedValue);
        this.score += mergedValue;
        i += 2;
      } else {
        merged.push(filtered[i]);
        i++;
      }
    }

    // 填充0到长度4
    while (merged.length < 4) {
      merged.push(0);
    }

    return merged;
  }

  private checkGameState(): void {
    // 检查是否获胜
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (this.board[row][col] === 2048 && this.status === 'playing') {
          this.status = 'win';
          this.showWinMessage();
          return;
        }
      }
    }

    // 检查是否还有可移动的空间
    if (!this.canMove()) {
      this.status = 'lose';
      this.showLoseMessage();
    }
  }

  private canMove(): boolean {
    // 检查是否有空格
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (this.board[row][col] === 0) {
          return true;
        }
      }
    }

    // 检查是否有相邻的相同数字
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const current = this.board[row][col];
        // 检查右边
        if (col < 3 && this.board[row][col + 1] === current) {
          return true;
        }
        // 检查下边
        if (row < 3 && this.board[row + 1][col] === current) {
          return true;
        }
      }
    }

    return false;
  }

  private showWinMessage(): void {
    wx.showModal({
      title: '恭喜获胜！🎉',
      content: `你达到了2048！\n得分: ${this.score}`,
      confirmText: '继续游戏',
      cancelText: '重新开始',
      success: (res) => {
        if (res.cancel) {
          this.restart();
        } else {
          this.status = 'playing'; // 允许继续游戏
        }
      },
    });
  }

  private showLoseMessage(): void {
    wx.showModal({
      title: '游戏结束',
      content: `没有可移动的空间了！\n得分: ${this.score}`,
      confirmText: '重新开始',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          this.restart();
        } else if (this.sceneManager) {
          this.sceneManager.switchTo('menu');
        }
      },
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    // 背景
    ctx.fillStyle = '#faf8ef';
    ctx.fillRect(0, 0, width, height);

    // 顶部栏
    this.renderTopBar(ctx);

    // 绘制游戏板
    this.renderBoard(ctx);

    // 绘制提示
    this.renderHint(ctx);
  }

  private renderTopBar(ctx: CanvasRenderingContext2D): void {
    const { width } = this.canvas;
    const topBarY = 50;
    const topBarHeight = 70;

    // 背景
    ctx.fillStyle = 'rgba(187, 173, 160, 0.5)';
    ctx.fillRect(0, topBarY, width, topBarHeight);

    // 返回按钮
    ctx.fillStyle = '#8f7a66';
    ctx.fillRect(this.backBtn!.x, this.backBtn!.y, this.backBtn!.width, this.backBtn!.height);
    ctx.fillStyle = '#f9f6f2';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('返回', this.backBtn!.x + this.backBtn!.width / 2, this.backBtn!.y + this.backBtn!.height / 2);

    // 分数（中间）
    ctx.fillStyle = '#776e65';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`得分: ${this.score}`, width / 2, topBarY + 40);

    // 重启按钮
    ctx.fillStyle = '#8f7a66';
    ctx.fillRect(this.restartBtn!.x, this.restartBtn!.y, this.restartBtn!.width, this.restartBtn!.height);
    ctx.fillStyle = '#f9f6f2';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('重启', this.restartBtn!.x + this.restartBtn!.width / 2, this.restartBtn!.y + this.restartBtn!.height / 2);
  }

  private renderBoard(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;
    const boardSize = Math.min(width, height - 200) * 0.9;
    const cellSize = boardSize / 4;
    const padding = 15;
    const offsetX = (width - boardSize) / 2;
    const offsetY = 150;

    // 绘制棋盘背景
    ctx.fillStyle = '#bbada0';
    ctx.fillRect(offsetX, offsetY, boardSize, boardSize);

    // 绘制每个格子
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = offsetX + col * cellSize + padding;
        const y = offsetY + row * cellSize + padding;
        const size = cellSize - padding * 2;
        const value = this.board[row][col];

        // 格子背景
        const color = this.colors[value] || this.colors[2048];
        ctx.fillStyle = color.bg;
        this.roundRect(ctx, x, y, size, size, 8);
        ctx.fill();

        // 数字
        if (value > 0) {
          ctx.fillStyle = color.text;
          const fontSize = value > 999 ? 32 : value > 99 ? 40 : 48;
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(value.toString(), x + size / 2, y + size / 2);
        }
      }
    }
  }

  private renderHint(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvas;

    ctx.fillStyle = '#776e65';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('滑动屏幕移动方块', width / 2, height - 40);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
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

  update(deltaTime: number): void {
    // 2048 游戏不需要主动更新逻辑，只响应用户输入
  }

  destroy(): void {
    console.log('[Game2048] Destroy');
    // 清理资源
  }
}

