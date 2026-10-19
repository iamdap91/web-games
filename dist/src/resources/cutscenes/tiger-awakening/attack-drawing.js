import { drawPose, groundY, startX, } from '../../characters/ataho-v2-combos/pose-drawing.js';
import { drawSandbag } from '../../characters/ataho-v2-combos/sandbag-drawing.js';
import { frameKey } from '../../characters/ataho-v2-combos/source-frames.js';
import { sprite, stage, voidBackground } from '../shared/drawing.js';
import { drawImpact, gold, ivory } from '../shared/combat-drawing.js';
import { ease, unit } from '../shared/playback.js';
import { battleOptions, groundImpactPoint, } from './battle.js';
import { impactHoldMs } from './timeline.js';
import { drawGeothermalWave } from './geothermal-wave.js';
const poseOptions = { ...battleOptions, showMovement: true };
function battleStage(ctx, timeMs) {
    stage(ctx, timeMs);
    // 뒤쪽 분출도 바닥에서 솟도록 인물 뒤까지 도장 바닥의 깊이를 확보한다.
    ctx.fillStyle = '#39302a';
    ctx.fillRect(0, 305, 960, 235);
    ctx.strokeStyle = '#8b70523b';
    ctx.lineWidth = 1;
    for (const y of [320, 343, 375, 417, 471, 536]) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(960, y);
        ctx.stroke();
    }
    for (const x of [-600, -220, 160, 540, 920, 1300, 1680]) {
        ctx.beginPath();
        ctx.moveTo(480 + (x - 480) * 0.3, 305);
        ctx.lineTo(x, 540);
        ctx.stroke();
    }
}
function contactBurst(ctx, battle, monochrome) {
    const contact = battle.contact;
    const age = battle.impactAgeMs;
    if (!battle.connected || !contact || age > 520)
        return;
    const travel = ease(age / 360);
    ctx.save();
    ctx.translate(contact.x, contact.y);
    ctx.globalAlpha = 1 - unit((age - 130) / 390);
    for (let i = 0; i < 18; i++) {
        const angle = -1.2 + ((i % 7) - 3) * 0.37;
        const radius = 5 + travel * (40 + (i % 5) * 19);
        ctx.save();
        ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
        ctx.rotate(angle);
        ctx.fillStyle = monochrome ? '#100b09' : i % 3 ? gold : ivory;
        ctx.fillRect(0, -1.5, (1 - travel) * (i % 3 ? 14 : 32) + 3, i % 4 ? 2 : 5);
        ctx.restore();
    }
    ctx.restore();
}
function view(battle, reducedMotion) {
    const pullback = reducedMotion
        ? 1
        : ease((battle.groundAgeMs - impactHoldMs) / 450);
    const kick = reducedMotion || battle.groundAgeMs < 0
        ? 0
        : (1 - unit((battle.groundAgeMs - impactHoldMs) / 260)) ** 2;
    return {
        x: 600 + (480 - 600) * pullback + kick * 4,
        y: 474 + (406 - 474) * pullback + kick * 21,
        zoom: 1.75 +
            (1.05 - 1.75) * pullback +
            (reducedMotion ? 0 : battle.preparation * 0.08 * (1 - pullback)),
        focusX: groundImpactPoint.x,
        focusY: groundImpactPoint.y,
    };
}
function drawCombatants(ctx, a, battle, monochrome) {
    const frame = a.battleFrames.get(frameKey(battle.pose.step));
    const target = battle.target;
    if (!frame || !target)
        return;
    const released = Math.max(0, battle.impactAgeMs);
    const recoil = !battle.connected
        ? 0
        : Math.sin(released / 80) *
            Math.exp(-released / 300) *
            (1 - unit(released / 550)) *
            1.7;
    const pressure = Math.max(0, recoil);
    ctx.save();
    if (monochrome)
        ctx.filter = 'brightness(0.08) grayscale(1)';
    drawSandbag(ctx, {
        ...target,
        // 지지점과 최초 접촉은 보존하고, 솟은 분출에 맞은 몸통만 위로 반동시킨다.
        offsetY: target.offsetY - recoil * 15,
        rotation: target.rotation - recoil * 0.07,
        scaleX: target.scaleX + pressure * 0.12,
        scaleY: target.scaleY - pressure * 0.16,
        flash: monochrome ? 0 : target.flash,
    });
    ctx.fillStyle = '#05060980';
    ctx.beginPath();
    ctx.ellipse(startX, groundY + 2, 70, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    drawPose(ctx, battle.pose, frame, poseOptions);
    ctx.restore();
}
function hud(ctx, battle) {
    ctx.fillStyle = '#11151de8';
    ctx.fillRect(664, 59, 223, 54);
    ctx.fillStyle = '#c8bba6';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('수련 샌드백', 679, 80);
    ctx.fillStyle = '#493c30';
    ctx.fillRect(679, 92, 193, 7);
    ctx.fillStyle = gold;
    ctx.fillRect(679, 92, (193 * battle.health) / battle.maxHealth, 7);
    if (!battle.connected)
        return;
    ctx.globalAlpha = 1 - unit((battle.impactAgeMs - 800) / 350);
    ctx.fillStyle = ivory;
    ctx.font = 'bold 35px serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(battle.damage), 760, 151 - ease(battle.impactAgeMs / 600) * 25);
    ctx.fillStyle = gold;
    ctx.font = '23px serif';
    ctx.fillText('호왕일격', 480, 470);
    ctx.globalAlpha = 1;
}
export function drawAttackScene(ctx, s, a, battle, options) {
    const monochrome = !options.reducedMotion &&
        battle.groundAgeMs >= 0 &&
        battle.groundAgeMs < 55;
    if (monochrome) {
        ctx.fillStyle = '#f5e8cb';
        ctx.fillRect(0, 0, 960, 540);
    }
    else if (battle.groundAgeMs < 0) {
        // 준비의 배경 흐름을 멈춰 40ms 하강과 대비한다.
        voidBackground(ctx, 0, true);
        ctx.save();
        const pulse = battle.releaseProgress > 0 ? 1 : 0.45 + battle.preparation * 0.2;
        ctx.globalAlpha = pulse;
        sprite(ctx, a.spirit, 430, 600, 650);
        ctx.restore();
        ctx.fillStyle = `rgba(4,6,10,${0.2 + battle.preparation * 0.28})`;
        ctx.fillRect(0, 0, 960, 540);
    }
    else {
        battleStage(ctx, s.elapsedMs);
        ctx.fillStyle = `rgba(3,5,9,${0.72 * (1 - unit((battle.groundAgeMs - 55) / 500))})`;
        ctx.fillRect(0, 0, 960, 540);
    }
    const camera = view(battle, options.reducedMotion);
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.focusX, -camera.focusY);
    if (battle.groundAgeMs >= 0 && !monochrome)
        drawGeothermalWave(ctx, a.battleFrames, groundImpactPoint, battle.pose.elapsedMs);
    drawCombatants(ctx, a, battle, monochrome);
    if (battle.groundAgeMs >= 0 && battle.groundAgeMs < 230)
        drawImpact(ctx, groundImpactPoint.x, groundImpactPoint.y, battle.groundAgeMs, 1.65);
    contactBurst(ctx, battle, monochrome);
    ctx.restore();
    if (!monochrome)
        hud(ctx, battle);
}
