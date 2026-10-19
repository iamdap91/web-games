import { drawPaper, drawSeal, drawStage, drawTarget, } from '../../characters/companion-basic-attacks/attack-drawing.js';
import { attackDefinition } from '../../characters/companion-basic-attacks/attack-definitions.js';
import { unit } from '../../cutscenes/shared/playback.js';
import { signatureHeight, signatureWidth, } from './contracts.js';
import { sampleTalismanInsert, talismanInsertTiming, } from './acting-insert-timing.js';
const target = { x: 320, y: 250 };
const bodyScale = 2;
const worldScale = 1.5;
function smooth(value) {
    const t = unit(value);
    return t * t * (3 - 2 * t);
}
function geometry(facing) {
    const sign = facing === 'south-east' ? 1 : -1;
    const vector = { x: sign * 0.92, y: sign * 0.38 };
    const side = { x: -vector.y, y: vector.x };
    const yeonmukHome = {
        x: target.x - vector.x * 260 + side.x * 30,
        y: target.y - vector.y * 260 + side.y * 30,
    };
    return {
        vector,
        yeonmukHome,
        biwolHome: {
            x: target.x - vector.x * 190 + side.x * 48,
            y: target.y - vector.y * 190 + side.y * 48,
        },
        biwolNear: {
            x: target.x - vector.x * 56,
            y: target.y - vector.y * 56,
        },
        palm: {
            x: yeonmukHome.x + sign * 35,
            y: yeonmukHome.y - (sign > 0 ? 73 : 86),
        },
    };
}
function biwolPosition(facing, elapsed) {
    const positions = geometry(facing);
    const travel = attackDefinition('biwol', 'lunge').travel;
    if (!travel)
        return positions.biwolHome;
    const progress = elapsed < travel.arrive
        ? smooth((elapsed - travel.begin) / (travel.arrive - travel.begin))
        : 1 -
            smooth((elapsed - travel.returnStart) /
                (travel.returnEnd - travel.returnStart));
    return {
        x: positions.biwolHome.x +
            (positions.biwolNear.x - positions.biwolHome.x) * progress,
        y: positions.biwolHome.y +
            (positions.biwolNear.y - positions.biwolHome.y) * progress,
    };
}
function shadow(ctx, position) {
    ctx.save();
    ctx.fillStyle = '#090d1680';
    ctx.beginPath();
    ctx.ellipse(position.x, position.y + 2, 25, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
function drawBody(ctx, source, position) {
    const image = source.sprite.image;
    ctx.drawImage(image, Math.round(position.x - source.pivot.x * bodyScale), Math.round(position.y - (image.naturalHeight - source.pivot.y) * bodyScale), image.naturalWidth * bodyScale, image.naturalHeight * bodyScale);
}
function drawActor(ctx, assets, frame, actor, sample, started, position) {
    const frames = actor === 'yeonmuk'
        ? assets.acting.talisman.get(frame.facing)
        : assets.advanced.companions.get('biwol')?.get(frame.facing);
    const idle = assets.idle.get(actor)?.get(frame.facing);
    if (!frames?.length || !idle)
        throw new Error(`인서트 장면의 몸 원본이 없습니다: ${actor}`);
    shadow(ctx, position);
    if (!started || sample.idle) {
        ctx.drawImage(idle.image, Math.round(position.x - (idle.image.naturalWidth * bodyScale) / 2), Math.round(position.y - idle.bounds.bottom * bodyScale), idle.image.naturalWidth * bodyScale, idle.image.naturalHeight * bodyScale);
        return 0;
    }
    const index = Math.min(frames.length - 1, Math.floor(sample.bodyProgress * frames.length));
    drawBody(ctx, frames[index], position);
    return index;
}
/** 단발 원본의 비행·부착·문양을 같은 표적 좌표에서 그린다. */
function drawTalisman(ctx, frame, sample) {
    if (!sample.spellStarted)
        return;
    const elapsed = sample.spellElapsed;
    const palm = geometry(frame.facing).palm;
    const hit = { x: target.x, y: target.y - 61 };
    if (elapsed >= 0.27 && elapsed < 0.43) {
        const progress = (elapsed - 0.27) / 0.16;
        drawPaper(ctx, {
            x: palm.x + (hit.x - palm.x) * progress,
            y: palm.y +
                (hit.y - palm.y) * progress -
                Math.sin(progress * Math.PI) * 5,
        }, Math.sin(progress * Math.PI * 2) * 0.25);
    }
    else if (elapsed >= 0.43 && elapsed < 0.51) {
        drawPaper(ctx, hit, 0, elapsed < 0.48 ? 1 : 1 - (elapsed - 0.48) / 0.03);
    }
    if (elapsed >= sample.spell.contact && elapsed < 0.69) {
        drawSeal(ctx, target, (elapsed - sample.spell.contact) / 0.21);
    }
}
function drawLungeImpact(ctx, frame, sample) {
    const time = sample.lungeElapsed - sample.lunge.contact;
    if (!sample.lungeStarted || time < 0 || time >= 0.18)
        return;
    const vector = geometry(frame.facing).vector;
    ctx.save();
    ctx.globalAlpha = (1 - time / 0.18) * (frame.reducedMotion ? 0.45 : 0.8);
    ctx.strokeStyle = '#e4d8dc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(target.x - vector.x * 31, target.y - 56 - vector.y * 31);
    ctx.lineTo(target.x + vector.x * 9, target.y - 56 + vector.y * 9);
    ctx.stroke();
    ctx.restore();
}
function drawWorld(ctx, assets, frame, sample) {
    const positions = geometry(frame.facing);
    const biwol = biwolPosition(frame.facing, sample.lungeElapsed);
    drawStage(ctx, { home: positions.yeonmukHome, target, light: false });
    const lungeHit = frame.timeMs >= talismanInsertTiming.lungeContactMs;
    const elapsed = lungeHit ? sample.lungeElapsed : sample.spellElapsed;
    const contact = lungeHit ? sample.lunge.contact : sample.spell.contact;
    const recoil = frame.reducedMotion ? 0.35 : 1;
    let poseIndex = 0;
    const subjects = [
        {
            depth: positions.yeonmukHome.y,
            draw: () => {
                drawActor(ctx, assets, frame, 'yeonmuk', sample.spell, sample.spellStarted, positions.yeonmukHome);
            },
        },
        {
            depth: biwol.y,
            draw: () => {
                poseIndex = drawActor(ctx, assets, frame, 'biwol', sample.lunge, sample.lungeStarted, biwol);
            },
        },
        {
            depth: target.y,
            draw: () => {
                drawTarget(ctx, target, elapsed, contact, {
                    x: positions.vector.x * recoil,
                    y: positions.vector.y * recoil,
                });
            },
        },
    ];
    subjects.sort((left, right) => left.depth - right.depth);
    for (const subject of subjects)
        subject.draw();
    drawTalisman(ctx, frame, sample);
    drawLungeImpact(ctx, frame, sample);
    return poseIndex;
}
/** 인서트도 별도 가짜 문양 대신 동일한 무대의 표적 부분을 확대한다. */
export function drawTalismanInsert(ctx, assets, frame) {
    const sample = sampleTalismanInsert(frame.timeMs, frame.facing);
    const closeUp = frame.enhanced && sample.closeUp;
    const zoom = closeUp ? 2 : 1;
    ctx.save();
    try {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#242834';
        ctx.fillRect(0, 0, signatureWidth, signatureHeight);
        // 멈춘 인서트와 와이드의 명료한 컷으로 연결하며 이동하는 줌은 만들지 않는다.
        ctx.translate(target.x * worldScale, (target.y - 61) * worldScale);
        ctx.scale(worldScale * zoom, worldScale * zoom);
        ctx.translate(-target.x, -(target.y - 61));
        const poseIndex = drawWorld(ctx, assets, frame, sample);
        return {
            phase: sample.phase,
            detail: frame.enhanced
                ? '부적 비행·부착 → 실제 표적의 문양 인서트 → 비월의 찌르기 순서입니다. 같은 몸·배치·접촉 시각을 쓰며 별도 합동 피해나 표식 보너스는 없습니다.'
                : '같은 몸·종이·문양·접촉 시각을 한 와이드 구도로 유지합니다. 문양을 읽는 동안 원본 시각을 천천히 진행합니다.',
            poseIndex,
        };
    }
    finally {
        ctx.restore();
    }
}
