/**
 * 合成大西瓜游戏
 * 参考原 Cocos Creator 项目逻辑
 * 使用纯 JavaScript + Canvas 实现
 */
import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';

// 简化的物理引擎 - 用于水果碰撞和下落
// 简化的物理引擎 - 用于水果碰撞和下落
class SimplePhysics {
  gravity: number = 0.5;
  friction: number = 0.99;
  restitution: number = 0.2; // 弹性系数
  iterations: number = 8;    // 迭代次数，越高越稳定
  fruits: Fruit[] = [];

  // 边界
  minX: number = 0;
  maxX: number = 0;
  floorY: number = 0;

  setBounds(minX: number, maxX: number, floorY: number) {
    this.minX = minX;
    this.maxX = maxX;
    this.floorY = floorY;
  }

  update() {
    // 1. 应用重力和外部力
    this.fruits.forEach(fruit => {
      fruit.updateAnimation(); // 更新缩放动画
      if (!fruit.isStatic) {
        fruit.velocityY += this.gravity;

        // 简单的空气阻力
        fruit.velocityX *= this.friction;
        fruit.velocityY *= this.friction;

        // 预测位置更新 (Verlet Integration思想)
        fruit.x += fruit.velocityX;
        fruit.y += fruit.velocityY;
      }
    });

    // 2. 迭代解决约束 (碰撞和边界)
    // 多次迭代可以显著减少重叠和抖动
    for (let k = 0; k < this.iterations; k++) {
      this.solveConstraints();
    }
  }

  private solveConstraints() {
    const fruitCount = this.fruits.length;

    // A. 边界约束
    for (let i = 0; i < fruitCount; i++) {
      const fruit = this.fruits[i];
      if (fruit.isStatic) continue;

      // 左右墙壁
      if (fruit.x - fruit.radius < this.minX) {
        const penetration = this.minX - (fruit.x - fruit.radius);
        fruit.x += penetration;
        fruit.velocityX = Math.abs(fruit.velocityX) * 0.5; // 反弹+阻尼
      } else if (fruit.x + fruit.radius > this.maxX) {
        const penetration = (fruit.x + fruit.radius) - this.maxX;
        fruit.x -= penetration;
        fruit.velocityX = -Math.abs(fruit.velocityX) * 0.5;
      }

      // 地面
      if (fruit.y + fruit.radius > this.floorY) {
        const penetration = (fruit.y + fruit.radius) - this.floorY;
        fruit.y -= penetration;
        fruit.velocityY = -Math.abs(fruit.velocityY) * 0.3; // 吸收大部分能量
        fruit.velocityX *= 0.9; // 地面摩擦
      }
    }

    // B. 水果之间碰撞
    for (let i = 0; i < fruitCount; i++) {
      for (let j = i + 1; j < fruitCount; j++) {
        const a = this.fruits[i];
        const b = this.fruits[j];

        // 如果是同类合并的，不在这里处理物理碰撞（或者让逻辑层移除它）
        // 这里主要处理物理排斥

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        const radiusSum = a.radius + b.radius;

        if (distSq < radiusSum * radiusSum && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const penetration = radiusSum - dist;

          // 避免除以0
          if (dist === 0) continue;

          const nx = dx / dist;
          const ny = dy / dist;

          // 位置修正 (Position Correction)
          // 根据质量反比分配修正量 (此处假设质量与半径成正比，或者简单均分)
          const percent = 0.8; // 修正百分比，避免过于强硬的修正导致抖动
          const correction = penetration * percent;

          // 简单的质量假设：静态物体质量无限大
          if (a.isStatic) {
            if (!b.isStatic) {
              b.x -= nx * correction;
              b.y -= ny * correction;
            }
          } else if (b.isStatic) {
            if (!a.isStatic) {
              a.x += nx * correction;
              a.y += ny * correction;
            }
          } else {
            // 均分修正
            const half = correction * 0.5;
            a.x += nx * half;
            a.y += ny * half;
            b.x -= nx * half;
            b.y -= ny * half;

            // 速度冲量 (Velocity Impulse)
            // 计算相对速度
            const rvx = a.velocityX - b.velocityX;
            const rvy = a.velocityY - b.velocityY;

            // 在法线方向上的速度分量
            const velAlongNormal = rvx * nx + rvy * ny;

            // 如果已经在分离，则不处理
            if (velAlongNormal > 0) continue;

            // 计算冲量
            let jImpulse = -(1 + this.restitution) * velAlongNormal;
            jImpulse /= 2; // 假设质量相等 1/m + 1/m = 2

            const impulseX = jImpulse * nx;
            const impulseY = jImpulse * ny;

            a.velocityX += impulseX;
            a.velocityY += impulseY;
            b.velocityX -= impulseX;
            b.velocityY -= impulseY;
          }
        }
      }
    }
  }

