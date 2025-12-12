import { SniperPveConfig, Rect } from '../config';

export interface Circle {
    x: number;
    y: number;
    r: number;
}

export interface Pose {
    head: Circle;
    body: Circle;
}

export class Hitboxes {
    constructor(private config: SniperPveConfig, private wallRect: Rect) {}

    createPoseFromHead(headX: number, headY: number): Pose {
        const head: Circle = {
            x: headX,
            y: headY,
            r: this.config.ai.headRadius
        };
        const body: Circle = {
            x: headX,
            y: headY + this.config.ai.bodyOffsetY,
            r: this.config.ai.bodyRadius
        };

        return this.clampPose({ head, body });
    }

    updateWallRect(rect: Rect) {
        this.wallRect = rect;
    }

    hitTest(pose: Pose, x: number, y: number): 'head' | 'body' | 'miss' {
        if (Math.hypot(x - pose.head.x, y - pose.head.y) <= pose.head.r) {
            return 'head';
        }
        if (Math.hypot(x - pose.body.x, y - pose.body.y) <= pose.body.r) {
            return 'body';
        }
        return 'miss';
    }

    private clampPose(pose: Pose): Pose {
        const minX = this.wallRect.x + this.config.ai.headRadius;
        const maxX = this.wallRect.x + this.wallRect.width - this.config.ai.headRadius;
        const minY = this.wallRect.y + this.config.ai.headRadius;
        const maxY = this.wallRect.y + this.wallRect.height - this.config.ai.bodyRadius - this.config.ai.bodyOffsetY;

        pose.head.x = Math.max(minX, Math.min(maxX, pose.head.x));
        pose.head.y = Math.max(minY, Math.min(maxY, pose.head.y));
        pose.body.x = pose.head.x;
        pose.body.y = pose.head.y + this.config.ai.bodyOffsetY;

        return pose;
    }
}
