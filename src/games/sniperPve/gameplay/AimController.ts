import { Rect, SniperPveConfig } from '../config';

export class AimController {
    private position = { x: 0, y: 0 };
    private dragging = false;
    private wallRect: Rect;

    constructor(private config: SniperPveConfig, wallRect: Rect) {
        this.wallRect = wallRect;
        this.position = {
            x: wallRect.x + wallRect.width / 2,
            y: wallRect.y + wallRect.height / 2
        };
    }

    setWallRect(rect: Rect) {
        this.wallRect = rect;
        this.snapTo(rect.x + rect.width / 2, rect.y + rect.height / 2);
    }

    onPointerDown(x: number, y: number) {
        this.dragging = true;
        this.moveTo(x, y);
    }

    onPointerMove(x: number, y: number) {
        if (!this.dragging) return;
        this.moveTo(x, y);
    }

    onPointerUp() {
        this.dragging = false;
    }

    getPosition() {
        return { ...this.position };
    }

    snapTo(x: number, y: number) {
        this.position = {
            x: Math.max(this.wallRect.x, Math.min(this.wallRect.x + this.wallRect.width, x)),
            y: Math.max(this.wallRect.y, Math.min(this.wallRect.y + this.wallRect.height, y))
        };
    }

    private moveTo(x: number, y: number) {
        const clamped = {
            x: Math.max(this.wallRect.x, Math.min(this.wallRect.x + this.wallRect.width, x)),
            y: Math.max(this.wallRect.y, Math.min(this.wallRect.y + this.wallRect.height, y))
        };
        this.position.x += (clamped.x - this.position.x) * this.config.aim.dragSmooth;
        this.position.y += (clamped.y - this.position.y) * this.config.aim.dragSmooth;
    }
}
