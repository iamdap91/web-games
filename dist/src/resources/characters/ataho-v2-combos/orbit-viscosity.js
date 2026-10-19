import { orbitActivationMs, sampleKiShot } from './ki-sampling.js';
import { clamp } from './ki-shapes.js';
const separationTimesMs = [144, 184, 158, 196];
const residueFrameCount = 9;
function separationTimeMs(index) {
    return separationTimesMs[index % separationTimesMs.length] ?? 144;
}
export function orbitViscosityEndMs(shot, index) {
    return Math.min(shot.launchMs + separationTimeMs(index) + 170, shot.arriveMs - 30);
}
/** 발사·명중 궤도는 그대로 두고 연결부와 잔여 조각만 절대 시각에서 재현한다. */
export function sampleOrbitViscosity(shot, timeMs, index) {
    const ageMs = timeMs - shot.launchMs;
    const preparation = clamp((ageMs + orbitActivationMs) / orbitActivationMs);
    const compression = ageMs < 0 ? Math.sin(preparation * Math.PI) : 0;
    const snapMs = separationTimeMs(index);
    const root = { x: shot.from.x - shot.radius, y: shot.from.y };
    if (ageMs < 0 || timeMs >= orbitViscosityEndMs(shot, index))
        return { compression };
    if (ageMs < snapMs) {
        const progress = ageMs / snapMs;
        const front = sampleKiShot(shot, timeMs).point;
        return {
            compression,
            tether: {
                from: root,
                to: { x: front.x - shot.radius * 0.35, y: front.y },
                rootRadius: shot.radius * (0.72 - progress * 0.37),
                tipRadius: shot.radius * 0.72,
                neckRadius: 2.8 * (1 - progress) + 0.45,
                bend: (index % 2 === 0 ? -1 : 1) * Math.sin(progress * Math.PI) * 4,
                frame: 0,
            },
        };
    }
    const recoilMs = 42;
    const residueAgeMs = ageMs - snapMs;
    const residueEndMs = orbitViscosityEndMs(shot, index) - shot.launchMs;
    const residueProgress = clamp(residueAgeMs / (residueEndMs - snapMs));
    const frame = Math.min(residueFrameCount - 1, Math.floor(residueProgress * residueFrameCount));
    if (residueAgeMs < recoilMs) {
        const recoil = residueAgeMs / recoilMs;
        const separation = sampleKiShot(shot, shot.launchMs + snapMs).point;
        return {
            compression,
            tether: {
                from: root,
                to: {
                    x: root.x + (separation.x - root.x) * (1 - recoil) * 0.55,
                    y: root.y + (separation.y - root.y) * (1 - recoil) * 0.55,
                },
                rootRadius: shot.radius * 0.38,
                tipRadius: 0.6,
                neckRadius: 0.4,
                bend: (index % 2 === 0 ? 1 : -1) * Math.sin(recoil * Math.PI) * 5,
                frame,
            },
        };
    }
    const chase = clamp((ageMs - snapMs - recoilMs) / (residueEndMs - snapMs - recoilMs));
    if (chase >= 1)
        return { compression };
    const delayed = sampleKiShot(shot, timeMs - 38).point;
    const catchUp = chase * chase;
    const radius = shot.radius * (0.4 - chase * 0.18);
    return {
        compression,
        droplet: {
            point: {
                x: root.x + (delayed.x - root.x) * catchUp,
                y: root.y +
                    (delayed.y - root.y) * catchUp +
                    Math.sin(chase * Math.PI) * 3,
            },
            radius,
            angle: Math.atan2(delayed.y - root.y, delayed.x - root.x),
            frame,
            alpha: 1 - chase * chase,
        },
    };
}
