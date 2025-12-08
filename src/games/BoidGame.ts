import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';

// ============================================================================
// 以下代码直接来自 wx-mini-game-demo/canvas-compute/
// Vector3D.js + Boid.js + guimark3.js 的完整代码
// 只做最小的适配修改
// ============================================================================

// Vector3D 类（完整原代码）
class Vector3D {
  x: number;
  y: number;
  z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static distance(vector1: Vector3D, vector2: Vector3D): number {
    const xdiff = vector1.x - vector2.x;
    const ydiff = vector1.y - vector2.y;
    const zdiff = vector1.z - vector2.z;
    return Math.sqrt((xdiff * xdiff) + (ydiff * ydiff) + (zdiff * zdiff));
  }

  length(): number {
    return Math.sqrt((this.x * this.x) + (this.y * this.y) + (this.z * this.z));
  }

  lengthSquared(): number {
    return (this.x * this.x) + (this.y * this.y) + (this.z * this.z);
  }

  normalize(): number {
    const len = this.length();
    this.x /= len;
    this.y /= len;
    this.z /= len;
    return len;
  }

  incrementBy(vector3d: Vector3D): void {
    this.x += vector3d.x;
    this.y += vector3d.y;
    this.z += vector3d.z;
  }

  decrementBy(vector3d: Vector3D): void {
    this.x -= vector3d.x;
    this.y -= vector3d.y;
    this.z -= vector3d.z;
  }

  scaleBy(scalar: number): void {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
  }

  negate(): void {
    this.x *= -1;
    this.y *= -1;
    this.z *= -1;
  }

  equals(vector3d: Vector3D): boolean {
    return this.x === vector3d.x && this.y === vector3d.y && this.z === vector3d.z;
  }

  clone(): Vector3D {
    return new Vector3D(this.x, this.y, this.z);
  }

  add(vector3d: Vector3D): Vector3D {
    return new Vector3D(this.x + vector3d.x, this.y + vector3d.y, this.z + vector3d.z);
  }

  subtract(vector3d: Vector3D): Vector3D {
    return new Vector3D(this.x - vector3d.x, this.y - vector3d.y, this.z - vector3d.z);
  }

  fastSubtract(vector3d: Vector3D, toCache: Vector3D): void {
    toCache.x = this.x - vector3d.x;
    toCache.y = this.y - vector3d.y;
    toCache.z = this.z - vector3d.z;
  }
}

// Boid 类（完整原代码）
class Boid {
  static EDGE_BOUNCE = 1;
  static EDGE_WRAP = 2;
  static EDGE_NONE = 0;
  static ZERO = new Vector3D(0, 0, 0);

  color: string = '';
  maxForce: number;
  maxForceSQ: number;
  maxSpeed: number;
  maxSpeedSQ: number;
  edgeBehavior: number;

  boundsCentre: Vector3D = new Vector3D();
  boundsRadius: number = 0;
  radius: number = 10.0;
  wanderTheta: number = 0.0;
  wanderPhi: number = 0.0;
  wanderPsi: number = 0.0;
  wanderRadius: number = 16.0;
  wanderDistance: number = 60.0;
  wanderStep: number = 0.25;
  lookAtTarget: boolean = true;

  velocity: Vector3D = new Vector3D();
  position: Vector3D = new Vector3D();
  oldPosition: Vector3D = new Vector3D();
  acceleration: Vector3D = new Vector3D();
  steeringForce: Vector3D = new Vector3D();
  distance: number = 0;

  constructor(maxForce: number = 1, maxSpeed: number = 10, edgeBehavior: number = Boid.EDGE_NONE) {
    this.maxForce = maxForce;
    this.maxForceSQ = this.maxForce * this.maxForce;
    this.maxSpeed = maxSpeed;
    this.maxSpeedSQ = this.maxSpeed * this.maxSpeed;
    this.edgeBehavior = edgeBehavior;
  }

  reset(): void {
    this.velocity = new Vector3D();
    this.position = new Vector3D();
    this.oldPosition = new Vector3D();
    this.acceleration = new Vector3D();
    this.steeringForce = new Vector3D();
  }

