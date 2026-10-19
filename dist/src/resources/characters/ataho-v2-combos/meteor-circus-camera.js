import { circusTiming, sampleCircusTarget, } from './meteor-circus-flight.js';
import { stageHeight, stageWidth } from './pose-drawing.js';
const nearDepth = 18;
export function sampleCircusCamera(timeMs) {
    const time = Math.max(0, Math.min(circusTiming.endMs, timeMs));
    if (time < circusTiming.cutMs)
        return sampleLaunchCamera(time);
    if (time < circusTiming.spiralMs)
        return sampleChaseCamera(time);
    if (time < circusTiming.regroupMs)
        return sampleOrbitCamera(time);
    if (time < circusTiming.firstHitMs)
        return sampleTurnCamera(time);
    if (time < circusTiming.lastHitMs)
        return sampleImpactCamera(time);
    // 낙하하는 표적을 따라가지 않고 마지막 넓은 구도를 유지해 착지까지 보여준다.
    return {
        ...sampleImpactCamera(circusTiming.lastHitMs),
        phase: 'finish',
    };
}
export function projectCircusPoint(point, camera) {
    const forward = normalize(subtract(camera.lookAt, camera.position));
    const right = normalize({ x: forward.z, y: 0, z: -forward.x });
    const up = cross(forward, right);
    const relative = subtract(point, camera.position);
    const depth = dot(relative, forward);
    if (depth <= nearDepth) {
        return {
            x: stageWidth / 2,
            y: stageHeight * 0.52,
            depth,
            scale: 0,
            visible: false,
        };
    }
    const scale = camera.focalLength / depth;
    const horizontal = dot(relative, right) * scale;
    const vertical = -dot(relative, up) * scale;
    const cosine = Math.cos(camera.roll);
    const sine = Math.sin(camera.roll);
    return {
        x: stageWidth / 2 + horizontal * cosine - vertical * sine,
        y: stageHeight * 0.52 + horizontal * sine + vertical * cosine,
        depth,
        scale,
        visible: true,
    };
}
function sampleLaunchCamera(timeMs) {
    const progress = smoothProgress(timeMs, 0, circusTiming.cutMs);
    return {
        position: mixPoint({ x: 240, y: 140, z: -160 }, { x: 225, y: 132, z: -145 }, progress),
        lookAt: mixPoint({ x: 30, y: 35, z: 180 }, { x: 30, y: 40, z: 210 }, progress),
        focalLength: mix(600, 620, progress),
        roll: 0,
        phase: 'launch',
    };
}
function sampleChaseCamera(timeMs) {
    const progress = smoothProgress(timeMs, circusTiming.cutMs, circusTiming.regroupMs);
    const aim = sampleCircusTarget(timeMs - 130);
    // z 추적을 줄이고 초점거리를 유지해, 전후 속도를 투영 크기와 배경 시차로 보여준다.
    return {
        position: {
            x: mix(-80, -50, progress),
            y: mix(178, 170, progress),
            z: mix(340, 355, progress),
        },
        lookAt: { x: aim.x * 0.3, y: 136, z: 1050 },
        focalLength: 500,
        // 회피 자체의 왕복·선회가 읽히도록 카메라 롤은 고정한다.
        roll: 0,
        phase: 'chase',
    };
}
function sampleOrbitCamera(timeMs) {
    const progress = smoothProgress(timeMs, circusTiming.spiralMs, circusTiming.regroupMs);
    const entry = sampleChaseCamera(circusTiming.spiralMs);
    const center = { x: 0, y: 145, z: 900 };
    const offset = subtract(entry.position, center);
    // 위치를 110도 회전해 가까운 광탄과 먼 기둥 사이에 시차를 만든다.
    const angle = (progress * Math.PI * 110) / 180;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const aim = sampleCircusTarget(timeMs - 200);
    const tracking = smoothProgress(timeMs, circusTiming.spiralMs, circusTiming.spiralMs + 450);
    return {
        position: {
            x: center.x + offset.x * cosine - offset.z * sine,
            y: mix(entry.position.y, 195, progress) +
                Math.sin(progress * Math.PI) * 35,
            z: center.z + offset.x * sine + offset.z * cosine,
        },
        lookAt: mixPoint(entry.lookAt, aim, tracking),
        focalLength: entry.focalLength,
        roll: (Math.sin(progress * Math.PI) * Math.PI * -4) / 180,
        phase: 'orbit',
    };
}
function sampleTurnCamera(timeMs) {
    const entry = sampleOrbitCamera(circusTiming.regroupMs);
    const tracking = smoothProgress(timeMs, circusTiming.regroupMs, circusTiming.regroupMs + 300);
    const entryTarget = sampleCircusTarget(circusTiming.regroupMs - 160);
    const followedTarget = sampleCircusTarget(timeMs - 160);
    const movement = subtract(followedTarget, entryTarget);
    const aim = sampleCircusTarget(timeMs - 90);
    // 마지막까지 뒤옆에서 함께 전진해 표적이 멈춰 서는 명중 구도를 만들지 않는다.
    return {
        position: {
            x: entry.position.x + movement.x * tracking,
            y: entry.position.y + movement.y * tracking,
            z: entry.position.z + movement.z * tracking,
        },
        lookAt: mixPoint(entry.lookAt, aim, tracking),
        focalLength: entry.focalLength,
        roll: entry.roll * (1 - tracking),
        phase: 'turn',
    };
}
function sampleImpactCamera(timeMs) {
    // 첫 명중에도 추격을 이어 가면 광탄이 도주 속도를 넘어서 붙는 차이가 남는다.
    return { ...sampleTurnCamera(timeMs), phase: 'impact' };
}
function smoothProgress(timeMs, startMs, endMs) {
    const value = Math.max(0, Math.min(1, (timeMs - startMs) / (endMs - startMs)));
    return value * value * (3 - 2 * value);
}
function mix(from, to, progress) {
    return from + (to - from) * progress;
}
function mixPoint(from, to, progress) {
    return {
        x: mix(from.x, to.x, progress),
        y: mix(from.y, to.y, progress),
        z: mix(from.z, to.z, progress),
    };
}
function subtract(from, to) {
    return { x: from.x - to.x, y: from.y - to.y, z: from.z - to.z };
}
function dot(from, to) {
    return from.x * to.x + from.y * to.y + from.z * to.z;
}
function cross(from, to) {
    return {
        x: from.y * to.z - from.z * to.y,
        y: from.z * to.x - from.x * to.z,
        z: from.x * to.y - from.y * to.x,
    };
}
function normalize(point) {
    const length = Math.hypot(point.x, point.y, point.z);
    return { x: point.x / length, y: point.y / length, z: point.z / length };
}
