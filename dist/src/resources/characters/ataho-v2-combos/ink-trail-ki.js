import { sampleKiShot } from './ki-sampling.js';
import { orbitViscosityEndMs } from './orbit-viscosity.js';
import { groundY, startX } from './pose-drawing.js';
function worldPoint(point, timeMs, scale) {
    return {
        x: startX + point.x * scale,
        y: groundY + point.y * scale,
        timeMs,
    };
}
function shotPath(shot, scale, beginMs) {
    const durationMs = Math.max(1, shot.arriveMs - beginMs);
    const segments = Math.max(2, Math.ceil(durationMs / 16));
    return Array.from({ length: segments + 1 }, (_, index) => {
        const timeMs = beginMs + (durationMs * index) / segments;
        return worldPoint(sampleKiShot(shot, timeMs).point, timeMs, scale);
    });
}
/** 기공 핵은 원래 그림이 맡고, 같은 비행 좌표에 짧고 가는 먹 꼬리만 남긴다. */
export function sampleKiInkTrails(snapshot, options) {
    const definition = snapshot.motion.ki;
    if (!definition)
        return [];
    const { scale } = options;
    const timeMs = snapshot.elapsedMs;
    const lifetimeMs = definition.style === 'meteor' ? 90 : 145;
    const shots = definition.shots.flatMap((shot, index) => {
        // 점성 연결이 끊긴 자리를 일반 먹 궤적이 다시 이어 보이지 않게 한다.
        const beginMs = options.showViscousOrbit && definition.style === 'orbit'
            ? orbitViscosityEndMs(shot, index)
            : shot.launchMs;
        if (timeMs < beginMs || timeMs > shot.arriveMs + lifetimeMs)
            return [];
        return [
            {
                id: `${snapshot.motion.id}:ki:${shot.id}`,
                points: shotPath(shot, scale, beginMs),
                width: Math.max(1.15, Math.min(5.5, shot.radius * 0.24)) * scale,
                lifetimeMs,
                opacity: definition.style === 'meteor' ? 0.58 : 0.68,
                layer: 'back',
                seed: 71 + index * 37,
            },
        ];
    });
    if (definition.shots.length > 0)
        return shots;
    if (definition.style !== 'eruption' && definition.style !== 'tiger-manifest')
        return [];
    return definition.hits.flatMap((hit, index) => {
        const eruption = definition.style === 'eruption';
        // 분출은 표적 바닥에서 위로, 호격권은 주먹 방출점에서 현현점까지만 긋는다.
        const from = eruption
            ? { x: definition.target.x, y: 0 }
            : definition.origin;
        const to = eruption
            ? { x: definition.target.x, y: -hit.radius * 3.2 }
            : hit.point;
        const beginMs = eruption
            ? hit.atMs
            : index === 0
                ? definition.releaseMs
                : hit.atMs - 45;
        const endMs = eruption ? hit.atMs + hit.durationMs * 0.68 : hit.atMs;
        if (timeMs < beginMs || timeMs > endMs + lifetimeMs)
            return [];
        const points = Array.from({ length: 13 }, (_, pointIndex) => {
            const progress = pointIndex / 12;
            const travel = eruption ? 1 - Math.pow(1 - progress, 2) : progress;
            return worldPoint({
                x: from.x + (to.x - from.x) * travel,
                y: from.y + (to.y - from.y) * travel,
            }, beginMs + (endMs - beginMs) * progress, scale);
        });
        return [
            {
                id: `${snapshot.motion.id}:ki:${hit.id}`,
                points,
                width: (eruption ? Math.min(6.5, hit.radius * 0.27) : 4.5) * scale,
                lifetimeMs,
                opacity: 0.64,
                layer: 'back',
                seed: 173 + index * 47,
            },
        ];
    });
}
