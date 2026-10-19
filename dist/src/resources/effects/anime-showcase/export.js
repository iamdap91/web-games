import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { drawSample } from './catalog.js';
import { durationMs } from './types.js';
export async function exportGif(options) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx)
        throw new Error('GIF를 그릴 수 없습니다.');
    const gif = GIFEncoder();
    try {
        for (let timeMs = 0; timeMs < durationMs; timeMs += 50) {
            await new Promise((resolve) => window.setTimeout(resolve, 0));
            options.signal.throwIfAborted();
            ctx.setTransform(2 / 3, 0, 0, 2 / 3, 0, 0);
            drawSample(ctx, options.sample, {
                timeMs,
                enhanced: true,
                reducedMotion: options.reducedMotion,
            });
            const pixels = ctx.getImageData(0, 0, 640, 360).data;
            const palette = quantize(pixels, 256, { format: 'rgb565' });
            gif.writeFrame(applyPalette(pixels, palette, 'rgb565'), 640, 360, {
                palette,
                delay: 50,
                repeat: 0,
            });
            options.progress(Math.round(((timeMs + 50) / durationMs) * 100));
        }
        gif.finish();
        return new Blob([new Uint8Array(gif.bytes())], { type: 'image/gif' });
    }
    finally {
        canvas.width = canvas.height = 1;
    }
}
