import { sprite, stage, voidBackground } from '../shared/drawing.js';
import { ease, unit, sceneWidth, sceneHeight } from '../shared/playback.js';
import { drawAttackScene } from './attack-drawing.js';
function eyes(ctx, s, a, options) {
    voidBackground(ctx, s.elapsedMs, true);
    const zoom = options.reducedMotion ? 0 : ease(s.progress) * 35;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 162, sceneWidth, 193);
    ctx.clip();
    sprite(ctx, a.portrait, 505, 915 + zoom * 0.45, 1090 + zoom);
    const light = ctx.createLinearGradient(0, 170, 0, 350);
    light.addColorStop(0, '#05060c85');
    light.addColorStop(0.4, '#f3c87905');
    light.addColorStop(1, '#05060c65');
    ctx.fillStyle = light;
    ctx.fillRect(0, 160, sceneWidth, 200);
    ctx.restore();
    ctx.fillStyle = '#b69d70';
    ctx.fillRect(65, 160, 70, 1);
    ctx.fillRect(825, 356, 70, 1);
}
function lowStage(ctx, timeMs) {
    ctx.save();
    ctx.translate(480, 210);
    ctx.scale(1.25, 1.25);
    ctx.translate(-480, -210);
    stage(ctx, timeMs);
    ctx.restore();
    const shade = ctx.createLinearGradient(0, 0, 0, 490);
    shade.addColorStop(0, '#05060bea');
    shade.addColorStop(0.7, '#0d1014a8');
    shade.addColorStop(1, '#11101635');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, sceneWidth, sceneHeight);
}
function stance(ctx, s, a, options) {
    lowStage(ctx, s.elapsedMs);
    const settle = options.reducedMotion ? 0 : (1 - ease(s.localMs / 350)) * 8;
    ctx.fillStyle = '#020306aa';
    ctx.beginPath();
    ctx.ellipse(491, 491, 160, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    sprite(ctx, a.windup, 491, 491 - settle, 390);
    const light = ctx.createLinearGradient(0, 450, 0, 496);
    light.addColorStop(0, '#f4cd8d00');
    light.addColorStop(1, '#f4cd8d38');
    ctx.fillStyle = light;
    ctx.fillRect(200, 450, 570, 46);
}
function aura(ctx, timeMs, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    for (let i = 0; i < 8; i++) {
        const side = i % 2 ? 1 : -1;
        const x = 480 + side * (155 + Math.floor(i / 2) * 38);
        const drift = Math.sin(timeMs / 460 + i) * 12;
        ctx.strokeStyle = i % 3 === 0 ? '#f4d39b9c' : '#d18f484d';
        ctx.lineWidth = i % 3 === 0 ? 3 : 6;
        ctx.beginPath();
        ctx.moveTo(x + side * 40, 505);
        ctx.bezierCurveTo(x - side * 25 + drift, 415, x + side * 60, 260, x + drift, 135 - i * 7);
        ctx.stroke();
    }
    ctx.restore();
}
function spirit(ctx, s, a, options) {
    lowStage(ctx, s.elapsedMs);
    const reveal = ease(unit((s.localMs - 120) / 780));
    const glow = ctx.createRadialGradient(480, 270, 30, 480, 270, 490);
    glow.addColorStop(0, `rgba(192,115,40,${0.35 * reveal})`);
    glow.addColorStop(1, '#07090c00');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, sceneWidth, sceneHeight);
    ctx.save();
    ctx.globalAlpha = reveal * 0.88;
    const rise = options.reducedMotion ? 0 : (1 - reveal) * 75;
    sprite(ctx, a.spirit, 480, 553 + rise, 585);
    ctx.restore();
    aura(ctx, options.reducedMotion ? 0 : s.elapsedMs, reveal * 0.7);
    // 발은 같은 지면에 고정하고 등 뒤의 거대한 형상만 서서히 드러낸다.
    ctx.fillStyle = '#0304079c';
    ctx.beginPath();
    ctx.ellipse(491, 491, 151, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    sprite(ctx, a.windup, 491, 491, 390 - (options.reducedMotion ? 0 : reveal * 14));
}
export function drawScene(ctx, s, a, options, battle) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    switch (s.cut.id) {
        case 'eyes':
            eyes(ctx, s, a, options);
            break;
        case 'stance':
            stance(ctx, s, a, options);
            break;
        case 'spirit':
            spirit(ctx, s, a, options);
            break;
        case 'slash':
        case 'battle':
            drawAttackScene(ctx, s, a, battle.sample(s.elapsedMs), options);
            break;
    }
    const shade = ctx.createRadialGradient(480, 260, 200, 480, 260, 590);
    shade.addColorStop(0, '#05060900');
    shade.addColorStop(1, '#050609a0');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, sceneWidth, sceneHeight);
    const bar = s.cut.id === 'battle' ? 24 : 42;
    ctx.fillStyle = '#050609';
    ctx.fillRect(0, 0, sceneWidth, bar);
    ctx.fillRect(0, sceneHeight - bar, sceneWidth, bar);
    ctx.restore();
}
