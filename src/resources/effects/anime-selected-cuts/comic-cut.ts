import { drawBear, drawHero } from './cast.js';
import { clamp, ease, gameBackground, rand } from './drawing.js';
import { gameImpact, gameInk } from '../../cutscenes/game-effects.js';
import type { Context, Cut, CutFrame } from './types.js';

const comicStrike = { start: 1.78, contact: 1.88, settle: 2.36 } as const;
const comicHit = { x: 850, y: 330 } as const;
const panelTiming = {
  entries: [0.12, 0.38, 0.58, 0.72],
  entryDuration: 0.12,
  leave: 1.28,
  leaveDuration: 0.18,
} as const;

type Panel = {
  readonly points: readonly (readonly [number, number])[];
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
  readonly word: string;
  readonly kind: 'eye' | 'bear' | 'foot' | 'fist';
};

const panels: readonly Panel[] = [
  {
    points: [
      [35, 32],
      [735, 32],
      [683, 333],
      [35, 305],
    ],
    x: 35,
    y: 32,
    width: 700,
    height: 301,
    color: '#5fd5db',
    word: '번뜩',
    kind: 'eye',
  },
  {
    points: [
      [760, 32],
      [1244, 32],
      [1244, 370],
      [709, 333],
    ],
    x: 709,
    y: 32,
    width: 535,
    height: 338,
    color: '#edb7d0',
    word: '스윽',
    kind: 'bear',
  },
  {
    points: [
      [35, 332],
      [466, 354],
      [400, 687],
      [35, 687],
    ],
    x: 35,
    y: 332,
    width: 431,
    height: 355,
    color: '#f6d45e',
    word: '꽉!',
    kind: 'foot',
  },
  {
    points: [
      [493, 356],
      [1244, 397],
      [1244, 687],
      [427, 687],
    ],
    x: 427,
    y: 356,
    width: 817,
    height: 331,
    color: '#e9e3c7',
    word: '쨍!',
    kind: 'fist',
  },
];

function panelPath(context: Context, panel: Panel): void {
  context.beginPath();
  panel.points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
}

