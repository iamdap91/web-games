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
  readonly exit: HTMLCanvasElement;
  readonly emptyCenter: HTMLCanvasElement;
  readonly door: HTMLCanvasElement;
  readonly machine: HTMLCanvasElement;
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

function grade(canvas: HTMLCanvasElement, warm = false): HTMLCanvasElement {
  const context = getContext(canvas);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  gradePixels(pixels, {
    saturation: warm ? 0.62 : 0.46,
    brightness: warm ? 1 : 0.8,
    chill: warm ? 0 : 0.52,
    vignette: 0.38,
  });
  context.putImageData(pixels, 0, 0);
  if (warm) {
    context.fillStyle = '#e9b76630';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
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
  const makeBackground = (
    centralDoorScale: number,
    warm = false,
    omitCentralDoor = false,
  ): HTMLCanvasElement => {
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
      true,
      omitCentralDoor,
    );
    return grade(canvas, warm);
  };
  const pipeImage = components.get('wall');
  if (!pipeImage) throw new Error('배관 리소스가 없습니다.');
  const pipe = document.createElement('canvas');
  pipe.width = pipeImage.width;
  pipe.height = pipeImage.height;
  getContext(pipe).drawImage(pipeImage, 0, 0);
  const doorRegion = map.regions.find((region) => region.name === 'door');
  const machineImage = components.get('machine');
  if (!doorRegion || !machineImage)
    throw new Error('이상현상 리소스가 없습니다.');
  const door = document.createElement('canvas');
  door.width = 166;
  door.height = 200;
  getContext(door).drawImage(
    objects,
    doorRegion.x,
    doorRegion.y,
    doorRegion.width,
    doorRegion.height,
    0,
    0,
    166,
    200,
  );
  const machine = document.createElement('canvas');
  machine.width = machineImage.width;
  machine.height = machineImage.height;
  getContext(machine).drawImage(machineImage, 0, 0);
  return {
    emptyCenter: makeBackground(1, false, true),
    door: grade(door),
    machine: grade(machine),
    normal: makeBackground(1),
    giantDoor: makeBackground(1.48),
    exit: makeBackground(1, true),
    pipe: grade(pipe),
    animations,
    frames,
  };
}