  wander(multiplier: number = 1): void {
    this.wanderTheta += -this.wanderStep + Math.random() * this.wanderStep * 2;
    this.wanderPhi += -this.wanderStep + Math.random() * this.wanderStep * 2;
    this.wanderPsi += -this.wanderStep + Math.random() * this.wanderStep * 2;

    if (Math.random() < 0.5) {
      this.wanderTheta = -this.wanderTheta;
    }

    const pos = this.velocity.clone();
    pos.normalize();
    pos.scaleBy(this.wanderDistance);
    pos.incrementBy(this.position);

    const offset = new Vector3D();
    offset.x = this.wanderRadius * Math.cos(this.wanderTheta);
    offset.y = this.wanderRadius * Math.sin(this.wanderPhi);
    offset.z = this.wanderRadius * Math.cos(this.wanderPsi);

    this.steeringForce = this.steer(pos.add(offset));

    if (multiplier !== 1.0) {
      this.steeringForce.scaleBy(multiplier);
    }

    this.acceleration.incrementBy(this.steeringForce);
  }

  seek(target: Vector3D, multiplier: number = 1): void {
    this.steeringForce = this.steer(target);
    if (multiplier !== 1) {
      this.steeringForce.scaleBy(multiplier);
    }
    this.acceleration.incrementBy(this.steeringForce);
  }

  flock(
    boids: Boid[],
    separationWeight: number = 0.5,
    alignmentWeight: number = 0.1,
    cohesionWeight: number = 0.2,
    separationDistance: number = 100,
    alignmentDistance: number = 200,
    cohesionDistance: number = 200
  ): void {
    this.separate(boids, separationDistance, separationWeight);
    this.align(boids, alignmentDistance, alignmentWeight);
    this.cohesion(boids, cohesionDistance, cohesionWeight);
  }

  separate(boids: Boid[], separationDistance: number, multiplier: number = 1): void {
    this.steeringForce = this.getSeparation(boids, separationDistance);
    if (multiplier !== 1.0) {
      this.steeringForce.scaleBy(multiplier);
    }
    this.acceleration.incrementBy(this.steeringForce);
  }

  align(boids: Boid[], neighborDistance: number, multiplier: number = 1): void {
    this.steeringForce = this.getAlignment(boids, neighborDistance);
    if (multiplier !== 1.0) {
      this.steeringForce.scaleBy(multiplier);
    }
    this.acceleration.incrementBy(this.steeringForce);
  }

  cohesion(boids: Boid[], neighborDistance: number, multiplier: number = 1): void {
    this.steeringForce = this.getCohesion(boids, neighborDistance);
    if (multiplier !== 1.0) {
      this.steeringForce.scaleBy(multiplier);
    }
    this.acceleration.incrementBy(this.steeringForce);
  }

  update(): void {
    this.oldPosition.x = this.position.x;
    this.oldPosition.y = this.position.y;
    this.oldPosition.z = this.position.z;

    this.velocity.incrementBy(this.acceleration);

    if (this.velocity.lengthSquared() > this.maxSpeedSQ) {
      this.velocity.normalize();
      this.velocity.scaleBy(this.maxSpeed);
    }

    this.position.incrementBy(this.velocity);

    this.acceleration.x = 0;
    this.acceleration.y = 0;
    this.acceleration.z = 0;

    if (!this.position.equals(this.oldPosition)) {
      const distance = Vector3D.distance(this.position, this.boundsCentre);

      if (distance > this.boundsRadius + this.radius) {
        if (this.edgeBehavior === Boid.EDGE_BOUNCE) {
          this.position.decrementBy(this.boundsCentre);
          this.position.normalize();
          this.position.scaleBy(this.boundsRadius + this.radius);

          this.velocity.scaleBy(-1);
          this.position.incrementBy(this.velocity);
          this.position.incrementBy(this.boundsCentre);
        } else {
          this.position.decrementBy(this.boundsCentre);
          this.position.negate();
          this.position.incrementBy(this.boundsCentre);
        }
      }
    }
  }

