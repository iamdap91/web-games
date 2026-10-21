export const demonDescentSource = 'presentation-aerial-smash-south-east';
function clamp(value) {
    return Math.max(0, Math.min(1, value));
}
function smooth(value) {
    const progress = clamp(value);
    return progress * progress * (3 - 2 * progress);
}
/** 현재 선택된 발 디딤과 접촉 시각에서 마지막 도약을 재구성한다. */
export function sampleDemonDescent(snapshot) {
    if (snapshot.motion.id !== 'finisher-demon' ||
        snapshot.waiting ||
        snapshot.elapsedMs >= snapshot.durationMs)
        return undefined;
    let timeMs = 0;
    let riseStartMs;
    let apexStartMs;
    let fallStartMs;
    let contactMs;
    for (const [index, step] of snapshot.motion.steps.entries()) {
        const next = snapshot.motion.steps[index + 1];
        if (step.motion === demonDescentSource) {
            if (riseStartMs === undefined &&
                ((step.y ?? 0) < 0 ||
                    (next?.motion === demonDescentSource && (next.y ?? 0) < 0)))
                riseStartMs = timeMs;
            if (step.frame === 3 && apexStartMs === undefined)
                apexStartMs = timeMs;
            if (step.frame === 4 && fallStartMs === undefined)
                fallStartMs = timeMs;
            if (step.frame === 5 && step.contact) {
                contactMs = timeMs;
                break;
            }
        }
        timeMs += step.durationMs;
    }
    if (riseStartMs === undefined ||
        apexStartMs === undefined ||
        fallStartMs === undefined ||
        contactMs === undefined)
        return undefined;
    const endMs = Math.min(snapshot.durationMs, contactMs + 180);
    const now = snapshot.elapsedMs;
    if (now < riseStartMs || now >= endMs)
        return undefined;
    const impactAgeMs = now >= contactMs ? now - contactMs : undefined;
    const fallProgress = clamp((now - apexStartMs) / Math.max(1, contactMs - apexStartMs));
    const riseProgress = smooth((now - riseStartMs) / Math.max(1, apexStartMs - riseStartMs));
    const bodyOpacity = impactAgeMs !== undefined
        ? 1 - smooth((impactAgeMs - 25) / 95) * 0.82
        : now >= apexStartMs
            ? 0.9 + smooth(fallProgress) * 0.1
            : 0.65 + riseProgress * 0.25;
    return {
        phase: impactAgeMs !== undefined
            ? 'impact'
            : now >= apexStartMs
                ? 'fall'
                : 'rise',
        riseStartMs,
        apexStartMs,
        fallStartMs,
        contactMs,
        endMs,
        fallProgress,
        impactAgeMs,
        bodyOpacity,
    };
}
