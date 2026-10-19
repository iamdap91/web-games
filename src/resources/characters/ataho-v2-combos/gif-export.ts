import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { BodySilhouette } from './body-silhouette.js';
import {
  drawCombo,
  stageHeight,
  stageWidth,
  type DrawingOptions,
} from './drawing.js';
import { KiLighting } from './ki-lighting.js';
import type { ComboPlayer } from './player.js';
import { BackgroundShockwave } from './shockwave-presentation.js';
import type { SourceFrame } from './source-frames.js';

const frameDurationMs = 20;

/** 화면 재생기와 분리한 한 주기를 같은 그리기 경로로 내보낸다. */
export async function exportComboGif(settings: {
  readonly replay: ReturnType<ComboPlayer['createReplay']>;
  readonly frames: ReadonlyMap<string, SourceFrame>;
  readonly options: DrawingOptions;
  readonly hitStopShake: boolean;
  readonly signal: AbortSignal;
  readonly onProgress: (progress: number) => void;
}): Promise<Blob> {
  settings.signal.throwIfAborted();
  const { player, durationMs, repeating } = settings.replay;
  if (!Number.isFinite(durationMs) || durationMs <= 0)
    throw new Error('GIF로 내보낼 재생 길이가 올바르지 않습니다.');
  const options: DrawingOptions = {
    ...settings.options,
    enabledEffects: new Set(settings.options.enabledEffects),
  };
  const frames = new Map(settings.frames);
  const canvas = document.createElement('canvas');
  canvas.width = stageWidth;
  canvas.height = stageHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    canvas.width = 0;
    canvas.height = 0;
    throw new Error('GIF를 그릴 화면을 만들 수 없습니다.');
  }
  const surfaces = {
    lighting: new KiLighting(),
    shockwave: new BackgroundShockwave(),
    silhouette: new BodySilhouette(),
  };
  // 비반복은 마지막 자세도 한 프레임 남기고, 반복은 다음 주기의 첫 자세와 겹치지 않는다.
  const frameCount = Math.max(
    1,
    Math.ceil(durationMs / frameDurationMs) + (repeating ? 0 : 1),
  );
  let previousTimeMs = 0;
  try {
    const gif = GIFEncoder();
    settings.onProgress(0);
    for (let index = 0; index < frameCount; index++) {
      // 프레임 사이에 입력과 취소를 처리하며 전체 RGBA 프레임을 쌓지 않는다.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      settings.signal.throwIfAborted();
      const timeMs = Math.min(index * frameDurationMs, durationMs);
      player.update(timeMs - previousTimeMs);
      previousTimeMs = timeMs;
      drawCombo(
        context,
        player.snapshot,
        frames,
        {
          ...options,
          hitStopElapsedMs: settings.hitStopShake
            ? player.hitStopElapsedMs
            : undefined,
        },
        surfaces,
      );
      const pixels = context.getImageData(0, 0, stageWidth, stageHeight).data;
      const palette = quantize(pixels, 256, { format: 'rgb565' });
      const indexed = applyPalette(pixels, palette, 'rgb565');
      gif.writeFrame(indexed, stageWidth, stageHeight, {
        palette,
        delay: frameDurationMs,
        repeat: repeating ? 0 : -1,
      });
      settings.onProgress((index + 1) / frameCount);
    }
    settings.signal.throwIfAborted();
    gif.finish();
    return new Blob([new Uint8Array(gif.bytes())], { type: 'image/gif' });
  } finally {
    surfaces.silhouette.destroy();
    canvas.width = 0;
    canvas.height = 0;
  }
}