  private steer(target: Vector3D, ease: boolean = false, easeDistance: number = 100): Vector3D {
    this.steeringForce = target.clone();
    this.steeringForce.decrementBy(this.position);

    this.distance = this.steeringForce.normalize();

    if (this.distance > 0.00001) {
      if (this.distance < easeDistance && ease) {
        this.steeringForce.scaleBy(this.maxSpeed * (this.distance / easeDistance));
      } else {
        this.steeringForce.scaleBy(this.maxSpeed);
      }

      this.steeringForce.decrementBy(this.velocity);
      if (this.steeringForce.lengthSquared() > this.maxForceSQ) {
        this.steeringForce.normalize();
        this.steeringForce.scaleBy(this.maxForce);
      }
    }
    return this.steeringForce;
  }

  private getSeparation(boids: Boid[], separation: number): Vector3D {
    const force = new Vector3D();
    const difference = new Vector3D();
    let count = 0;

    for (let i = 0; i < boids.length; i++) {
      const boid = boids[i];
      const distance = Vector3D.distance(this.position, boid.position);

      if (distance > 0 && distance < separation) {
        this.position.fastSubtract(boid.position, difference);
        difference.normalize();
        difference.scaleBy(1 / distance);

        force.incrementBy(difference);
        count++;
      }
    }

    if (count > 0) {
      force.scaleBy(1 / count);
    }

    return force;
  }

  private getAlignment(boids: Boid[], neighborDistance: number): Vector3D {
    const force = new Vector3D();
    let count = 0;

    for (let i = 0; i < boids.length; i++) {
      const boid = boids[i];
      const distance = Vector3D.distance(this.position, boid.position);

      if (distance > 0 && distance < neighborDistance) {
        force.incrementBy(boid.velocity);
        count++;
      }
    }

    if (count > 0) {
      force.scaleBy(1 / count);

      if (force.lengthSquared() > this.maxForceSQ) {
        force.normalize();
        force.scaleBy(this.maxForce);
      }
    }

    return force;
  }

  private getCohesion(boids: Boid[], neighborDistance: number): Vector3D {
    const force = new Vector3D();
    let count = 0;

    for (let i = 0; i < boids.length; i++) {
      const boid = boids[i];
      const distance = Vector3D.distance(this.position, boid.position);

      if (distance > 0 && distance < neighborDistance) {
        force.incrementBy(boid.position);
        count++;
      }
    }

    if (count > 0) {
      force.scaleBy(1 / count);
      return this.steer(force);
    }

    return force;
  }
}

// 简单的 FPS 计数器
class SimpleFPSMeter {
  private lastTime: number = Date.now();
  private frameCount: number = 0;
  private frames: number = 0;
  private fps: number = 60;

  update(): { framerate: number; frames: number } {
    const now = Date.now();
    this.frameCount++;
    this.frames++;
    
    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      const result = { framerate: this.fps, frames: this.frames };
      this.frames = 0;
      this.lastTime = now;
      return result;
    }
    
    return { framerate: 0, frames: 0 };
  }
}

// ============================================================================
// Boid Game - 主游戏类（Scene 包装）
// ============================================================================

export class BoidGame implements Scene {
  name: string = 'boidgame';
  canvas: WechatMinigame.Canvas;
  ctx: CanvasRenderingContext2D;
  private gameBridge: GameBridge | null = null;
  private sceneManager: any = null;

  // 游戏变量（直接来自原代码）
  private STAGE = { width: 1080, height: 1920 };
  private meter: SimpleFPSMeter = new SimpleFPSMeter();
  private drawCount: number = 0;
  private config = {
    minForce: 3,
    maxForce: 6,
    minSpeed: 6,
    maxSpeed: 12,
    minWanderDistance: 10,
    maxWanderDistance: 100,
    minWanderRadius: 5,
    maxWanderRadius: 20,
    minWanderStep: 0.1,
    maxWanderStep: 0.9,
    numBoids: 300 // 减少数量以提高性能
  };
  private drawEnabled: boolean = true;
  private boids: Boid[] = [];
  private isRunning: boolean = false;

  // UI
  private backBtn = { x: 20, y: 60, width: 100, height: 50 };

  init(): void {
    this.canvas = wx.createCanvas();
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.canvas.width = windowWidth;
    this.canvas.height = windowHeight;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    this.STAGE.width = this.canvas.width;
    this.STAGE.height = this.canvas.height;
  }

  enter(data?: any): void {
    this.isRunning = true;
    this.createBoids();
    console.log('[BoidGame] Game started with ' + this.config.numBoids + ' boids');
  }

