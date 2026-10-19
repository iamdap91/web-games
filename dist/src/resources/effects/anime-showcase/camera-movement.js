import { actor, clamp, ellipse, label, line, mix, palette, polygon, smooth, stage, } from './drawing.js';
import { opticalScene, overlayFrame, panorama } from './camera-scene.js';
import { height, width } from './types.js';
function screenShake(ctx, frame) {
    const hitTime = frame.timeMs - 1800;
    const envelope = hitTime < 0 ? 0 : Math.pow(1 - clamp(hitTime / 750), 2);
    const amplitude = frame.enhanced
        ? (frame.reducedMotion ? 2 : 19) * envelope
        : 0;
    const x = Math.sin(hitTime * 0.052) * amplitude;
    const y = Math.sin(hitTime * 0.073 + 0.8) * amplitude * 0.56;
    ctx.save();
    ctx.translate(x, y);
    stage(ctx);
    const punch = smooth((frame.timeMs - 1200) / 600);
    actor(ctx, 420 + punch * 90, 430, 1.05, { arm: punch, lean: punch * 12 });
    actor(ctx, 660, 430, 1.05, {
        color: palette.blue,
        facing: -1,
        lean: envelope * 20,
    });
    if (hitTime >= 0 && hitTime < 180) {
        ctx.globalAlpha *= 1 - hitTime / 180;
        ellipse(ctx, 615, 300, 36, 18, palette.paper);
    }
    ctx.restore();
    overlayFrame(ctx);
    label(ctx, '1800ms의 한 충격 → 빠르게 감쇠 → 정지 · 화면 안내는 고정');
}
function handheld(ctx, frame) {
    const amplitude = frame.enhanced ? (frame.reducedMotion ? 0.65 : 4.4) : 0;
    const t = frame.timeMs / 1000;
    const x = (Math.sin(t * 2.7) + Math.sin(t * 6.1) * 0.25) * amplitude;
    const y = (Math.sin(t * 3.8 + 0.7) + Math.sin(t * 7.3) * 0.2) * amplitude;
    const roll = Math.sin(t * 2.1 + 0.3) * amplitude * 0.0014;
    ctx.save();
    ctx.translate(width / 2 + x, height / 2 + y);
    ctx.rotate(roll);
    ctx.translate(-width / 2, -height / 2);
    opticalScene(ctx);
    ctx.restore();
    overlayFrame(ctx);
    label(ctx, '작은 위치·롤이 계속 이어짐 · 특정 충격이나 감쇠 사건 없음');
}
function contactMulti(ctx, frame) {
    const amount = frame.enhanced
        ? smooth(frame.timeMs / 3200) * (frame.reducedMotion ? 60 : 170)
        : 0;
    ctx.fillStyle = '#29364b';
    ctx.fillRect(0, 0, width, height);
    ellipse(ctx, 760 - amount * 0.08, 100, 46, 46, '#d8c9a8');
    for (let i = -1; i < 6; i++) {
        const x = i * 240 - amount * 0.2;
        polygon(ctx, [
            { x, y: 360 },
            { x: x + 100, y: 170 },
            { x: x + 260, y: 360 },
        ], '#455365');
    }
    ctx.fillStyle = '#222e3d';
    ctx.fillRect(0, 410, width, 130);
    actor(ctx, 470 - amount * 0.48, 430, 1.05);
    for (let i = -1; i < 5; i++) {
        const x = i * 300 - amount;
        ctx.fillStyle = '#101d2a';
        ctx.fillRect(x, 40, 45, 500);
        ellipse(ctx, x + 20, 95, 105, 85, '#162633');
    }
    label(ctx, '평면 셀의 서로 다른 수평 이송 · 각 층의 그림 크기는 일정');
}
function flicker(ctx, frame) {
    opticalScene(ctx);
    if (frame.enhanced) {
        // 감소 모션에서는 주기적인 전면 명멸 대신 낮은 농도의 일정한 노출만 둔다.
        const opacity = frame.reducedMotion
            ? 0.06
            : (Math.sin(frame.timeMs / 270) * 0.5 + 0.5) * 0.25;
        ctx.fillStyle = `rgba(244, 226, 177, ${opacity})`;
        ctx.fillRect(0, 0, width, height);
    }
    label(ctx, frame.reducedMotion
        ? '움직임 줄이기 · 명멸 없이 낮은 노출 유지'
        : '같은 그림의 주기적 노출 변화 · 단발 섬광과 다름');
}
function followPan(ctx, frame) {
    const progress = smooth(frame.timeMs / 3600);
    const x = mix(180, 1180, progress);
    const cameraX = frame.enhanced ? Math.max(0, x - 350) : 0;
    ctx.save();
    ctx.translate(-cameraX, 0);
    panorama(ctx);
    actor(ctx, x, 430, 1, { lean: 10, arm: Math.sin(frame.timeMs / 140) * 0.2 });
    ctx.restore();
    overlayFrame(ctx);
    label(ctx, frame.enhanced
        ? '이동 인물을 화면 왼쪽 350px 부근에 유지하며 배경을 이송'
        : '고정 화면 · 인물은 같은 경로로 오른쪽 밖까지 이동');
}
function slowQuickPan(ctx, frame) {
    const slow = smooth(frame.timeMs / 1450);
    const quickDuration = frame.reducedMotion ? 1300 : 360;
    const quick = smooth((frame.timeMs - 1850) / quickDuration);
    const offset = frame.enhanced ? slow * 170 + quick * 610 : 0;
    ctx.save();
    ctx.translate(-offset, 0);
    panorama(ctx);
    actor(ctx, 350, 430, 1, { headTurn: 1 });
    actor(ctx, 1270, 430, 1.1, { color: palette.red, facing: -1 });
    ctx.restore();
    label(ctx, frame.timeMs < 1850
        ? '지와 PAN · 천천히 주변을 읽힘'
        : '퀵 PAN · 화면 밖 인물 쪽으로 빠르게 구도 전환');
}
function trackUpBack(ctx, frame) {
    const up = smooth((frame.timeMs - 400) / 1300);
    const back = smooth((frame.timeMs - 2400) / 1300);
    const max = frame.reducedMotion ? 1.22 : 1.72;
    const zoom = frame.enhanced ? 1 + (max - 1) * up * (1 - back) : 1;
    ctx.save();
    ctx.translate(468, 276);
    ctx.scale(zoom, zoom);
    ctx.translate(-468, -276);
    opticalScene(ctx);
    ctx.restore();
    label(ctx, frame.timeMs < 2400
        ? 'T.U · 같은 중심으로 그림을 확대'
        : 'T.B · 다시 넓은 구도로 축소');
}
function multiplane(ctx, frame) {
    const progress = frame.enhanced
        ? smooth(frame.timeMs / 3500) * (frame.reducedMotion ? 0.4 : 1)
        : 0;
    const cameraX = progress * 0.9;
    const cameraZ = progress * 1.25;
    const project = (point) => {
        const scale = 700 / (point.z - cameraZ);
        return {
            x: width / 2 + (point.x - cameraX) * scale,
            y: 220 + (1.6 - point.y) * scale,
            scale,
        };
    };
    ctx.fillStyle = '#29374b';
    ctx.fillRect(0, 0, width, height);
    ellipse(ctx, 760 - cameraX * 10, 95, 43, 43, '#cdbf9e');
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
    ], '#4a5e6c');
    ctx.fillStyle = '#273746';
    ctx.fillRect(0, 400, width, 140);
    for (const z of [5, 7, 10, 14]) {
        const left = project({ x: -12, y: 0, z });
        const right = project({ x: 12, y: 0, z });
        line(ctx, [left, right], '#a4a07f45', 1);
    }
    for (const x of [-6, -2, 2, 6])
        line(ctx, [project({ x, y: 0, z: 20 }), project({ x, y: 0, z: 3 })], '#a4a07f45', 1);
    const middle = project({ x: 0.4, y: 0, z: 7 });
    actor(ctx, middle.x, middle.y, middle.scale * 0.0115);
    for (const x of [-1.8, 2.2]) {
        const base = project({ x, y: 0, z: 3.5 });
        const top = project({ x, y: 3.2, z: 3.5 });
        ctx.fillStyle = '#101d29';
        ctx.fillRect(base.x - base.scale * 0.08, top.y, base.scale * 0.16, base.y - top.y);
        ellipse(ctx, top.x, top.y + 20, base.scale * 0.55, base.scale * 0.35, '#16303a');
    }
    label(ctx, 'z 깊이로 투영 · 전진·옆 이동에 따라 가까운 층이 더 커지고 빠르게 이동');
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
