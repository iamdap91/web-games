function animationDuration(animation) {
    return animation.frames.reduce((sum, frame) => sum + (frame.durationSeconds ?? 0.14), 0);
}
function sample(animation, time, playback) {
    const duration = animationDuration(animation);
    let remaining = Math.max(0, time);
    if (playback === 'repeat')
        remaining %= duration;
    for (const frame of animation.frames) {
        // 접촉 0.36초 같은 정확한 경계에서 부동소수 오차로 이전 자세를 선택하지 않는다.
        if (remaining < (frame.durationSeconds ?? 0.14) - 1e-9)
            return frame;
        remaining -= frame.durationSeconds ?? 0.14;
    }
    return animation.frames.at(-1);
}
/** 시간은 BattleSprite, 공격·피격 발생은 전투 규칙이 소유한다. 여기서는 실제 포즈만 선택한다. */
export function yeonmukBattlePose(animations, state) {
    const animation = (motion) => {
        const value = animations.get(motion);
        if (!value?.frames.length)
            throw new Error(`연묵 전투 모션이 없습니다: ${motion}`);
        return value;
    };
    if (state.deathAge !== null) {
        const fall = animation('die1');
        return {
            motion: 'die1',
            frame: state.reducedMotion
                ? fall.frames.at(-1)
                : sample(fall, state.deathAge, 'once'),
        };
    }
    const hurt = animation('hit1');
    if (state.hurtAge >= 0 && state.hurtAge < animationDuration(hurt))
        return {
            motion: 'hit1',
            frame: state.reducedMotion
                ? hurt.frames[0]
                : sample(hurt, state.hurtAge, 'once'),
        };
    if (state.action?.kind === 'talisman' || state.action?.kind === 'ward')
        return {
            motion: 'talisman-cast',
            frame: sample(animation('talisman-cast'), state.action.elapsed, 'once'),
        };
    const ready = animation('battle-ready');
    return {
        motion: 'battle-ready',
        frame: state.reducedMotion
            ? ready.frames[0]
            : sample(ready, state.elapsed, 'repeat'),
    };
}
