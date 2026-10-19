import { attackDefinition } from '../../characters/companion-basic-attacks/attack-definitions.js';
import { drawPaper, drawStage, drawTarget, } from '../../characters/companion-basic-attacks/attack-drawing.js';
import { unit } from '../../cutscenes/shared/playback.js';
import { signatureHeight, signatureWidth, } from './contracts.js';
import { sampleFocusShift, sampleRepeatedStrike, } from './dramatic-editing-timing.js';
const facing = 'south-east';
const bodyScale = 2;
const target = { x: 370, y: 262 };
const attackVector = { x: 0.92, y: 0.38 };
const home = {
    x: target.x - attackVector.x * 190,
    y: target.y - attackVector.y * 190,
};
const near = {
    x: target.x - attackVector.x * 56,
    y: target.y - attackVector.y * 56,
};
function smooth(value) {
    const amount = unit(value);
    return amount * amount * (3 - 2 * amount);
}
function biwolPosition(elapsed) {
    const travel = attackDefinition('biwol', 'lunge').travel;
    if (!travel)
        return home;
    const progress = elapsed < travel.arrive
        ? smooth((elapsed - travel.begin) / (travel.arrive - travel.begin))
        : 1 -
            smooth((elapsed - travel.returnStart) /
                (travel.returnEnd - travel.returnStart));
    return {
        x: home.x + (near.x - home.x) * progress,
        y: home.y + (near.y - home.y) * progress,
    };
}
function drawBody(ctx, frame, feet) {
    const image = frame.sprite.image;
    ctx.drawImage(image, Math.round(feet.x - frame.pivot.x * bodyScale), Math.round(feet.y - (image.naturalHeight - frame.pivot.y) * bodyScale), image.naturalWidth * bodyScale, image.naturalHeight * bodyScale);
}
function drawIdle(ctx, source, feet) {
    const image = source.image;
    ctx.drawImage(image, Math.round(feet.x - (image.naturalWidth * bodyScale) / 2), Math.round(feet.y - source.bounds.bottom * bodyScale), image.naturalWidth * bodyScale, image.naturalHeight * bodyScale);
}
function drawShadow(ctx, feet) {
    ctx.fillStyle = '#0a0d1680';
    ctx.beginPath();
    ctx.ellipse(feet.x, feet.y + 2, 25, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
}
function drawStrikeWorld(ctx, assets, sample, reducedMotion) {
    const frames = assets.advanced.companions.get('biwol')?.get(facing);
    const idle = assets.idle.get('biwol')?.get(facing);
    if (!frames?.length || !idle)
        throw new Error('반복 쇼트의 비월 찌르기 원본을 준비하지 못했습니다.');
    drawStage(ctx, { home, target, light: false });
    const feet = biwolPosition(sample.elapsed);
    const index = Math.min(frames.length - 1, Math.floor(sample.attack.bodyProgress * frames.length));
    drawShadow(ctx, feet);
    if (sample.attack.idle)
        drawIdle(ctx, idle, feet);
    else
        drawBody(ctx, frames[index], feet);
    const recoil = reducedMotion ? 0.35 : 1;
    drawTarget(ctx, target, sample.elapsed, sample.attack.contact, {
        x: attackVector.x * recoil,
        y: attackVector.y * recoil,
    });
    const hitAge = sample.elapsed - sample.attack.contact;
    if (hitAge >= 0 && hitAge < 0.16) {
        ctx.save();
        ctx.globalAlpha *= (1 - hitAge / 0.16) * (reducedMotion ? 0.45 : 0.8);
        ctx.strokeStyle = '#eadbcd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(target.x - 29, target.y - 70);
        ctx.lineTo(target.x + 10, target.y - 54);
        ctx.stroke();
        ctx.restore();
    }
    return sample.attack.idle ? 0 : index;
}
function drawCaption(ctx, text) {
    ctx.save();
    ctx.filter = 'none';
    ctx.fillStyle = '#111821e8';
    ctx.fillRect(22, signatureHeight - 49, 448, 31);
    ctx.fillStyle = '#eadcc3';
    ctx.font = '17px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(text, 35, signatureHeight - 28);
    ctx.restore();
}
function drawTriple(ctx, assets, frame) {
    const sample = sampleRepeatedStrike(frame.timeMs, frame.enhanced);
    // 샷 안에서는 배율과 초점이 고정이다. 같은 원본 시점으로 돌아가는 컷만 전환한다.
    const scales = frame.reducedMotion ? [1.5, 1.62, 1.74] : [1.5, 2.25, 2.75];
    const scale = scales[sample.shot];
    const cropOffset = sample.shot === 2 ? (frame.reducedMotion ? 8 : 24) : 0;
    const focus = { x: target.x - cropOffset, y: target.y - 61 };
    ctx.save();
    let poseIndex;
    try {
        ctx.translate(signatureWidth / 2, 300);
        ctx.scale(scale, scale);
        ctx.translate(-focus.x, -focus.y);
        poseIndex = drawStrikeWorld(ctx, assets, sample, frame.reducedMotion);
    }
    finally {
        ctx.restore();
    }
    const shotName = ['와이드', '근접', '타점 크롭'][sample.shot];
    const caption = frame.enhanced
        ? `같은 결정타 · ${sample.shot + 1}/3 · ${shotName}`
        : '결정타 1회 · 원래 동작과 여운';
    drawCaption(ctx, caption);
    return {
        phase: sample.finished ? '같은 결정타를 거두고 정착' : caption,
        detail: frame.enhanced
            ? '한 찌르기의 접촉 구간을 세 고정 크롭으로 다시 보여주는 반복 편집입니다. 화면 이동이나 세 번의 명중이 아니며 원본 몸·타점·방향은 같습니다.'
            : '한 번의 찌르기를 원래 순서로 끝낸 뒤 같은 전체 길이 동안 여운을 유지합니다.',
        poseIndex,
    };
}
function drawFocusBackground(ctx, assets) {
    const idle = assets.idle.get('biwol')?.get(facing);
    if (!idle)
        throw new Error('초점 넘기기의 비월 대기 원본이 없습니다.');
    drawStage(ctx, {
        home: { x: 420, y: 248 },
        target: { x: 525, y: 254 },
        light: false,
    });
    drawShadow(ctx, { x: 420, y: 248 });
    drawIdle(ctx, idle, { x: 420, y: 248 });
    drawTarget(ctx, { x: 525, y: 254 }, 0, 0.5, attackVector);
}
function drawFocusForeground(ctx) {
    // 기존 부적 도형을 전경의 고정 기둥에 붙인다. 몸 원화를 기울이거나 새 손 자세를 만들지 않는다.
    ctx.fillStyle = '#241e27';
    ctx.fillRect(210, 100, 36, 375);
    ctx.fillStyle = '#59404a';
    ctx.fillRect(215, 100, 9, 375);
    ctx.save();
    ctx.translate(228, 294);
    ctx.scale(4, 4);
    drawPaper(ctx, { x: 0, y: 0 }, 0);
    ctx.restore();
}
function drawFocus(ctx, assets, frame) {
    // 흐린 배경 가장자리의 반투명 픽셀이 이전 시점을 남기지 않게 먼저 불투명하게 채운다.
    ctx.fillStyle = '#18202a';
    ctx.fillRect(0, 0, signatureWidth, signatureHeight);
    const focus = sampleFocusShift(frame.timeMs);
    const maximumBlur = frame.reducedMotion ? 0.8 : 4;
    const backgroundBlur = frame.enhanced ? maximumBlur * (1 - focus) : 0;
    const foregroundBlur = frame.enhanced ? maximumBlur * focus : 0;
    ctx.save();
    try {
        ctx.filter = backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : 'none';
        ctx.scale(1.5, 1.5);
        drawFocusBackground(ctx, assets);
    }
    finally {
        ctx.restore();
    }
    ctx.save();
    try {
        ctx.filter = foregroundBlur > 0 ? `blur(${foregroundBlur}px)` : 'none';
        drawFocusForeground(ctx);
    }
    finally {
        ctx.restore();
    }
    const phase = focus === 0
        ? '전경의 부적을 살핌'
        : focus < 1
            ? '부적에서 뒤쪽 기척으로 초점을 넘김'
            : '뒤에 선 비월과 표적을 알아차림';
    drawCaption(ctx, frame.enhanced
        ? '고정 구도 · 전경에서 배경으로 초점 이동'
        : '같은 배치 · 앞뒤 모두 선명');
    return {
        phase,
        detail: frame.enhanced
            ? '전경 부적과 뒤쪽 비월·표적의 위치는 고정하고 레이어별 선명도만 교대합니다. 인물이나 카메라를 움직이지 않으며 UI는 흐리지 않습니다.'
            : '같은 시각과 위치에 전경 부적·비월·표적을 모두 선명하게 표시합니다.',
        poseIndex: focus < 0.5 ? 0 : 1,
    };
}
/** 기존 한 사건의 재편집과 고정 구도의 초점 교대만 그린다. */
export function drawDramaticEditing(ctx, assets, frame) {
    const id = frame.scene.id;
    if (id !== 'dramatic-triple' && id !== 'dramatic-focus')
        return null;
    ctx.save();
    try {
        ctx.filter = 'none';
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#202532';
        ctx.fillRect(0, 0, signatureWidth, signatureHeight);
        return id === 'dramatic-triple'
            ? drawTriple(ctx, assets, frame)
            : drawFocus(ctx, assets, frame);
    }
    finally {
        ctx.restore();
    }
}
