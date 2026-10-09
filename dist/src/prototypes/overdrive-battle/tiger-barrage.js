export const tigerBarrageRules = {
    name: '초구취호패타',
    dashAt: 0.18,
    arriveAt: 0.3,
    windupAt: 1.46,
    finalAt: 1.73,
    duration: 2.15,
    strikeDamage: 5,
    finalDamage: 135,
    hitStop: 0.012,
    finalStop: 0.13,
};
const hitTimes = [
    // 기존 난무 구간 안에 19타를 넣어 마무리까지 총 20타를 쏟아붓는다.
    ...Array.from({ length: 19 }, (_, index) => 0.32 + index * 0.06),
    tigerBarrageRules.finalAt,
];
/** 난무의 시간과 타격 순서를 소유해 표시 프레임과 무관하게 각 타격을 한 번 적용한다. */
export class TigerBarrage {
    setup;
    elapsed = 0;
    nextHit = 0;
    hits = 0;
    damage = 0;
    constructor(setup) {
        this.setup = setup;
    }
    get snapshot() {
        return {
            ...this.setup,
            elapsed: this.elapsed,
            hits: this.hits,
            damage: this.damage,
        };
    }
    get done() {
        return this.elapsed >= tigerBarrageRules.duration;
    }
    update(dt) {
        this.elapsed = Math.min(tigerBarrageRules.duration, this.elapsed + dt);
        const strikes = [];
        while (this.nextHit < hitTimes.length &&
            this.elapsed >= hitTimes[this.nextHit]) {
            const final = this.nextHit === hitTimes.length - 1;
            this.nextHit++;
            strikes.push({
                hit: this.nextHit,
                final,
                damage: final
                    ? tigerBarrageRules.finalDamage
                    : tigerBarrageRules.strikeDamage,
            });
        }
        return strikes;
    }
    recordHit(damage) {
        this.hits++;
        this.damage += damage;
    }
}
const motionSequence = [
    { until: tigerBarrageRules.dashAt, animation: 'crouch', frames: [0, 1, 2] },
    { until: tigerBarrageRules.arriveAt, animation: 'attack1', frames: [0] },
    { until: 0.62, animation: 'attack1', frames: [0, 1] },
    { until: 0.89, animation: 'battle-kick', frames: [0, 1] },
    { until: 1.12, animation: 'sweep-kick', frames: [0, 1] },
    { until: 1.3, animation: 'turn-kick', frames: [0, 1, 2, 3] },
    {
        until: tigerBarrageRules.windupAt,
        animation: 'somersault',
        frames: [0, 1, 2, 3],
    },
    { until: 1.62, animation: 'tiger-fist', frames: [0, 1, 2, 3] },
    { until: tigerBarrageRules.finalAt, animation: 'tiger-fist', frames: [3] },
    { until: 1.98, animation: 'tiger-fist', frames: [4] },
    { until: tigerBarrageRules.duration, animation: 'tiger-fist', frames: [5] },
];
export function barrageHitTime(hit) {
    return hitTimes[hit - 1] ?? 0;
}
export function barragePose(state) {
    const time = state.elapsed;
    const direction = state.target.x < state.destination.x ? -1 : 1;
    const progress = Math.max(0, Math.min(1, (time - tigerBarrageRules.dashAt) /
        (tigerBarrageRules.arriveAt - tigerBarrageRules.dashAt)));
    const travel = 1 - Math.pow(1 - progress, 3);
    const jab = time >= tigerBarrageRules.arriveAt && time < tigerBarrageRules.windupAt
        ? Math.sin(time * 70) * 0.075
        : time >= tigerBarrageRules.finalAt
            ? Math.max(0, 1 -
                (time - tigerBarrageRules.finalAt) /
                    (tigerBarrageRules.duration - tigerBarrageRules.finalAt)) * 0.18
            : 0;
    let start = 0;
    let motion = motionSequence.at(-1);
    for (const entry of motionSequence) {
        motion = entry;
        if (time < entry.until)
            break;
        start = entry.until;
    }
    const frameProgress = Math.max(0, Math.min(0.999, (time - start) / Math.max(0.001, motion.until - start)));
    let frame = motion.frames[Math.floor(frameProgress * motion.frames.length)];
    if (time >= tigerBarrageRules.arriveAt && time < 1.12) {
        const contacts = hitTimes.filter((at) => at >= start && at < motion.until);
        const landed = contacts.some((at) => at <= time);
        const preparing = contacts.some((at) => at > time && at - time < 0.03);
        // 타격 정지 때 뻗은 자세가 보이도록 주먹과 발을 판정 시각에 맞춘다.
        frame = motion.frames[landed && !preparing ? 1 : 0];
    }
    return {
        point: {
            x: state.origin.x +
                (state.destination.x - state.origin.x) * travel +
                direction * jab,
            z: state.origin.z + (state.destination.z - state.origin.z) * travel,
        },
        height: time >= 1.3 && time < tigerBarrageRules.windupAt
            ? Math.sin(((time - 1.3) / (tigerBarrageRules.windupAt - 1.3)) * Math.PI) * 0.42
            : 0,
        animation: motion.animation,
        frame,
        direction,
    };
}
