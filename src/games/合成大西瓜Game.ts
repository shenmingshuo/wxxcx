/**
 * 合成大西瓜游戏
 * 参考原 Cocos Creator 项目逻辑
 * 使用纯 JavaScript + Canvas 实现
 */
import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';

// 简化的物理引擎 - 用于水果碰撞和下落
class SimplePhysics {
  gravity: number = 0.5;
  fruits: Fruit[] = [];

  update() {
    this.fruits.forEach(fruit => {
      if (!fruit.isStatic) {
        // 应用重力
        fruit.velocityY += this.gravity;
        
        // 更新位置
        fruit.x += fruit.velocityX;
        fruit.y += fruit.velocityY;
        
        // 简单的速度衰减
        fruit.velocityX *= 0.99;
        fruit.velocityY *= 0.99;
      }
    });

    // 碰撞检测
    this.checkCollisions();
  }

  checkCollisions() {
    for (let i = 0; i < this.fruits.length; i++) {
      for (let j = i + 1; j < this.fruits.length; j++) {
        const fruitA = this.fruits[i];
        const fruitB = this.fruits[j];
        
        if (this.isColliding(fruitA, fruitB)) {
          this.resolveCollision(fruitA, fruitB);
        }
      }
    }
  }

  isColliding(a: Fruit, b: Fruit): boolean {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (a.radius + b.radius);
  }

  resolveCollision(a: Fruit, b: Fruit) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    // 分离水果
    const overlap = (a.radius + b.radius - distance) / 2;
    const nx = dx / distance;
    const ny = dy / distance;
    
    a.x -= nx * overlap;
    a.y -= ny * overlap;
    b.x += nx * overlap;
    b.y += ny * overlap;
    
    // 弹性碰撞
    const relVelX = b.velocityX - a.velocityX;
    const relVelY = b.velocityY - a.velocityY;
    const normalVel = relVelX * nx + relVelY * ny;
    
    if (normalVel < 0) return;
    
    const restitution = 0.3; // 弹性系数
    const impulse = -(1 + restitution) * normalVel;
    
    a.velocityX -= impulse * nx * 0.5;
    a.velocityY -= impulse * ny * 0.5;
    b.velocityX += impulse * nx * 0.5;
    b.velocityY += impulse * ny * 0.5;
  }

  addFruit(fruit: Fruit) {
    this.fruits.push(fruit);
  }

  removeFruit(fruit: Fruit) {
    const index = this.fruits.indexOf(fruit);
    if (index > -1) {
      this.fruits.splice(index, 1);
    }
  }
}

// 水果类
class Fruit {
  x: number;
  y: number;
  type: number; // 1-11
  radius: number;
  velocityX: number = 0;
  velocityY: number = 0;
  isStatic: boolean = false;
  image: HTMLImageElement | null = null;
  toRemove: boolean = false;

  constructor(x: number, y: number, type: number) {
    this.x = x;
    this.y = y;
    this.type = type;
    // 根据类型设置半径
    this.radius = 20 + type * 5;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.image && this.image.complete) {
      const size = this.radius * 2;
      ctx.drawImage(
        this.image,
        this.x - this.radius,
        this.y - this.radius,
        size,
        size
      );
    } else {
      // 备用绘制
      ctx.fillStyle = this.getColor();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  getColor(): string {
    const colors = [
      '#FFC0CB', '#FFB6C1', '#FF69B4', '#FF1493',
      '#DB7093', '#C71585', '#FF0000', '#FF4500',
      '#FF6347', '#FF7F50', '#FFA500'
    ];
    return colors[this.type - 1] || '#FFA500';
  }
}

export class 合成大西瓜Game implements Scene {
  name: string = '合成大西瓜';
  private canvas: WechatMinigame.Canvas;
  private ctx: CanvasRenderingContext2D;
  private gameBridge: GameBridge | null = null;
  private sceneManager: any = null;

  // 游戏状态
  private isRunning: boolean = false;
  private physics: SimplePhysics;
  private currentFruit: Fruit | null = null;
  private isCreating: boolean = false;
  private fruitCount: number = 0;
  private score: number = 0;
  private gameOver: boolean = false;

  // 游戏区域
  private gameWidth: number = 0;
  private gameHeight: number = 0;
  private gameOffsetX: number = 0;
  private gameOffsetY: number = 100;

  // 图片资源
  private fruitImages: Map<number, HTMLImageElement> = new Map();
  private imagesLoaded: boolean = false;

  // UI
  private backBtn = { x: 20, y: 20, width: 100, height: 50 };

  constructor() {
    this.physics = new SimplePhysics();
  }

