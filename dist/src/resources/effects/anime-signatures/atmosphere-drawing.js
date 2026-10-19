import { sprite, stage } from '../../cutscenes/shared/drawing.js';
import { drawTarget } from '../../cutscenes/shared/combat-drawing.js';
import { ease } from '../../cutscenes/shared/playback.js';
import { signatureHeight, signatureWidth, } from './contracts.js';
function mountain(ctx, color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(80, 390);
    for (const [x, y] of points)
        ctx.lineTo(x, y);
    ctx.lineTo(880, 390);
    ctx.closePath();
    ctx.fill();
}
function bamboo(ctx, x, sway, height) {
    const top = 390 - height;
    ctx.strokeStyle = '#172a28';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, 390);
    ctx.lineTo(x + sway, top);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
        const y = top + i * (height / 5) + 20;
        const stem = x + sway * (1 - (y - top) / height);
        ctx.strokeStyle = '#4c6352';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(stem - 3, y);
        ctx.lineTo(stem + 4, y);
        ctx.stroke();
        for (const side of [-1, 1]) {
            ctx.fillStyle = i % 2 ? '#2a463c' : '#345143';
            ctx.beginPath();
            ctx.moveTo(stem, y);
            ctx.lineTo(stem + side * (24 + i * 3), y - 17);
            ctx.lineTo(stem + side * 15, y + 2);
            ctx.closePath();
            ctx.fill();
        }
    }
}
function windowLandscape(ctx, timeMs) {
    const sky = ctx.createLinearGradient(0, 100, 0, 390);
    sky.addColorStop(0, '#718b88');
    sky.addColorStop(0.63, '#b8b598');
    sky.addColorStop(1, '#8c9873');
    ctx.fillStyle = sky;
    ctx.fillRect(110, 100, 740, 285);
    const offset = Math.sin(timeMs / 3200) * 5;
    ctx.save();
    ctx.translate(offset, 0);
    mountain(ctx, '#758985', [
        [80, 315],
        [225, 170],
        [325, 260],
        [445, 153],
        [580, 263],
        [690, 185],
        [880, 315],
    ]);
    mountain(ctx, '#62796d', [
        [80, 352],
        [200, 271],
        [310, 326],
        [425, 238],
        [550, 310],
        [700, 253],
        [880, 340],
    ]);
    mountain(ctx, '#4b6654', [
        [80, 379],
        [230, 321],
        [410, 365],
        [580, 314],
        [740, 347],
        [880, 318],
    ]);
    ctx.restore();
    const haze = ctx.createLinearGradient(0, 265, 0, 365);
    haze.addColorStop(0, '#d1cba400');
    haze.addColorStop(0.5, '#d1cba444');
    haze.addColorStop(1, '#d1cba400');
    ctx.fillStyle = haze;
    ctx.fillRect(110, 265, 740, 100);
    for (const [index, x] of [144, 181, 744, 793, 832].entries())
        bamboo(ctx, x, Math.sin(timeMs / 1450 + index) * 3, 195 + index * 11);
    ctx.fillStyle = '#345042';
    for (let i = 0; i < 29; i++) {
        const x = 100 + i * 28;
        ctx.beginPath();
        ctx.moveTo(x, 390);
        ctx.lineTo(x - 8, 369 - (i % 4) * 4);
        ctx.lineTo(x + 5, 378);
        ctx.lineTo(x + 13, 365 - (i % 3) * 6);
        ctx.lineTo(x + 20, 390);
        ctx.fill();
    }
    for (let i = 0; i < 12; i++) {
        const p = (timeMs / (4600 + i * 230) + i * 0.137) % 1;
        const x = 130 + ((i * 127 + p * 180) % 700);
        const y = 130 + p * 250;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(p * Math.PI * 2 + i) * 0.9);
        ctx.fillStyle = i % 3 ? '#cebd78' : '#b78c5d';
        ctx.globalAlpha *= Math.sin(p * Math.PI) * 0.7;
        ctx.fillRect(-4, -1, 8, 3);
        ctx.restore();
    }
}
/** 같은 도장 무대만 그리며 인물·자세·시간 진행은 호출한 장면이 소유한다. */
export function drawSignatureStage(ctx, assets, frame) {
    // 모든 장면 렌더러가 같은 호출 규격을 사용한다. 무대에는 인물 그림을 섞지 않는다.
    void assets;
    const timeMs = frame.reducedMotion ? 0 : Math.max(0, frame.timeMs);
    ctx.save();
    stage(ctx, timeMs);
    ctx.save();
    ctx.beginPath();
    ctx.rect(110, 100, 740, 285);
    ctx.clip();
    windowLandscape(ctx, timeMs);
    ctx.restore();
    // 재사용한 도장의 창틀을 풍경 앞에 복원해 공간의 깊이를 유지한다.
    ctx.fillStyle = '#1b1d23';
    for (const x of [88, 274, 470, 666, 852])
        ctx.fillRect(x, 64, 20, 365);
    ctx.fillRect(75, 80, 810, 24);
    ctx.fillRect(75, 195, 810, 9);
    ctx.fillStyle = '#938263';
    ctx.globalAlpha *= 0.16;
    ctx.beginPath();
    ctx.moveTo(294, 407);
    ctx.lineTo(470, 407);
    ctx.lineTo(597, 540);
    ctx.lineTo(267, 540);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
function drawActor(ctx, assets, frame, x) {
    const source = assets.idle.get(frame.scene.actor)?.get(frame.facing);
    if (!source)
        throw new Error('애니메이션 연출의 기본 자세가 없습니다.');
    const breath = frame.reducedMotion ? 0 : Math.sin(frame.timeMs / 360) * 1.2;
    ctx.save();
    ctx.fillStyle = '#090f13';
    ctx.globalAlpha *= 0.4;
    ctx.beginPath();
    ctx.ellipse(x, 443, 57, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    sprite(ctx, source, x, 440, 236 + breath);
}
function drawMinagawa(ctx, assets, frame) {
    const t = Math.max(0, frame.timeMs);
    const fadeIn = ease((t - 500) / 750);
    const fadeOut = 1 - ease((t - 2450) / 650);
    const opacity = fadeIn * fadeOut;
    drawSignatureStage(ctx, assets, frame);
    if (frame.enhanced && opacity > 0) {
        ctx.save();
        // 다른 시점의 자세 복제가 아니라 풍경과 마음을 동시에 읽는 큰 얼굴의 다중노출이다.
        ctx.globalAlpha *= opacity * 0.65;
        const drift = frame.reducedMotion ? 0 : (1 - fadeIn) * 13;
        sprite(ctx, assets.portrait, 657 + drift, 493, 467);
        ctx.restore();
    }
    drawActor(ctx, assets, frame, 319);
    const phase = t < 500
        ? '장소'
        : t < 1250
            ? '마음이 겹침'
            : t < 2450
                ? '결심'
                : t < 3100
                    ? '장소로 복귀'
                    : '여운';
    return {
        phase,
        detail: frame.enhanced
            ? '풍경을 남긴 채 큰 얼굴이 스며들고 머문 뒤 사라집니다.'
            : '같은 장소와 시간. 얼굴의 다중노출을 생략한 비교입니다.',
        poseIndex: 0,
    };
}
function painting(ctx, source, zoom) {
    const b = source.bounds;
    const sourceWidth = b.right - b.left;
    const sourceHeight = b.bottom - b.top;
    const scale = Math.max(signatureWidth / sourceWidth, signatureHeight / sourceHeight) *
        zoom;
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(source.image, b.left, b.top, sourceWidth, sourceHeight, (signatureWidth - width) / 2, (signatureHeight - height) / 2, width, height);
    ctx.restore();
}
function drawDezaki(ctx, assets, frame) {
    const t = Math.max(0, frame.timeMs);
    const settle = ease((t - 850) / 650);
    const opacity = ease((t - 850) / 400) * (1 - ease((t - 2800) / 450));
    drawSignatureStage(ctx, assets, frame);
    drawTarget(ctx, 758, 446, 238, frame.reducedMotion ? 0 : Math.sin(t / 240) * Math.exp(-t / 350) * 0.5);
    drawActor(ctx, assets, frame, 340);
    if (frame.enhanced && opacity > 0) {
        ctx.save();
        ctx.globalAlpha *= opacity;
        // 화면 필터나 정지가 아니라 인물과 배경을 함께 그린 별도 종결화로 전환한다.
        painting(ctx, assets.harmony, frame.reducedMotion ? 1 : 1 + (1 - settle) * 0.025);
        ctx.restore();
    }
    const phase = t < 850
        ? '움직이는 도장'
        : t < 1500
            ? '그림으로 정착'
            : t < 2800
                ? '종결화 유지'
                : t < 3250
                    ? '무대로 복귀'
                    : '여운';
    return {
        phase,
        detail: frame.enhanced
            ? '같은 인물과 수련 장소를 그린 별도 종결화로 전환합니다.'
            : '같은 수련 장소에서 별도 종결화로 전환하지 않는 비교입니다.',
        poseIndex: 0,
    };
}
/** 절대 시각만으로 그려 탐색·반복·비교 시 화면이나 프레임 상태를 누적하지 않는다. */
export function drawAtmosphereSignature(ctx, assets, frame) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const result = frame.scene.id === 'minagawa'
        ? drawMinagawa(ctx, assets, frame)
        : drawDezaki(ctx, assets, frame);
    ctx.restore();
    return result;
}
