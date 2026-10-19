import { unit } from '../../cutscenes/shared/playback.js';
import { drawSignatureStage } from './atmosphere-drawing.js';
import { signatureHeight, signatureWidth, } from './contracts.js';
const poseStartMs = 650;
const poseEndMs = 3670;
function smooth(value) {
    const p = unit(value);
    return p * p * (3 - 2 * p);
}
function envelope(timeMs, startMs, inMs, endMs, outMs) {
    return (smooth((timeMs - startMs) / inMs) * (1 - smooth((timeMs - endMs) / outMs)));
}
function idleImage(assets, actor) {
    const source = assets.idle.get(actor)?.get('south-east');
    if (!source)
        throw new Error('극적 연출의 남동 기본 자세가 없습니다.');
    return source;
}
function poseImage(assets, pose, timeMs) {
    if (timeMs < poseStartMs || timeMs >= poseEndMs)
        return idleImage(assets, pose === 'gainax' ? 'ataho' : 'biwol');
    const source = assets.poses.get(pose)?.get('south-east')?.[0];
    if (!source)
        throw new Error(`극적 연출에 재사용할 자세가 없습니다: ${pose}`);
    return source;
}
function drawBody(ctx, source, silhouette = 0) {
    const scale = 4;
    const x = 480 - (source.image.naturalWidth * scale) / 2;
    const y = 440 - source.bounds.bottom * scale;
    const width = source.image.naturalWidth * scale;
    const height = source.image.naturalHeight * scale;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#080d12';
    ctx.globalAlpha *= 0.36;
    ctx.beginPath();
    ctx.ellipse(480, 445, 55, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // 원화의 알파·비율·발 위치를 그대로 쓰고 명암만 바꾼다.
    if (silhouette > 0) {
        ctx.filter = 'brightness(0)';
        ctx.drawImage(source.image, x, y, width, height);
        ctx.filter = 'none';
        ctx.globalAlpha *= 1 - unit(silhouette);
    }
    ctx.drawImage(source.image, x, y, width, height);
    ctx.restore();
}
function drawPressureSheet(ctx, intensity) {
    const shade = ctx.createLinearGradient(0, 0, 0, signatureHeight);
    shade.addColorStop(0, '#10101f');
    shade.addColorStop(0.38, '#292238');
    shade.addColorStop(0.77, '#201c2c');
    shade.addColorStop(1, '#090d17');
    ctx.save();
    ctx.globalAlpha *= intensity * 0.97;
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, signatureWidth, signatureHeight);
    // 장소의 세부를 가라앉히고 머리와 어깨 뒤에는 단순한 어두운 면을 남긴다.
    ctx.fillStyle = '#0a0c1b';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(321, 0);
    ctx.lineTo(274, 113);
    ctx.lineTo(335, 253);
    ctx.lineTo(260, 417);
    ctx.lineTo(331, signatureHeight);
    ctx.lineTo(0, signatureHeight);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(signatureWidth, 0);
    ctx.lineTo(660, 0);
    ctx.lineTo(714, 126);
    ctx.lineTo(642, 278);
    ctx.lineTo(718, 422);
    ctx.lineTo(649, signatureHeight);
    ctx.lineTo(signatureWidth, signatureHeight);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
function strokePressureCurve(ctx, width) {
    ctx.strokeStyle = '#050a14';
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.strokeStyle = '#433151';
    ctx.lineWidth = width * 0.48;
    ctx.stroke();
    ctx.strokeStyle = '#79688c';
    ctx.lineWidth = Math.max(2, width * 0.09);
    ctx.stroke();
}
function drawPressureLines(ctx, timeMs, reducedMotion, intensity) {
    const closing = smooth((timeMs - 500) / 1500);
    const travel = closing * (reducedMotion ? 14 : 76);
    ctx.save();
    ctx.globalAlpha *= intensity * (reducedMotion ? 0.5 : 0.94);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const side of [-1, 1]) {
        const inward = -side;
        for (let i = 0; i < 5; i++) {
            const distance = -53 + i * 69 + travel;
            const x = side < 0 ? distance : signatureWidth - distance;
            const bend = 32 + (i % 3) * 12;
            const stagger = (i % 2) * 27;
            ctx.beginPath();
            ctx.moveTo(x - inward * 44, -62);
            ctx.bezierCurveTo(x + inward * bend, 31 + stagger, x - inward * (bend + 24), 82 + stagger, x + inward * 12, 150 + stagger);
            ctx.bezierCurveTo(x + inward * (bend + 12), 220 + stagger, x - inward * bend, 265 + stagger, x + inward * 18, 339 + stagger);
            ctx.bezierCurveTo(x + inward * bend, 398 + stagger, x - inward * (bend + 17), 475, x + inward * 28, 608);
            strokePressureCurve(ctx, i % 2 === 0 ? 44 - i * 3 : 25 - i * 2);
        }
    }
    const descent = closing * (reducedMotion ? 5 : 38);
    for (let i = 0; i < 3; i++) {
        const y = -49 + i * 33 + descent;
        ctx.beginPath();
        ctx.moveTo(-80, y + 22);
        ctx.bezierCurveTo(132, y - 56, 203, y + 61, 344, y + 9);
        ctx.bezierCurveTo(426, y - 31, 459, y + 53, 550, y + 15);
        ctx.bezierCurveTo(704, y - 42, 821, y + 76, 1040, y - 7);
        strokePressureCurve(ctx, i === 1 ? 34 : 19);
    }
    ctx.restore();
}
function drawPressure(ctx, assets, frame) {
    const timeMs = Math.max(0, frame.timeMs);
    const intensity = envelope(timeMs, 350, 1650, 3150, 750);
    drawSignatureStage(ctx, assets, frame);
    if (frame.enhanced) {
        drawPressureSheet(ctx, intensity * (frame.reducedMotion ? 0.73 : 1));
        drawPressureLines(ctx, timeMs, frame.reducedMotion, intensity);
    }
    drawBody(ctx, idleImage(assets, 'ataho'));
    return {
        phase: timeMs < 350
            ? '고요한 도장'
            : timeMs < 2000
                ? '위압감이 올라옴'
                : timeMs < 3150
                    ? '움직임이 멎은 압박'
                    : '고요로 정착',
        detail: frame.enhanced
            ? '도장이 짙은 심리 배경으로 잠기고 큰 불규칙 곡선이 위와 양옆에서 좁혀진 뒤 멎습니다. 머리와 어깨는 비워 둡니다.'
            : '같은 자세와 장면 시간. 주변 암부와 오도로선을 생략한 비교입니다.',
        poseIndex: 0,
    };
}
function drawIncomingRays(ctx, timeMs, reducedMotion) {
    const intensity = envelope(timeMs, 350, 1250, 3100, 800);
    if (intensity <= 0)
        return;
    const spread = reducedMotion ? 0 : (1 - smooth((timeMs - 350) / 1700)) * 22;
    const beam = ctx.createLinearGradient(735, 95, 310, 520);
    beam.addColorStop(0, '#fff6cfb5');
    beam.addColorStop(0.47, '#f6e9b96e');
    beam.addColorStop(1, '#d2e1d300');
    ctx.save();
    ctx.globalAlpha *= intensity * (reducedMotion ? 0.48 : 0.75);
    ctx.fillStyle = beam;
    for (const [topX, width, footX] of [
        [602, 28, 153],
        [668, 63, 216],
        [758, 35, 310],
        [822, 22, 384],
    ]) {
        ctx.beginPath();
        ctx.moveTo(topX + spread, 100);
        ctx.lineTo(topX + width + spread, 100);
        ctx.lineTo(footX + width * 2.3, 520);
        ctx.lineTo(footX, 520);
        ctx.closePath();
        ctx.fill();
    }
    const pool = ctx.createRadialGradient(365, 452, 6, 365, 452, 210);
    pool.addColorStop(0, '#eee7b96b');
    pool.addColorStop(1, '#e8dba000');
    ctx.fillStyle = pool;
    ctx.fillRect(155, 394, 420, 116);
    ctx.restore();
}
function drawRays(ctx, assets, frame) {
    const timeMs = Math.max(0, frame.timeMs);
    const active = timeMs >= poseStartMs && timeMs < poseEndMs;
    drawSignatureStage(ctx, assets, frame);
    if (frame.enhanced)
        drawIncomingRays(ctx, timeMs, frame.reducedMotion);
    const silhouette = frame.enhanced && active
        ? (1 - smooth((timeMs - 1200) / 1250)) *
            (frame.reducedMotion ? 0.6 : 0.94)
        : 0;
    drawBody(ctx, poseImage(assets, 'gainax', timeMs), silhouette);
    return {
        phase: timeMs < poseStartMs
            ? '등장 전의 고요'
            : timeMs < 1200
                ? '역광의 실루엣'
                : timeMs < 2450
                    ? '인물이 천천히 드러남'
                    : timeMs < poseEndMs
                        ? '선명한 등장 자세'
                        : '기본 자세로 복귀',
        detail: frame.enhanced
            ? '기존 가이낙스 자세 뒤로 사선 광주가 들어오고 실루엣에서 원래 색이 천천히 드러납니다.'
            : '같은 시각에 같은 가이낙스 자세를 표시하고 입사광과 실루엣 해제만 생략합니다.',
        poseIndex: active ? 1 : 0,
    };
}
function crossOutline(ctx, center, size) {
    const horizontal = { x: 0.976, y: -0.218 };
    const vertical = { x: -horizontal.y, y: horizontal.x };
    const points = [
        [-1, 0],
        [-0.13, -0.025],
        [-0.035, -0.1],
        [0, -0.75],
        [0.026, -0.13],
        [0.1, -0.027],
        [0.9, 0],
        [0.13, 0.035],
        [0.025, 0.12],
        [0, 0.65],
        [-0.033, 0.14],
        [-0.12, 0.026],
    ];
    ctx.beginPath();
    for (const [i, [along, across]] of points.entries()) {
        const x = center.x + (horizontal.x * along + vertical.x * across) * size;
        const y = center.y + (horizontal.y * along + vertical.y * across) * size;
        if (i === 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}
function drawHeroFlare(ctx, timeMs, reducedMotion) {
    const intensity = envelope(timeMs, 1150, 350, 2200, 800);
    if (intensity <= 0)
        return;
    const expansion = smooth((timeMs - 1150) / 1050);
    const center = { x: 374, y: 345 };
    const size = reducedMotion ? 130 : 116 + expansion * 72;
    ctx.save();
    ctx.globalAlpha *= intensity * (reducedMotion ? 0.5 : 0.88);
    const glow = ctx.createRadialGradient(center.x, center.y, 1, center.x, center.y, 96);
    glow.addColorStop(0, '#ecfbff95');
    glow.addColorStop(0.28, '#aad7fa42');
    glow.addColorStop(1, '#90bce900');
    ctx.fillStyle = glow;
    ctx.fillRect(center.x - 96, center.y - 96, 192, 192);
    ctx.fillStyle = '#86c7efa6';
    crossOutline(ctx, center, size);
    ctx.fillStyle = '#f2fcffe0';
    crossOutline(ctx, center, size * 0.73);
    ctx.strokeStyle = '#c1e8ff';
    ctx.lineWidth = 2.5;
    const ringWidth = reducedMotion ? 141 : 103 + expansion * 70;
    const ringHeight = ringWidth * 0.6;
    ctx.beginPath();
    ctx.ellipse(480, 321, ringWidth, ringHeight, -0.16, 0.12, Math.PI * 0.91);
    ctx.stroke();
    ctx.strokeStyle = '#84c6f1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(480, 321, ringWidth + 7, ringHeight + 5, -0.16, Math.PI * 1.04, Math.PI * 1.87);
    ctx.stroke();
    ctx.restore();
}
function drawFlare(ctx, assets, frame) {
    const timeMs = Math.max(0, frame.timeMs);
    const active = timeMs >= poseStartMs && timeMs < poseEndMs;
    drawSignatureStage(ctx, assets, frame);
    if (frame.enhanced)
        drawHeroFlare(ctx, timeMs, frame.reducedMotion);
    drawBody(ctx, poseImage(assets, 'sunrise', timeMs));
    return {
        phase: timeMs < poseStartMs
            ? '기본 자세'
            : timeMs < 1150
                ? '결정 자세 컷'
                : timeMs < 2200
                    ? '십자광과 링의 단발 전개'
                    : timeMs < 3000
                        ? '빛이 사그라듦'
                        : timeMs < poseEndMs
                            ? '자세의 여운'
                            : '기본 자세로 복귀',
        detail: frame.enhanced
            ? '기존 비월의 선라이즈 자세 뒤에 비대칭 십자광과 끊긴 링을 한 번 펼치고 가라앉힙니다.'
            : '같은 시각에 같은 선라이즈 자세를 표시하고 결정 자세 주변의 십자광과 링만 생략합니다.',
        poseIndex: active ? 1 : 0,
    };
}
export function drawDramaticAtmosphere(ctx, assets, frame) {
    ctx.save();
    try {
        switch (frame.scene.id) {
            case 'dramatic-pressure':
                return drawPressure(ctx, assets, frame);
            case 'dramatic-rays':
                return drawRays(ctx, assets, frame);
            case 'dramatic-flare':
                return drawFlare(ctx, assets, frame);
            default:
                return null;
        }
    }
    finally {
        ctx.restore();
    }
}
