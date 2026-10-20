import { clamp, ellipse, label, line, mix, noise, polygon, smooth, } from './drawing.js';
import { opticalScene, overlayFrame, panorama } from './camera-scene.js';
import { atahoPosition, battleLayout, drawBattleActors } from './battle.js';
import { height, width } from './types.js';
/** 시각을 같은 연속 난수 곡선에 매핑해 역탐색에서도 불규칙한 진동을 재현한다. */
function cameraDrift(time, seed) {
    const index = Math.floor(time);
    return (mix(noise(index + seed), noise(index + seed + 1), smooth(time - index)) *
        2 -
        1);
}
function screenShake(ctx, frame) {
    const hitTime = frame.timeMs - battleLayout.contactMs;
    const envelope = hitTime < 0 ? 0 : Math.pow(1 - clamp(hitTime / 750), 2);
    const amplitude = frame.enhanced
        ? (frame.reducedMotion ? 2 : 32) * envelope
        : 0;
    const x = cameraDrift(hitTime * 0.037, 7) * amplitude;
    const y = cameraDrift(hitTime * 0.041, 101) * amplitude * 0.56;
    ctx.save();
    ctx.translate(width / 2 + x, height / 2 + y);
    ctx.rotate(cameraDrift(hitTime * 0.029, 211) *
        envelope *
        (frame.enhanced ? (frame.reducedMotion ? 0.001 : 0.018) : 0));
    ctx.scale(1.12, 1.12);
    ctx.translate(-width / 2, -height / 2);
    opticalScene(ctx, frame);
    ctx.restore();
    overlayFrame(ctx);
    label(ctx, '1800ms의 한 충격 → 빠르게 감쇠 → 정지 · 화면 안내는 고정');
}
function handheld(ctx, frame) {
    const amplitude = frame.enhanced ? (frame.reducedMotion ? 0.65 : 7.5) : 0;
    const t = frame.timeMs / 1000;
    const x = cameraDrift(t * 2.7, 19) * amplitude;
    const y = cameraDrift(t * 3.8, 83) * amplitude;
    const roll = cameraDrift(t * 2.1, 163) * amplitude * 0.0014;
    ctx.save();
    ctx.translate(width / 2 + x, height / 2 + y);
    ctx.rotate(roll);
    ctx.scale(1.07, 1.07);
    ctx.translate(-width / 2, -height / 2);
    opticalScene(ctx, frame);
    ctx.restore();
    overlayFrame(ctx);
    label(ctx, '작은 위치·롤이 계속 이어짐 · 특정 충격이나 감쇠 사건 없음');
}
function contactMulti(ctx, frame) {
    const amount = frame.enhanced
        ? smooth((frame.timeMs - 250) / 2850) * (frame.reducedMotion ? 60 : 480)
        : 0;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#182738');
    sky.addColorStop(1, '#738d9b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    ellipse(ctx, 765 - amount * 0.05, 95, 43, 43, '#d6e5e8');
    for (let i = -1; i < 6; i++) {
        const x = i * 240 - amount * 0.2;
        polygon(ctx, [
            { x, y: 440 },
            { x: x + 100, y: 170 },
            { x: x + 260, y: 440 },
        ], '#91a8ba');
    }
    ctx.fillStyle = '#c0d1dc';
    ctx.fillRect(0, 410, width, 130);
    ctx.save();
    ctx.translate(-amount * 0.48, 0);
    // 중경 지면도 배우와 같은 판으로 움직인다. 고정된 기본 무대의 나무를 중복해서 남기지 않는다.
    for (let i = -2; i < 14; i++) {
        const x = i * 90;
        line(ctx, [
            { x, y: 457 },
            { x: x + 32, y: 461 },
        ], '#91a8b8', 2);
        line(ctx, [
            { x: x + 39, y: 507 },
            { x: x + 81, y: 511 },
        ], '#a4bac7', 2);
    }
    drawBattleActors(ctx, frame);
    ctx.restore();
    for (const origin of [-340, 100, 580, 1080, 1520]) {
        const x = origin - amount;
        ctx.fillStyle = '#29495e';
        ctx.fillRect(x, 40, 28, 500);
        ellipse(ctx, x + 14, 95, 76, 85, '#3c6177');
    }
    label(ctx, '평면 셀의 서로 다른 수평 이송 · 각 층의 그림 크기는 일정');
}
function flicker(ctx, frame) {
    opticalScene(ctx, frame);
    if (frame.enhanced) {
        // 노출의 색 차이를 키우되 짧은 섬광을 연사하지 않고 한 색을 충분히 유지한다.
        const warm = frame.reducedMotion || Math.floor(frame.timeMs / 400) % 2 === 0;
        ctx.fillStyle = frame.reducedMotion
            ? '#edc77d24'
            : warm
                ? '#edbb6460'
                : '#638fc652';
        ctx.fillRect(0, 0, width, height);
    }
    label(ctx, frame.reducedMotion
        ? '움직임 줄이기 · 색 교대 없이 낮은 노출 유지'
        : '금빛·푸른 노출을400ms씩 유지하고 교대 · 단발 섬광과 다름');
}
function followPan(ctx, frame) {
    const initial = atahoPosition(frame, { timeMs: 0 });
    const current = atahoPosition(frame);
    const cameraX = frame.enhanced ? current.x - initial.x : 0;
    const cameraY = frame.enhanced ? current.ground - initial.ground : 0;
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    panorama(ctx);
    drawBattleActors(ctx, frame);
    ctx.restore();
    overlayFrame(ctx);
    label(ctx, frame.enhanced
        ? '같은 어퍼컷의 실제 아타호 위치를 따라 전장을 이송'
        : '고정 화면 · 같은 접근과 어퍼컷을 유지');
}
function slowQuickPan(ctx, frame) {
    const slow = smooth(frame.timeMs / 1450);
    const quickDuration = frame.reducedMotion ? 1300 : 180;
    const quick = smooth((frame.timeMs - 1850) / quickDuration);
    const slowFocus = mix(240, battleLayout.attacker.x - 130, slow);
    const focus = mix(slowFocus, battleLayout.target.x + 20, quick);
    const offset = frame.enhanced ? focus - width / 2 : 0;
    ctx.save();
    ctx.translate(-offset, 0);
    panorama(ctx);
    drawBattleActors(ctx, frame);
    ctx.restore();
    label(ctx, frame.timeMs < 1850
        ? '지와 PAN · 천천히 주변을 읽힘'
        : '퀵 PAN · 곰왕 쪽으로 빠르게 구도 전환');
}
function trackUpBack(ctx, frame) {
    const up = smooth((frame.timeMs - 500) / 900);
    const back = smooth((frame.timeMs - 2400) / 1050);
    const max = frame.reducedMotion ? 1.22 : 2.15;
    const zoom = frame.enhanced ? 1 + (max - 1) * up * (1 - back) : 1;
    ctx.save();
    ctx.translate(battleLayout.impact.x, battleLayout.impact.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-battleLayout.impact.x, -battleLayout.impact.y);
    opticalScene(ctx, frame);
    ctx.restore();
    label(ctx, frame.timeMs < 2400
        ? 'T.U · 같은 중심으로 그림을 확대'
        : 'T.B · 다시 넓은 구도로 축소');
}
function multiplane(ctx, frame) {
    const progress = frame.enhanced
        ? smooth(frame.timeMs / 3500) * (frame.reducedMotion ? 0.4 : 1)
        : 0;
    const cameraX = progress * 0.6;
    const cameraZ = progress * 1.65;
    const project = (point) => {
        const scale = 700 / (point.z - cameraZ);
        return {
            x: width / 2 + (point.x - cameraX) * scale,
            y: 280 + (1.6 - point.y) * scale,
            scale,
        };
    };
    ctx.fillStyle = '#57748c';
    ctx.fillRect(0, 0, width, height);
    const moon = project({ x: 14, y: 10.85, z: 35 });
    ellipse(ctx, moon.x, moon.y, moon.scale * 2.15, moon.scale * 2.15, '#eaf1f5');
    const mountain = [
        { x: -9, y: -1, z: 17 },
        { x: -4, y: 3.8, z: 17 },
        { x: 0, y: -0.5, z: 17 },
        { x: 5, y: 3, z: 17 },
        { x: 12, y: -1, z: 17 },
    ];
    polygon(ctx, [
        ...mountain.map(project),
        { x: width + 100, y: height },
        { x: -100, y: height },
    ], '#94aebf');
    ctx.fillStyle = '#c1d1dd';
    ctx.fillRect(0, 280, width, height - 280);
    for (const z of [5, 7, 10, 14]) {
        const left = project({ x: -12, y: 0, z });
        const right = project({ x: 12, y: 0, z });
        line(ctx, [left, right], '#a4a07f45', 1);
    }
    for (const x of [-6, -2, 2, 6])
        line(ctx, [project({ x, y: 0, z: 20 }), project({ x, y: 0, z: 3 })], '#a4a07f45', 1);
    // 배우 두 원본은 같은 수직 판에 둔다. PNG를 돌리지 않고 판의 위치와 균등 배율만 투영한다.
    const middle = project({ x: 0, y: 0, z: 7 });
    ctx.save();
    ctx.translate(middle.x, middle.y);
    ctx.scale(middle.scale / 100, middle.scale / 100);
    ctx.translate(-width / 2, -battleLayout.attacker.ground);
    drawBattleActors(ctx, frame);
    ctx.restore();
    for (const x of [-1.25, 1.9]) {
        const base = project({ x, y: 0, z: 3.5 });
        const top = project({ x, y: 3.2, z: 3.5 });
        ctx.fillStyle = '#29495e';
        ctx.fillRect(base.x - base.scale * 0.08, top.y, base.scale * 0.16, base.y - top.y);
        ellipse(ctx, top.x, top.y + 20, base.scale * 0.55, base.scale * 0.35, '#3c6177');
    }
    label(ctx, '원본 전투는 수직 판으로 유지 · 앞뒤 깊이에 따라 크기와 시차만 변화');
}
export function drawCameraMovement(ctx, id, frame) {
    switch (id) {
        case 'camera-screen-shake':
            screenShake(ctx, frame);
            break;
        case 'camera-contact-multi':
            contactMulti(ctx, frame);
            break;
        case 'camera-flicker':
            flicker(ctx, frame);
            break;
        case 'camera-follow-pan':
            followPan(ctx, frame);
            break;
        case 'camera-slow-quick-pan':
            slowQuickPan(ctx, frame);
            break;
        case 'camera-track-up-back':
            trackUpBack(ctx, frame);
            break;
        case 'camera-handheld':
            handheld(ctx, frame);
            break;
        case 'camera-multiplane':
            multiplane(ctx, frame);
            break;
        default:
            return false;
    }
    return true;
}
