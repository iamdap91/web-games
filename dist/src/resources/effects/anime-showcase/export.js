import { GameStages } from '../../cutscenes/game-stage.js';
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { drawSample, disposeSampleSurfaces } from './catalog.js';
import { durationMs } from './types.js';
import { shockKomaCuts } from './shock-koma.js';
import { shockKomaV2Cuts } from './shock-koma-v2.js';
import { fastContactCuts } from './composite-fast.js';
export async function exportGif(options) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx)
        throw new Error('GIF를 그릴 수 없습니다.');
    const stage = new GameStages();
    const gif = GIFEncoder();
    const boundaries = Array.from({ length: durationMs / 50 + 1 }, (_, i) => i * 50);
    const shockCuts = options.sample.id === 'shock-koma'
        ? shockKomaCuts
        : options.sample.id === 'shock-koma-v2'
            ? shockKomaV2Cuts
            : options.sample.id === 'composite-fast'
                ? fastContactCuts
                : null;
    if (shockCuts) {
        // 20fps 표본 사이에 1코마 작화가 빠지지 않도록 해당 컷의 경계로 구간을 나눈다.
        const begin = shockCuts[0];
        const end = shockCuts[shockCuts.length - 1];
        const outside = boundaries.filter((timeMs) => timeMs < begin || timeMs > end);
        boundaries.splice(0, boundaries.length, ...outside, ...shockCuts);
        boundaries.sort((a, b) => a - b);
    }
    const motionCuts = {
        midareuchi: [3400 / 3, 4400 / 3, 1550, 42200 / 24, 1800],
        'smear-frame': [1740, 1760, 1770, 1780, 1800],
        obake: [1720, 1740, 1760, 1770, 1780, 1800],
    };
    // 접근·변형은 계속 움직이므로 기존 표본도 남기고 짧은 원화 교체 경계만 보충한다.
    for (const cut of motionCuts[options.sample.id] ?? [])
        if (!boundaries.includes(cut))
            boundaries.push(cut);
    boundaries.sort((a, b) => a - b);
    try {
        await stage.load();
        options.signal.throwIfAborted();
        for (let index = 0; index < boundaries.length - 1; index++) {
            const timeMs = boundaries[index];
            const endMs = boundaries[index + 1];
            await new Promise((resolve) => window.setTimeout(resolve, 0));
            options.signal.throwIfAborted();
            ctx.setTransform(2 / 3, 0, 0, 2 / 3, 0, 0);
            drawSample(ctx, options.sample, {
                assets: options.assets,
                stage,
                // 짧은 연결 그림도 프레임의 가운데 노출 시각에서 표본화한다.
                timeMs: (timeMs + endMs) / 2,
                enhanced: true,
                reducedMotion: options.reducedMotion,
            });
            const pixels = ctx.getImageData(0, 0, 640, 360).data;
            const palette = quantize(pixels, 256, { format: 'rgb565' });
            gif.writeFrame(applyPalette(pixels, palette, 'rgb565'), 640, 360, {
                palette,
                // GIF의 10ms 단위 오차를 누적하지 않고 전체 구간 길이를 보존한다.
                delay: (Math.round(endMs / 10) - Math.round(timeMs / 10)) * 10,
                repeat: 0,
            });
            options.progress(Math.round((endMs / durationMs) * 100));
        }
        gif.finish();
        return new Blob([new Uint8Array(gif.bytes())], { type: 'image/gif' });
    }
    finally {
        disposeSampleSurfaces(ctx);
        stage.dispose();
        canvas.width = canvas.height = 1;
    }
}
