const jumpMotion = 'jumping-1-south-east';
const backflipMotion = 'backflip-south-east';
const guardMotion = 'fight-stance-idle-8-frames-south-east';
function isGuard(step) {
    return (step.motion === guardMotion ||
        (step.frame === 8 &&
            (step.motion === 'smear-hook-stable-south-east' ||
                step.motion === 'smear-hammerfist-clean-south-east')));
}
const preparationFrames = {
    'surprise-uppercut-south-east': { from: [0], release: 2 },
    'cheolsango-short': { from: [0], release: 2 },
    'smear-hammerfist-clean-south-east': { from: [1, 3], release: 4 },
    'ataho-firewood-elbow-chop-south-east-south-east': {
        from: [2, 3],
        release: 4,
    },
};
function timedSteps(motion) {
    let timeMs = 0;
    return motion.steps.map((step, index) => {
        const startMs = timeMs;
        timeMs += step.durationMs;
        return { step, index, startMs, endMs: timeMs };
    });
}
/** 마지막 일반 가드부터 추가 카메라 연출을 끝내 반복 대기에 변위를 남기지 않는다. */
export function cameraGuardStart(motion) {
    const steps = timedSteps(motion);
    let startMs = steps.at(-1)?.endMs ?? 0;
    for (let index = steps.length - 1; index >= 0; index--) {
        const item = steps[index];
        if (!isGuard(item.step))
            break;
        startMs = item.startMs;
    }
    // 기공은 몸이 가드에 돌아온 뒤에도 남아 도달하므로 그 여운까지 담는다.
    return motion.ki
        ? Math.max(startMs, ...motion.ki.hits.map((hit) => hit.atMs + hit.durationMs))
        : startMs;
}
/** 연계에서도 마지막으로 명확히 장전하는 한 구간만 골라 반복 확대를 피한다. */
export function preparationCameraCue(motion) {
    const steps = timedSteps(motion);
    let cue;
    for (const contact of steps) {
        if (!contact.step.contact)
            continue;
        const rule = preparationFrames[contact.step.motion];
        if (!rule)
            continue;
        let from = contact.index;
        while (from > 0 && steps[from - 1].step.motion === contact.step.motion)
            from--;
        const approach = steps.slice(from, contact.index + 1);
        const preparation = approach.find((item) => rule.from.includes(item.step.frame));
        const release = approach.find((item) => item.step.frame === rule.release);
        if (!preparation || !release || release.startMs <= preparation.startMs)
            continue;
        cue = {
            startMs: preparation.startMs,
            peakMs: release.startMs,
            endMs: Math.min(release.startMs + 120, cameraGuardStart(motion)),
        };
    }
    return cue;
}
/** 같은 낮은 착지 자세의 유지는 하나로 묶고 일어서는8번은 포함하지 않는다. */
export function lastLandingCameraStep(motion) {
    const steps = timedSteps(motion);
    let landing;
    for (const item of steps) {
        if (item.step.motion !== jumpMotion ||
            item.step.frame !== 7 ||
            Math.abs(item.step.y ?? 0) >= 0.01 ||
            (steps[item.index - 1]?.step.y ?? 0) >= -1)
            continue;
        let endMs = item.endMs;
        for (const following of steps.slice(item.index + 1)) {
            if (following.step.motion !== jumpMotion ||
                following.step.frame !== 7 ||
                Math.abs(following.step.y ?? 0) >= 0.01)
                break;
            endMs = following.endMs;
        }
        landing = { ...item, endMs };
    }
    return landing;
}
export function airborneCameraCue(motion) {
    const landing = lastLandingCameraStep(motion);
    if (!landing)
        return undefined;
    const steps = timedSteps(motion);
    const takeoff = steps.find((item) => item.index < landing.index &&
        item.step.frame === 3 &&
        ((item.step.motion === jumpMotion &&
            (steps[item.index + 1]?.step.y ?? 0) < -1) ||
            item.step.motion === backflipMotion));
    if (!takeoff)
        return undefined;
    const roots = steps
        .slice(takeoff.index, landing.index + 1)
        .map((item) => item.step.x);
    return {
        startMs: Math.max(0, takeoff.startMs - 100),
        wideMs: takeoff.startMs,
        landingEndMs: landing.endMs,
        endMs: Math.min(landing.endMs + 140, cameraGuardStart(motion)),
        focusRootX: (Math.min(...roots) + Math.max(...roots)) * 0.5,
    };
}
