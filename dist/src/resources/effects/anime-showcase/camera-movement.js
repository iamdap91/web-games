import { clamp, label, mix, noise, gameStage, smooth } from './drawing.js';
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
    // 첫 진동을 강하게 읽힌 뒤 곧 가라앉혀 접촉 뒤의 원화가 오래 가려지지 않게 한다.
    const envelope = hitTime < 0 ? 0 : Math.pow(1 - clamp(hitTime / 560), 2.4);
    const amplitude = frame.enhanced
        ? (frame.reducedMotion ? 2 : 38) * envelope
        : 0;
    const x = cameraDrift(hitTime * 0.046, 7) * amplitude;
    const y = cameraDrift(hitTime * 0.051, 101) * amplitude * 0.44;
    ctx.save();
    ctx.translate(width / 2 + x, height / 2 + y);
    ctx.rotate(cameraDrift(hitTime * 0.035, 211) *
        envelope *
        (frame.enhanced ? (frame.reducedMotion ? 0.001 : 0.014) : 0));
    ctx.scale(1.14, 1.14);
    ctx.translate(-width / 2, -height / 2);
    opticalScene(ctx, frame);
    ctx.restore();
    overlayFrame(ctx);
    label(ctx, '접촉의 짧고 큰 진동 → 빠르게 정착 · 화면 안내 고정');
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
    // 렌더한 게임 자재의 판은 배율을 유지한 채 서로 다른 거리만큼 이송한다.
    ctx.save();
    ctx.translate(-amount * 0.2, 0);
    panorama(ctx, frame);
    ctx.restore();
    ctx.save();
    ctx.translate(-amount * 0.48, 0);
    drawBattleActors(ctx, frame);
    ctx.restore();
    ctx.save();
    ctx.translate(-amount, 0);
    gameStage(ctx, frame, { layer: 'foreground', focus: { x: 0, y: 0, z: 0 } });
    ctx.restore();
    label(ctx, '게임 배경·배우·근경 판의 서로 다른 수평 이송 · 각 판의 크기는 일정');
}
function flicker(ctx, frame) {
    opticalScene(ctx, frame);
    if (frame.enhanced) {
        // 노출의 색 차이를 키우되 짧은 섬광을 연사하지 않고 한 색을 충분히 유지한다.
        const warm = frame.reducedMotion ||
            Math.floor((frame.exposureTimeMs ?? frame.timeMs) / 400) % 2 === 0;
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
    panorama(ctx, frame);
    drawBattleActors(ctx, frame);
    ctx.restore();
    overlayFrame(ctx);
    label(ctx, frame.enhanced
        ? '같은 어퍼컷의 실제 아타호 위치를 따라 전장을 이송'
        : '고정 화면 · 같은 접근과 어퍼컷을 유지');
}
function slowQuickPan(ctx, frame) {
    const slow = smooth(frame.timeMs / 1450);
    const quickDuration = frame.reducedMotion ? 900 : 140;
    const quickStart = battleLayout.contactMs - quickDuration;
    const quick = smooth((frame.timeMs - quickStart) / quickDuration);
    const slowFocus = mix(240, battleLayout.attacker.x - 130, slow);
    const focus = mix(slowFocus, battleLayout.target.x + 20, quick);
    const offset = frame.enhanced ? focus - width / 2 : 0;
    ctx.save();
    ctx.translate(-offset, 0);
    panorama(ctx, frame);
    drawBattleActors(ctx, frame);
    ctx.restore();
    label(ctx, frame.timeMs < quickStart
        ? '지와 PAN · 천천히 주변을 읽힘'
        : frame.timeMs < battleLayout.contactMs
            ? '퀵 PAN · 접촉 직전 곰왕 쪽으로 전환'
            : '접촉에 구도 정착 · 같은 타격을 선명하게 읽힘');
}
function trackUpBack(ctx, frame) {
    const up = smooth((frame.timeMs - 900) / 900);
    const back = smooth((frame.timeMs - 2180) / 820);
    const max = frame.reducedMotion ? 1.22 : 2.15;
    const zoom = frame.enhanced ? 1 + (max - 1) * up * (1 - back) : 1;
    ctx.save();
    ctx.translate(battleLayout.impact.x, battleLayout.impact.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-battleLayout.impact.x, -battleLayout.impact.y);
    opticalScene(ctx, frame);
    ctx.restore();
    label(ctx, frame.timeMs < 2180
        ? 'T.U · 접촉에 근접 구도 도착 · 타점을 유지'
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
    const camera = {
        position: { x: cameraX, y: 1.6, z: -cameraZ },
        target: { x: cameraX, y: 1.6, z: -cameraZ - 10 },
        focal: 700,
    };
    const options = { camera, principalY: 280, focus: { x: 0, y: 0, z: -7 } };
    gameStage(ctx, frame, options);
    // 배우 두 원본은 같은 수직 판에 둔다. PNG를 돌리지 않고 판의 위치와 균등 배율만 투영한다.
    const middle = project({ x: 0, y: 0, z: 7 });
    ctx.save();
    ctx.translate(middle.x, middle.y);
    ctx.scale(middle.scale / 100, middle.scale / 100);
    ctx.translate(-width / 2, -battleLayout.attacker.ground);
    drawBattleActors(ctx, frame);
    ctx.restore();
    gameStage(ctx, frame, { ...options, layer: 'foreground' });
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
