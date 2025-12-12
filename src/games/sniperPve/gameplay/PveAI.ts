import { Rect, SniperPveConfig } from '../config';
import { Hitboxes, Pose } from './Hitboxes';
import { WallMask } from './WallMask';

export class PveAI {
    constructor(private config: SniperPveConfig, private hitboxes: Hitboxes) {}

    pickPose(wallRect: Rect, wallMask: WallMask): Pose {
        let bestPose: Pose | null = null;
        let bestScore = Infinity;

        for (let i = 0; i < this.config.ai.samples; i++) {
            const headX = wallRect.x + this.config.ai.headRadius + Math.random() * (wallRect.width - this.config.ai.headRadius * 2);
            const headY = wallRect.y + this.config.ai.headRadius + Math.random() * (wallRect.height - this.config.ai.headRadius - this.config.ai.bodyRadius - this.config.ai.bodyOffsetY);
            const pose = this.hitboxes.createPoseFromHead(headX, headY);

            const headOpen = wallMask.opennessForCircle(pose.head.x, pose.head.y, pose.head.r);
            const bodyOpen = wallMask.opennessForCircle(pose.body.x, pose.body.y, pose.body.r);
            const distancePenalty = 1 / (1 + wallMask.distanceToNearestHole(pose.head.x, pose.head.y));

            const score =
                headOpen * this.config.ai.weights.headOpenness +
                bodyOpen * this.config.ai.weights.bodyOpenness +
                distancePenalty * this.config.ai.weights.distance;

            if (score < bestScore) {
                bestScore = score;
                bestPose = pose;
            }
        }

        if (!bestPose) {
            const fallbackX = wallRect.x + wallRect.width / 2;
            const fallbackY = wallRect.y + wallRect.height / 2 - this.config.ai.bodyOffsetY / 2;
            bestPose = this.hitboxes.createPoseFromHead(fallbackX, fallbackY);
        }

        return bestPose;
    }
}
