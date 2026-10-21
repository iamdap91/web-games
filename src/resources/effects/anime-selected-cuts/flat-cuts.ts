import { drawBear, drawHero } from './cast.js';
import { clamp, ease, gameBackground, rand } from './drawing.js';
import { gameImpact, gameInk } from '../../cutscenes/game-effects.js';
import { comicCut } from './comic-cut.js';
import { inkCut } from './ink-cut.js';
import { orbitCut } from './orbit-cut.js';
import type { Context, Cut, CutFrame } from './types.js';

const stopTiming = {
  frozenWorld: 0.75,
  strikeStart: 1.16,
  strikeInterval: 0.06,
  strikeEnd: 1.49,
  colorReturn: 2.43,
  resume: 2.65,
  settled: 3.4,
} as const;

function frozenDebris(context: Context, frame: CutFrame, time: number): void {
  const image = frame.assets.props.basaltShards.image;
  context.save();
  context.imageSmoothingEnabled = false;
  for (let index = 0; index < 23; index++) {
    const phase = time * (0.3 + rand(index + 45) * 0.5);
    const x = 170 + rand(index * 13 + 7) * 1000 + Math.sin(phase) * 25;
    const y = 170 + rand(index * 5 + 18) * 380 - Math.sin(phase) * 62;
    const size = 4 + rand(index + 66) * 10;
    context.translate(x, y);
    context.rotate(index + phase);
    const height = (size * image.naturalHeight) / image.naturalWidth;
    context.drawImage(image, -size / 2, -height / 2, size, height);
    context.rotate(-index - phase);
    context.translate(-x, -y);
  }
  context.restore();
}

function drawWorld(context: Context, frame: CutFrame, time: number): void {
  gameBackground(context, frame, time);
  frozenDebris(context, frame, time);
  const resumed = frame.time >= stopTiming.resume;
  const age = Math.max(0, frame.time - stopTiming.resume);
  const recoil = clamp(age / 0.34);
  const launch = ease(age / 0.15);
  const settle = ease((age - 0.15) / 0.19);
  drawBear(context, frame.assets, {
    x: 920 + launch * 128 - settle * 18,
    y: 610 - Math.sin(recoil * Math.PI) * 60,
    height: 640,
    state: resumed ? 'hit' : 'attack',
    phase: resumed ? recoil : Math.min(time / 0.85, 0.76),
  });
}

