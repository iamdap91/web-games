import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { signatureHeight, signatureWidth, } from './contracts.js';
import { drawSignature } from './drawing.js';
const frameDurationMs = 50;
/** 화면과 같은 장면 시간을 사용하고, 프레임 사이에 취소 입력을 처리한다. */
export async function exportSignatureGif(settings) {
    settings.signal.throwIfAborted();
    const canvas = document.createElement('canvas');
    canvas.width = signatureWidth;
    canvas.height = signatureHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        canvas.width = 0;
        canvas.height = 0;
        throw new Error('GIF를 그릴 화면을 만들 수 없습니다.');
    }
    const frameCount = Math.ceil(settings.scene.durationMs / frameDurationMs);
    try {
        const gif = GIFEncoder();
        settings.onProgress(0);
        for (let index = 0; index < frameCount; index += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 0));
            settings.signal.throwIfAborted();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            drawSignature(ctx, settings.assets, {
                scene: settings.scene,
                timeMs: index * frameDurationMs,
                enhanced: true,
                facing: settings.facing,
                reducedMotion: settings.reducedMotion,
            });
            const pixels = ctx.getImageData(0, 0, signatureWidth, signatureHeight).data;
            const palette = quantize(pixels, 256, { format: 'rgb565' });
            gif.writeFrame(applyPalette(pixels, palette, 'rgb565'), signatureWidth, signatureHeight, {
                palette,
                delay: Math.min(frameDurationMs, settings.scene.durationMs - index * frameDurationMs),
                repeat: 0,
            });
            settings.onProgress((index + 1) / frameCount);
        }
        settings.signal.throwIfAborted();
        gif.finish();
        return new Blob([new Uint8Array(gif.bytes())], { type: 'image/gif' });
    }
    finally {
        canvas.width = 0;
        canvas.height = 0;
    }
}
