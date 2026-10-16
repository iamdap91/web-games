import { comboDuration, sampleComboMotion } from './player.js';
// 기존 조합 좌표를 무대 중앙으로 옮길 때 안무·궤적·구도가 같은 표적을 쓴다.
export const finisherAuthoringTargetX = 146;
export const finisherTargetX = 76;
/** 렌더·접촉·안전 구도가 같은 공격자와 절대 시각을 사용한다. */
export function motionActors(motion) {
    return [
        { id: 'body', startMs: 0, steps: motion.steps, opacity: 1, role: 'body' },
        ...(motion.finisher?.actors ?? []),
    ];
}
export function sampleActorPose(motion, actorId, timeMs) {
    const actor = motionActors(motion).find((item) => item.id === actorId);
    if (!actor)
        throw new Error(`공격자를 찾을 수 없습니다: ${actorId}`);
    const pose = sampleComboMotion({ ...motion, steps: actor.steps, finisher: undefined }, 
    // 합산한 전역 시각에서 트랙 시작을 뺄 때 생기는 경계 오차를 흡수한다.
    timeMs - actor.startMs + 1e-7);
    return { ...pose, motion, elapsedMs: timeMs };
}
export function collectContactCues(motion) {
    if (motion.ki) {
        return motion.ki.hits.map((hit, index) => {
            let timeMs = 0;
            const stepIndex = motion.steps.findIndex((step) => {
                timeMs += step.durationMs;
                return timeMs > hit.atMs;
            });
            const step = motion.steps[Math.max(0, stepIndex)];
            return {
                actorId: `ki:${hit.id}`,
                stepIndex: Math.max(0, stepIndex),
                plannedTimeMs: hit.atMs,
                durationMs: hit.durationMs,
                step: { ...step, phase: `${index + 1}타 · 기공 도달` },
            };
        });
    }
    return motionActors(motion)
        .flatMap((actor) => {
        let timeMs = actor.startMs;
        return actor.steps.flatMap((step, stepIndex) => {
            const plannedTimeMs = timeMs;
            timeMs += step.durationMs;
            return step.contact
                ? [
                    {
                        actorId: actor.id,
                        stepIndex,
                        plannedTimeMs,
                        durationMs: step.durationMs,
                        step,
                    },
                ]
                : [];
        });
    })
        .sort((a, b) => a.plannedTimeMs - b.plannedTimeMs || a.actorId.localeCompare(b.actorId));
}
export function visibleActors(motion, timeMs) {
    return motionActors(motion).flatMap((actor) => {
        const durationMs = comboDuration({ ...motion, steps: actor.steps });
        const age = timeMs - actor.startMs;
        if (actor.role !== 'body' && (age < 0 || age >= durationMs))
            return [];
        const fade = actor.role === 'body'
            ? 1
            : Math.min(1, age / 45, (durationMs - age) / 85);
        return [
            {
                ...actor,
                pose: sampleActorPose(motion, actor.id, timeMs),
                opacity: actor.opacity * Math.max(0, fade),
            },
        ];
    });
}
export function finisherContactPhase(motion, timeMs) {
    if (!motion.finisher)
        return undefined;
    return collectContactCues(motion)
        .filter((cue) => timeMs + 1e-7 >= cue.plannedTimeMs &&
        timeMs < cue.plannedTimeMs + cue.durationMs)
        .at(-1)?.step.phase;
}
