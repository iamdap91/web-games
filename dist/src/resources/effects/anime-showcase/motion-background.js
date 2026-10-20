import { gameDust } from '../../cutscenes/game-effects.js';
import { atahoPosition, battleLayout, drawAtaho, drawAtahoRun, drawBear, } from './battle.js';
import { clamp, ellipse, mix, gameStage, smooth } from './drawing.js';
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
/** 기존 픽셀 월드의 투영축을 게임 질주 길의 m 좌표로 대응한다. */
function drawWorld(ctx, camera, frame, layer = 'background') {
    const unit = 100;
    const x = (camera.z - 780) / unit;
    const z = camera.x / unit;
    const beat = sampleBeat(frame);
    gameStage(ctx, frame, {
        kind: 'run',
        camera: {
            position: { x, y: camera.eyeHeight / unit, z },
            target: {
                x: x + Math.cos(camera.yaw) * 10,
                y: camera.eyeHeight / unit,
                z: z + Math.sin(camera.yaw) * 10,
            },
            focal: 780,
        },
        principalY: camera.horizonY,
        focus: { x: 0, y: 0, z: (beat.attackerX - width / 2) / unit },
        layer,
        timeMs: beat.timeMs,
    });
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
    // 기울인 판 바깥의 얇은 모서리도 같은 게임 배경으로 채운다.
    if (camera.roll !== 0)
        drawWorld(ctx, camera, frame);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(camera.roll);
    ctx.translate(-width / 2, -height / 2);
    drawWorld(ctx, camera, frame);
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
        const p = project({ x: position.x - width / 2 - 24, y: 1, z: 0 }, camera);
        const elapsed = Math.max(0, beat.timeMs - backgroundRun.startMs);
        const footfall = Math.floor(Math.min(elapsed, backgroundRun.endMs - backgroundRun.startMs) / 250) * 250;
        gameDust(ctx, frame.assets.effects, {
            x: p.x,
            y: p.y,
            progress: (elapsed - footfall) / 350,
            size: 100 * p.scale,
        });
        ctx.restore();
    }
    drawWorld(ctx, camera, frame, 'foreground');
    ctx.restore();
}
