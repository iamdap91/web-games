import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { CutscenePlayer, sceneHeight, sceneWidth, } from './playback.js';
/** 검토 페이지와 같은 절대 시각·렌더러를 쓰되 감상용 재생 상태는 바꾸지 않는다. */
export async function exportCutsceneGif(options) {
    const player = new CutscenePlayer(options.definition.cuts);
    const { startMs, endMs } = options.range;
    const stepMs = startMs === 0 && endMs === player.durationMs ? 80 : 40;
    const frameCount = Math.ceil((endMs - startMs) / stepMs);
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    try {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx)
            throw new Error('GIF를 그릴 수 없습니다.');
        const gif = GIFEncoder();
        for (let frame = 0; frame < frameCount; frame++) {
            await new Promise((resolve) => window.setTimeout(resolve, 0));
            options.signal.throwIfAborted();
            const timeMs = startMs + frame * stepMs;
            player.seek(timeMs);
            ctx.setTransform(640 / sceneWidth, 0, 0, 360 / sceneHeight, 0, 0);
            ctx.clearRect(0, 0, sceneWidth, sceneHeight);
            options.definition.draw(ctx, player.snapshot(), options.assets, {
                reducedMotion: options.reducedMotion,
            });
            const pixels = ctx.getImageData(0, 0, 640, 360).data;
            const palette = quantize(pixels, 256, { format: 'rgb565' });
            gif.writeFrame(applyPalette(pixels, palette, 'rgb565'), 640, 360, {
                palette,
                // GIF의 10ms 해상도에서 짧은 마지막 표본도 0 지연이 되지 않게 한다.
                delay: Math.max(10, Math.min(stepMs, endMs - timeMs)),
                repeat: 0,
            });
            options.progress(frame + 1, frameCount);
        }
        options.signal.throwIfAborted();
        gif.finish();
        return new Blob([new Uint8Array(gif.bytes())], { type: 'image/gif' });
    }
    finally {
        canvas.width = canvas.height = 1;
    }
}
