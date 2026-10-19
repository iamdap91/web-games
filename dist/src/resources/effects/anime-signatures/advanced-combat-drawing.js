import { stage } from '../../cutscenes/shared/drawing.js';
import { unit } from '../../cutscenes/shared/playback.js';
import { attackDefinition } from '../../characters/companion-basic-attacks/attack-definitions.js';
import { drawStage, drawTarget, } from '../../characters/companion-basic-attacks/attack-drawing.js';
import { drawYeonmukAdditionalEffects } from '../../characters/companion-basic-attacks/yeonmuk-additional-effects.js';
import { punchContactMs, samplePunchCut, sampleSplitAttack, splitFirstContactMs, splitJoinMs, } from './advanced-combat-timing.js';
const splitTarget = { x: 320, y: 250 };
const bodyScale = 2;
const punchScale = 4;
const punchFeet = { x: 410, y: 440 };
/** 선택한 원화의 앞쪽 주먹 표면을 64px 원본에서 확인한 접촉점이다. */
const punchPoint = {
    'south-east': { x: 11, y: 33 },
    'north-west': { x: 13, y: 31 },
};
function drawBody(ctx, frame, feet, scale) {
    const image = frame.sprite.image;
    ctx.drawImage(image, Math.round(feet.x - frame.pivot.x * scale), Math.round(feet.y - (image.naturalHeight - frame.pivot.y) * scale), image.naturalWidth * scale, image.naturalHeight * scale);
}
function drawIdle(ctx, source, feet, scale) {
    ctx.drawImage(source.image, Math.round(feet.x - (source.image.naturalWidth / 2) * scale), Math.round(feet.y - source.bounds.bottom * scale), source.image.naturalWidth * scale, source.image.naturalHeight * scale);
}
function shadow(ctx, feet, radius = 25) {
    ctx.save();
    ctx.fillStyle = '#0a0d1680';
    ctx.beginPath();
    ctx.ellipse(feet.x, feet.y + 2, radius, radius * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
function smooth(value) {
    const t = unit(value);
    return t * t * (3 - 2 * t);
}
function companionGeometry(facing) {
    const sign = facing === 'south-east' ? 1 : -1;
    const vector = { x: sign * 0.92, y: sign * 0.38 };
    const side = { x: -vector.y, y: vector.x };
    return {
        vector,
        biwolHome: {
            x: splitTarget.x - vector.x * 190 + side.x * 48,
            y: splitTarget.y - vector.y * 190 + side.y * 48,
        },
        biwolNear: {
            x: splitTarget.x - vector.x * 56,
            y: splitTarget.y - vector.y * 56,
        },
        yeonmukHome: {
            x: splitTarget.x - vector.x * 260 + side.x * 30,
            y: splitTarget.y - vector.y * 260 + side.y * 30,
        },
    };
}
function lungePosition(facing, seconds) {
    const geometry = companionGeometry(facing);
    const travel = attackDefinition('biwol', 'lunge').travel;
    if (!travel)
        return geometry.biwolHome;
    const progress = seconds < travel.arrive
        ? smooth((seconds - travel.begin) / (travel.arrive - travel.begin))
        : 1 -
            smooth((seconds - travel.returnStart) /
                (travel.returnEnd - travel.returnStart));
    return {
        x: geometry.biwolHome.x +
            (geometry.biwolNear.x - geometry.biwolHome.x) * progress,
        y: geometry.biwolHome.y +
            (geometry.biwolNear.y - geometry.biwolHome.y) * progress,
    };
}
function drawCompanion(ctx, assets, actor, frame, sample, position) {
    const body = actor === 'biwol' ? sample.lunge : sample.volley;
    const frames = assets.advanced.companions.get(actor)?.get(frame.facing);
    const idle = assets.idle.get(actor)?.get(frame.facing);
    if (!frames?.length || !idle)
        throw new Error(`합동 장면 원본이 없습니다: ${actor}`);
    const index = Math.min(frames.length - 1, Math.floor(body.bodyProgress * frames.length));
    shadow(ctx, position);
    if (body.idle)
        drawIdle(ctx, idle, position, bodyScale);
    else
        drawBody(ctx, frames[index], position, bodyScale);
    return index;
}
function drawVolley(ctx, frame, sample) {
    const home = companionGeometry(frame.facing).yeonmukHome;
    const sign = frame.facing === 'south-east' ? 1 : -1;
    drawYeonmukAdditionalEffects(ctx, {
        kind: 'volley',
        facing: frame.facing,
        elapsed: sample.volleySeconds,
        home,
        target: splitTarget,
        palm: { x: home.x + sign * 35, y: home.y - (sign > 0 ? 73 : 86) },
        contacts: sample.volley.contacts,
    });
}
function drawLungeContact(ctx, frame, sample) {
    const time = sample.lungeSeconds - sample.lunge.contact;
    if (time < 0 || time > 0.18)
        return;
    const progress = unit(time / 0.18);
    const vector = companionGeometry(frame.facing).vector;
    ctx.save();
    ctx.globalAlpha = (1 - progress) * (frame.reducedMotion ? 0.55 : 0.85);
    ctx.strokeStyle = '#e4d7dc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(splitTarget.x - vector.x * 31, splitTarget.y - 56 - vector.y * 31);
    ctx.lineTo(splitTarget.x + vector.x * 9, splitTarget.y - 56 + vector.y * 9);
    ctx.stroke();
    ctx.restore();
}
function drawSplitWorld(ctx, assets, frame, sample) {
    const geometry = companionGeometry(frame.facing);
    const biwol = lungePosition(frame.facing, sample.lungeSeconds);
    ctx.save();
    ctx.scale(1.5, 1.5);
    drawStage(ctx, {
        home: geometry.yeonmukHome,
        target: splitTarget,
        light: false,
    });
    let poseIndex = 0;
    const figures = [
        {
            y: geometry.yeonmukHome.y,
            draw: () => {
                drawCompanion(ctx, assets, 'yeonmuk', frame, sample, geometry.yeonmukHome);
            },
        },
        {
            y: biwol.y,
            draw: () => {
                poseIndex = drawCompanion(ctx, assets, 'biwol', frame, sample, biwol);
            },
        },
        {
            y: splitTarget.y,
            draw: () => {
                drawTarget(ctx, splitTarget, sample.volleySeconds, sample.lastContact ?? sample.volley.contacts[0], frame.reducedMotion
                    ? { x: geometry.vector.x * 0.4, y: geometry.vector.y * 0.4 }
                    : geometry.vector);
            },
        },
    ];
    figures.sort((left, right) => left.y - right.y);
    for (const figure of figures)
        figure.draw();
    drawVolley(ctx, frame, sample);
    drawLungeContact(ctx, frame, sample);
    ctx.restore();
    return poseIndex;
}
function drawPreparationPanels(ctx, assets, frame, sample) {
    stage(ctx, frame.reducedMotion ? 0 : frame.timeMs);
    ctx.fillStyle = '#090e17c9';
    ctx.fillRect(0, 0, 960, 540);
    const geometry = companionGeometry(frame.facing);
    const panels = [
        {
            actor: 'yeonmuk',
            left: 34,
            title: '연묵 · 삼연부',
            home: geometry.yeonmukHome,
        },
        {
            actor: 'biwol',
            left: 494,
            title: '비월 · 질풍 찌르기',
            home: geometry.biwolHome,
        },
    ];
    let poseIndex = 0;
    for (const panel of panels) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(panel.left, 92, 432, 350);
        ctx.clip();
        ctx.fillStyle = panel.actor === 'biwol' ? '#252331' : '#1c2c32';
        ctx.fillRect(panel.left, 92, 432, 350);
        ctx.strokeStyle = '#c4a27240';
        ctx.beginPath();
        ctx.moveTo(panel.left, 408);
        ctx.lineTo(panel.left + 432, 408);
        ctx.stroke();
        ctx.translate(panel.left + 216 - panel.home.x * 1.5, 406 - panel.home.y * 1.5);
        ctx.scale(1.5, 1.5);
        poseIndex = drawCompanion(ctx, assets, panel.actor, frame, sample, panel.home);
        ctx.restore();
        ctx.strokeStyle = '#b69a71';
        ctx.lineWidth = 1;
        ctx.strokeRect(panel.left + 0.5, 92.5, 431, 349);
        ctx.fillStyle = '#e0cba5';
        ctx.font = '19px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(panel.title, panel.left + 216, 130);
    }
    ctx.fillStyle = '#b1b9c7';
    ctx.font = '17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('같은 순간, 서로 다른 준비', 480, 482);
    return poseIndex;
}
function drawSplitScreen(ctx, assets, frame) {
    const sample = sampleSplitAttack(frame.timeMs, frame.facing);
    const panels = frame.enhanced && frame.timeMs < splitJoinMs;
    const poseIndex = panels
        ? drawPreparationPanels(ctx, assets, frame, sample)
        : drawSplitWorld(ctx, assets, frame, sample);
    return {
        phase: frame.timeMs < splitJoinMs
            ? '동시 준비'
            : frame.timeMs < splitFirstContactMs
                ? '한 무대로 합류'
                : frame.timeMs < splitFirstContactMs + 420
                    ? '찌르기와 부적의 동시 명중'
                    : '회수와 정착',
        detail: '양쪽 모두 같은 원본 몸 동작·접촉 시각입니다. 첫 부적과 찌르기가 함께 닿고 남은 두 부적이 이어집니다. 본게임의 합동 피해 판정은 추가하지 않습니다.',
        poseIndex,
    };
}
function drawPunchPose(ctx, source) {
    drawIdle(ctx, source, punchFeet, punchScale);
}
function drawPunch(ctx, assets, frame) {
    const sample = samplePunchCut(frame.timeMs);
    const poses = assets.advanced.punch.get(frame.facing);
    const normal = assets.advanced.normalPunch.get(frame.facing);
    const idle = assets.idle.get('ataho')?.get(frame.facing);
    if (!poses?.length || !normal?.length || !idle)
        throw new Error('원근 정권의 방향별 원본을 준비하지 못했습니다.');
    stage(ctx, frame.reducedMotion ? 0 : frame.timeMs);
    const point = punchPoint[frame.facing];
    const strike = poses[1];
    const perspectiveContact = {
        x: punchFeet.x + (point.x - strike.image.naturalWidth / 2) * punchScale,
        y: punchFeet.y + (point.y - strike.bounds.bottom) * punchScale,
    };
    // 기준판도 자기 원본의 실제 주먹 위치에 맞춘다. 두 원화의 투영 위치는 다르다.
    const contact = frame.enhanced
        ? perspectiveContact
        : frame.facing === 'south-east'
            ? {
                x: punchFeet.x + (69 - 48) * punchScale,
                y: punchFeet.y + (50 - 78) * punchScale,
            }
            : perspectiveContact;
    const sign = Math.sign(contact.x - punchFeet.x);
    const canContact = frame.enhanced || normal.length > 1;
    drawTarget(ctx, { x: contact.x, y: contact.y + 61 }, canContact ? frame.timeMs / 1000 : 0, punchContactMs / 1000, { x: sign * (frame.reducedMotion ? 0.35 : 1), y: 0 });
    shadow(ctx, punchFeet, 44);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (frame.enhanced) {
        drawPunchPose(ctx, sample.pose < 0 ? idle : poses[sample.pose]);
    }
    else {
        drawBody(ctx, normal[Math.min(normal.length - 1, sample.normalIndex)], punchFeet, punchScale);
    }
    ctx.restore();
    const hitAge = frame.timeMs - punchContactMs;
    if (canContact && hitAge >= 0 && hitAge < 140) {
        ctx.save();
        ctx.globalAlpha = (1 - hitAge / 140) * (frame.reducedMotion ? 0.3 : 0.65);
        ctx.strokeStyle = '#ead7ab';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(contact.x, contact.y, 12 + hitAge * 0.14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    return {
        phase: sample.phase,
        detail: frame.enhanced
            ? frame.facing === 'north-west'
                ? '북서 장전 → 타격 → 회수 원화 컷입니다. 현재 타격 시안은 전경 주먹의 원근 과장이 약해 사용자 검토가 필요합니다. 새 중간 몸 동작은 포함하지 않습니다.'
                : '전용 장전 → 큰 전경 주먹 → 회수 원화 컷입니다. 통째 확대·관절 변형으로 원근을 만들지 않으며 새 중간 몸 동작은 포함하지 않습니다.'
            : normal.length === 1
                ? '북서: 기존 기본 자세 고정 비교입니다. 같은 방향의 기존 정권 모션이 없어 다른 방향 그림을 섞지 않습니다.'
                : '기존 남동 정권의 준비·접촉·회수를 같은 장면 시각에 표시합니다.',
        poseIndex: frame.enhanced
            ? sample.pose + 1
            : Math.min(normal.length - 1, sample.normalIndex),
    };
}
export function drawAdvancedCombat(ctx, assets, frame) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const result = frame.scene.id === 'split-screen'
        ? drawSplitScreen(ctx, assets, frame)
        : drawPunch(ctx, assets, frame);
    ctx.restore();
    return result;
}
