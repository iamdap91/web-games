import { burst, clamp, ease, fistSmear, lerp, line, rand, sky, smearBackground, smooth, speedLines, } from './drawing.js';
import { WorldScene } from './world.js';
const runCut = {
    start: 0.16,
    jump: 1.85,
    land: 2.24,
    contact: 2.46,
    runDistance: 56,
    ramp: 0.12,
    leapDistance: 6.7,
    leapHeight: 1.1,
    settleStart: 1.97,
    settleEnd: 2.25,
    targetGap: 1.05,
};
const runLandingZ = runCut.runDistance + runCut.leapDistance;
// 세계 이동과 카메라는 연속적으로, 그림 교체만 24fps의 1·2·3코마로 나눈다.
function poseTime(time, holds = 2) {
    return Math.floor(time * (24 / holds)) / (24 / holds);
}
function mixPoint(from, to, progress) {
    return {
        x: lerp(from.x, to.x, progress),
        y: lerp(from.y, to.y, progress),
        z: lerp(from.z, to.z, progress),
    };
}
function mixCamera(from, to, progress) {
    return {
        position: mixPoint(from.position, to.position, progress),
        target: mixPoint(from.target, to.target, progress),
        focal: lerp(from.focal ?? 760, to.focal ?? 760, progress),
        roll: lerp(from.roll ?? 0, to.roll ?? 0, progress),
    };
}
function colonnadeColumns(scene, layer) {
    const near = layer === 'near';
    for (let z = -30; z <= runLandingZ + 30; z += 10) {
        // 착지와 장전 앞의 가까운 기둥은 비워 공격이 또렷하게 보이게 한다.
        if (near && z > runCut.runDistance - 2 && z < runLandingZ + 8)
            continue;
        const x = near ? -7 : 7;
        scene.column({ x, y: 0, z }, 9, near ? 0.28 : 0.62);
        scene.box({ x, y: near ? 0.125 : 0.25, z }, { x: near ? 0.9 : 1.8, y: near ? 0.25 : 0.5, z: near ? 0.9 : 1.8 }, '#bba172');
        scene.box({ x, y: 8.7, z }, { x: near ? 1.05 : 2, y: 0.6, z: near ? 1.05 : 2 }, '#dfcc9f');
        scene.box({ x, y: 9.15, z: z + 5 }, { x: near ? 0.8 : 1.65, y: 0.5, z: 10.5 }, '#b29d73');
    }
}
function colonnade(scene) {
    const start = -36;
    const end = runLandingZ + 40;
    // 겹치는 큰 바닥 면을 두지 않아 평균 깊이 정렬이 돌 격자를 다시 덮지 않는다.
    for (let z = start, row = 0; z < end; z += 5, row++) {
        for (let column = -8; column < 8; column++) {
            const x = column * 3;
            scene.floorQuad([
                { x, y: 0.025, z },
                { x: x + 3, y: 0.025, z },
                { x: x + 3, y: 0.025, z: Math.min(z + 5, end) },
                { x, y: 0.025, z: Math.min(z + 5, end) },
            ], (row + column) % 2 ? '#b7a382' : '#e4d4ad');
        }
    }
    colonnadeColumns(scene, 'far');
}
function fallingTower(scene) {
    scene.floorBox({ x: 0, y: -0.45, z: 0 }, { x: 30, y: 0.9, z: 30 }, '#887d72');
    scene.floorBox({ x: 0, y: 0.025, z: 0 }, { x: 6, y: 0.05, z: 6 }, '#c8b998');
    for (let layer = 0; layer < 12; layer++) {
        const y = layer * 7;
        for (let index = 0; index < 8; index++) {
            const angle = (index / 8) * Math.PI * 2;
            const x = Math.cos(angle) * 8;
            const z = Math.sin(angle) * 8;
            const broken = (index + layer) % 5 === 1;
            scene.column({ x, y, z }, broken ? 3.3 : 6.8, 0.6);
            if (!broken)
                scene.box({ x, y: y + 6.6, z }, { x: 2, y: 0.6, z: 2 }, '#a89d8a');
        }
        for (let index = 0; index < 4; index++) {
            const seed = layer * 7 + index;
            const angle = seed * 2.399;
            const radius = 4.8 + rand(seed + 8) * 2.5;
            scene.box({
                x: Math.cos(angle) * radius,
                y: y + 2.3,
                z: Math.sin(angle) * radius,
            }, { x: 0.55 + rand(seed + 12), y: 0.3 + rand(seed + 23), z: 0.7 }, '#9a8a73');
        }
    }
}
function stairAngle(progress) {
    return progress * Math.PI * 4.8 - 0.6;
}
function stairPoint(progress) {
    const angle = stairAngle(progress);
    return {
        x: Math.sin(angle) * 5.5,
        y: progress * 15,
        z: Math.cos(angle) * 5.5,
    };
}
function spiralTower(scene) {
    // 난간을 두지 않아 계단의 좁은 디딤면과 열린 중앙이 보인다.
    for (let index = 0; index < 60; index++) {
        const a = stairPoint(index / 60);
        const b = stairPoint((index + 1) / 60);
        const angle = stairAngle(index / 60);
        const outward = { x: Math.sin(angle) * 1.35, z: Math.cos(angle) * 1.35 };
        const inward = { x: -outward.x, z: -outward.z };
        scene.quad([
            { x: a.x + inward.x, y: a.y, z: a.z + inward.z },
            { x: a.x + outward.x, y: a.y, z: a.z + outward.z },
            { x: b.x + outward.x, y: a.y, z: b.z + outward.z },
            { x: b.x + inward.x, y: a.y, z: b.z + inward.z },
        ], index % 2 ? '#bd9d70' : '#d9bd8a');
        scene.quad([
            { x: b.x + inward.x, y: a.y, z: b.z + inward.z },
            { x: b.x + outward.x, y: a.y, z: b.z + outward.z },
            { x: b.x + outward.x, y: b.y, z: b.z + outward.z },
            { x: b.x + inward.x, y: b.y, z: b.z + inward.z },
        ], '#776b5b');
    }
    for (let index = 0; index < 12; index++) {
        const angle = (index / 12) * Math.PI * 2;
        const x = Math.sin(angle) * 9.3;
        const z = Math.cos(angle) * 9.3;
        scene.column({ x, y: -1, z }, 18.5, 0.75);
        scene.box({ x, y: 17.7, z }, { x: 2.5, y: 0.55, z: 2.5 }, '#d9c89b');
    }
    const top = stairPoint(1);
    scene.floorBox({ x: top.x, y: 14.7, z: top.z }, { x: 8.5, y: 0.6, z: 8.5 }, '#d6bd8e');
}
function sceneBackground(ctx, frame, camera, build, smear, vertical = false) {
    const draw = (background) => {
        sky(background, frame.time);
        const scene = new WorldScene(background, camera, frame.time);
        build(scene);
        scene.render();
    };
    if (smear > 0.005) {
        smearBackground(ctx, frame.surfaces, draw, smear, vertical);
        return new WorldScene(ctx, camera, frame.time);
    }
    // 흐림 없는 장은 배우와 앞 기둥도 같은 깊이 순서로 정렬한다.
    sky(ctx, frame.time);
    const scene = new WorldScene(ctx, camera, frame.time);
    build(scene);
    return scene;
}
function contact(ctx, projected, time, contactTime, angle, patch) {
    if (!projected)
        return;
    const swing = (time - (contactTime - 0.12)) / 0.15;
    if (swing > 0 && swing < 1)
        fistSmear(ctx, projected.x, projected.y, swing, angle, Math.min(160, projected.scale * 1.4), patch);
    if (time >= contactTime && time < contactTime + 0.33)
        burst(ctx, projected.x, projected.y, (time - contactTime) / 0.33, Math.min(150, projected.scale * 1.8), '#fff0b4');
}
function spriteHeight(sprite) {
    return ((sprite.bounds?.bottom ?? sprite.image.naturalHeight) -
        (sprite.bounds?.top ?? 0));
}
function strikePoint(scene, sprite, position, hand) {
    const foot = scene.project(position);
    if (!foot)
        return null;
    const pixelScale = (2.5 * foot.scale) / spriteHeight(sprite);
    return {
        x: foot.x + (hand[0] - sprite.anchorX) * pixelScale,
        y: foot.y + (hand[1] - sprite.feetY) * pixelScale,
        scale: foot.scale,
    };
}
function strikeHeight(sequence, phase, reference) {
    const sprite = sequence[Math.min(sequence.length - 1, Math.floor(clamp(phase) * sequence.length))];
    // 코마별 알파 높이가 달라도 같은 원본 픽셀의 크기는 유지한다.
    return (2.5 * spriteHeight(sprite)) / spriteHeight(sequence[reference]);
}
function finishShade(ctx, progress) {
    if (progress <= 0)
        return;
    const shade = ctx.createRadialGradient(640, 325, 200, 640, 350, 850);
    shade.addColorStop(0, '#05151b00');
    shade.addColorStop(1, '#07151bd9');
    ctx.save();
    ctx.globalAlpha = smooth(progress) * 0.65;
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
}
function runPoint(time) {
    if (time < runCut.jump) {
        const duration = runCut.jump - runCut.start;
        const elapsed = clamp((time - runCut.start) / duration) * duration;
        const travel = elapsed < runCut.ramp
            ? (elapsed * elapsed) / (2 * runCut.ramp)
            : elapsed - runCut.ramp / 2;
        return {
            x: 0,
            y: 0,
            z: (runCut.runDistance * travel) / (duration - runCut.ramp / 2),
        };
    }
    const jump = clamp((time - runCut.jump) / (runCut.land - runCut.jump));
    return {
        x: 0,
        y: Math.sin(jump * Math.PI) * runCut.leapHeight,
        // 질주 속도를 도약으로 이어받고 착지에서 전진을 멈춰 주먹을 읽힌다.
        z: runCut.runDistance + (2 * jump - jump * jump) * runCut.leapDistance,
    };
}
function runShadow(ctx, scene, position, radius) {
    const points = Array.from({ length: 16 }, (_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        return scene.project({
            x: position.x + Math.cos(angle) * radius.x,
            y: 0.03,
            z: position.z + Math.sin(angle) * radius.z,
        });
    });
    if (points.some((point) => !point))
        return;
    ctx.save();
    ctx.fillStyle = '#263941';
    ctx.globalAlpha = 0.24;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1))
        ctx.lineTo(point.x, point.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
function drawBackgroundRun(ctx, frame) {
    const time = Math.max(0, Math.min(3.3, frame.time));
    const point = runPoint(time);
    const hit = time >= runCut.contact;
    const hitAge = Math.max(0, time - runCut.contact);
    const bearPoint = {
        x: 0,
        y: hit
            ? Math.sin(clamp((time - runCut.contact) / 0.25) * Math.PI) * 0.5
            : 0,
        z: runLandingZ +
            runCut.targetGap +
            (hit ? smooth((time - runCut.contact) / 0.3) * 1.2 : 0),
    };
    const chase = {
        position: {
            x: -9.5,
            y: 1.25 + point.y * 0.25,
            z: point.z + 5.5,
        },
        target: { x: 0, y: 1.55 + point.y * 0.25, z: point.z + 2 },
        focal: 1380,
        roll: -0.035 * smooth((time - runCut.start) / 0.14),
    };
    const finish = {
        position: { x: -7.4, y: 1.1 + point.y * 0.25, z: point.z + 3.2 },
        target: { x: 0, y: 1.7 + point.y * 0.25, z: point.z + 1.1 },
        focal: 1000,
        roll: 0,
    };
    const camera = mixCamera(chase, finish, smooth((time - runCut.settleStart) / (runCut.settleEnd - runCut.settleStart)));
    const smear = time >= runCut.jump && time < runCut.settleEnd
        ? Math.sin(clamp((time - runCut.jump) / (runCut.settleEnd - runCut.jump)) *
            Math.PI) * 0.48
        : 0;
    const scene = sceneBackground(ctx, frame, camera, colonnade, smear);
    scene.render();
    // 그림자도 같은 바닥에 투영하고, 가까운 기둥과 배우보다 먼저 합성한다.
    runShadow(ctx, scene, point, { x: 0.72, z: 0.42 });
    runShadow(ctx, scene, bearPoint, { x: 1.1, z: 0.65 });
    // 근경은 흐린 배경 판에 굽지 않고 배우와 같은 깊이 순서로 합성한다.
    colonnadeColumns(scene, 'near');
    if (time < runCut.land) {
        const running = time >= runCut.start && time < runCut.jump;
        scene.hero(frame.assets, point, time < runCut.start ? 'idle' : running ? 'run' : 'jump', running
            ? Math.floor((time - runCut.start) * 16) / 4
            : lerp(0.12, 1, clamp((poseTime(time, 1) - runCut.jump) / (runCut.land - runCut.jump))), { facing: 0, rotation: camera.roll });
    }
    else {
        const phase = time < runCut.contact
            ? clamp((poseTime(time, 1) - runCut.land) / (runCut.contact - runCut.land)) *
                (2 / 7)
            : time < runCut.contact + 0.07
                ? 2.5 / 7
                : Math.min(6.5 / 7, (3 + Math.floor((time - runCut.contact - 0.07) / 0.08)) / 7);
        scene.hero(frame.assets, point, 'uppercut', phase, {
            facing: 0,
            rotation: camera.roll,
            height: strikeHeight(frame.assets.hero.uppercut['south-east'], phase, 2),
        });
    }
    scene.bear(frame.assets, bearPoint, hitAge > 0.28 ? 'defeat' : hit ? 'hit' : 'stand', hitAge > 0.28
        ? clamp((hitAge - 0.28) / 0.24)
        : hit
            ? clamp(hitAge / 0.28)
            : poseTime(time, 3) * 2, { rotation: camera.roll });
    scene.render();
    contact(ctx, strikePoint(scene, frame.assets.hero.uppercut['south-east'][2], { x: 0, y: 0, z: runLandingZ }, [62, 34]), time, runCut.contact, -1.15, frame.assets.fistPatch);
    finishShade(ctx, (time - 2.8) / 0.2);
}
function fallPoint(time) {
    const falling = Math.min(time, 2.58);
    return {
        x: Math.sin(falling * 1.3) * 0.5 * (1 - smooth((time - 2.16) / 0.3)),
        y: time < 2.58
            ? Math.max(1.95, 67 - 14 * falling - 5 * falling * falling)
            : 1.95 * (1 - smooth((time - 2.65) / 0.33)),
        z: 0,
    };
}
function fallingBrush(ctx, scene, time, amount) {
    ctx.save();
    ctx.globalAlpha = amount * 0.32;
    for (let index = 0; index < 16; index++) {
        const y = Math.floor(fallPoint(time).y / 7) * 7 + (index % 4) * 7 - 7;
        const angle = (Math.floor(index / 4) * Math.PI) / 2;
        const position = scene.project({
            x: Math.cos(angle) * 8,
            y,
            z: Math.sin(angle) * 8,
        });
        if (!position || position.x < -100 || position.x > 1380)
            continue;
        line(ctx, [
            [position.x, position.y],
            [position.x + 4, position.y - 80 - amount * 170],
        ], '#9e9883', Math.min(70, position.scale * 0.8));
    }
    ctx.restore();
}
function drawFalling(ctx, frame) {
    const time = Math.max(0, Math.min(3.7, frame.time));
    const fall = fallPoint(time);
    const orbit = time * 1.8 + 0.3;
    const rotation = Math.PI * (1 - smooth((time - 1.88) / 0.34));
    const chase = {
        position: {
            x: Math.sin(orbit) * 5.7,
            y: fall.y + 4.1,
            z: Math.cos(orbit) * 5.7,
        },
        target: { x: fall.x, y: fall.y + 1.25, z: 0 },
        focal: 780,
        roll: -0.14 + Math.sin(time * 1.7) * 0.15,
    };
    const finish = {
        position: { x: -6.2, y: 1.4, z: 7.6 },
        target: { x: 0, y: 2.6, z: 0.5 },
        focal: 920,
        roll: 0,
    };
    const camera = mixCamera(chase, finish, smooth((time - 2.24) / 0.28));
    const velocity = 14 + Math.min(time, 2.5) * 10;
    const smear = time < 2.42 ? clamp((velocity - 14) / 25) * 0.92 : 0;
    const scene = sceneBackground(ctx, frame, camera, fallingTower, smear, true);
    if (time < 2.22) {
        scene.hero(frame.assets, { ...fall, y: fall.y + 1.25 * (1 - Math.cos(rotation)) }, 'jump', 0.46, {
            facing: 0,
            rotation,
        });
    }
    else {
        const phase = time < 2.58
            ? lerp(3 / 9, 4.5 / 9, clamp((poseTime(time, 1) - 2.22) / 0.36))
            : time < 2.69
                ? 5.5 / 9
                : lerp(6 / 9, 8.5 / 9, clamp((time - 2.69) / 0.3));
        scene.hero(frame.assets, fall, 'slam', phase, {
            facing: 0,
            height: strikeHeight(frame.assets.hero.slam['south-east'], phase, 5),
        });
    }
    const hit = time >= 2.58;
    scene.bear(frame.assets, {
        x: 0.8 + (hit ? smooth((time - 2.58) / 0.35) * 0.7 : 0),
        y: 0,
        z: 0.9 + (hit ? smooth(clamp((time - 2.58) / 0.35)) * 0.5 : 0),
    }, time >= 2.86 ? 'defeat' : hit ? 'hit' : 'stand', time >= 2.86
        ? clamp((time - 2.86) / 0.44)
        : hit
            ? clamp((time - 2.58) / 0.28)
            : poseTime(time, 3) * 2);
    scene.render();
    if (time < 2.42) {
        fallingBrush(ctx, scene, time, smear);
        speedLines(ctx, time, smear * 0.55, true);
    }
    contact(ctx, strikePoint(scene, frame.assets.hero.slam['south-east'][5], { x: 0, y: 1.95, z: 0 }, [64, 69]), time, 2.58, 1.3);
    finishShade(ctx, (time - 3.05) / 0.28);
}
function stairProgress(time) {
    // 올려다보는 구간은 같은 세계 거리를 절반 시간에 지나가도록 접는다.
    if (time < 0.75)
        return lerp(0, 0.26, time / 0.75);
    if (time < 1.34)
        return lerp(0.26, 0.61, (time - 0.75) / 0.59);
    if (time < 1.7)
        return lerp(0.61, 1, (time - 1.34) / 0.36);
    return 1;
}
function drawStairs(ctx, frame) {
    const time = Math.max(0, Math.min(3.05, frame.time));
    const progress = stairProgress(time);
    const step = stairPoint(progress);
    const angle = stairAngle(progress);
    const jump = clamp((time - 1.7) / 0.9);
    const point = {
        x: step.x + (time > 1.7 ? Math.cos(angle) * ease(jump) * 1.4 : 0),
        y: step.y + Math.sin(jump * Math.PI) * 3,
        z: step.z - (time > 1.7 ? Math.sin(angle) * ease(jump) * 1.4 : 0),
    };
    const orbit = angle - 0.8;
    // 중앙 빈 공간의 반경1.5m 안에서 돌아 외곽 기둥이 주연을 덮지 않는다.
    const orbitRadius = 1.5;
    const height = time < 0.75
        ? lerp(9, 3.5, smooth(time / 0.75))
        : time < 1.34
            ? lerp(3.5, -1.2, smooth((time - 0.75) / 0.59))
            : lerp(-1.2, 0.4, smooth(clamp((time - 1.34) / 0.36)));
    const chase = {
        position: {
            x: -Math.sin(orbit) * orbitRadius,
            y: step.y + height,
            z: -Math.cos(orbit) * orbitRadius,
        },
        target: { x: point.x, y: point.y + 1.2, z: point.z },
        focal: lerp(650, 760, smooth(clamp(time / 1.5))) -
            Math.sin(jump * Math.PI) * 110,
        roll: Math.sin(time * 2.1) * 0.055,
    };
    const end = stairPoint(1);
    const landing = {
        x: end.x + Math.cos(stairAngle(1)) * 1.4,
        y: end.y,
        z: end.z - Math.sin(stairAngle(1)) * 1.4,
    };
    const finish = {
        position: { x: end.x - 6.2, y: 16.4, z: end.z + 7.6 },
        target: { x: landing.x, y: 17.5, z: landing.z + 0.5 },
        focal: 920,
        roll: 0,
    };
    const camera = mixCamera(chase, finish, smooth((time - 2.08) / 0.26));
    const smear = time > 1.68 && time < 2.18
        ? Math.sin(clamp((time - 1.68) / 0.5) * Math.PI) * 0.8
        : 0;
    const scene = sceneBackground(ctx, frame, camera, spiralTower, smear);
    if (time < 1.7)
        scene.hero(frame.assets, point, 'run', poseTime(time, 2) * 3, {
            facing: angle + Math.PI / 2,
        });
    else if (time < 2.19)
        scene.hero(frame.assets, point, 'jump', (poseTime(time, 1) - 1.7) / 0.7, {
            facing: 0,
        });
    else {
        const phase = time < 2.4
            ? lerp(3 / 9, 4.5 / 9, clamp((poseTime(time, 1) - 2.19) / 0.21))
            : time < 2.47
                ? 5.5 / 9
                : lerp(6 / 9, 8.5 / 9, clamp((time - 2.47) / 0.2));
        scene.hero(frame.assets, point, 'slam', phase, {
            facing: 0,
            height: strikeHeight(frame.assets.hero.slam['south-east'], phase, 5),
        });
    }
    const hit = time >= 2.4;
    scene.bear(frame.assets, {
        x: landing.x + 0.8 + (hit ? smooth((time - 2.4) / 0.24) * 0.7 : 0),
        y: landing.y,
        z: landing.z + 0.9 + (hit ? smooth(clamp((time - 2.4) / 0.24)) * 0.5 : 0),
    }, time >= 2.53 ? 'defeat' : hit ? 'hit' : 'stand', time >= 2.53
        ? clamp((time - 2.53) / 0.2)
        : hit
            ? clamp((time - 2.4) / 0.13)
            : poseTime(time, 3) * 2);
    scene.render();
    if (smear > 0)
        speedLines(ctx, time, smear * 0.28);
    contact(ctx, strikePoint(scene, frame.assets.hero.slam['south-east'][5], {
        x: landing.x,
        y: landing.y + Math.sin((0.7 / 0.9) * Math.PI) * 3,
        z: landing.z,
    }, [64, 69]), time, 2.4, 1.2);
    finishShade(ctx, (time - 2.65) / 0.1);
}
export const journeyCuts = [
    {
        id: 'background-run',
        title: '背景動画 · 열주 질주',
        kind: '3D',
        duration: 3.3,
        description: '곰왕 방향 앞쪽의 낮은 사선 카메라가 아타호와 함께 후퇴한다. 빠른 열주 질주와 짧은 도약 뒤 구도를 정착시키고 어퍼컷 한 번으로 끝낸다.',
        beats: [
            { time: runCut.start, label: '사선 동행 · 급가속' },
            { time: 0.75, label: '긴 질주 · 근경 시차' },
            { time: runCut.jump, label: '짧은 도약 · 배경 스미어' },
            { time: runCut.settleEnd, label: '타격 구도 정착' },
            { time: runCut.contact, label: '주먹 접촉 · 짧은 정지' },
            { time: 3, label: '회수 · 곰왕 쓰러짐' },
        ],
        draw: drawBackgroundRun,
    },
    {
        id: 'falling-background',
        title: '落下 · 무너진 석주 탑',
        kind: '3D',
        duration: 3.7,
        description: '14→39m/s 낙하와 나선 추적 카메라, 세로 배경 붓자국 뒤 공중 양손 내려찍기로 종결한다. 머리부터 떨어지는 장은 기존 점프 원본의 카드 회전이며 새 낙하 자세를 그린 재현은 아니다.',
        beats: [
            { time: 0, label: '머리부터 낙하 · 나선 추적' },
            { time: 1, label: '낙하 가속 · 배경만 세로 스미어' },
            { time: 1.88, label: '낙하 중 자세 회복' },
            { time: 2.22, label: '양손 내려찍기 장전' },
            { time: 2.58, label: '공중 접촉 · 앙각 정착' },
            { time: 3.3, label: '착지 · 곰왕 쓰러짐' },
        ],
        draw: drawFalling,
    },
    {
        id: 'spiral-stairs',
        title: '螺旋 · 열린 계단 60칸',
        kind: '3D',
        duration: 3.05,
        description: '난간 없는 60칸 나선 계단을 실제 3D로 오르며 하이→근접→로우 앵글을 잇고, 낮은 구간을 압축한 뒤 하늘 열린 꼭대기에 내려찍는다. 계단·카메라는 입체이고 인물은 방향별 평면 원본이다. 특정 작품 장면의 정확한 자세 재현은 아니다.',
        beats: [
            { time: 0, label: '60칸 · 높은 시점에서 진입' },
            { time: 0.75, label: '허공에서 파고드는 카메라' },
            { time: 1.34, label: '로우 앵글 구간 압축' },
            { time: 1.7, label: '꼭대기 도약 · 배경 스미어' },
            { time: 2.4, label: '공중 내려찍기 접촉' },
            { time: 2.75, label: '꼭대기 착지 · 종결' },
        ],
        draw: drawStairs,
    },
];
