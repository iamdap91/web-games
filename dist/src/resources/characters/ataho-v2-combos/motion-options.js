export const directionLabels = {
    'south-east': '남동쪽',
    'north-east': '북동쪽',
};
export function motionOptionId(motion) {
    return motion.variant?.groupId ?? motion.technique?.id ?? motion.id;
}
export function motionOptionTitle(motion) {
    return motion.variant?.groupTitle ?? motion.technique?.title ?? motion.title;
}
export function motionDirection(motion) {
    return motion.technique?.direction ?? 'south-east';
}
export function groupMotionOptions(motions) {
    const groups = new Map();
    for (const motion of motions) {
        const id = motionOptionId(motion);
        const group = groups.get(id);
        if (group)
            group.motions.push(motion);
        else
            groups.set(id, {
                id,
                title: motionOptionTitle(motion),
                motions: [motion],
            });
    }
    return [...groups.values()];
}
function matchingEffect(effect, effects) {
    const exact = effects.find((candidate) => candidate.id === effect.id && candidate.kind === effect.kind);
    if (exact)
        return exact;
    // 방향별 좌표·마스크가 다른 같은 의미의 효과만 보존한다. 이름이 모호하면 해제한다.
    const sameMeaning = effects.filter((candidate) => candidate.kind === effect.kind && candidate.label === effect.label);
    return sameMeaning.length === 1 ? sameMeaning[0] : undefined;
}
export function directionSelection(previous, next, selection) {
    const resetLabels = [];
    let presentationId = 'base';
    if (selection.presentationId !== 'base') {
        const previousTiming = previous.presentations?.find((item) => item.id === selection.presentationId);
        const exact = next.presentations?.find((item) => item.id === selection.presentationId);
        const sameMeaning = previousTiming
            ? (next.presentations?.filter((item) => item.label === previousTiming.label) ?? [])
            : [];
        const nextTiming = exact ?? (sameMeaning.length === 1 ? sameMeaning[0] : undefined);
        if (nextTiming)
            presentationId = nextTiming.id;
        else
            resetLabels.push(previousTiming?.label ?? '선택한 박자');
    }
    const enabledEffects = new Set();
    for (const id of selection.enabledEffects) {
        const effect = previous.effects?.find((item) => item.id === id);
        if (!effect)
            continue;
        const match = matchingEffect(effect, next.effects ?? []);
        if (match)
            enabledEffects.add(match.id);
        else
            resetLabels.push(effect.label);
    }
    return { presentationId, enabledEffects, resetLabels };
}
