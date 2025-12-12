import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';
import { Button } from '../ui/components/Button';
import { sniperPveConfig, Rect } from './sniperPve/config';
import { RoundState } from './sniperPve/gameplay/RoundState';
import { AimController } from './sniperPve/gameplay/AimController';
import { WallMask } from './sniperPve/gameplay/WallMask';
import { Hitboxes, Pose } from './sniperPve/gameplay/Hitboxes';
import { PveAI } from './sniperPve/gameplay/PveAI';
import { SniperRenderer } from './sniperPve/render/SniperRenderer';

export class SniperPveScene implements Scene {
    name: string = 'sniper_pve';
    private sceneManager: any;
    private gameBridge: GameBridge | null = null;

    private canvas: WechatMinigame.Canvas;
    private ctx: CanvasRenderingContext2D;
    private screenWidth: number = 0;
    private screenHeight: number = 0;

    private config = sniperPveConfig;
    private roundState = new RoundState(this.config);
    private wallRect: Rect;
    private aimController: AimController;
    private wallMask: WallMask;
    private hitboxes: Hitboxes;
    private ai: PveAI;
    private renderer: SniperRenderer;
    private currentPose: Pose | null = null;
    private showDebugPose: boolean = this.config.debug.showPose;

    private fireBtn: Button;
    private toggleDebugBtn: Button;
    private backBtn: Button;

    init(): void {
        const systemInfo = wx.getSystemInfoSync();
        this.screenWidth = systemInfo.windowWidth;
        this.screenHeight = systemInfo.windowHeight;

        this.canvas = wx.createCanvas();
        this.canvas.width = this.screenWidth;
        this.canvas.height = this.screenHeight;
        this.ctx = this.canvas.getContext('2d');

        this.wallRect = this.calculateWallRect();
        this.aimController = new AimController(this.config, this.wallRect);
        this.wallMask = new WallMask(this.config, this.wallRect);
        this.hitboxes = new Hitboxes(this.config, this.wallRect);
        this.ai = new PveAI(this.config, this.hitboxes);
        this.renderer = new SniperRenderer(this.config, {
            width: this.screenWidth,
            height: this.screenHeight
        });

        this.fireBtn = new Button('开火', this.screenWidth - 120, this.screenHeight - 90, 100, 44, 'primary');
        this.fireBtn.onClick = () => this.handleFire();

        this.toggleDebugBtn = new Button('调试', this.screenWidth - 120, this.config.wall.topOffset - 40, 100, 36, 'outline');
        this.toggleDebugBtn.onClick = () => {
            this.showDebugPose = !this.showDebugPose;
        };

        this.backBtn = new Button('返回主页', 20, this.screenHeight - 90, 120, 44, 'secondary');
        this.backBtn.onClick = () => this.sceneManager?.switchTo('menu');
    }

    enter(): void {
        this.startRound(true);
    }

    exit(): void {}

    update(deltaTime: number): void {
        const delta = deltaTime;
        const phaseCompleted = this.roundState.tick(delta);

        if (phaseCompleted) {
            this.advancePhase();
        }

        this.fireBtn.update(deltaTime);
        this.toggleDebugBtn.update(deltaTime);
        this.backBtn.update(deltaTime);
    }

    render(ctx: CanvasRenderingContext2D): void {
        this.renderer.render({
            ctx,
            wallRect: this.wallRect,
            holes: this.wallMask.getHoles(),
            aimPosition: this.aimController.getPosition(),
            pose: this.currentPose,
            roundState: this.roundState,
            showDebugPose: this.showDebugPose
        });

        this.fireBtn.render(ctx);
        this.toggleDebugBtn.render(ctx);
        this.backBtn.render(ctx);
    }

    onTouchStart(x: number, y: number): void {
        if (this.fireBtn.handleTouchStart(x, y)) return;
        if (this.toggleDebugBtn.handleTouchStart(x, y)) return;
        if (this.backBtn.handleTouchStart(x, y)) return;
        this.aimController.onPointerDown(x, y);
    }

    onTouchMove(x: number, y: number): void {
        this.aimController.onPointerMove(x, y);
    }

    onTouchEnd(x: number, y: number): void {
        if (this.fireBtn.handleTouchEnd(x, y)) return;
        if (this.toggleDebugBtn.handleTouchEnd(x, y)) return;
        if (this.backBtn.handleTouchEnd(x, y)) return;
        this.aimController.onPointerUp();
    }

    setSceneManager(manager: any): void {
        this.sceneManager = manager;
    }

    setGameBridge(bridge: GameBridge): void {
        this.gameBridge = bridge;
    }

    private calculateWallRect(): Rect {
        const padding = this.config.wall.padding;
        const maxWidth = this.screenWidth - padding * 2;
        let wallWidth = maxWidth;
        let wallHeight = wallWidth * this.config.wall.aspectRatio;

        if (wallHeight > this.screenHeight * 0.6) {
            wallHeight = this.screenHeight * 0.6;
            wallWidth = wallHeight / this.config.wall.aspectRatio;
        }

        return {
            x: (this.screenWidth - wallWidth) / 2,
            y: this.config.wall.topOffset,
            width: wallWidth,
            height: wallHeight
        };
    }

    private startRound(isInitial: boolean = false) {
        this.roundState.resetForNewRound(isInitial);
        this.currentPose = this.ai.pickPose(this.wallRect, this.wallMask);
        this.aimController.snapTo(this.wallRect.x + this.wallRect.width / 2, this.wallRect.y + this.wallRect.height / 2);
        this.roundState.message = 'AI 正在躲藏';
        this.roundState.setPhase('intro', this.config.phaseDurations.roundIntro);
    }

    private advancePhase() {
        switch (this.roundState.phase) {
            case 'intro':
                this.roundState.message = '拖动准星瞄准';
                this.roundState.setPhase('aiming', 0);
                break;
            case 'resolve':
                if (this.roundState.lastResult === 'head' || this.roundState.lastResult === 'body' || this.roundState.shotsLeft === 0) {
                    this.roundState.setPhase('end', this.config.phaseDurations.roundEnd);
                } else {
                    this.roundState.message = '继续射击';
                    this.roundState.setPhase('aiming', 0);
                }
                break;
            case 'end':
                this.startRound();
                break;
            default:
                break;
        }
    }

    private handleFire() {
        if (this.roundState.phase !== 'aiming' || !this.currentPose) return;

        const target = this.aimController.getPosition();
        this.wallMask.addHole(target.x, target.y, this.config.hole.radius);
        const hit = this.hitboxes.hitTest(this.currentPose, target.x, target.y);

        this.roundState.consumeShot();
        this.roundState.lastResult = hit;

        if (hit === 'head') {
            this.roundState.message = '爆头！完美击杀';
            this.roundState.setPhase('resolve', this.config.phaseDurations.shotResolve);
        } else if (hit === 'body') {
            this.roundState.message = '命中躯干，胜利';
            this.roundState.setPhase('resolve', this.config.phaseDurations.shotResolve);
        } else if (this.roundState.shotsLeft === 0) {
            this.roundState.message = '全部脱靶，目标逃脱';
            this.roundState.setPhase('resolve', this.config.phaseDurations.shotResolve);
        } else {
            this.roundState.message = '未命中，调整再来';
            this.roundState.setPhase('resolve', this.config.phaseDurations.shotResolve);
        }
    }
}
