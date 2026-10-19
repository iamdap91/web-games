import { collectContactCues } from './finisher-actors.js';
export function hasFinisherHierarchy(motion) {
    return (motion.finisher?.theme === 'demon' ||
        motion.finisher?.theme === 'drunken-tiger');
}
/** 마지막 예비동작에서만 장식을 덜고 타격하는 몸·분신·판정 표시는 남긴다. */
export function finisherDecorationOpacity(snapshot, enabled) {
    if (!enabled || snapshot.waiting || !hasFinisherHierarchy(snapshot.motion))
        return 1;
    const final = collectContactCues(snapshot.motion).at(-1);
    if (!final)
        return 1;
    const remainingMs = final.plannedTimeMs - snapshot.elapsedMs;
    if (remainingMs <= 0 || remainingMs > 60)
        return 1;
    const amount = Math.min(1, (60 - remainingMs) / 20);
    return 1 - amount * 0.78;
}
