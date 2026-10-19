import { sprite, stage } from '../../cutscenes/shared/drawing.js';
import { unit } from '../../cutscenes/shared/playback.js';
import { comboDuration, sampleComboMotion, } from '../../characters/ataho-v2-combos/player.js';
import { drawPose, groundY, startX, } from '../../characters/ataho-v2-combos/pose-drawing.js';
import { frameKey } from '../../characters/ataho-v2-combos/source-frames.js';
function body(ctx, frame, feet, scale) {
    const image = frame.sprite.image;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, Math.round(feet.x - frame.pivot.x * scale), Math.round(feet.y - (image.naturalHeight - frame.pivot.y) * scale), image.naturalWidth * scale, image.naturalHeight * scale);
}
function shadow(ctx, feet) {
    ctx.fillStyle = '#08111b66';
    ctx.beginPath();
    ctx.ellipse(feet.x + 18, feet.y + 3, 48, 9, 0, 0, Math.PI * 2);
    ctx.fill();
}
function expressionCloseup(ctx, frame) {
    const image = frame.sprite.image;
    ctx.fillStyle = '#131e25';
    ctx.fillRect(82, 85, 796, 365);
    ctx.strokeStyle = '#a8976c';
    ctx.lineWidth = 2;
    ctx.strokeRect(82, 85, 796, 365);
    ctx.save();
    ctx.beginPath();
    ctx.rect(84, 87, 792, 361);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    // 원화의 얼굴 픽셀을 그대로 읽는다. 눈·입을 도형으로 덧그리지 않는다.
    const cropHeight = Math.ceil(image.naturalHeight * 0.5);
    const scale = 9;
    ctx.drawImage(image, 0, 0, image.naturalWidth, cropHeight, 480 - (image.naturalWidth * scale) / 2, 124, image.naturalWidth * scale, cropHeight * scale);
    ctx.restore();
}
function drawReaction(ctx, assets, frame) {
    const pair = assets.acting.reaction.get(frame.facing);
    if (!pair || pair.length !== 2)
        throw new Error('표정 A/B 원화를 준비하지 못했습니다.');
    const t = frame.timeMs;
    const index = t < 700 ? 1 : t < 1800 ? 0 : 1;
    const shown = pair[frame.enhanced ? index : 1];
    stage(ctx, frame.reducedMotion ? 0 : t);
    const feet = { x: 280, y: 450 };
    shadow(ctx, feet);
    body(ctx, shown, feet, 4);
    ctx.save();
    ctx.globalAlpha *= unit((t - 450) / 250);
    sprite(ctx, assets.advanced.spirit, 676, 431, 280);
    ctx.restore();
    // 양쪽 같은 컷 길이에서 원화의 표정을 읽고 생성된 머리·의상 변화도 검토한다.
    if (t >= 850 && t < 2850)
        expressionCloseup(ctx, shown);
    return {
        phase: t < 700
            ? '기척'
            : t < 1800
                ? '알아차림'
                : t < 2850
                    ? '침착한 판단'
                    : '상황으로 복귀',
        detail: frame.enhanced
            ? '놀람 A → 침착 B의 원화 컷입니다. 실제 눈·입 변화와 함께 생성된 머리 각도·손·꼬리의 차이도 검토합니다. 중간 표정 동화는 사용자 GIF 확인 뒤 제작합니다.'
            : '침착 B를 유지하는 비교입니다.',
        poseIndex: frame.enhanced ? index : 1,
    };
}
function drawDrink(ctx, assets, timeMs, feet) {
    const study = assets.acting.drink;
    const pose = sampleComboMotion(study.motion, timeMs);
    const source = study.frames.get(frameKey(pose.step));
    if (!source)
        throw new Error('기존 마시기 몸 프레임이 없습니다.');
    ctx.save();
    // 마지막 원투 회수 16번의 실제 왼발 바닥 x35~40을 새 B의 지지점에 맞춘다.
    ctx.translate(feet.x + (48 - 37.5) * 4, feet.y);
    ctx.scale(4 / 3, 4 / 3);
    ctx.translate(-startX, -groundY);
    drawPose(ctx, pose, source, { scale: 3, showMovement: true });
    ctx.restore();
}
function drawBalance(ctx, assets, frame) {
    const pair = assets.acting.balance.get(frame.facing);
    if (!pair || pair.length !== 2)
        throw new Error('취권 A/B 원화를 준비하지 못했습니다.');
    const t = frame.timeMs;
    const feet = { x: 420, y: 450 };
    const index = t >= 1800 && t < 2700 ? 0 : 1;
    stage(ctx, frame.reducedMotion ? 0 : t);
    shadow(ctx, feet);
    if (t < 1800 && frame.facing === 'south-east') {
        drawDrink(ctx, assets, (t / 1800) * comboDuration(assets.acting.drink.motion), feet);
    }
    else
        body(ctx, pair[frame.enhanced ? index : 1], feet, 4);
    if (frame.enhanced && index === 0) {
        ctx.fillStyle = '#d7c28b';
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(frame.facing === 'north-west'
            ? 'A 원화 · 고개·몸 방향 검토'
            : 'A 원화 · 중심 쏠림 검토', 480, 497);
    }
    return {
        phase: t < 1800
            ? frame.facing === 'south-east'
                ? '한 모금'
                : '안정된 준비 자세'
            : t < 2700
                ? '한 발 지지 A 시안'
                : t < 3350
                    ? '안정 B로 회복'
                    : '자세 정착',
        detail: frame.enhanced
            ? frame.facing === 'north-west'
                ? '북서 A는 고개가 반대쪽으로 돌아가며 몸 방향 보존과 중심 쏠림을 더 검토해야 합니다. 실제 오른쪽 지지발 기준으로 A/B를 정렬한 원화 검토이며 새 연속 몸 동작은 아닙니다.'
                : '기존 마시기 뒤 한 발 지지 A → 안정 B를 같은 왼발에 맞춘 컷입니다. 몸통 쏠림은 목표보다 약한 검토 시안이며 새 중간 몸 동화와 회피·반격 판정은 없습니다.'
            : '기존 마시기/준비 뒤 안정된 자세를 유지하는 비교입니다.',
        poseIndex: frame.enhanced ? index : 1,
    };
}
export function drawActingCharacters(ctx, assets, frame) {
    ctx.save();
    try {
        return frame.scene.id === 'reaction-acting'
            ? drawReaction(ctx, assets, frame)
            : drawBalance(ctx, assets, frame);
    }
    finally {
        ctx.restore();
    }
}
