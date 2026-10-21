import { GameStages } from '../../cutscenes/game-stage.js';
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { drawSample, disposeSampleSurfaces } from './catalog.js';
import { getShockKomaVariant } from './shock-koma-variant-data.js';
import { fastContactCuts } from './composite-fast.js';
import { kutsunaChargeCuts } from './kutsuna-charge-scene.js';
import { heavyContactCuts } from './composite-heavy.js';
import { beamContactCuts } from './composite-beam.js';
import { compositeOrbTiming } from './composite-orb.js';
import { compositeFireTiming } from './composite-fire.js';
import { compositeSiegeTiming } from './composite-siege.js';
import { speedApproachCuts } from './motion.js';
export async function exportGif(options) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx)
        throw new Error('GIF를 그릴 수 없습니다.');
    const stage = new GameStages();
    const gif = GIFEncoder();
    const { timing, durationMs } = options.sample;
    const boundaries = Array.from({ length: Math.ceil(durationMs / 50) + 1 }, (_, i) => Math.min(durationMs, i * 50));
    const shockCuts = options.sample.id === 'shock-koma'
        ? getShockKomaVariant(options.sample.shockVariant).cuts
        : options.sample.id === 'composite-fast'
            ? fastContactCuts
            : null;
    if (shockCuts) {
        // 20fps 표본 사이에 1코마 작화가 빠지지 않도록 해당 컷의 경계로 구간을 나눈다.
        const contactCuts = shockCuts.map((cut) => timing.toPresentation(cut));
        const begin = contactCuts[0];
        const end = contactCuts[contactCuts.length - 1];
        const outside = boundaries.filter((timeMs) => timeMs < begin || timeMs > end);
        boundaries.splice(0, boundaries.length, ...outside, ...contactCuts);
        boundaries.sort((a, b) => a - b);
    }
    const motionCuts = {
        'fx-kutsuna': kutsunaChargeCuts,
        'speed-streamlines': speedApproachCuts,
        'composite-fast': speedApproachCuts.filter((cut) => cut < 1800),
        'composite-heavy': heavyContactCuts,
        'composite-beam': beamContactCuts,
        'composite-fire': [
            compositeFireTiming.contactMs,
            compositeFireTiming.holdEndMs,
        ],
        'composite-siege': compositeSiegeTiming.arrivalMs.flatMap((timeMs) => [
            timeMs,
            timeMs + compositeSiegeTiming.impactHoldMs,
        ]),
        'composite-orb': [
            compositeOrbTiming.splitMs,
            compositeOrbTiming.arrivalMs,
            compositeOrbTiming.arrivalMs + compositeOrbTiming.impactHoldMs,
        ],
        'fx-kanada-explosion': [
            0, 35, 75, 130, 215, 300, 420, 565, 760, 960, 1160, 1375,
        ].map((age) => 1800 + age / 1.25),
        'editing-harmony': [1830],
        'editing-still': [1800, 2460],
        'editing-imaishi': [1000, 1130, 1260, 1390, 1520, 1716, 1758, 1800, 2040],
        'beta-flash': [1800, 1925],
        'hisashi-punch': [1300, 1680, 1800, 2360],
        'action-cutin': [1040, 1600],
        'pon-yori': [1760, 1800, 2250],
        'inazuma-kick': [1540, 1720, 1800, 1900, 2260],
        nakanuki: [1480, 1800],
        midareuchi: [3400 / 3, 4400 / 3, 1550, 42200 / 24, 1800],
        strobe: [1150, 1270, 1390, 1510, 1630, 1750, 1800, 2110],
        'motion-metamorphosis': [1060, 1150, 1800, 1960, 2080],
        'wave-propagation': [650, 850, 950, 1950, 2380],
        'squash-stretch': [1050, 1160, 1560, 1740, 1800, 1920, 2000],
        'kanada-motion': [1400, 1716, 1758, 1800],
        'focus-lines': [1530, 1600, 1800, 1980, 2050],
        'smear-frame': [1740, 1760, 1770, 1780, 1800],
        obake: [1720, 1740, 1760, 1770, 1780, 1800],
    };
    // 접근·변형은 계속 움직이므로 기존 표본도 남기고 짧은 원화 교체 경계만 보충한다.
    for (const sourceTime of [
        ...timing.sourceBoundaries,
        ...(motionCuts[options.sample.id] ?? []),
    ]) {
        const timeMs = timing.toPresentation(sourceTime);
        if (!boundaries.includes(timeMs))
            boundaries.push(timeMs);
    }
    // 저장 형식의10ms 경계로 먼저 합쳐 짧은 보호 구간이0ms 프레임으로 남지 않게 한다.
    const frameTimes = [
        ...new Set(boundaries.map((time) => Math.round(time / 10) * 10)),
    ].sort((a, b) => a - b);
    const exportDurationMs = frameTimes[frameTimes.length - 1];
    try {
        await stage.load();
        options.signal.throwIfAborted();
        for (let index = 0; index < frameTimes.length - 1; index++) {
            const timeMs = frameTimes[index];
            const endMs = frameTimes[index + 1];
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
            options.progress(Math.round((endMs / exportDurationMs) * 100));
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
