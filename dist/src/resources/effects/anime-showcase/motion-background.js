import { atahoPosition, battleLayout, drawAtaho, drawAtahoRun, drawBear, } from './battle.js';
import { clamp, ellipse, line, mix, noise, polygon, smooth, } from './drawing.js';
import { height, width, } from './types.js';
const drawingMs = 1000 / 12;
const movementFrameMs = 1000 / 24;
const runFrameMs = 1000 / 16;
const backgroundRun = {
    startMs: 450,
    endMs: 1450,
    rampMs: 60,
    cameraEndMs: 1650,
    distance: 2000,
};
/** 짧은 가감속 사이에 등속 구간을 두어 질주 중간까지 느리게 끌지 않는다. */
function runProgress(timeMs) {
    const duration = backgroundRun.endMs - backgroundRun.startMs;
    const elapsed = clamp((timeMs - backgroundRun.startMs) / duration) * duration;
    const { rampMs } = backgroundRun;
    const distance = duration - rampMs;
    if (elapsed < rampMs)
        return (elapsed * elapsed) / (2 * rampMs * distance);
    if (elapsed > duration - rampMs) {
        const remaining = duration - elapsed;
        return 1 - (remaining * remaining) / (2 * rampMs * distance);
    }
    return (elapsed - rampMs / 2) / distance;
}
/** 출발·정지·접촉은 그림 교체의 경계에 두어 동작 전환을 늦추지 않는다. */
function sampleBeat(frame) {
    let origin = 0;
    for (const boundary of [
        backgroundRun.startMs,
        backgroundRun.endMs,
        backgroundRun.cameraEndMs,
        battleLayout.contactMs,
    ]) {
        if (frame.timeMs < boundary)
            break;
        origin = boundary;
    }
    const timeMs = origin +
        Math.floor((frame.timeMs - origin) / movementFrameMs) * movementFrameMs;
    const initialX = atahoPosition(frame, { timeMs: 0, action: 'uppercut' }).x;
    const targetGap = battleLayout.target.x - battleLayout.attacker.x;
    const phase = timeMs < backgroundRun.startMs
        ? 'ready'
        : timeMs < backgroundRun.endMs
            ? 'run'
            : 'attack';
    const attackTimeMs = timeMs < backgroundRun.endMs
        ? 0
        : timeMs < battleLayout.contactMs
            ? mix(1000, battleLayout.contactMs, clamp((timeMs - backgroundRun.endMs) /
                (battleLayout.contactMs - backgroundRun.endMs)))
            : timeMs;
    return {
        timeMs,
        initialX,
        attackerX: initialX + backgroundRun.distance * runProgress(timeMs),
        targetX: initialX + backgroundRun.distance + targetGap,
        attackTimeMs,
        phase,
    };
}
function cameraAt(frame, beat) {
    if (!frame.enhanced || frame.reducedMotion) {
        // 같은 실제 질주를 고정 와이드에 담아 비교·움직임 줄이기에서도 배우가 화면 밖으로 사라지지 않는다.
        return {
            x: (beat.initialX + beat.targetX) / 2 - width / 2,
            z: -1500,
            yaw: 0,
            roll: 0,
            eyeHeight: 255,
            horizonY: 185,
            drawing: 0,
        };
    }
    const settle = smooth((beat.timeMs - backgroundRun.endMs) /
        (backgroundRun.cameraEndMs - backgroundRun.endMs));
    const rush = smooth((beat.timeMs - backgroundRun.startMs) / 140) * (1 - settle);
    return {
        // 곰왕 방향 앞쪽에서 아타호와 같은 속도로 후퇴하며 사선으로 바라본다.
        x: beat.attackerX - width / 2 + 450,
        z: 180,
        yaw: -0.5 - settle * 0.15,
        roll: rush * -0.035,
        eyeHeight: mix(150, 205, settle),
        horizonY: mix(280, 225, settle),
        drawing: Math.floor(Math.min(beat.timeMs, backgroundRun.cameraEndMs) / drawingMs),
    };
}
function project(point, camera) {
    const x = point.x - camera.x;
    const z = point.z + 780 - camera.z;
    const depth = z * Math.cos(camera.yaw) + x * Math.sin(camera.yaw);
    const scale = 780 / Math.max(120, depth);
    return {
        x: width / 2 + (x * Math.cos(camera.yaw) - z * Math.sin(camera.yaw)) * scale,
        y: camera.horizonY + (camera.eyeHeight - point.y) * scale,
        scale,
    };
}
function drawFace(ctx, camera, points, color, seed) {
    const projected = points.map((p, i) => {
        const point = project(p, camera);
        const rough = noise(seed + i * 13 + camera.drawing * 101) - 0.5;
        return { x: point.x + rough * 1.1, y: point.y + rough * 0.8 };
    });
    polygon(ctx, projected, color);
    line(ctx, [...projected, projected[0]], '#1c2938', 2);
}
/** 벽·바닥·기둥을 같은 좌표에서 다시 그린다. 화면 속 소실점만 따로 움직이지 않는다. */
function drawWorld(ctx, camera) {
    ctx.fillStyle = '#334957';
    ctx.fillRect(-width, -height, width * 3, height * 3);
    const right = backgroundRun.distance + 2400;
    const endColumn = Math.ceil(backgroundRun.distance / 350);
    // 고정 와이드에서도 바닥 끝이 드러나지 않도록 카메라 근면까지 같은 돌바닥을 잇는다.
    const floorNear = camera.z - 560;
    const face = (points, color, seed) => drawFace(ctx, camera, points, color, seed);
    face([
        { x: -2200, y: 0, z: 2400 },
        { x: right, y: 0, z: 2400 },
        { x: right, y: 0, z: floorNear },
        { x: -2200, y: 0, z: floorNear },
    ], '#b6b7a3', 1);
    const rowCount = Math.ceil((2400 - floorNear) / 350);
    for (let row = 0; row < rowCount; row++) {
        const far = 2400 - row * 350;
        const near = Math.max(far - 350, floorNear);
        for (let column = -6; column <= endColumn + 6; column++) {
            const left = column * 350;
            face([
                { x: left, y: 0, z: far },
                { x: left + 350, y: 0, z: far },
                { x: left + 350, y: 0, z: near },
                { x: left, y: 0, z: near },
            ], (row + column) % 2 ? '#8f9b92' : '#cbd0b7', 20 + row * 29 + column);
        }
    }
    face([
        { x: -2400, y: 0, z: 850 },
        { x: right, y: 0, z: 850 },
        { x: right, y: 780, z: 850 },
        { x: -2400, y: 780, z: 850 },
    ], '#647d80', 50);
    for (let i = -5; i <= endColumn + 5; i++) {
        const x = i * 350;
        face([
            { x: x - 70, y: 90, z: 845 },
            { x: x + 70, y: 90, z: 845 },
            { x: x + 70, y: 540, z: 845 },
            { x: x - 70, y: 540, z: 845 },
        ], '#304954', 60 + i);
    }
    // 기둥의 옆면까지 같은 투영으로 그려 이동 중 폭과 가려짐이 함께 바뀐다.
    for (let i = -5; i <= endColumn + 5; i++) {
        const x = i * 350;
        const z = 520;
        face([
            { x: x - 42, y: 0, z },
            { x: x + 42, y: 0, z },
            { x: x + 42, y: 760, z },
            { x: x - 42, y: 760, z },
        ], '#d0cbb0', 90 + i * 3);
        face([
            { x: x + 42, y: 0, z },
            { x: x + 70, y: 0, z: z + 48 },
            { x: x + 70, y: 760, z: z + 48 },
            { x: x + 42, y: 760, z },
        ], '#4c666a', 91 + i * 3);
        face([
            { x: x - 67, y: 0, z: z - 18 },
            { x: x + 68, y: 0, z: z - 18 },
            { x: x + 60, y: 40, z: z - 18 },
            { x: x - 60, y: 40, z: z - 18 },
        ], '#dfd8b9', 92 + i * 3);
    }
}
/** 배우 앞의 넓은 기둥은 실제 시차로 빠르게 스치고, 마지막 타점은 가리지 않는다. */
function drawForeground(ctx, camera) {
    // 시작 준비와 마지막 타격은 추적·고정 구도 양쪽에서 비워 둔다.
    const columns = [-320, 950, 1510, 2250];
    for (const [i, x] of columns.entries()) {
        const z = -240;
        drawFace(ctx, camera, [
            { x: x - 45, y: 0, z },
            { x: x + 45, y: 0, z },
            { x: x + 45, y: 680, z },
            { x: x - 45, y: 680, z },
        ], '#263e48', 140 + i * 2);
        drawFace(ctx, camera, [
            { x: x + 45, y: 0, z },
            { x: x + 65, y: 0, z: z + 45 },
            { x: x + 65, y: 680, z: z + 45 },
            { x: x + 45, y: 680, z },
        ], '#59736e', 141 + i * 2);
    }
}
function drawProjectedActor(ctx, camera, anchor, draw) {
    const projected = project({ x: anchor.x - width / 2, y: 440 - anchor.y, z: 0 }, camera);
    ctx.save();
    ctx.translate(projected.x, projected.y);
    ctx.scale(projected.scale, projected.scale);
    ctx.translate(-anchor.x, -anchor.y);
    draw();
    ctx.restore();
}
export function drawBackgroundAnimation(ctx, frame) {
    const beat = sampleBeat(frame);
    const camera = cameraAt(frame, beat);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(camera.roll);
    ctx.translate(-width / 2, -height / 2);
    drawWorld(ctx, camera);
    const actorOptions = {
        action: 'uppercut',
        timeMs: beat.attackTimeMs,
        x: beat.attackerX,
        ground: battleLayout.attacker.ground,
    };
    const position = beat.phase === 'run'
        ? { x: beat.attackerX, ground: battleLayout.attacker.ground }
        : atahoPosition(frame, actorOptions);
    for (const shadow of [
        { x: position.x, radius: 58 },
        { x: beat.targetX, radius: 115 },
    ]) {
        const point = project({ x: shadow.x - width / 2, y: -5, z: 0 }, camera);
        ellipse(ctx, point.x, point.y, shadow.radius * point.scale, 10 * point.scale, '#263c484b');
    }
    drawProjectedActor(ctx, camera, { x: beat.targetX, y: battleLayout.target.ground }, () => drawBear(ctx, frame, { x: beat.targetX, timeMs: beat.timeMs }));
    drawProjectedActor(ctx, camera, { x: position.x, y: position.ground }, () => {
        if (beat.phase !== 'run') {
            drawAtaho(ctx, frame, actorOptions);
            return;
        }
        // 기존4장을16fps로 네 번 순환하고 마지막 발 디딤에서 장전으로 잇는다.
        drawAtahoRun(ctx, frame, {
            x: position.x,
            ground: position.ground,
            frameIndex: Math.floor(Math.max(0, frame.timeMs - backgroundRun.startMs) / runFrameMs),
        });
    });
    // 바닥에 붙은 짧은 먼지 자국은 접근 때만 남고 타격 전에 가라앉는다.
    const dust = frame.enhanced
        ? clamp((beat.timeMs - backgroundRun.startMs) / 100) *
            (1 - smooth((beat.timeMs - backgroundRun.endMs) / 250))
        : 0;
    if (dust > 0) {
        ctx.save();
        ctx.globalAlpha = dust * (frame.reducedMotion ? 0.12 : 0.42);
        for (let i = 0; i < 5; i++) {
            const p = project({
                x: position.x - width / 2 - 35 - i * 24,
                y: 1,
                z: mix(-15, 15, noise(i)),
            }, camera);
            line(ctx, [
                { x: p.x - 25 * p.scale, y: p.y },
                { x: p.x + 4 * p.scale, y: p.y - 3 },
            ], '#ede5c6', 3);
        }
        ctx.restore();
    }
    drawForeground(ctx, camera);
    ctx.restore();
}
