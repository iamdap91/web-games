import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { drawCut } from './catalog.js';
import { CutSurfaces } from './surfaces.js';
export async function exportCutGif(cut, assets, signal, progress) {
    const surface = document.createElement('canvas');
    surface.width = 1280;
    surface.height = 720;
    const c = surface.getContext('2d');
    if (!c)
        throw new Error('GIF 원본 판을 만들 수 없습니다.');
    const small = document.createElement('canvas');
    small.width = 640;
    small.height = 360;
    const out = small.getContext('2d', { willReadFrequently: true });
    if (!out)
        throw new Error('GIF 판을 만들 수 없습니다.');
    const surfaces = new CutSurfaces(), gif = GIFEncoder(), count = Math.ceil(cut.duration * 24);
    try {
        for (let i = 0; i < count; i++) {
            await new Promise((resolve) => window.setTimeout(resolve, 0));
            signal.throwIfAborted();
            drawCut(c, cut, {
                time: Math.min(cut.duration, (i + 0.5) / 24),
                assets,
                surfaces,
            });
            out.drawImage(surface, 0, 0, 640, 360);
            const pixels = out.getImageData(0, 0, 640, 360).data, palette = quantize(pixels, 256, { format: 'rgb565' });
            // GIF의 10ms 단위 지연을 교대로 배분해 24fps 누적 오차를 줄인다.
            const delay = (Math.round(((i + 1) * 100) / 24) - Math.round((i * 100) / 24)) * 10;
            gif.writeFrame(applyPalette(pixels, palette, 'rgb565'), 640, 360, {
                palette,
                delay,
                repeat: 0,
            });
            progress(Math.round(((i + 1) / count) * 100));
        }
        gif.finish();
        return new Blob([new Uint8Array(gif.bytes())], { type: 'image/gif' });
    }
    finally {
        surfaces.dispose();
        surface.width = surface.height = small.width = small.height = 1;
    }
}
