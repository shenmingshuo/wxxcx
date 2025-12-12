export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Hole {
    x: number;
    y: number;
    r: number;
}

export interface SniperPveConfig {
    roundShots: number;
    wall: {
        padding: number;
        aspectRatio: number;
        topOffset: number;
    };
    hole: {
        radius: number;
        maxCount: number;
    };
    aim: {
        crosshairRadius: number;
        dragSmooth: number;
    };
    ai: {
        samples: number;
        bodyOffsetY: number;
        headRadius: number;
        bodyRadius: number;
        weights: {
            headOpenness: number;
            bodyOpenness: number;
            distance: number;
        };
        opennessSamples: number;
    };
    phaseDurations: {
        roundIntro: number;
        shotResolve: number;
        roundEnd: number;
    };
    debug: {
        showPose: boolean;
    };
}

export const sniperPveConfig: SniperPveConfig = {
    roundShots: 3,
    wall: {
        padding: 28,
        aspectRatio: 1.1,
        topOffset: 140
    },
    hole: {
        radius: 14,
        maxCount: 240
    },
    aim: {
        crosshairRadius: 20,
        dragSmooth: 0.2
    },
    ai: {
        samples: 48,
        bodyOffsetY: 65,
        headRadius: 26,
        bodyRadius: 38,
        weights: {
            headOpenness: 0.6,
            bodyOpenness: 0.3,
            distance: 0.1
        },
        opennessSamples: 16
    },
    phaseDurations: {
        roundIntro: 1200,
        shotResolve: 500,
        roundEnd: 1100
    },
    debug: {
        showPose: false
    }
};