function drawRipple(
  context: Context,
  image: HTMLCanvasElement,
  radius: number,
): void {
  if (radius <= 0) return;
  context.save();
  context.beginPath();
  context.arc(350, 400, radius + 12, 0, Math.PI * 2);
  context.arc(350, 400, Math.max(0, radius - 12), 0, Math.PI * 2, true);
  context.clip('evenodd');
  context.filter = 'invert(1) saturate(.55)';
  context.drawImage(image, 0, 0);
  context.restore();
  context.save();
  context.strokeStyle = 'rgba(221,249,255,.9)';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(350, 400, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

const stops = [
  { x: 850, y: 410, angle: -0.75, rotation: 0, flip: false },
  { x: 960, y: 410, angle: -2.45, rotation: 0, flip: true },
  { x: 900, y: 360, angle: 0.52, rotation: 1.05, flip: false },
  { x: 960, y: 485, angle: -2.2, rotation: -0.38, flip: true },
  { x: 850, y: 475, angle: 0.18, rotation: 0.57, flip: false },
] as const;

function drawTimeStop(context: Context, frame: CutFrame): void {
  // 재생기의 마지막 0.3초 정지 전에 착지와 다섯 잔광까지 모두 끝낸다.
  const time = Math.min(frame.time, stopTiming.settled);
  const heldFrame = { ...frame, time };
  const worldTime =
    time < stopTiming.frozenWorld
      ? time
      : time < stopTiming.resume
        ? stopTiming.frozenWorld
        : stopTiming.frozenWorld + time - stopTiming.resume;
  const world = frame.surfaces.get('stopped-world');
  drawWorld(world, heldFrame, worldTime);
  context.drawImage(world.canvas, 0, 0);
  const expanded = ease(clamp((time - 0.65) / 0.43));
  const contracted = ease(
    (time - stopTiming.colorReturn) /
      (stopTiming.resume - stopTiming.colorReturn),
  );
  const radius = expanded * (1 - contracted) * 1600;
  if (time >= 0.65 && time < stopTiming.resume) {
    context.save();
    context.beginPath();
    context.arc(350, 400, radius, 0, Math.PI * 2);
    context.clip();
    context.filter = 'grayscale(1) sepia(.35) hue-rotate(145deg) saturate(.65)';
    context.drawImage(world.canvas, 0, 0);
    context.fillStyle = 'rgba(86,117,133,.16)';
    context.fillRect(0, 0, 1280, 720);
    context.restore();
    drawRipple(context, world.canvas, radius);
  }

  const completed = Math.max(
    0,
    Math.min(
      5,
      Math.floor((time - stopTiming.strikeStart) / stopTiming.strikeInterval) +
        1,
    ),
  );
  context.save();
  context.strokeStyle = '#ffdfa0';
  context.lineCap = 'round';
  context.globalAlpha = 1 - clamp((time - stopTiming.resume) / 0.16);
  for (let index = 0; index < completed; index++) {
    const stop = stops[index]!;
    const stroke = clamp(
      (time - stopTiming.strikeStart - index * stopTiming.strikeInterval) /
        0.055,
    );
    const distance = 160 * stroke;
    context.shadowColor = '#fff4c9';
    context.shadowBlur = 12;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(
      stop.x - Math.cos(stop.angle) * 100,
      stop.y - Math.sin(stop.angle) * 100,
    );
    context.lineTo(
      stop.x + Math.cos(stop.angle) * distance,
      stop.y + Math.sin(stop.angle) * distance,
    );
    context.stroke();
  }
  context.restore();

  if (time < stopTiming.strikeStart) {
    drawHero(context, frame.assets, {
      x: 345,
      y: 650,
      height: 375,
      action: 'idle',
      phase: Math.min(time, 0.75),
    });
  } else if (time < stopTiming.strikeEnd) {
    const index = Math.min(
      4,
      Math.floor((time - stopTiming.strikeStart) / stopTiming.strikeInterval),
    );
    const stop = stops[index]!;
    // 원본 5번의 바깥주먹과 발 앵커를 같은 배율로 옮겨 접촉 위치를 고정한다.
    const sprite = frame.assets.hero.uppercut['south-east']![5]!;
    const scale = 375 / 62;
    const bodyHeight = sprite.bounds
      ? sprite.bounds.bottom - sprite.bounds.top
      : sprite.image.naturalHeight;
    const handX = (stop.flip ? -1 : 1) * (66 - sprite.anchorX) * scale;
    const handY = (39 - sprite.feetY) * scale;
    const cosine = Math.cos(stop.rotation);
    const sine = Math.sin(stop.rotation);
    drawHero(context, frame.assets, {
      x: stop.x - (handX * cosine - handY * sine),
      y: stop.y - (handX * sine + handY * cosine),
      height: bodyHeight * scale,
      action: 'uppercut',
      phase: 0.76,
      flip: stop.flip,
      rotation: stop.rotation,
    });
    gameInk(context, frame.assets.effects, {
      sheet: 'stroke',
      x: stop.x,
      y: stop.y,
      progress:
        ((time - stopTiming.strikeStart) % stopTiming.strikeInterval) /
        stopTiming.strikeInterval,
      angle: stop.angle,
      size: 180,
    });
  } else {
    drawHero(context, frame.assets, {
      x: 345,
      y: 650,
      height: 375,
      action: 'idle',
      phase: 0.8,
      facing: (-Math.PI * 3) / 4,
    });
  }

  if (time >= stopTiming.resume) {
    for (let index = 0; index < 5; index++) {
      const progress = (time - stopTiming.resume - index * 0.03) / 0.3;
      if (progress >= 0)
        gameImpact(context, frame.assets.effects, {
          x: stops[index]!.x,
          y: stops[index]!.y,
          progress,
          size: 190 + index * 20,
          angle: stops[index]!.angle,
        });
    }
  }
  context.save();
  context.strokeStyle = 'rgba(235,239,225,.4)';
  context.lineWidth = 1;
  for (let index = 0; index < 9; index++) {
    context.beginPath();
    context.arc(350, 400, 130 + index * 85 + radius * 0.03, -0.4, 0.5);
    if (time > 0.65 && time < 1.12) context.stroke();
  }
  context.restore();
  context.fillStyle = '#111b26';
  context.fillRect(0, 0, 1280, 26);
  context.fillRect(0, 694, 1280, 26);
}

export const flatCuts: readonly Cut[] = [
  orbitCut,
  {
    id: 'time-stop',
    title: '시공 연격',
    kind: '2D',
    duration: 3.7,
    description:
      '곰왕 위협에서 반전 파문이 세계만 멈춘다. 제 색의 아타호가0.06초마다 다섯 자리를 옮긴 뒤 등 돌린 정적을 짧게 읽힌다.2.43초부터 색이 돌아오고2.65초에 다섯 타가0.03초 간격으로 터지며 곰왕이 빠르게 밀린다. 정지했던 세계는 같은 시각에서 이어지고 착지와 잔광 뒤 마지막 구도를 고정한다.',
    beats: [
      { time: 0, label: '곰왕 위협' },
      { time: 0.65, label: '반전 파문 · 세계 정지' },
      { time: stopTiming.strikeStart, label: '0.06초씩 다섯 자리' },
      { time: stopTiming.strikeEnd, label: '등 돌린 정적' },
      { time: stopTiming.colorReturn, label: '색 귀환' },
      { time: stopTiming.resume, label: '0.03초씩 지연 타격' },
      { time: stopTiming.settled, label: '착지 · 잔광 소거 · 정적' },
    ],
    draw: drawTimeStop,
  },
  inkCut,
  comicCut,
];
