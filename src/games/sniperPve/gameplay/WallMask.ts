import { Hole, Rect, SniperPveConfig } from '../config';

export class WallMask {
    private holes: Hole[] = [];

    constructor(private config: SniperPveConfig, private wallRect: Rect) {}

    setWallRect(rect: Rect) {
        this.wallRect = rect;
    }

    addHole(x: number, y: number, radius: number) {
        const hole: Hole = {
            x: Math.max(this.wallRect.x, Math.min(this.wallRect.x + this.wallRect.width, x)),
            y: Math.max(this.wallRect.y, Math.min(this.wallRect.y + this.wallRect.height, y)),
            r: radius
        };
        this.holes.push(hole);
        if (this.holes.length > this.config.hole.maxCount) {
            this.holes.shift();
        }
    }

    getHoles(): Hole[] {
        return this.holes;
    }

    opennessForCircle(cx: number, cy: number, radius: number): number {
        if (this.holes.length === 0) return 0;
        const samples = this.config.ai.opennessSamples;
        let overlapCount = 0;

        for (let i = 0; i < samples; i++) {
            const theta = (Math.PI * 2 * i) / samples;
            const sx = cx + Math.cos(theta) * radius;
            const sy = cy + Math.sin(theta) * radius;
            if (this.pointInsideHole(sx, sy)) {
                overlapCount++;
            }
        }

        return overlapCount / samples;
    }

    distanceToNearestHole(x: number, y: number): number {
        if (this.holes.length === 0) return Infinity;
        let min = Infinity;
        for (const hole of this.holes) {
            const dist = Math.hypot(x - hole.x, y - hole.y) - hole.r;
            if (dist < min) min = dist;
        }
        return Math.max(0, min);
    }

    private pointInsideHole(x: number, y: number): boolean {
        for (const hole of this.holes) {
            if (Math.hypot(x - hole.x, y - hole.y) <= hole.r) {
                return true;
            }
        }
        return false;
    }
}
