import { SniperPveConfig } from '../config';

export type RoundPhase = 'intro' | 'aiming' | 'resolve' | 'end';
export type HitResult = 'head' | 'body' | 'miss' | 'none';

export class RoundState {
    phase: RoundPhase = 'intro';
    shotsLeft: number;
    roundIndex: number = 1;
    timer: number = 0;
    lastResult: HitResult = 'none';
    message: string = '';

    constructor(private config: SniperPveConfig) {
        this.shotsLeft = config.roundShots;
    }

    resetForNewRound(isFirst: boolean = false) {
        if (isFirst) {
            this.roundIndex = 1;
        } else {
            this.roundIndex += 1;
        }
        this.shotsLeft = this.config.roundShots;
        this.lastResult = 'none';
        this.message = '';
    }

    setPhase(phase: RoundPhase, duration: number) {
        this.phase = phase;
        this.timer = duration;
    }

    tick(deltaTime: number): boolean {
        if (this.timer > 0) {
            this.timer -= deltaTime;
            if (this.timer <= 0) {
                this.timer = 0;
                return true;
            }
        }
        return false;
    }

    consumeShot() {
        this.shotsLeft = Math.max(0, this.shotsLeft - 1);
    }
}
