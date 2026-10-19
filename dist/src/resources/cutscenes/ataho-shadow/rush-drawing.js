import { drawCombo, stageWidth, } from '../../characters/ataho-v2-combos/drawing.js';
import { rushOptions } from './choreography.js';
import { finaleSourceStartMs, samplePresentedRush } from './finale-timing.js';
import { drawCinematicFinale } from './finale-drawing.js';
import { samplePresetRush } from './preset-rush.js';
import { prisonStartMs, sceneWidth, sceneHeight, } from './timeline.js';
function realm(ctx, s, a, reducedMotion) {
    const drift = reducedMotion ? 0 : Math.sin(s.elapsedMs / 1700) * 3;
    ctx.fillStyle = '#100b0e';
    ctx.fillRect(0, 0, sceneWidth, sceneHeight);
    ctx.drawImage(a.realm.image, -30, -14 + drift, 1020, 574);
    const haze = ctx.createLinearGradient(0, 335, 0, 500);
    haze.addColorStop(0, '#5b122000');
    haze.addColorStop(0.55, '#8c25331c');
    haze.addColorStop(1, '#09070c00');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 335, sceneWidth, 165);
    for (let i = 0; i < 24; i++) {
        const phase = (s.elapsedMs / 4400 + i * 0.317) % 1;
        const x = (i * 153.7) % sceneWidth;
        const y = 475 - phase * 265;
        ctx.fillStyle = i % 3 === 0 ? '#d49b604f' : '#a34a4c45';
        ctx.fillRect(x + Math.sin(phase * 4 + i) * 17, y, 2, i % 4 === 0 ? 5 : 2);
    }
}
/** 기존 순옥살의 본체와 공격 분신을 같은 시각·좌표·샌드백 판정으로 그린다. */
export function drawRushScene(ctx, s, a, options) {
    const { finisher, hitCount, totalHits } = samplePresentedRush(s.elapsedMs - prisonStartMs);
    realm(ctx, s, a, options.reducedMotion);
    const presentedTimeMs = s.elapsedMs - prisonStartMs;
    if (presentedTimeMs >= finaleSourceStartMs) {
        ctx.fillStyle = `rgba(2, 2, 7, ${finisher.backgroundDim * 0.4})`;
        ctx.fillRect(0, 0, sceneWidth, sceneHeight);
    }
    const cinematic = drawCinematicFinale(ctx, presentedTimeMs, a, options);
    if (!cinematic) {
        const preset = samplePresetRush(presentedTimeMs);
        ctx.save();
        ctx.translate(0, 70);
        const fit = sceneWidth / stageWidth;
        ctx.scale(fit, fit);
        drawCombo(ctx, preset.snapshot, a.combatFrames, {
            ...rushOptions,
            composition: 'cutscene',
            hitStopElapsedMs: options.reducedMotion
                ? undefined
                : preset.hitStopElapsedMs,
            ...(options.reducedMotion
                ? {
                    cameraMode: 'none',
                    showCameraRecoil: false,
                    showShockwave: false,
                }
                : {}),
        }, a.comboSurfaces);
        ctx.restore();
    }
    ctx.fillStyle = '#e5b47c';
    ctx.font = '18px serif';
    ctx.textAlign = 'left';
    ctx.fillText(finisher.beat.label, 62, 84);
    ctx.fillStyle = '#f4dec0';
    ctx.textAlign = 'right';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`${String(hitCount).padStart(2, '0')} / ${totalHits}`, 898, 84);
    ctx.font = '12px sans-serif';
    ctx.fillText('명중', 898, 106);
    ctx.fillStyle = '#030407';
    if (s.cut.id === 'still') {
        // 전원이 소멸한 뒤 짧은 정적을 거쳐 등 뒤 종결로 어둡게 연결한다.
        ctx.globalAlpha = s.progress * 0.65;
        ctx.fillRect(0, 0, sceneWidth, sceneHeight);
        ctx.globalAlpha = 1;
    }
}
