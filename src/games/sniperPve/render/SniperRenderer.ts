import { Hole, Rect, SniperPveConfig } from '../config';
import { Pose } from '../gameplay/Hitboxes';
import { RoundState } from '../gameplay/RoundState';

interface RenderParams {
    ctx: CanvasRenderingContext2D;
    wallRect: Rect;
    holes: Hole[];
    aimPosition: { x: number; y: number };
    pose: Pose | null;
    roundState: RoundState;
    showDebugPose: boolean;
}

export class SniperRenderer {
    constructor(private config: SniperPveConfig, private screen: { width: number; height: number }) {}

    render(params: RenderParams) {
        const { ctx } = params;
        this.drawBackground(ctx);
        this.drawWall(ctx, params.wallRect);
        this.drawHoles(ctx, params.holes);
        if (params.pose && params.showDebugPose) {
            this.drawPoseDebug(ctx, params.pose);
        }
        this.drawCrosshair(ctx, params.aimPosition);
        this.drawHUD(ctx, params.roundState);
    }

    private drawBackground(ctx: CanvasRenderingContext2D) {
        ctx.save();
        const gradient = ctx.createLinearGradient(0, 0, 0, this.screen.height);
        gradient.addColorStop(0, '#081b29');
        gradient.addColorStop(1, '#11283f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.screen.width, this.screen.height);
        ctx.restore();
    }

    private drawWall(ctx: CanvasRenderingContext2D, rect: Rect) {
        ctx.save();
        ctx.fillStyle = '#b68a5c';
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        const rows = 8;
        const cols = 8;
        for (let i = 1; i < cols; i++) {
            const x = rect.x + (rect.width / cols) * i;
            ctx.beginPath();
            ctx.moveTo(x, rect.y);
            ctx.lineTo(x, rect.y + rect.height);
            ctx.stroke();
        }
        for (let j = 1; j < rows; j++) {
            const y = rect.y + (rect.height / rows) * j;
            ctx.beginPath();
            ctx.moveTo(rect.x, y);
            ctx.lineTo(rect.x + rect.width, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    private drawHoles(ctx: CanvasRenderingContext2D, holes: Hole[]) {
        ctx.save();
        for (const hole of holes) {
            const gradient = ctx.createRadialGradient(hole.x, hole.y, 0, hole.x, hole.y, hole.r);
            gradient.addColorStop(0, 'rgba(0,0,0,0.7)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.05)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    private drawCrosshair(ctx: CanvasRenderingContext2D, pos: { x: number; y: number }) {
        ctx.save();
        ctx.strokeStyle = '#f5f8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pos.x - 18, pos.y);
        ctx.lineTo(pos.x + 18, pos.y);
        ctx.moveTo(pos.x, pos.y - 18);
        ctx.lineTo(pos.x, pos.y + 18);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, this.config.aim.crosshairRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    private drawHUD(ctx: CanvasRenderingContext2D, roundState: RoundState) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, this.screen.width, 70);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`回合 ${roundState.roundIndex}`, 16, 30);
        ctx.fillText(`剩余子弹 ${roundState.shotsLeft}`, 16, 58);

        ctx.textAlign = 'right';
        ctx.fillText(this.phaseLabel(roundState.phase), this.screen.width - 16, 30);
        ctx.font = '16px Arial';
        ctx.fillText(roundState.message || '', this.screen.width - 16, 58);
        ctx.restore();
    }

    private drawPoseDebug(ctx: CanvasRenderingContext2D, pose: Pose) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pose.head.x, pose.head.y, pose.head.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.beginPath();
        ctx.arc(pose.body.x, pose.body.y, pose.body.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    private phaseLabel(phase: RoundState['phase']): string {
        switch (phase) {
            case 'intro':
                return '准备躲藏';
            case 'aiming':
                return '瞄准中';
            case 'resolve':
                return '判定中';
            case 'end':
                return '结算';
            default:
                return '';
        }
    }
}
