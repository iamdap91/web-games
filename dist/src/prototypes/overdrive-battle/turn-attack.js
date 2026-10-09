// 이동·자세·피해 판정이 같은 구간 경계를 사용해 타격 중 발이 밀리지 않게 한다.
export const turnAttackTimings = {
    attack: {
        arriveAt: 0.15,
        windupAt: 0.19,
        contactTime: 0.36,
        recoverAt: 0.46,
        returnAt: 0.6,
        returnEnd: 0.75,
        duration: 0.8,
    },
    skill: {
        arriveAt: 0.16,
        windupAt: 0.2,
        contactTime: 0.46,
        recoverAt: 0.6,
        returnAt: 0.76,
        returnEnd: 0.92,
        duration: 1,
    },
};
export function turnAttackAdvance(kind, time) {
    const timing = turnAttackTimings[kind];
    if (time < timing.arriveAt)
        return Math.max(0, time / timing.arriveAt);
    if (time < timing.returnAt)
        return 1;
    // 짧은 등속 대시 뒤 정확히 멈추며, 감속 꼬리나 되튐을 남기지 않는다.
    return Math.max(0, 1 - (time - timing.returnAt) / (timing.returnEnd - timing.returnAt));
}
export function turnAttackPose(kind, time, facing, skill = 'tiger') {
    const timing = turnAttackTimings[kind];
    const mirror = facing === 'left';
    if (time < timing.arriveAt ||
        (time >= timing.returnAt && time < timing.returnEnd)) {
        const suffix = facing === 'front' ? '' : `-${facing}`;
        // 복귀 때도 적을 바라보며 발 디딤 순서만 거꾸로 재생한다.
        return {
            animation: `move${suffix}`,
            frame: turnAttackAdvance(kind, time) < 0.5 ? 1 : 2,
            mirror: false,
        };
    }
    if (time >= timing.returnEnd)
        return { animation: 'battle-ready', frame: 0, mirror };
    const windup = Math.max(0, (time - timing.windupAt) / (timing.contactTime - timing.windupAt));
    if (kind === 'skill' && skill !== 'tiger') {
        if (time >= timing.recoverAt + (timing.returnAt - timing.recoverAt) * 0.65)
            return { animation: 'battle-ready', frame: 0, mirror };
        if (skill === 'sweep')
            return {
                animation: 'turn-kick',
                frame: time < timing.contactTime
                    ? windup < 0.55
                        ? 0
                        : 1
                    : time < timing.recoverAt
                        ? 2
                        : 3,
                mirror,
            };
        return {
            animation: 'battle-kick',
            frame: time >= timing.contactTime && time < timing.recoverAt ? 1 : 0,
            mirror,
        };
    }
    if (facing === 'back') {
        const recovery = (time - timing.recoverAt) / (timing.returnAt - timing.recoverAt);
        return {
            animation: 'turn-kick',
            frame: time < timing.contactTime
                ? windup < 0.5
                    ? 0
                    : 1
                : time < timing.recoverAt
                    ? 2
                    : recovery < 0.7
                        ? 3
                        : 0,
            mirror: false,
        };
    }
    if (facing === 'front')
        return {
            animation: 'sweep-kick',
            frame: time >= timing.contactTime && time < timing.recoverAt ? 1 : 0,
            mirror: false,
        };
    // 호격권의 끝 프레임 뒤 손을 모은 자세까지 보여준 다음에 발을 뺀다.
    if (time >= timing.recoverAt + (timing.returnAt - timing.recoverAt) * 0.6)
        return { animation: 'battle-ready', frame: 0, mirror };
    return {
        animation: 'tiger-fist',
        frame: time < timing.contactTime
            ? kind === 'skill'
                ? Math.min(3, Math.floor(windup * 4))
                : time < timing.windupAt
                    ? 0
                    : 3
            : time < timing.recoverAt
                ? 4
                : 5,
        mirror,
    };
}