  isColliding(a: Fruit, b: Fruit): boolean {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    // 使用平方距离稍微优化性能
    const distSq = dx * dx + dy * dy;
    const radiusSum = a.radius + b.radius;
    return distSq < radiusSum * radiusSum;
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

// 粒子效果
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number = 1.0;
  size: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = Math.random() * 3 + 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.2; // 重力
    this.life -= 0.02;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

// 漂浮文字
class FloatingText {
  x: number;
  y: number;
  text: string;
  life: number = 1.0;
  vY: number = -2;

  constructor(x: number, y: number, text: string) {
    this.x = x;
    this.y = y;
    this.text = text;
  }

  update() {
    this.y += this.vY;
    this.life -= 0.02;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = '#FFD700'; // 金色
    ctx.font = 'bold 24px Arial';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1.0;
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

  // 动画属性
  scale: number = 0;
  targetScale: number = 1;

  constructor(x: number, y: number, type: number) {
    this.x = x;
    this.y = y;
    this.type = type;
    // 根据类型设置半径
    // Type 1 (Grape): 15
    // Type 2 (Old 1): 20 + 5 = 25? 
    // Old logic: 20 + type*5. Type 1 was 25.
    // New logic: 
    // Type 1: 15
    // Type 2: 25
    // Type 3: 30...
    if (type === 1) {
      this.radius = 15;
    } else {
      // Shift remaining to match old sizes approx
      // Old Type 1 (now 2) was 25.
      // So: 20 + (type-1)*5?
      // Type 2: 20 + 5 = 25. Correct.
      this.radius = 20 + (type - 1) * 5;
    }
  }

  updateAnimation() {
    if (this.scale < this.targetScale) {
      this.scale += (this.targetScale - this.scale) * 0.2;
      if (Math.abs(this.targetScale - this.scale) < 0.01) {
        this.scale = this.targetScale;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    // 只有非静态（刚生成或合成）的水果才可能有缩放动画
    // 为了简单，我们让所有水果都支持缩放，新生成的从0开始
    ctx.scale(this.scale, this.scale);

    // 检查图片完整性 (grape.png might likely fail)
    if (this.image && this.image.complete && this.image.width > 0) {
      const size = this.radius * 2;
      ctx.drawImage(
        this.image,
        -this.radius,
        -this.radius,
        size,
        size
      );
    } else {
      // 备用绘制 (Code draw)
      ctx.fillStyle = this.getColor();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // 给备用绘制加一点高光让它看起来像水果
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  getColor(): string {
    const colors = [
      '#800080', // Type 1: Purple (Grape)
      '#FFC0CB', // Type 2 (Old 1)
      '#FFB6C1',
      '#FF69B4',
      '#FF1493',
      '#DB7093',
      '#C71585',
      '#FF0000',
      '#FF4500',
      '#FF6347',
      '#FF7F50',
      '#FFA500'  // Type 12 (Big Melon) - Old 11
    ];
    return colors[this.type - 1] || '#FFA500';
  }
}

export class WatermelonGame implements Scene {
  name: string = 'watermelon';
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

  // 视觉效果
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];

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

    // 设置物理边界
    this.physics.setBounds(
      this.gameOffsetX + 20,
      this.gameOffsetX + this.gameWidth - 20,
      this.gameOffsetY + this.gameHeight - 20
    );

    // 加载图片资源
    this.loadImages();
  }

  private loadImages(): void {
    // fruit_1 to fruit_11 become Type 2 to Type 12
    // We skip loading 'grape.png' because it doesn't exist, preventing ENOENT errors.
    const fruits = [
      'fruit_1.png', 'fruit_2.png', 'fruit_3.png', 'fruit_4.png',
      'fruit_5.png', 'fruit_6.png', 'fruit_7.png', 'fruit_8.png',
      'fruit_9.png', 'fruit_10.png', 'fruit_11.png'
    ];

    let loadedCount = 0;
    const total = fruits.length;

    for (let i = 0; i < total; i++) {
      const fruitFileName = fruits[i];
      // Type 1 is Grape (No Image), so existing images start from Type 2
      const fruitType = i + 2;
      const img = wx.createImage();

      img.src = `assets/watermelon/img/${fruitFileName}`;

      img.onload = () => {
        loadedCount++;
        if (loadedCount === total) {
          this.imagesLoaded = true;
          console.log('[合成大西瓜] 所有图片加载完成');
        }
      };

      img.onerror = () => {
        loadedCount++;
        if (loadedCount === total) {
          this.imagesLoaded = true;
        }
      };

      this.fruitImages.set(fruitType, img);
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
    this.currentFruit.scale = 0; // 从0开始
    this.currentFruit.targetScale = 1;
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
          const point = fruitA.type * 10;
          this.score += point;

          // 生成新水果
          const newX = (fruitA.x + fruitB.x) / 2;
          const newY = (fruitA.y + fruitB.y) / 2;

          // 视觉特效：爆炸 + 飘字
          this.createExplosion(newX, newY, fruitA.getColor());
          this.showFloatingText(newX, newY, `+${point}`);

          if (fruitA.type < 12) {
            const newFruit = new Fruit(newX, newY, fruitA.type + 1);
            newFruit.image = this.fruitImages.get(fruitA.type + 1) || null;
            // 继承一点速度让效果更自然
            newFruit.velocityX = (fruitA.velocityX + fruitB.velocityX) / 2;
            newFruit.velocityY = (fruitA.velocityY + fruitB.velocityY) / 2;
            this.physics.addFruit(newFruit);

            // 播放音效（如果需要）
            // this.playMergeSound();
          } else {
            // 合成最大西瓜
            this.score += 1000;
            this.showFloatingText(newX, newY, `BIG MELON! +1000`);
            this.createExplosion(newX, newY, '#FF0000');
          }
        }
      }
    }

    // 移除标记的水果
    this.physics.fruits = this.physics.fruits.filter(f => !f.toRemove);
  }

  // private checkBounds(): void { ... } (Removed logic moved to SimplePhysics)

  update(deltaTime: number): void {
    if (!this.isRunning || this.gameOver) return;

    // 更新物理
    this.physics.update();

    // 检查合成
    this.checkMerge();

    // 更新特效
    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => p.life > 0);

    this.floatingTexts.forEach(t => t.update());
    this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);

    // 更新当前水果动画
    if (this.currentFruit) {
      this.currentFruit.updateAnimation();
    }

    // 检查游戏结束（水果超出顶部且静止）
    // 给一点宽容度，只有当水果静止且在顶部线之上才结束
    // 这里简单检查: if any static fruit is above limit
    const limitY = this.gameOffsetY - 20;
    for (const fruit of this.physics.fruits) {
      if (!fruit.isStatic && Math.abs(fruit.velocityY) < 0.1 && fruit.y - fruit.radius < limitY) {
        // 还需要确认不是刚生成的
        if (fruit.y > 0) { // 简单防护
          this.gameOver = true;
          break;
        }
      }
    }
  }

  private createExplosion(x: number, y: number, color: string) {
    for (let i = 0; i < 15; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  private showFloatingText(x: number, y: number, text: string) {
    this.floatingTexts.push(new FloatingText(x, y, text));
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

    // 绘制特效
    this.particles.forEach(p => p.draw(ctx));
    this.floatingTexts.forEach(t => t.draw(ctx));

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