  init(): void {
    this.canvas = wx.createCanvas();
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.canvas.width = windowWidth;
    this.canvas.height = windowHeight;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    // 设置游戏区域（留出顶部空间）
    this.gameWidth = windowWidth - 40;
    this.gameHeight = windowHeight - 200;
    this.gameOffsetX = 20;
    this.gameOffsetY = 120;

    // 加载图片资源
    this.loadImages();
  }

  private loadImages(): void {
    const imagesToLoad = 11;
    let loadedCount = 0;

    for (let i = 1; i <= imagesToLoad; i++) {
      const img = wx.createImage();
      img.src = `assets/合成大西瓜/img/fruit_${i}.png`;
      
      img.onload = () => {
        loadedCount++;
        if (loadedCount === imagesToLoad) {
          this.imagesLoaded = true;
          console.log('[合成大西瓜] 所有图片加载完成');
        }
      };
      
      img.onerror = () => {
        console.warn(`[合成大西瓜] 图片加载失败: fruit_${i}.png`);
        loadedCount++;
        if (loadedCount === imagesToLoad) {
          this.imagesLoaded = true;
        }
      };
      
      this.fruitImages.set(i, img);
    }
  }

  enter(data?: any): void {
    console.log('[合成大西瓜] 游戏开始');
    this.isRunning = true;
    this.gameOver = false;
    this.score = 0;
    this.fruitCount = 0;
    this.physics.fruits = [];
    
    // 生成第一个水果
    this.initOneFruit(1);
  }

  exit(): void {
    console.log('[合成大西瓜] 游戏退出');
    this.isRunning = false;
    this.physics.fruits = [];
    this.currentFruit = null;
  }

  private initOneFruit(type: number = 1): void {
    this.fruitCount++;
    const x = this.gameOffsetX + this.gameWidth / 2;
    const y = this.gameOffsetY + 50;
    
    this.currentFruit = new Fruit(x, y, type);
    this.currentFruit.isStatic = true;
    this.currentFruit.image = this.fruitImages.get(type) || null;
  }

  private getNextFruitType(): number {
    if (this.fruitCount < 3) {
      return 1;
    } else if (this.fruitCount === 3) {
      return 2;
    } else {
      // 随机返回前5个
      return Math.floor(Math.random() * 5) + 1;
    }
  }

  private dropFruit(): void {
    if (!this.currentFruit || this.isCreating) return;
    
    this.isCreating = true;
    this.currentFruit.isStatic = false;
    this.physics.addFruit(this.currentFruit);
    this.currentFruit = null;

    // 1秒后生成新水果
    setTimeout(() => {
      const nextType = this.getNextFruitType();
      this.initOneFruit(nextType);
      this.isCreating = false;
    }, 1000);
  }

  private checkMerge(): void {
    const fruits = this.physics.fruits;
    
    for (let i = 0; i < fruits.length; i++) {
      if (fruits[i].toRemove) continue;
      
      for (let j = i + 1; j < fruits.length; j++) {
        if (fruits[j].toRemove) continue;
        
        const fruitA = fruits[i];
        const fruitB = fruits[j];
        
        // 相同类型且碰撞
        if (fruitA.type === fruitB.type && this.physics.isColliding(fruitA, fruitB)) {
          // 标记删除
          fruitA.toRemove = true;
          fruitB.toRemove = true;
          
          // 计算分数
          this.score += fruitA.type * 10;
          
          // 生成新水果
          if (fruitA.type < 11) {
            const newX = (fruitA.x + fruitB.x) / 2;
            const newY = (fruitA.y + fruitB.y) / 2;
            const newFruit = new Fruit(newX, newY, fruitA.type + 1);
            newFruit.image = this.fruitImages.get(fruitA.type + 1) || null;
            this.physics.addFruit(newFruit);
            
            // 播放音效（如果需要）
            // this.playMergeSound();
          } else {
            // 合成最大西瓜
            this.score += 1000;
          }
        }
      }
    }
    
    // 移除标记的水果
    this.physics.fruits = this.physics.fruits.filter(f => !f.toRemove);
  }

