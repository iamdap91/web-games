const depth = 16;
export const clearing = {
    width: 20,
    depth,
    speed: 5.4,
    playerRadius: 0.27,
    reach: 0.72,
    strikeReach: 0.48,
    swingDuration: 0.44,
    impactTime: 0.16,
    moveRecoveryTime: 0.32,
    hitStop: 0.055,
    breakStop: 0.085,
    exit: { x: 0, z: depth / 2, halfWidth: 1.15 },
    spawn: { x: 0, z: 4.4 },
};
