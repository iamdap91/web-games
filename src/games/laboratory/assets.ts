import manifest from '../../../resources/manifest.json' with { type: 'json' };
import {
  gradePixels,
  prepareMapObjects,
} from '../../resources/corridor/corridor-renderer.js';
import { drawIndustrial } from '../../resources/corridor/industrial-renderer.js';
import type { Animation } from '../../resources/preview/animation-player.js';
import { world, type Motion } from './game.js';

export type GameAssets = {
  readonly normal: HTMLCanvasElement;
  readonly giantDoor: HTMLCanvasElement;
  readonly pipe: HTMLCanvasElement;
  readonly animations: ReadonlyMap<Motion, Animation>;
  readonly frames: ReadonlyMap<string, HTMLImageElement>;
};

export function getContext(
  canvas: HTMLCanvasElement,
): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D를 사용할 수 없습니다.');
  return context;
}

async function loadImage(path: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = `/${path}`;
  try {
    await image.decode();
  } catch {
    throw new Error(`로컬 리소스를 불러오지 못했습니다: ${path}`);
  }
  return image;
}

function grade(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const context = getContext(canvas);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  gradePixels(pixels, {
    saturation: 0.46,
    brightness: 0.8,
    chill: 0.52,
    vignette: 0.38,
  });
  context.putImageData(pixels, 0, 0);
  return canvas;
}

export async function loadAssets(): Promise<GameAssets> {
  const map = manifest.assets.find((asset) => asset.id === 'map/261020400');
  const avatar = manifest.assets.find(
    (asset) => asset.id === 'avatar/adventurer-toben',
  );
  if (!map?.localPath || !map.regions || !avatar)
    throw new Error('게임 리소스 정보가 없습니다.');
  const components = new Map<string, HTMLImageElement>();
  const frames = new Map<string, HTMLImageElement>();
  const animations = new Map<Motion, Animation>();
  for (const motion of ['stand', 'move', 'jump'] as const) {
    const animation = avatar.animations[motion];
    if (!animation) throw new Error(`모험가 모션이 없습니다: ${motion}`);
    animations.set(motion, animation);
  }
  const [original] = await Promise.all([
    loadImage(map.localPath),
    Promise.all(
      (map.components ?? []).map(async (part) => {
        components.set(part.name, await loadImage(part.localPath));
      }),
    ),
    Promise.all(
      [...animations.values()].flatMap((animation) =>
        animation.frames.map(async (frame) => {
          frames.set(frame.localPath, await loadImage(frame.localPath));
        }),
      ),
    ),
  ]);
  const objects = prepareMapObjects(original);
  const makeBackground = (centralDoorScale: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = world.width;
    canvas.height = world.height;
    drawIndustrial(
      getContext(canvas),
      objects,
      components,
      map.regions,
      'laboratory',
      centralDoorScale,
    );
    return grade(canvas);
  };
  const pipeImage = components.get('wall');
  if (!pipeImage) throw new Error('배관 리소스가 없습니다.');
  const pipe = document.createElement('canvas');
  pipe.width = pipeImage.width;
  pipe.height = pipeImage.height;
  getContext(pipe).drawImage(pipeImage, 0, 0);
  return {
    normal: makeBackground(1),
    giantDoor: makeBackground(1.48),
    pipe: grade(pipe),
    animations,
    frames,
  };
}
