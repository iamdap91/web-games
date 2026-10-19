import { drawTarget } from '../shared/combat-drawing.js';
import { sceneWidth, sceneHeight, unit } from '../shared/playback.js';
import { frameKey } from '../../characters/ataho-v2-combos/source-frames.js';
import { drawFinaleTrails, drawFinaleStrikes } from './finale-effects.js';
import { finaleSourceStartMs, presentedRushDurationMs, } from './finale-timing.js';
import { sampleFinaleFormation } from './finale-formation.js';
function drawFloor(ctx) {
    const floor = ctx.createLinearGradient(0, 310, 0, 700);
    floor.addColorStop(0, '#39343f00');
    floor.addColorStop(0.06, '#39343fee');
    floor.addColorStop(0.7, '#25212cf5');
    floor.addColorStop(1, '#100e16ff');
    // 이전 배경의 구름과 한 줄짜리 바닥을 덮어 모든 발 위치를 받치는 면을 만든다.
    ctx.fillStyle = floor;
    ctx.fillRect(-240, 310, 1440, 420);
    ctx.save();
    ctx.strokeStyle = '#b3a4b217';
    ctx.lineWidth = 1;
    for (const endX of [-240, 0, 240, 480, 720, 960, 1200]) {
        const startX = 480 + ((endX - 480) * (330 - 240)) / (700 - 240);
        ctx.beginPath();
        ctx.moveTo(startX, 330);
        ctx.lineTo(endX, 700);
        ctx.stroke();
    }
    ctx.strokeStyle = '#b9a9b314';
    for (const y of [370, 420, 480, 555, 650]) {
        const spread = (y - 240) * 1.8;
        ctx.beginPath();
        ctx.moveTo(480 - spread, y);
        ctx.quadraticCurveTo(480, y - 5, 480 + spread, y);
        ctx.stroke();
    }
    ctx.restore();
}
function drawActorShadow(ctx, actor) {
    if (actor.opacity <= 0)
        return;
    ctx.save();
    ctx.globalAlpha *= actor.opacity * 0.68;
    ctx.fillStyle = '#05050bd9';
    ctx.beginPath();
    ctx.ellipse(actor.x, actor.feetY + 2, 34, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
function drawActor(ctx, a, actor) {
    if (actor.opacity <= 0)
        return;
    const key = frameKey(actor.pose);
    const frame = a.finaleFrames.get(key);
    if (!frame)
        throw new Error(`지상 포위 공격 자세가 없습니다: ${key}`);
    ctx.save();
    ctx.globalAlpha *= actor.opacity;
    ctx.translate(actor.x, actor.feetY);
    ctx.rotate(actor.rotation);
    ctx.scale(actor.scale, actor.scale);
    ctx.imageSmoothingEnabled = false;
    const x = -actor.anchor.x;
    const y = -actor.anchor.y;
    if (actor.colorMix >= 1)
        ctx.drawImage(frame.source.image, x, y);
    else {
        ctx.drawImage(frame.black, x, y);
        if (actor.colorMix > 0) {
            ctx.globalAlpha *= actor.colorMix;
            ctx.drawImage(frame.source.image, x, y);
        }
    }
    ctx.restore();
}
/** 지상에서 포위한 형상들이 서로 다른 공격으로 표적을 통과하고 사라진다. */
export function drawCinematicFinale(ctx, timeMs, a, options) {
    const localMs = timeMs - finaleSourceStartMs;
    if (localMs < 0 || timeMs > presentedRushDurationMs)
        return false;
    const formation = sampleFinaleFormation(localMs, options);
    const { camera, target, crossing } = formation;
    ctx.save();
    if (crossing.active && crossing.effectAgeMs < 180 && !options.reducedMotion) {
        const kick = Math.exp(-crossing.effectAgeMs / 75) *
            (1 - unit(crossing.effectAgeMs / 180));
        ctx.translate(Math.sin(crossing.effectAgeMs / 14) * kick * 1.5, kick * 3.5);
    }
    ctx.translate(sceneWidth / 2, 300);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.focusX, -camera.focusY);
    drawFloor(ctx);
    const actors = [...formation.actors].sort((left, right) => left.feetY - right.feetY);
    for (const actor of actors)
        drawActorShadow(ctx, actor);
    drawFinaleTrails(ctx, formation, options);
    for (const actor of actors)
        if (actor.feetY < target.baseY)
            drawActor(ctx, a, actor);
    const reaction = formation.strikes.reduce((result, strike) => {
        if (!strike.active || strike.ageMs >= 135)
            return result;
        const pulse = Math.sin((Math.PI * strike.ageMs) / 135) *
            Math.exp(-strike.ageMs / 110);
        return {
            force: pulse > result.pressure
                ? pulse * Math.sign(strike.direction.x)
                : result.force,
            pressure: Math.max(result.pressure, pulse),
        };
    }, { force: 0, pressure: 0 });
    const recoil = Math.max(-1, Math.min(1, reaction.force));
    ctx.save();
    ctx.translate(target.x + recoil * 3, target.baseY);
    ctx.scale(1 + reaction.pressure * 0.045, 1 - reaction.pressure * 0.07);
    ctx.translate(-target.x, -target.baseY);
    drawTarget(ctx, target.x, target.baseY, target.height, recoil * (options.reducedMotion ? 0.18 : 0.4));
    ctx.restore();
    for (const actor of actors)
        if (actor.feetY >= target.baseY)
            drawActor(ctx, a, actor);
    drawFinaleStrikes(ctx, formation, options);
    ctx.restore();
    if (formation.concealment > 0) {
        ctx.save();
        ctx.globalAlpha *= unit(formation.concealment);
        ctx.fillStyle = '#08080c';
        ctx.fillRect(0, 0, sceneWidth, sceneHeight);
        ctx.restore();
    }
    return true;
}
