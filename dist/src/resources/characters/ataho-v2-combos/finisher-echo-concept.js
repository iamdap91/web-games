import { sampleActorPose } from './finisher-actors.js';
import { drawPose, poseWithDrawing } from './pose-drawing.js';
import { frameKey } from './source-frames.js';
const echoIntervalMs = 40;
function clampUnit(value) {
    return Math.max(0, Math.min(1, value));
}
function rushStartMs(frame) {
    const firstRush = frame.finisher.definition.beats.find((beat) => beat.emphasis === 'rush');
    return frame.snapshot.motion.steps
        .slice(0, firstRush?.fromStep ?? 0)
        .reduce((total, step) => total + step.durationMs, 0);
}
/** 후반 난무에만 짧은 본체 잔상을 남기고 실제 공격 분신은 따로 선명하게 그린다. */
export function drawDragonConceptEchoes(ctx, frame) {
    const { snapshot, finisher, frames, options } = frame;
    if (finisher.definition.theme !== 'dragon' ||
        snapshot.waiting ||
        snapshot.elapsedMs >= snapshot.durationMs ||
        finisher.beat.emphasis !== 'rush')
        return;
    const attackProgress = clampUnit(finisher.hitCount / Math.max(1, finisher.totalHits));
    if (attackProgress < 0.35)
        return;
    const count = attackProgress >= 0.7 ? 3 : 2;
    const lifetimeMs = count * echoIntervalMs + 10;
    const peakOpacity = 0.1 + attackProgress * 0.08;
    const startMs = rushStartMs(frame);
    const newestStampMs = Math.floor(snapshot.elapsedMs / echoIntervalMs) * echoIntervalMs;
    for (let index = count - 1; index >= 0; index--) {
        const stampMs = newestStampMs - index * echoIntervalMs;
        const ageMs = snapshot.elapsedMs - stampMs;
        if (stampMs < startMs || ageMs >= lifetimeMs)
            continue;
        const pose = poseWithDrawing(sampleActorPose(snapshot.motion, 'body', stampMs), options.enabledEffects);
        const source = frames.get(frameKey(pose.step));
        if (!source)
            continue;
        ctx.save();
        ctx.globalAlpha *= peakOpacity * (1 - ageMs / lifetimeMs) ** 1.25;
        ctx.filter = 'grayscale(1) sepia(0.75)';
        // 원래 자세·위치에 한 번만 그려 색 분신과 임의의 공간 이동을 만들지 않는다.
        drawPose(ctx, pose, source, options);
        ctx.restore();
    }
}