  exit(): void {
    this.isRunning = false;
    this.boids = [];
  }

  // ========================================================================
  // 以下是原游戏的完整代码（最小修改）
  // ========================================================================

  private createBoids(): void {
    const random = (min: number, max: number) => Math.random() * (max - min) + min;

    for (let i = 0; i < this.config.numBoids; i++) {
      const boid = new Boid();
      boid.color = `rgb(${Math.floor(random(100, 255))},${Math.floor(random(100, 255))},${Math.floor(random(100, 255))})`;
      boid.edgeBehavior = Boid.EDGE_BOUNCE;
      boid.maxForce = random(this.config.minForce, this.config.maxForce);
      boid.maxForceSQ = boid.maxForce * boid.maxForce;
      boid.maxSpeed = random(this.config.minSpeed, this.config.maxSpeed);
      boid.maxSpeedSQ = boid.maxSpeed * boid.maxSpeed;
      boid.wanderDistance = random(this.config.minWanderDistance, this.config.maxWanderDistance);
      boid.wanderRadius = random(this.config.minWanderRadius, this.config.maxWanderRadius);
      boid.wanderStep = random(this.config.minWanderStep, this.config.maxWanderStep);
      boid.boundsRadius = this.STAGE.width / 2;
      boid.boundsCentre = new Vector3D(this.STAGE.width / 2, this.STAGE.height / 2, 0.0);
      boid.radius = 16;

      // 设置初始位置和速度
      boid.position.x = boid.boundsCentre.x + random(-100, 100);
      boid.position.y = boid.boundsCentre.y + random(-100, 100);
      boid.position.z = random(-100, 100);
      const vel = new Vector3D(random(-2, 2), random(-2, 2), random(-2, 2));
      boid.velocity.incrementBy(vel);

      this.boids.push(boid);
    }
  }

  update(deltaTime: number): void {
    if (!this.isRunning) return;

    // 更新所有 boid
    for (let i = 0; i < this.boids.length; i++) {
      const boid = this.boids[i];
      boid.wander(0.3);
      // 添加轻微的中心吸引力以保持在屏幕上
      boid.seek(boid.boundsCentre, 0.1);
      // 群集行为
      boid.flock(this.boids);
      boid.update();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isRunning) return;

    // 绘制背景
    ctx.fillStyle = 'rgb(50,50,50)';
    ctx.fillRect(0, 0, this.STAGE.width, this.STAGE.height);

    // 绘制所有 boid（轨迹线）
    if (this.drawEnabled) {
      for (let i = 0; i < this.boids.length; i++) {
        const boid = this.boids[i];
        ctx.strokeStyle = boid.color;
        ctx.beginPath();
        ctx.moveTo(boid.oldPosition.x, boid.oldPosition.y);
        ctx.lineTo(boid.position.x, boid.position.y);
        ctx.closePath();
        ctx.stroke();
        this.drawCount++;
      }
    }

    // 绘制 UI
    this.drawUI(ctx);

    // FPS 统计
    const result = this.meter.update();
    if (result.framerate > 0) {
      const framedrawcount = Math.floor(this.drawCount / result.frames);
      this.drawCount = 0;

      ctx.fillStyle = '#fff';
      ctx.font = '18px Arial';
      ctx.fillText(`FPS: ${result.framerate} | Boids: ${this.boids.length} | Draw: ${framedrawcount}`, 10, 30);
    }
  }

  private drawUI(ctx: CanvasRenderingContext2D): void {
    // 返回按钮
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(this.backBtn.x, this.backBtn.y, this.backBtn.width, this.backBtn.height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.backBtn.x, this.backBtn.y, this.backBtn.width, this.backBtn.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('返回', this.backBtn.x + this.backBtn.width / 2, this.backBtn.y + this.backBtn.height / 2);
  }

  onTouchStart(x: number, y: number): void {
    // 返回按钮
    if (x >= this.backBtn.x && x <= this.backBtn.x + this.backBtn.width &&
        y >= this.backBtn.y && y <= this.backBtn.y + this.backBtn.height) {
      this.sceneManager.switchTo('menu');
    }
  }

  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
  }

  setSceneManager(manager: any): void {
    this.sceneManager = manager;
  }
}

