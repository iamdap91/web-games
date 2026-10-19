import { ease } from '../../cutscenes/shared/playback.js';
import { drawAdvancedCombat } from './advanced-combat-drawing.js';
import { drawAdvancedEffects } from './advanced-effects-drawing.js';
import { drawActingCharacters } from './acting-character-drawing.js';
import { drawTalismanInsert } from './acting-insert-drawing.js';
import { drawActingEffects } from './acting-effects-drawing.js';
import { sampleComboMotion } from '../../characters/ataho-v2-combos/player.js';
import { drawMeteorCircus } from '../../characters/ataho-v2-combos/meteor-circus-drawing.js';
import { sampleCircusShot, sampleCircusTarget, } from '../../characters/ataho-v2-combos/meteor-circus-flight.js';
import { drawAtmosphereSignature, drawSignatureStage, } from './atmosphere-drawing.js';
import { signatureHeight, signatureWidth, } from './contracts.js';
function poseEnvelope(timeMs, durationMs) {
    return (ease((timeMs - 500) / 330) * (1 - ease((timeMs - durationMs + 650) / 330)));
}
/** 같은 64px 원본 격자 배율과 발 기준을 써 자세 교체를 크기 변화로 강조하지 않는다. */
function drawPoseFrame(ctx, source, baseline) {
    const scale = 4;
    ctx.drawImage(source.image, 480 - (source.image.naturalWidth * scale) / 2, baseline - source.bounds.bottom * scale, source.image.naturalWidth * scale, source.image.naturalHeight * scale);
}
function drawPoseSignature(ctx, assets, frame) {
    const { scene, timeMs: t } = frame;
    const idle = assets.idle.get(scene.actor)?.get(frame.facing);
    const pose = assets.poses.get(scene.id)?.get(frame.facing)?.[0];
    if (!idle || !pose)
        throw new Error(`자세 그림을 준비하지 못했습니다: ${scene.title}`);
    drawSignatureStage(ctx, assets, frame);
    const active = frame.enhanced && t >= 650 && t < scene.durationMs - 530;
    const envelope = poseEnvelope(t, scene.durationMs);
    ctx.save();
    ctx.globalAlpha = 0.36;
    ctx.fillStyle = '#080d12';
    ctx.beginPath();
    ctx.ellipse(480, 445, 55, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (active && (scene.id === 'gainax' || scene.id === 'sunrise')) {
        ctx.save();
        ctx.globalAlpha = envelope * 0.22;
        ctx.fillStyle = scene.id === 'gainax' ? '#ddb969' : '#a9c2d0';
        ctx.beginPath();
        ctx.moveTo(480, 130);
        ctx.lineTo(670, 440);
        ctx.lineTo(290, 440);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // 새 자세를 통째 회전하거나 다른 방향 그림을 뒤집지 않고 해당 방향 원본을 표시한다.
    // 공중 자세는 별도 컷의 높은 위치에 배치하며 도약 궤적이나 중간 몸 동작을 만들지 않는다.
    const aerialCut = active && scene.id === 'seed';
    drawPoseFrame(ctx, active ? pose : idle, aerialCut ? 360 : 440);
    ctx.restore();
    const phase = t < 650
        ? '기본 자세'
        : t < scene.durationMs - 530
            ? '결정 자세 컷'
            : '기본 자세로 복귀';
    return {
        phase,
        detail: !frame.enhanced
            ? '같은 시간에 기본 자세를 유지하는 비교입니다.'
            : scene.id === 'seed'
                ? '기본 자세 → 공중 결정 자세 컷 → 복귀. 도약 중간 동작은 포함하지 않습니다.'
                : '기본 자세 → 전용 원화 컷 → 기본 자세. 새 중간 그림은 사용자 확인 뒤 제작합니다.',
        poseIndex: active ? 1 : 0,
    };
}
function drawCircusOverview(ctx, assets, frame) {
    ctx.fillStyle = '#18252c';
    ctx.fillRect(0, 0, signatureWidth, signatureHeight);
    const time = frame.timeMs;
    const target = sampleCircusTarget(time);
    const toScreen = (point) => ({
        x: 120 + point.z * 0.22,
        y: 290 - point.x * 0.4 - point.y * 0.15,
    });
    ctx.strokeStyle = '#8cb2bb25';
    for (let x = 120; x < 900; x += 66) {
        ctx.beginPath();
        ctx.moveTo(x, 70);
        ctx.lineTo(x, 470);
        ctx.stroke();
    }
    let hits = 0;
    for (const shot of assets.circus.motion.ki?.shots ?? []) {
        const flight = shot.circusFlight;
        if (!flight || time < flight.launchMs)
            continue;
        if (time >= flight.arriveMs) {
            hits++;
            continue;
        }
        ctx.strokeStyle = '#a6d9e7a8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const point = toScreen(sampleCircusShot(flight, Math.max(flight.launchMs, time - (9 - i) * 28)));
            if (i === 0)
                ctx.moveTo(point.x, point.y);
            else
                ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
        const tip = toScreen(sampleCircusShot(flight, time));
        ctx.fillStyle = '#fff3b3';
        ctx.fillRect(tip.x - 2, tip.y - 2, 4, 4);
    }
    const point = toScreen(target);
    ctx.fillStyle = '#ffad90';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '18px system-ui';
    ctx.fillStyle = '#f3e9cd';
    ctx.fillText('고정 구도 · 같은 광탄 경로와 명중 시각', 45, 45);
    ctx.fillText(`${hits}/32 명중`, 45, 495);
    return {
        phase: time < 1050
            ? '발사'
            : time < 8000
                ? '추격·회피'
                : time < 8600
                    ? '추월'
                    : time < 8880
                        ? '명중'
                        : '종결',
        detail: frame.reducedMotion
            ? '움직임 줄이기 · 같은 경로와 명중 시각을 고정 도해로 표시합니다.'
            : '기존 추격 데이터의 고정 경로 도해입니다.',
        poseIndex: hits,
    };
}
function drawCircusSignature(ctx, assets, frame) {
    if (!frame.enhanced || frame.reducedMotion)
        return drawCircusOverview(ctx, assets, frame);
    const pose = sampleComboMotion(assets.circus.motion, frame.timeMs);
    ctx.fillStyle = '#10171e';
    ctx.fillRect(0, 0, signatureWidth, signatureHeight);
    ctx.save();
    // 기존 900×410 투영을 원래 비율로 재사용한다.
    ctx.translate((signatureWidth - 900) / 2, (signatureHeight - 410) / 2);
    const state = drawMeteorCircus(ctx, { ...pose, paused: false, waiting: false, opacity: 1 }, assets.circus.frames, { showMovement: true });
    ctx.restore();
    return {
        phase: state?.phase ?? '도입',
        detail: `기존 유성권 추격 시안 · ${state?.hits ?? 0}/32 명중`,
        poseIndex: state?.hits ?? 0,
    };
}
/** 재생·탐색·GIF가 같은 절대 시각을 같은 렌더러로 그린다. */
export function drawSignature(ctx, assets, frame) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, signatureWidth, signatureHeight);
    ctx.clip();
    try {
        if (frame.scene.id === 'talisman-insert')
            return drawTalismanInsert(ctx, assets, frame);
        if (frame.scene.id === 'reaction-acting' ||
            frame.scene.id === 'drunken-balance')
            return drawActingCharacters(ctx, assets, frame);
        if (frame.scene.id === 'water-landing' || frame.scene.id === 'heat-haze')
            return drawActingEffects(ctx, assets, frame);
        if (frame.scene.id === 'split-screen' ||
            frame.scene.id === 'perspective-punch')
            return drawAdvancedCombat(ctx, assets, frame);
        if (frame.scene.id === 'metamorphosis' ||
            frame.scene.id === 'rolling-smoke' ||
            frame.scene.id === 'cube-debris')
            return drawAdvancedEffects(ctx, assets, frame);
        if (frame.scene.id === 'minagawa' || frame.scene.id === 'dezaki')
            return drawAtmosphereSignature(ctx, assets, frame);
        if (frame.scene.id === 'itano')
            return drawCircusSignature(ctx, assets, frame);
        return drawPoseSignature(ctx, assets, frame);
    }
    finally {
        ctx.restore();
    }
}