  private checkBounds(): void {
    const minX = this.gameOffsetX + 20;
    const maxX = this.gameOffsetX + this.gameWidth - 20;
    const maxY = this.gameOffsetY + this.gameHeight - 20;
    
    this.physics.fruits.forEach(fruit => {
      // 左右边界
      if (fruit.x - fruit.radius < minX) {
        fruit.x = minX + fruit.radius;
        fruit.velocityX = Math.abs(fruit.velocityX) * 0.5;
      }
      if (fruit.x + fruit.radius > maxX) {
        fruit.x = maxX - fruit.radius;
        fruit.velocityX = -Math.abs(fruit.velocityX) * 0.5;
      }
      
      // 底部边界
      if (fruit.y + fruit.radius > maxY) {
        fruit.y = maxY - fruit.radius;
        fruit.velocityY = -Math.abs(fruit.velocityY) * 0.3;
        fruit.velocityX *= 0.9;
      }
      
      // 检查游戏结束（水果超出顶部）
      if (fruit.y - fruit.radius < this.gameOffsetY - 20) {
        this.gameOver = true;
      }
    });
  }

  update(deltaTime: number): void {
    if (!this.isRunning || this.gameOver) return;

    // 更新物理
    this.physics.update();
    
    // 检查合成
    this.checkMerge();
    
    // 检查边界
    this.checkBounds();
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isRunning) return;

    // 背景
    ctx.fillStyle = '#FFF8DC';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制游戏区域
    this.drawGameArea(ctx);

    // 绘制分数
    this.drawScore(ctx);

    // 绘制所有水果
    this.physics.fruits.forEach(fruit => fruit.draw(ctx));

    // 绘制当前水果
    if (this.currentFruit) {
      this.currentFruit.draw(ctx);
    }

    // 绘制UI
    this.drawUI(ctx);

    // 游戏结束提示
    if (this.gameOver) {
      this.drawGameOver(ctx);
    }
  }

  private drawGameArea(ctx: CanvasRenderingContext2D): void {
    // 游戏区域背景
    ctx.fillStyle = '#FFF';
    ctx.fillRect(
      this.gameOffsetX,
      this.gameOffsetY,
      this.gameWidth,
      this.gameHeight
    );

    // 边框
    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      this.gameOffsetX,
      this.gameOffsetY,
      this.gameWidth,
      this.gameHeight
    );

    // 危险线
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(this.gameOffsetX, this.gameOffsetY + 30);
    ctx.lineTo(this.gameOffsetX + this.gameWidth, this.gameOffsetY + 30);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawScore(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`分数: ${this.score}`, this.canvas.width / 2, 80);
  }

  private drawUI(ctx: CanvasRenderingContext2D): void {
    // 返回按钮
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(this.backBtn.x, this.backBtn.y, this.backBtn.width, this.backBtn.height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.backBtn.x, this.backBtn.y, this.backBtn.width, this.backBtn.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('返回', this.backBtn.x + this.backBtn.width / 2, this.backBtn.y + this.backBtn.height / 2);
  }

  private drawGameOver(ctx: CanvasRenderingContext2D): void {
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 游戏结束文字
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 50);

    ctx.font = 'bold 32px Arial';
    ctx.fillText(`最终分数: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);

    // 重新开始按钮
    const btnWidth = 200;
    const btnHeight = 60;
    const btnX = (this.canvas.width - btnWidth) / 2;
    const btnY = this.canvas.height / 2 + 80;

    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('重新开始', this.canvas.width / 2, btnY + btnHeight / 2);
  }

  onTouchStart(x: number, y: number): void {
    // 返回按钮
    if (x >= this.backBtn.x && x <= this.backBtn.x + this.backBtn.width &&
        y >= this.backBtn.y && y <= this.backBtn.y + this.backBtn.height) {
      this.sceneManager.switchTo('menu');
      return;
    }

    // 游戏结束，重新开始
    if (this.gameOver) {
      this.enter();
      return;
    }

    // 移动当前水果
    if (this.currentFruit && !this.isCreating) {
      const minX = this.gameOffsetX + this.currentFruit.radius;
      const maxX = this.gameOffsetX + this.gameWidth - this.currentFruit.radius;
      this.currentFruit.x = Math.max(minX, Math.min(maxX, x));
    }
  }

  onTouchMove(x: number, y: number): void {
    // 拖动当前水果
    if (this.currentFruit && !this.isCreating && !this.gameOver) {
      const minX = this.gameOffsetX + this.currentFruit.radius;
      const maxX = this.gameOffsetX + this.gameWidth - this.currentFruit.radius;
      this.currentFruit.x = Math.max(minX, Math.min(maxX, x));
    }
  }

  onTouchEnd(x: number, y: number): void {
    // 松开手指，释放水果
    if (this.currentFruit && !this.isCreating && !this.gameOver) {
      // 检查是否在游戏区域内点击
      if (y > this.gameOffsetY) {
        this.dropFruit();
      }
    }
  }

  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
  }

  setSceneManager(manager: any): void {
    this.sceneManager = manager;
  }
}