function halftone(
  context: Context,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.save();
  context.globalCompositeOperation = 'multiply';
  context.fillStyle = 'rgba(42,32,45,.25)';
  for (let row = 0; row < Math.ceil(height / 13) + 1; row++) {
    for (let column = 0; column < Math.ceil(width / 13) + 1; column++) {
      const cx = x + column * 13 + (row % 2) * 6.5;
      const cy = y + row * 13;
      context.beginPath();
      context.arc(cx, cy, 1.1 + (column / (width / 13)) * 2.5, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function lettering(
  context: Context,
  word: string,
  x: number,
  y: number,
  size: number,
  rotation = -0.1,
): void {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.font = `900 ${size}px "Arial Black", "Apple SD Gothic Neo", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = size * 0.17;
  context.strokeStyle = '#161521';
  context.strokeText(word, 0, 0);
  context.fillStyle = '#fff6da';
  context.fillText(word, 0, 0);
  context.restore();
}

function closeup(context: Context, frame: CutFrame, panel: Panel): void {
  const center = panel.x + panel.width * 0.5;
  if (panel.kind === 'eye') {
    const portrait = frame.assets.portrait;
    context.imageSmoothingEnabled = false;
    context.drawImage(
      portrait,
      portrait.naturalWidth * 0.285,
      portrait.naturalHeight * 0.245,
      portrait.naturalWidth * 0.44,
      portrait.naturalHeight * 0.27,
      panel.x - 20,
      panel.y + 2,
      panel.width + 40,
      303,
    );
  } else if (panel.kind === 'bear') {
    const sequence = frame.assets.bear.attack;
    const sprite =
      sequence[
        Math.min(sequence.length - 1, Math.floor(sequence.length * 0.72))
      ]!;
    context.save();
    context.filter = 'contrast(1.3)';
    context.imageSmoothingEnabled = false;
    context.drawImage(
      sprite.image,
      31,
      33,
      79,
      61,
      center - 225,
      panel.y - 3,
      450,
      348,
    );
    context.restore();
  } else if (panel.kind === 'foot') {
    const groundY = panel.y + panel.height - 18;
    context.strokeStyle = '#3d2c23';
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(panel.x, groundY);
    context.lineTo(panel.x + panel.width, groundY);
    context.stroke();
    context.fillStyle = 'rgba(61,44,35,.3)';
    context.beginPath();
    context.ellipse(center + 70, groundY, 96, 15, 0, 0, Math.PI * 2);
    context.fill();
    drawHero(context, frame.assets, {
      x: center + 70,
      y: groundY,
      height: 640,
      action: 'uppercut',
      phase: 0.13,
    });
  } else {
    // 작은 패치만 과확대하지 않고 주먹과 이어진 팔까지 보여 힘의 방향을 읽힌다.
    const sprite = frame.assets.hero.punch['south-east']![2]!;
    const scale = 7;
    const bodyHeight =
      (sprite.bounds?.bottom ?? sprite.image.naturalHeight) -
      (sprite.bounds?.top ?? 0);
    drawHero(context, frame.assets, {
      x: center + 100 - (80 - sprite.anchorX) * scale,
      y: panel.y + 130 - (46 - sprite.feetY) * scale,
      height: bodyHeight * scale,
      action: 'punch',
      phase: 2.5 / 17,
    });
    context.strokeStyle = '#4a4751';
    context.lineWidth = 2;
    for (let index = 0; index < 18; index++) {
      const y = panel.y + index * 25;
      context.beginPath();
      context.moveTo(panel.x + 15, y);
      context.lineTo(panel.x + 160 + rand(index) * 90, y - 36);
      context.stroke();
    }
  }
}

function drawPanel(
  context: Context,
  frame: CutFrame,
  panel: Panel,
  index: number,
): void {
  const entry = ease(
    (frame.time - panelTiming.entries[index]!) / panelTiming.entryDuration,
  );
  if (entry <= 0) return;
  const leave = ease(
    (frame.time - panelTiming.leave) / panelTiming.leaveDuration,
  );
  const sign = index % 2 === 0 ? -1 : 1;
  context.save();
  context.translate(
    sign * (1 - entry) * 880 + sign * leave * 1400,
    (1 - entry) * 35,
  );
  context.rotate(sign * (1 - entry) * 0.07 + sign * leave * 0.15);
  panelPath(context, panel);
  context.save();
  context.clip();
  context.fillStyle = panel.color;
  context.fillRect(
    panel.x - 100,
    panel.y - 100,
    panel.width + 200,
    panel.height + 200,
  );
  halftone(context, panel.x, panel.y, panel.width, panel.height);
  context.save();
  context.strokeStyle = 'rgba(25,21,33,.45)';
  context.lineWidth = 1.5;
  for (let ray = 0; ray < 13; ray++) {
    const angle = ray * 0.83;
    const cx = panel.x + panel.width * 0.5;
    const cy = panel.y + panel.height * 0.5;
    context.beginPath();
    context.moveTo(cx + Math.cos(angle) * 570, cy + Math.sin(angle) * 370);
    context.lineTo(cx + Math.cos(angle) * 180, cy + Math.sin(angle) * 135);
    context.stroke();
  }
  context.restore();
  closeup(context, frame, panel);
  const letterX = panel.x + panel.width * (index === 0 ? 0.78 : 0.25);
  const letterY = panel.y + panel.height * (index === 0 ? 0.75 : 0.72);
  lettering(
    context,
    panel.word,
    letterX,
    letterY,
    index === 1 ? 69 : 78,
    index % 2 ? 0.12 : -0.14,
  );
  context.restore();
  panelPath(context, panel);
  context.strokeStyle = '#171421';
  context.lineWidth = 11;
  context.stroke();
  context.restore();
}

function actionActors(context: Context, frame: CutFrame): void {
  const time = Math.min(frame.time, comicStrike.settle);
  const strike = clamp(
    (time - comicStrike.start) / (comicStrike.contact - comicStrike.start),
  );
  const age = time - comicStrike.contact;
  const recoil = ease((age - 0.055) / 0.31);
  const displacement =
    ease((age - 0.055) / 0.14) * 84 - ease((age - 0.195) / 0.17) * 22;
  const sequence = frame.assets.hero.uppercut['south-east']!;
  const contact = sequence[2]!;
  const index =
    time >= comicStrike.contact ? 2 : Math.min(1, Math.floor(strike * 2));
  const sprite = sequence[index]!;
  const scale = 7;
  const bounds = sprite.bounds;
  const bodyHeight =
    (bounds?.bottom ?? sprite.image.naturalHeight) - (bounds?.top ?? 0);
  // 2번 원화의 바깥 주먹에 판 어긋남·피격·의성어를 함께 맞춘다.
  const heroX = comicHit.x - (62 - contact.anchorX) * scale;
  const heroY = comicHit.y - (34 - contact.feetY) * scale;
  drawBear(context, frame.assets, {
    x: 925 + displacement,
    y: 625 - Math.sin(recoil * Math.PI) * 36,
    height: 560,
    state: time >= comicStrike.contact ? 'hit' : 'attack',
    phase: time >= comicStrike.contact ? recoil * 0.85 : 0.75,
  });
  drawHero(context, frame.assets, {
    x: heroX - (1 - strike * strike) * 195,
    y: heroY,
    height: bodyHeight * scale,
    action: 'uppercut',
    phase: (index + 0.1) / sequence.length,
  });
}

function registerLayer(
  context: Context,
  frame: CutFrame,
  color: string,
  offsetX: number,
  offsetY: number,
): void {
  const layer = frame.surfaces.get(`comic-register-${color}`);
  actionActors(layer, frame);
  layer.globalCompositeOperation = 'source-in';
  layer.fillStyle = color;
  layer.fillRect(0, 0, 1280, 720);
  layer.globalCompositeOperation = 'source-over';
  context.save();
  context.globalCompositeOperation = 'multiply';
  context.globalAlpha = 0.85;
  context.drawImage(layer.canvas, offsetX, offsetY);
  context.restore();
}

function actionPanel(context: Context, frame: CutFrame): void {
  const time = Math.min(frame.time, comicStrike.settle);
  const strike = clamp(
    (time - comicStrike.start) / (comicStrike.contact - comicStrike.start),
  );
  context.save();
  context.beginPath();
  context.rect(32, 32, 1216, 656);
  context.clip();
  const backdrop = frame.surfaces.get('comic-game-backdrop');
  gameBackground(backdrop, frame, 0.2);
  context.save();
  context.filter = 'sepia(.35) saturate(.75) contrast(1.12)';
  context.drawImage(backdrop.canvas, 0, 0);
  context.restore();
  context.fillStyle = 'rgba(247,232,176,.35)';
  context.fillRect(0, 0, 1280, 720);
  halftone(context, 32, 32, 1216, 656);
  const displacement =
    time < comicStrike.contact
      ? 2
      : 3 + (1 - clamp((time - comicStrike.contact) / 0.18)) * 19;
  registerLayer(context, frame, '#00c4de', -displacement, 2);
  registerLayer(context, frame, '#f1338d', displacement, -3);
  if (time >= comicStrike.contact)
    gameImpact(context, frame.assets.effects, {
      x: comicHit.x,
      y: comicHit.y,
      progress: (time - comicStrike.contact) / 0.22,
      size: 300,
      angle: -0.58,
    });
  actionActors(context, frame);
  if (time > comicStrike.start && time < comicStrike.contact)
    gameInk(context, frame.assets.effects, {
      sheet: 'stroke',
      x: comicHit.x - (1 - strike * strike) * 195,
      y: comicHit.y,
      progress: strike,
      angle: -0.58,
      size: 330,
    });
  if (time >= comicStrike.contact) {
    lettering(context, '쾅!!', 965, 177, 153, -0.16);
  }
  if (time > comicStrike.contact + 0.17) {
    context.fillStyle = '#f4e7c6';
    context.strokeStyle = '#191622';
    context.lineWidth = 6;
    context.fillRect(78, 76, 265, 110);
    context.strokeRect(78, 76, 265, 110);
    context.fillStyle = '#191622';
    context.font = '900 54px "Apple SD Gothic Neo", sans-serif';
    context.fillText('일격.', 117, 149);
  }
  context.restore();
  context.strokeStyle = '#161421';
  context.lineWidth = 13;
  context.strokeRect(32, 32, 1216, 656);
}

function drawComic(context: Context, frame: CutFrame): void {
  context.fillStyle = '#f3e9ce';
  context.fillRect(0, 0, 1280, 720);
  if (frame.time >= panelTiming.leave) actionPanel(context, frame);
  if (frame.time < panelTiming.leave + panelTiming.leaveDuration) {
    panels.forEach((panel, index) => drawPanel(context, frame, panel, index));
  }
  if (
    frame.time >= comicStrike.contact &&
    frame.time < comicStrike.contact + 0.035
  ) {
    context.save();
    context.globalCompositeOperation = 'difference';
    context.fillStyle = '#fff';
    context.fillRect(32, 32, 1216, 656);
    context.restore();
  }
}

export const comicCut: Cut = {
  id: 'comic-panels',
  title: '만화 일격',
  kind: '2D',
  duration: 3.3,
  description:
    '눈·곰왕·디딤발·주먹 칸의 간격을260→200→140ms로 좁히며 한 타를 준비한다. 큰 칸을 먼저 읽힌 뒤100ms의 가속 신전으로 주먹·피격·판 어긋남·의성어가 함께 터지고, 빠른 초기 밀림 뒤 한 장의 만화로 멈춘다. 원본 몸의 비율·배율·발 앵커와 한 번의 타격을 유지한다.',
  beats: [
    { time: 0.12, label: '눈 · 번뜩' },
    { time: 0.38, label: '곰왕 · 스윽' },
    { time: 0.58, label: '디딤발 · 꽉!' },
    { time: 0.72, label: '주먹 · 쨍!' },
    { time: panelTiming.leave, label: '큰 칸으로 전환' },
    { time: comicStrike.start, label: '100ms 가속 신전' },
    { time: comicStrike.contact, label: '주먹 접촉 · 판 어긋남 · 쾅!!' },
    { time: comicStrike.settle, label: '한 컷 만화 정지' },
  ],
  draw: drawComic,
};
