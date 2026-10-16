import { cameraGuardStart } from './camera-cues.js';
import { sampleComboMotion } from './player.js';
/** 짧은 충돌이나 제자리 타격을 제외하고 실제 이동이 이어지는 동작만 추적한다. */
export function trackingCameraCue(motion) {
    let timeMs = 0;
    let movementStartMs;
    let movementEndMs = 0;
    let movingDurationMs = 0;
    let left = Infinity;
    let right = -Infinity;
    for (const [index, step] of motion.steps.entries()) {
        const next = motion.steps[index + 1] ?? step;
        left = Math.min(left, step.x);
        right = Math.max(right, step.x);
        if (Math.abs(next.x - step.x) >= 0.01) {
            movementStartMs ??= timeMs;
            movementEndMs = timeMs + step.durationMs;
            movingDurationMs += step.durationMs;
        }
        timeMs += step.durationMs;
    }
    // 14px 보행과 45~60ms 철산고 충돌은 기존 준비·명중 카메라에 맡긴다.
    if (movementStartMs === undefined ||
        right - left < 20 ||
        movingDurationMs < 100)
        return undefined;
    const endMs = Math.min(cameraGuardStart(motion) - 16, movementEndMs + 280);
    if (endMs <= movementEndMs)
        return undefined;
    const startMs = Math.max(0, movementStartMs - 90);
    return {
        startMs,
        movementStartMs,
        // 처음부터 이동하는 자료도 최소90ms 동안 들어와 첫 시점의 변위를 막는다.
        rampEndMs: movementStartMs > startMs ? movementStartMs : startMs + 90,
        movementEndMs,
        returnStartMs: Math.max(movementEndMs, Math.min(movementEndMs + 60, endMs - 180)),
        endMs,
        originX: motion.steps[0].x,
    };
}
function smoothProgress(timeMs, fromMs, toMs) {
    const progress = Math.max(0, Math.min(1, (timeMs - fromMs) / Math.max(1, toMs - fromMs)));
    return progress * progress * (3 - 2 * progress);
}
/** 과거·미래의 절대 동작 시각만 사용해 탐색이나 재생 이력에 의존하지 않는다. */
export function sampleCameraTracking(snapshot, options) {
    const cue = trackingCameraCue(snapshot.motion);
    const timeMs = snapshot.elapsedMs;
    if (!cue || snapshot.waiting || timeMs < cue.startMs || timeMs >= cue.endMs)
        return { offsetX: 0, offsetY: 0, active: false };
    const rootAt = (atMs) => sampleComboMotion(snapshot.motion, atMs).x;
    // 지연은 최근120ms의 세 위치로 만들고 선행은90ms 뒤의 이동량만 더한다.
    const delayedX = rootAt(timeMs - 120) * 0.5 +
        rootAt(timeMs - 60) * 0.3 +
        rootAt(timeMs) * 0.2;
    const lead = (rootAt(timeMs + 90) - rootAt(timeMs)) * 0.1;
    const followed = (delayedX - cue.originX) * 0.11;
    const amount = smoothProgress(timeMs, cue.startMs, cue.rampEndMs) *
        (1 - smoothProgress(timeMs, cue.returnStartMs, cue.endMs));
    // 최대 이동은 원본10px: 3배에서30px이며 바닥의 세로 위치는 유지한다.
    const offsetX = -Math.max(-10, Math.min(10, followed + lead)) * options.scale * amount;
    return { offsetX, offsetY: 0, active: Math.abs(offsetX) >= 0.000001 };
}
