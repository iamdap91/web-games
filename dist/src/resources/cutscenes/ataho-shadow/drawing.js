import { drawTarget as target, gold, ivory } from '../shared/combat-drawing.js';
import { drawRushScene } from './rush-drawing.js';
import { sprite, animated, voidBackground, stage, streaks, } from '../shared/drawing.js';
import { ease, sceneHeight, sceneWidth, unit, } from './timeline.js';
function stageCut(ctx, s, a, options) {
    stage(ctx, s.elapsedMs);
    const returning = s.cut.id === 'return';
    const p = returning ? ease(s.progress) : ease(unit((s.localMs - 280) / 600));
    const x = returning ? 370 : 300 + p * 75;
    sprite(ctx, animated(a.idle, s.elapsedMs, 120), x, 415, 180);
    target(ctx, 637, 412, 158, returning ? Math.sin(s.localMs * 0.018) * (1 - s.progress) : 0);
    if (!returning) {
        ctx.fillStyle = `rgba(3, 5, 8, ${p * 0.65})`;
        ctx.fillRect(0, 0, sceneWidth, sceneHeight);
    }
    else {
        ctx.fillStyle = '#ead4ad';
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = ease(unit((s.localMs - 250) / 500));
        ctx.fillText('암중호격', 480, 146);
        ctx.globalAlpha = 1;
        if (!options.reducedMotion) {
            ctx.fillStyle = `rgba(255, 232, 190, ${(1 - ease(s.progress)) * 0.4})`;
            ctx.fillRect(0, 0, sceneWidth, sceneHeight);
        }
    }
}
function eyesCut(ctx, s, a, options) {
    voidBackground(ctx, s.elapsedMs, true);
    const zoom = options.reducedMotion ? 0 : ease(s.progress) * 50;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 72, sceneWidth, 390);
    ctx.clip();
    sprite(ctx, a.portrait, 490 - zoom * 0.22, 700 + zoom * 0.6, 700 + zoom);
    // 좁은 빛을 눈높이에 두고 나머지 얼굴은 명암으로 묶는다.
    ctx.fillStyle = '#05070c88';
    ctx.fillRect(0, 72, sceneWidth, 100);
    ctx.fillRect(0, 300, sceneWidth, 180);
    const light = ctx.createLinearGradient(0, 0, sceneWidth, 0);
    light.addColorStop(0, '#e0b46c00');
    light.addColorStop(0.5, '#e0b46c30');
    light.addColorStop(1, '#e0b46c00');
    ctx.fillStyle = light;
    ctx.fillRect(0, 170, sceneWidth, 130);
    ctx.restore();
    ctx.fillStyle = '#f8dfb9';
    ctx.font = '19px serif';
    ctx.textAlign = 'left';
    ctx.globalAlpha = ease(unit((s.localMs - 220) / 350));
    ctx.fillText('고요 속에,', 92, 418);
    ctx.globalAlpha = 1;
}
function threatCut(ctx, s, a, options) {
    voidBackground(ctx, s.elapsedMs, true);
    const p = ease(s.progress);
    ctx.save();
    ctx.globalAlpha = 0.14 + p * 0.6;
    sprite(ctx, a.tiger, 490, 505, options.reducedMotion ? 460 : 380 + p * 180);
    ctx.restore();
    streaks(ctx, options.reducedMotion ? 0 : s.elapsedMs * 0.12, 0.6);
    sprite(ctx, a.strike, 480, 690, 650 + (options.reducedMotion ? 0 : p * 40));
    const shade = ctx.createLinearGradient(0, 290, 0, 520);
    shade.addColorStop(0, '#08090d00');
    shade.addColorStop(1, '#08090df0');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 290, sceneWidth, 250);
    ctx.fillStyle = gold;
    ctx.font = '24px serif';
    ctx.textAlign = 'left';
    ctx.fillText('호랑이가 깨어난다.', 78, 449);
}
function endingCut(ctx, s, a, options) {
    voidBackground(ctx, s.elapsedMs, true);
    const reveal = ease(s.localMs / 450);
    ctx.save();
    ctx.globalAlpha = reveal * 0.17;
    sprite(ctx, a.tiger, 480, 560, 600);
    ctx.restore();
    ctx.fillStyle = '#ab764336';
    ctx.font = 'bold 390px serif';
    ctx.textAlign = 'center';
    ctx.fillText('虎', 480, 431);
    ctx.save();
    ctx.globalAlpha = reveal;
    const zoom = options.reducedMotion ? 0 : ease(s.progress) * 16;
    sprite(ctx, a.ending, 480, 506 + zoom, 385 + zoom);
    ctx.restore();
    const text = ease(unit((s.localMs - 750) / 500));
    ctx.globalAlpha = text;
    ctx.fillStyle = ivory;
    ctx.textAlign = 'left';
    ctx.font = '33px serif';
    for (const [i, char] of [...'암중호격'].entries())
        ctx.fillText(char, 768, 173 + i * 49);
    ctx.fillStyle = gold;
    ctx.fillRect(774, 374, 20, 2);
    ctx.textAlign = 'right';
    ctx.font = '14px serif';
    ctx.fillStyle = '#c8bba7';
    ctx.fillText('고요가 돌아온다.', 260, 404);
    ctx.globalAlpha = 1;
}
/** 모든 컷과 효과를 절대 시각에서 그려 탐색·반복에도 같은 화면을 돌려준다. */
export function drawScene(ctx, s, assets, options) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    switch (s.cut.id) {
        case 'stage':
        case 'return':
            stageCut(ctx, s, assets, options);
            break;
        case 'eyes':
            eyesCut(ctx, s, assets, options);
            break;
        case 'threat':
            threatCut(ctx, s, assets, options);
            break;
        case 'prison':
        case 'strike':
        case 'encircle':
        case 'crossing':
        case 'still':
            drawRushScene(ctx, s, assets, options);
            break;
        case 'ending':
            endingCut(ctx, s, assets, options);
            break;
    }
    const vignette = ctx.createRadialGradient(480, 260, 160, 480, 260, 560);
    vignette.addColorStop(0, '#03040700');
    vignette.addColorStop(1, '#030407b0');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, sceneWidth, sceneHeight);
    const bars = s.cut.id === 'stage' || s.cut.id === 'return' ? 24 : 42;
    ctx.fillStyle = '#050609';
    ctx.fillRect(0, 0, sceneWidth, bars);
    ctx.fillRect(0, sceneHeight - bars, sceneWidth, bars);
    ctx.restore();
}
